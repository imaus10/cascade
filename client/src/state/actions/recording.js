import { serverSend } from './server';
import { getState } from '../reducer';

const streamReceivedTimes = {};
export function setStreamReceivedTime(id) {
    streamReceivedTimes[id] = Date.now();
}
const playLatencies = {};
export function setPlayLatency(id) {
    playLatencies[id] = Date.now() - streamReceivedTimes[id];
}
let cascadeRecordingTime;
export function setCascadeRecordingTime() {
    cascadeRecordingTime = Date.now();
}
let beforeRecordLatency;
function setBeforeRecordLatency() {
    beforeRecordLatency = Date.now() - cascadeRecordingTime;
}

export function makeNewRecorder(stream, dispatch) {
    // TODO: use specific codecs. check browser compatibility.
    const recorder = new MediaRecorder(stream, { mimeType : 'video/webm' });
    recorder.addEventListener('dataavailable', ({ data }) => {
        dispatch({
            type : 'FILES_ADD',
            file : URL.createObjectURL(data),
        });
    });
    recorder.addEventListener('start', async () => {
        setBeforeRecordLatency();
        sendLatencyInfo();
    });
    return recorder;
}

export function sendLatencyInfo() {
    const { myId, order } = getState();
    const prevIndex = order.indexOf(myId) - 1;
    const prevId = order[prevIndex];
    const playLatency = playLatencies[prevId];
    let latencyInfo = {
        type   : 'latency_info',
        fromId : myId,
        beforeRecordLatency,
        playLatency,
    };
    serverSend(latencyInfo);
}
