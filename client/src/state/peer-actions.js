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

    // The peer data channel is currently only used for sending
    // pings to get an idea of the time it takes for a stream
    // to reach the next person in the cascade
    peer.on('data', (data) => {
        const { mode } = getState();
        const { startTime, type, ...rest } = JSON.parse(data.toString());
        // This will go away when we send it to the server instead
        if (type === 'latency_info') {
            printLatencyInfo(rest);
        }
        // Send the ping right back
        if (type === 'ping') {
            peer.send(JSON.stringify({
                type : 'ping_response',
                startTime,
            }));
        }
        // Keep pinging until recording starts
        if (type === 'ping_response') {
            const roundTripLatency = Date.now() - startTime;
            latencies.push(roundTripLatency);
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

let latencies = [];
// This starts a series of pings that lasts from standby until recording starts
// to get an idea of the latencies between each connection in the cascade.
// We use it later to stitch together the video.
export function gatherLatencyInfo() {
    latencies = [];
    const nextPeer = getNextPeer();
    if (nextPeer) {
        pingPeer(nextPeer);
    }
}

function pingPeer(peer) {
    peer.send(JSON.stringify({
        type      : 'ping',
        startTime : Date.now()
    }));
}

function printLatencyInfo(latencyInfo) {
    const { myId, order } = getState();
    const { avgPingTime, fromId, numPings, stdDevPingTime, toId } = latencyInfo;
    const fromOrderNumber = order.indexOf(fromId);
    const toOrderNumber = order.indexOf(toId);
    console.log(`latency info from ${fromOrderNumber} to ${toOrderNumber}:`);
    console.log(`num pings = ${numPings};
                 std dev = ${stdDevPingTime};
                 avg rount trip = ${avgPingTime};
                 est. one-way = ${avgPingTime / 2}`);
    if (fromId === myId) {
        console.log(latencies);
    }
}

export function sendLatencyInfo() {
    const { myId, order, peers } = getState();

    // Don't send if you're the end of the cascade
    if (!getNextPeer()) return;

    const numPings = latencies.length;
    const pingSum = latencies.reduce((accumulator, pingTime) => accumulator + pingTime, 0);
    const avgPingTime = pingSum / numPings;
    const sumOfSquares = latencies.reduce(
        (accumulator, pingTime) => accumulator + Math.pow(pingTime - avgPingTime, 2),
        0
    );
    const stdDevPingTime = Math.sqrt(sumOfSquares / (numPings - 1));
    const fromId = myId;
    const toIndex = order.indexOf(myId) + 1;
    const toId = order[toIndex];
    const latencyInfo = {
        type : 'latency_info',
        avgPingTime,
        fromId,
        numPings,
        stdDevPingTime,
        toId
    };

    // For now, send info to the initiator to print, for manual slicing.
    // Eventually, we want to send this to the server
    // with the files to do the automatic syncing.
    const initiatorId = order[0];
    if (initiatorId === myId) {
        printLatencyInfo(latencyInfo);
    } else {
        const initiator = peers[initiatorId];
        initiator.send(JSON.stringify(latencyInfo));
    }
}
