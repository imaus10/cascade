import { getNextPeer } from './peers';
import {
    gatherLatencyInfo,
    setCascadeStandbyTime,
    setCascadeRecordingTime,
    setCascadeSendTime
} from './recording';
import { serverSend } from './server';
import { CASCADE_DONE, CASCADE_RECORDING, CASCADE_STANDBY } from '../modes';
import { getState } from '../reducer';

export const CASCADE_STANDBY_DURATION = 6000; // milliseconds

function cloneTracks(stream) {
    return stream.getTracks().map((track) => track.clone());
}

export function cloneMyStream() {
    const { myStream } = getState();
    const tracks = cloneTracks(myStream);
    return new MediaStream(tracks);
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
    changeMode(mode, dispatch);
    serverSend(action);
}

export function changeMode(newMode, dispatch) {
    dispatch({
        type : 'MODE_SET',
        mode : newMode
    });

    const { recorder } = getState();

    switch (newMode) {
        case CASCADE_STANDBY:
            setCascadeStandbyTime();
            stopStreaming();
            gatherLatencyInfo();
            break;
        case CASCADE_RECORDING:
            setCascadeRecordingTime();
            sendCascadeStream();
            recorder.start();
            break;
        case CASCADE_DONE:
            recorder.stop();
            resetStreams();
            break;
        default:
    }
}

function stopStreaming() {
    const { peers } = getState();
    Object.values(peers).forEach((peer) => {
        peer.removeStream(peer.streams[0]);
    });
}

function sendCascadeStream() {
    const { myId, myStream, order, streams } = getState();
    const nextPeer = getNextPeer();
    if (nextPeer) {
        const myIndex = order.indexOf(myId);
        const myTracks = cloneTracks(myStream);
        const otherTracks = order.slice(0, myIndex).reduce((accumulator, id) => {
            return [
                ...accumulator,
                ...streams[id].getTracks()
            ];
        }, []);
        const tracks = [
            ...otherTracks,
            ...myTracks
        ];
        // TODO: how to provide order?
        // Maybe could peer.addTrack() one by one in order?
        // Is that guaranteed to be received in the same order?
        // Will there be A/V sync issues?
        // Let's keep it TODO til we absolutely need do.
        const cascadeStream = new MediaStream(tracks);
        nextPeer.addStream(cascadeStream);
        setCascadeSendTime();
    }
}

export function setStreamsFromCascade(cascade, dispatch) {
    const { myId, order } = getState();
    const audioTracks = cascade.getAudioTracks();
    const videoTracks = cascade.getVideoTracks();
    const myIndex = order.indexOf(myId);
    const beforeIds = order.slice(0, myIndex);
    // For now, combine randomly
    beforeIds.forEach((id, index) => {
        const tracks = [
            audioTracks[index],
            videoTracks[index]
        ].filter(Boolean);
        if (tracks.length !== 2) {
            console.error('Missing a track in the cascade');
        }
        dispatch({
            type   : 'STREAMS_ADD',
            id,
            stream : new MediaStream(tracks)
        });
    });
}

function resetStreams() {
    const { myId, order, peers } = getState();

    // Adding the same MediaStream again causes an error
    // so we have to clone the tracks
    // and wrap them in a new MediaStream
    const newMyStream = cloneMyStream();

    // Signal to the next one it's done
    const nextPeer = getNextPeer();
    if (nextPeer) {
        nextPeer.removeStream(nextPeer.streams[0]);
        nextPeer.addStream(newMyStream);
    }

    // Send live video back to everyone upstream
    const myIndex = order.indexOf(myId);
    const beforeIds = order.slice(0, myIndex);
    beforeIds.forEach((id) => {
        const peer = peers[id];
        peer.addStream(newMyStream);
    });
}

export function stopCascade(dispatch) {
    changeMode(CASCADE_DONE, dispatch);
}
