import { serverSend } from './server';
import { getState } from '../reducer';

let streamReceivedTime;
export function setStreamReceivedTime() {
    streamReceivedTime = Date.now();
}
let playLatency;
export function setPlayLatency() {
    playLatency = Date.now() - streamReceivedTime;
}
let cascadeRecordingTime;
export function setCascadeRecordingTime() {
    cascadeRecordingTime = Date.now();
}
let beforeRecordLatency;
function setBeforeRecordLatency() {
    beforeRecordLatency = Date.now() - cascadeRecordingTime
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
    const { myId } = getState();
    let latencyInfo = {
        type   : 'latency_info',
        fromId : myId,
        beforeRecordLatency,
        playLatency,
    };
    serverSend(latencyInfo);
}
