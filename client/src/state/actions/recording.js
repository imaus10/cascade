import { CASCADE_STANDBY_DURATION } from './cascade';
import { getNextPeer, pingPeer } from './peers';
import { serverSend } from './server';
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
let latencies = [];
export function addLatency(latency) {
    latencies.push(latency);
}

// The difference between the time at the sender and the local time when it's received.
// We can compare this value with an estimated one-way trip time
// to see the time offset between the two machines (hopefully).
let localLatencies = [];
export function addLocalTimeDifference(localTime) {
    localLatencies.push(Date.now() - localTime);
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
    const nextPeer = getNextPeer();
    if (nextPeer) {
        pingPeer(nextPeer);
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
        const numPongs = latencies.length;
        const avgPongTime = avg(latencies);
        const stdDevPongTime = stddev(latencies, avgPongTime);
        const sendLatency = cascadeSendTime - cascadeRecordingTime;
        latencyInfo = {
            ...latencyInfo,
            avgPongTime,
            numPongs,
            sendLatency,
            stdDevPongTime
        };
    }

    // No pings for initiator
    if (!iAmInitiator) {
        const numPings = localLatencies.length;
        const avgPingTime = avg(localLatencies);
        const stdDevPingTime = stddev(localLatencies, avgPingTime);
        const signalingLatency = cascadeReceiveTime - cascadeStandbyTime - CASCADE_STANDBY_DURATION;
        latencyInfo = {
            ...latencyInfo,
            avgPingTime,
            numPings,
            signalingLatency,
            stdDevPingTime,
        };
    }

    serverSend(latencyInfo);
    latencies = [];
    localLatencies = [];
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
