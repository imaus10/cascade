import Peer from 'simple-peer';
import {
    CASCADE_DONE,
    CASCADE_STANDBY,
    addCascadedStream,
    changeMode
 } from './cascade';
import { setStreamReceivedTime } from './recording';
import { serverSend } from './server';
import { getState } from '../reducer';

export function handleOrderSet(action, dispatch) {
    const { order : newOrder } = action;
    const { myId, order : oldOrder, peers, streams } = getState();
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

    // If peers have been removed, clean up the connections
    const removedPeers = oldOrder.reduce((accumulator, id) => {
        if (newOrder.includes(id)) return accumulator;
        return accumulator.concat(id);
    }, []);
    removedPeers.forEach((id) => {
        peers[id].destroy();
        streams[id].getTracks().forEach((track) => track.stop());
    });
}

function makeNewPeer(initiator, newId, dispatch) {
    const { myId, myStream } = getState();
    const peer = new Peer({
        initiator,
        stream : myStream.clone()
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
        if (mode === CASCADE_STANDBY) {
            addCascadedStream(theirStream, dispatch);
        } else {
            dispatch({
                type   : 'STREAMS_ADD',
                id     : newId,
                stream : theirStream
            });
            // Mark when the stream is first received to measure the play latency
            // (the time it takes from receiving the stream to viewing the first frame)
            setStreamReceivedTime(newId);
            // After cascading, if this is sent from downstream,
            // we need to reciprocate and reopen our stream as well
            if (mode === CASCADE_DONE && peer.streams.length === 0) {
                peer.addStream(myStream.clone());
            }
        }
    });

    // The peer data channel is currently only used
    // for propagating mode changes down the cascade
    peer.on('data', (data) => {
        const { mode, type } = JSON.parse(data.toString());
        if (type === 'MODE_SET') {
            changeMode(mode, dispatch);
            return;
        }
        console.error(`Unknown action "${type}" sent thru peer`);
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
