import Peer from 'simple-peer';
import { CASCADE_RECORDING, CASCADE_STANDBY } from './modes';

export function makeNewPeer(initiator, newId, state, dispatch) {
    const { myId, myStream } = state;
    const peer = new Peer({
        initiator,
        stream : myStream,
    });
    peer.on('signal', (signal) => {
        dispatch({
            type       : 'SERVER_SEND',
            sendAction : {
                type   : 'PEER_SIGNAL',
                forId  : newId,
                fromId : myId,
                signal
            }
        });
    });
    peer.on('stream', (theirStream) => {
        dispatch((stateNow) => {
            const { mode, order } = stateNow;
            // In this mode, a stream will be received from
            // just one peer containing all the synchronized audio/video
            if (mode === CASCADE_STANDBY) {
                // Start recording immediately
                dispatch({
                    type : 'MODE_SET',
                    mode : CASCADE_RECORDING
                });
                console.log('receiving stream:', theirStream);
                console.log('tracks:', theirStream.getTracks());

                const audioTracks = theirStream.getAudioTracks();
                const videoTracks = theirStream.getVideoTracks();
                const myIndex = order.indexOf(myId);
                // For now, combine randomly
                order.slice(0, myIndex).forEach((id, index) => {
                    const tracks = [
                        audioTracks[index],
                        videoTracks[index]
                    ].filter(Boolean);
                    if (tracks.length !== 2) {
                        console.error('Missing a track in the stream');
                    }
                    dispatch({
                        type   : 'STREAMS_ADD',
                        id,
                        stream : new MediaStream(tracks)
                    });
                })
            } else {
                dispatch({
                    type   : 'STREAMS_ADD',
                    id     : newId,
                    stream : theirStream
                });
            }
        });
    });
    dispatch({
        type : 'PEERS_ADD',
        id   : newId,
        peer
    });
    return peer;
}

export function handlePeerSignal(state, action) {
    const { peers } = state;
    const {
        dispatch,
        fromId : theirId,
        signal : receiveSignal
    } = action;
    const existingPeer = peers[theirId];
    const peer = existingPeer || makeNewPeer(false, theirId, state, dispatch);
    peer.signal(receiveSignal);
}
