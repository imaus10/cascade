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
        beforeRecordLatency = Date.now() - cascadeStartTime;
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

let cascadeStartTime;
export function setCascadeStartTime() {
    cascadeStartTime = Date.now();
}

let beforeRecordLatency;

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

export function sendLatencyInfo() {
    const { iAmInitiator, myId } = getState();

    let latencyInfo = {
        type   : 'latency_info',
        cascadeStartTime,
        fromId : myId
    };

    // No pongs at the end of the cascade
    if (getNextPeer()) {
        const numPongs = latencies.length;
        const avgPongTime = avg(latencies);
        const stdDevPongTime = stddev(latencies, avgPongTime);
        latencyInfo = {
            ...latencyInfo,
            avgPongTime,
            numPongs,
            stdDevPongTime
        };
    }

    // No pings for initiator
    if (!iAmInitiator) {
        const numPings = localLatencies.length;
        const avgPingTime = avg(localLatencies);
        const stdDevPingTime = stddev(localLatencies, avgPingTime);
        latencyInfo = {
            ...latencyInfo,
            avgPingTime,
            beforeRecordLatency,
            numPings,
            stdDevPingTime,
        };
    }

    serverSend(latencyInfo);
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
