import Peer from 'simple-peer';
import { changeMode, cloneMyStream, setStreamsFromCascade } from './cascade-actions';
import { CASCADE_DONE, CASCADE_RECORDING, CASCADE_STANDBY } from './modes';
import { getState, serverSend } from './reducer';

export function checkForNewPeers(action, dispatch) {
    const { order : newOrder } = action;
    const { myId, order : oldOrder, peers } = getState();
    dispatch(action);
    // If receiving order for the first time,
    // initialize a new peer for everyone else waiting
    if (oldOrder.length === 0) {
        newOrder.forEach((id) => {
            if (id !== myId && !peers[id]) {
                makeNewPeer(true, id, dispatch);
            }
        });
    }
}

function makeNewPeer(initiator, newId, dispatch) {
    const { myId, myStream } = getState();
    const peer = new Peer({
        initiator,
        stream : myStream,
    });
    peer.on('signal', (signal) => {
        serverSend({
            type   : 'PEER_SIGNAL',
            forId  : newId,
            fromId : myId,
            signal
        });
    });
    peer.on('stream', (theirStream) => {
        const { mode } = getState();
        // In this mode, the stream is a cascade
        // containing all the synchronized audio/video
        // from all previous peers.
        // Receiving it is a signal to start the cascade.
        if (mode === CASCADE_STANDBY) {
            setStreamsFromCascade(theirStream, dispatch);
            changeMode(CASCADE_RECORDING, dispatch);
        } else {
            dispatch({
                type   : 'STREAMS_ADD',
                id     : newId,
                stream : theirStream
            });
            // If a new stream is added while recording,
            // that means the cascade is over
            if (mode === CASCADE_RECORDING) {
                changeMode(CASCADE_DONE, dispatch);
            }
            // After cascading, if this is sent from downstream,
            // we need to reciprocate and reopen our stream as well
            if (mode === CASCADE_DONE && peer.streams.length === 0) {
                peer.addStream(cloneMyStream());
            }
        }
    });
    dispatch({
        type : 'PEERS_ADD',
        id   : newId,
        peer
    });
    return peer;
}

export function handlePeerSignal(action, dispatch) {
    const { peers } = getState();
    const { fromId, signal } = action;
    const existingPeer = peers[fromId];
    const peer = existingPeer || makeNewPeer(false, fromId, dispatch);
    peer.signal(signal);
}
