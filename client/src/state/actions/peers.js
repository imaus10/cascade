import Peer from 'simple-peer';
import {
    CASCADE_DONE,
    CASCADE_STANDBY,
    addCascadedStream,
    changeMode,
    cleanStream
} from './cascade';
import { sendRecordSignal } from './recording';
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
        cleanStream(streams[id]);
        peers[id].destroy();
    });
}

function makeNewPeer(initiator, peerId, dispatch) {
    const { myId, myStream } = getState();
    // Clone this because we'll stop the tracks during cascade,
    // which would stop our view of ourself
    const sendStream = myStream.clone();
    const peer = new Peer({
        initiator,
        stream : sendStream
    });
    // Peer doesn't keep track of the sending streams.
    // We're doing a bunch of stream cloning
    // (because you can't send the same stream more than once :shrug:)
    // so we need to keep track of the streams that were sent.
    peer._sendStreams = [sendStream];

    peer.on('signal', (signal) => {
        serverSend({
            type   : 'PEER_SIGNAL',
            forId  : peerId,
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
                id     : peerId,
                stream : theirStream
            });
            // After cascading, if this is sent from downstream,
            // we need to reciprocate and reopen our stream as well
            // (except for the next peer, which we're already streaming to)
            if (mode === CASCADE_DONE && peer._sendStreams.length === 0) {
                addStream(peer, myStream.clone());
            }
        }
    });

    // The peer data channel is currently only used
    // for propagating mode changes down the cascade
    peer.on('data', (data) => {
        const { mode, type } = JSON.parse(data.toString());
        if (type === 'MODE_SET') {
            changeMode(mode, dispatch);
        } else if (type === 'SEND_RECORD_SIGNAL') {
            sendRecordSignal();
        } else {
            console.error(`Unknown action "${type}" sent thru peer`);
        }
    });

    dispatch({
        type : 'PEERS_ADD',
        id   : peerId,
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

export function addStream(peer, stream) {
    peer.addStream(stream);
    peer._sendStreams.push(stream);
}

export function popStream(peer) {
    const stream = peer._sendStreams.pop();
    cleanStream(stream);
    peer.removeStream(stream);
    return stream;
}
