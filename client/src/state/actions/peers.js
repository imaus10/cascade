import Peer from 'simple-peer';
import { changeMode, cloneMyStream, setStreamsFromCascade } from './cascade';
import { addLatency, addLocalTimeDifference, setCascadeReceiveTime } from './recording';
import { serverSend } from './server';
import { CASCADE_DONE, CASCADE_RECORDING, CASCADE_STANDBY } from '../modes';
import { getState } from '../reducer';

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
            setCascadeReceiveTime();
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

    // The peer data channel is currently only used for sending
    // pings to get an idea of the time it takes for a stream
    // to reach the next person in the cascade
    peer.on('data', (data) => {
        const { mode } = getState();
        const { startTime, type } = JSON.parse(data.toString());

        // Send the ping right back
        if (type === 'ping') {
            addLocalTimeDifference(startTime)
            peer.send(JSON.stringify({
                type : 'pong',
                startTime,
            }));
        }
        // Keep pinging until recording starts
        if (type === 'pong') {
            const roundTripLatency = Date.now() - startTime;
            addLatency(roundTripLatency)
            if (mode === CASCADE_STANDBY) {
                pingPeer(peer);
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

export function getNextPeer(state) {
    const { myId, order, peers } = getState();
    const nextIndex = order.indexOf(myId) + 1;
    const nextId = order[nextIndex];
    return peers[nextId];
}

export function pingPeer(peer) {
    peer.send(JSON.stringify({
        type      : 'ping',
        startTime : Date.now()
    }));
}
