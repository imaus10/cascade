import { setCascadeRecordingTime } from './recording';
import { serverSend } from './server';
import { CASCADE_DONE, CASCADE_RECORDING, CASCADE_STANDBY } from '../modes';
import { getState } from '../reducer';

export const CASCADE_STANDBY_DURATION = 6000; // milliseconds

function getNextPeer(state) {
    const { myId, order, peers } = getState();
    const nextIndex = order.indexOf(myId) + 1;
    const nextId = order[nextIndex];
    return peers[nextId];
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

    const { recorder } = getState();

    switch (newMode) {
        case CASCADE_STANDBY:
            setupCascade();
            break;
        case CASCADE_RECORDING:
            setCascadeRecordingTime();
            recorder.start();
            cascadeModeSet(CASCADE_RECORDING);
            break;
        case CASCADE_DONE:
            recorder.stop();
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
        const stream = peer.streams[0];
        stream.getTracks().forEach((track) => {
            track.stop();
            peer.removeTrack(track, stream);
        });
    });

    // To start, send the stream from the previous peer
    // to the next peer in the cascade.
    // The rest of the streams will come with the peer stream event,
    // which calls addCascadedStream()
    const nextPeer = getNextPeer();
    const myIndex = order.indexOf(myId);
    const prevId = order[myIndex - 1];
    if (prevId && nextPeer) {
        const prevStream = streams[prevId].clone();
        nextPeer.addStream(prevStream);
    }
}

export function addCascadedStream(stream, dispatch) {
    const { streams } = getState();

    // Find the next upstream id from here that doesn't have a stream set
    const upstreamIds = getUpstreamIds().slice(0, -1).reverse();
    const id = upstreamIds.find((upstreamId) => !streams[upstreamId]);
    dispatch({
        type : 'STREAMS_ADD',
        id,
        stream,
    });

    const nextPeer = getNextPeer();
    if (nextPeer) {
        nextPeer.addStream(stream);
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
        // The streams stay in the order they're added
        nextPeer.streams.slice(1).forEach((stream) => {
            stream.getTracks().forEach((track) => track.stop());
            nextPeer.removeStream(stream);
        });
    }

    // Send live video back to everyone upstream
    // They will reciprocate if they're not already sending video
    const beforeIds = getUpstreamIds();
    beforeIds.forEach((id) => {
        const peer = peers[id];
        peer.addStream(myStream.clone());
    });
}
