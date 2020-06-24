import { addStream, popStream } from './peers';
import {
    connectBlipListener,
    listenToBlips,
    silenceAudioOutput,
    startRecording,
    stopRecording
} from './recording';
import { serverSend } from './server';
import { getState } from '../reducer';

// User is connecting audio/video, hasn't connected to server
export const SETUP = 0;
// Connected to server, waiting for initiator to press GO
export const READY = 1;
// Cascade has started but recording hasn't started yet.
// For initiator, there's a short countdown.
// For everyone else, it's just waiting on the stream to arrive.
export const CASCADE_STANDBY = 2;
// Cascade in progress!
// This will end for the initiator when they press the DONE button
// and for everyone else when the stream ends.
export const CASCADE_RECORDING = 3;
// After the cascade is finished, restarting connections needs to be handled differently.
// Upstream peers should only send their video downstream after the downstream peers have finished.
export const CASCADE_DONE = 4;

function getNextPeer(state) {
    const { myId, order, peers } = getState();
    const nextIndex = order.indexOf(myId) + 1;
    const nextId = order[nextIndex];
    return peers[nextId];
}

export function cleanStream(stream) {
    stream.getTracks().forEach((track) => track.stop());
}

function cascadeModeSet(mode) {
    const nextPeer = getNextPeer();
    if (nextPeer) {
        nextPeer.send(JSON.stringify({
            type : 'MODE_SET',
            mode
        }));
    }
}

export function changeMode(newMode, dispatch) {
    dispatch({
        type : 'MODE_SET',
        mode : newMode
    });

    switch (newMode) {
        case CASCADE_STANDBY:
            listenToBlips(dispatch);
            setupCascade();
            break;
        case CASCADE_RECORDING:
            startRecording();
            break;
        case CASCADE_DONE:
            stopRecording();
            cascadeModeSet(CASCADE_DONE);
            resetStreams();
            break;
        default:
    }
}

export function startCascade(dispatch) {
    const { myId } = getState();
    // dispatch MODE_SET and broadcast via server
    // (server will set lock on new participants)
    const mode = CASCADE_STANDBY;
    const action = {
        type   : 'MODE_SET',
        fromId : myId,
        mode
    };
    serverSend(action);
    changeMode(mode, dispatch);
    silenceAudioOutput();
}

export function getDownstreamIds() {
    const { myId, order } = getState();
    const myIndex = order.indexOf(myId);
    return order.slice(myIndex + 1);
}

export function getUpstreamIds() {
    const { myId, order } = getState();
    const myIndex = order.indexOf(myId);
    return order.slice(0, myIndex);
}

function setupCascade() {
    const { myId, order, peers, streams } = getState();

    // Disconnect stream from all upstream peers
    // and all downstream peers except the one right after
    const disconnectIds = [
        ...getUpstreamIds(),
        ...getDownstreamIds().slice(1)
    ];
    disconnectIds.forEach((id) => {
        const peer = peers[id];
        // There should only be one stream per peer in this stage
        popStream(peer);
    });

    // To start, send the stream from the previous peer
    // to the next peer in the cascade.
    // The rest of the streams will come with the peer stream event,
    // which calls addCascadedStream()
    const nextPeer = getNextPeer();
    const myIndex = order.indexOf(myId);
    const prevId = order[myIndex - 1];
    const prevStream = streams[prevId];
    if (prevStream && nextPeer) {
        addStream(nextPeer, prevStream.clone());
    }

    // If the previous peer is the initiator,
    // listen to blips to signal start recording
    if (prevId === order[0]) {
        connectBlipListener(prevStream);
    }
}

export function addCascadedStream(stream, dispatch) {
    const { order, streams } = getState();

    // Find the next upstream id from here that doesn't have a stream set
    const upstreamIds = getUpstreamIds().slice(0, -1).reverse();
    const id = upstreamIds.find((upstreamId) => !streams[upstreamId]);
    dispatch({
        type : 'STREAMS_ADD',
        id,
        stream,
    });

    // If the stream is from the initiator,
    // listen to the blips to signal start recording
    if (id === order[0]) {
        connectBlipListener(stream);
    }

    const nextPeer = getNextPeer();
    if (nextPeer) {
        addStream(nextPeer, stream);
    }
}

export function stopCascade(dispatch) {
    changeMode(CASCADE_DONE, dispatch);
}

function resetStreams() {
    const { myStream, peers } = getState();

    const nextPeer = getNextPeer();
    if (nextPeer) {
        // Remove the cascaded streams
        while (nextPeer._sendStreams.length > 1) {
            popStream(nextPeer);
        }
    }

    // Send live video back to everyone upstream
    // They will reciprocate if they're not already sending video
    const beforeIds = getUpstreamIds();
    beforeIds.forEach((id) => {
        const peer = peers[id];
        addStream(peer, myStream.clone());
    });
}
