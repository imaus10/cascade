import { CASCADE_STANDBY_DURATION } from './cascade';
import { getNextPeer, pingPeer } from './peers';
import { serverSend } from './server';
import { CASCADE_STANDBY } from '../modes';
import { getState } from '../reducer';

export function makeNewRecorder(stream, dispatch) {
    // TODO: use specific codecs. check browser compatibility.
    const recorder = new MediaRecorder(stream, { mimeType : 'video/webm' });
    recorder.addEventListener('dataavailable', ({ data }) => {
        dispatch({
            type : 'FILES_ADD',
            file : URL.createObjectURL(data),
        });
    });
    recorder.addEventListener('start', () => {
        const { iAmInitiator } = getState();
        // For non-initiators, there could be an additional delay between
        // receiving the stream and record start.
        const startTime = iAmInitiator ? cascadeRecordingTime : cascadeReceiveTime;
        beforeRecordLatency = Date.now() - startTime;
    });
    recorder.addEventListener('stop', () => {
        sendLatencyInfo();
    })
    return recorder;
}

// The time it takes for a ping to get back to its sender
let peerRoundTripLatencies = [];
export function addPeerRoundTripLatency(startTime) {
    peerRoundTripLatencies.push(Date.now() - startTime);
}

// The difference between the time at the sender and the local time when it's received.
// We can compare this value with an estimated one-way trip time
// to see the time offset between the two machines (hopefully).
let peerRelativeOneWayLatencies = [];
export function addPeerRelativeOneWayLatency(remoteStartTime) {
    peerRelativeOneWayLatencies.push(Date.now() - remoteStartTime);
}

let serverLatencies = {};
function addServerLatency(id, startTime) {
    const latencies = serverLatencies[id] || [];
    if (latencies.length === 0) {
        serverLatencies[id] = latencies;
    }
    latencies.push(Date.now() - startTime);
}

// The time CASCADE_STANDBY starts
let cascadeStandbyTime;
export function setCascadeStandbyTime() {
    cascadeStandbyTime = Date.now();
}

// When the cascade stream is received
// (not relevant for the initiator)
let cascadeReceiveTime;
export function setCascadeReceiveTime() {
    cascadeReceiveTime = Date.now();
}

// The time CASCADE_RECORDING starts
let cascadeRecordingTime;
export function setCascadeRecordingTime() {
    cascadeRecordingTime = Date.now();
}

// Right after the stream is sent, to see how long that part takes.
let cascadeSendTime;
export function setCascadeSendTime() {
    cascadeSendTime = Date.now();
}

let beforeRecordLatency;

// This starts a series of pings that lasts from standby until recording starts
// to get an idea of the latencies between each connection in the cascade.
// We use it later to stitch together the video.
export function gatherLatencyInfo() {
    const { iAmInitiator, myId } = getState();
    const nextPeer = getNextPeer();
    // Peer latencies
    if (nextPeer) {
        pingPeer(nextPeer);
    }
    // Server latencies
    if (iAmInitiator) {
        // This will broadcast to all other peers
        // because forId is missing
        serverSend({
            type      : 'ping',
            fromId    : myId,
            startTime : Date.now()
        });
    }
}

export function handleServerPingPong(action) {
    const { fromId, startTime, type } = action;
    const { mode, myId } = getState();

    // If it's a regular keep-alive pong from the server
    // just ignore it
    if (!fromId) return;

    switch (type) {
        case 'ping':
            serverSend({
                type   : 'pong',
                forId  : fromId,
                fromId : myId,
                startTime,
            });
            break;
        case 'pong':
            addServerLatency(fromId, startTime);
            // Keep pinging until recording starts
            if (mode === CASCADE_STANDBY) {
                serverSend({
                    type      : 'ping',
                    forId     : fromId,
                    fromId    : myId,
                    startTime : Date.now()
                });
            }
            break;
        default:
    }
}

export function sendLatencyInfo() {
    const { iAmInitiator, myId } = getState();

    let latencyInfo = {
        type   : 'latency_info',
        fromId : myId,
        beforeRecordLatency,
    };

    // No pongs at the end of the cascade
    if (getNextPeer()) {
        const peerPongNum = peerRoundTripLatencies.length;
        const peerPongTimeAvg = avg(peerRoundTripLatencies);
        const peerPongTimeStdDev = stddev(peerRoundTripLatencies, peerPongTimeAvg);
        const sendLatency = cascadeSendTime - cascadeRecordingTime;
        latencyInfo = {
            ...latencyInfo,
            peerPongNum,
            peerPongTimeAvg,
            peerPongTimeStdDev,
            sendLatency
        };
    }

    // No pings for initiator
    if (!iAmInitiator) {
        const peerPingNum = peerRelativeOneWayLatencies.length;
        const peerPingTimeAvg = avg(peerRelativeOneWayLatencies);
        const peerPingTimeStdDev = stddev(peerRelativeOneWayLatencies, peerPingTimeAvg);
        const signalingLatency = cascadeReceiveTime - cascadeStandbyTime - CASCADE_STANDBY_DURATION;
        latencyInfo = {
            ...latencyInfo,
            peerPingNum,
            peerPingTimeAvg,
            peerPingTimeStdDev,
            signalingLatency
        };
    } else {
        Object.entries(serverLatencies).forEach(([fromId, latencies]) => {
            const serverPongNum = latencies.length;
            const serverPongTimeAvg = avg(peerRoundTripLatencies);
            const serverPongTimeStdDev = stddev(peerRoundTripLatencies, serverPongTimeAvg);
            serverSend({
                type: 'latency_info',
                fromId,
                serverPongNum,
                serverPongTimeAvg,
                serverPongTimeStdDev
            })
        });
    }

    serverSend(latencyInfo);
    peerRoundTripLatencies = [];
    peerRelativeOneWayLatencies = [];
    serverLatencies = {};
}

function avg(values) {
    const sum = values.reduce((accumulator, value) => accumulator + value, 0);
    return sum / values.length;
}

function stddev(values, mean) {
    const sumOfSquares = values.reduce(
        (accumulator, value) => accumulator + Math.pow(value - mean, 2),
        0
    );
    return Math.sqrt(sumOfSquares / (values.length - 1));
}
