import { serverSend } from './server';
import { getState } from '../reducer';

// The time CASCADE_RECORDING starts
let cascadeRecordingTime;
export function setCascadeRecordingTime() {
    cascadeRecordingTime = Date.now();
}
let cascadeSentTime;
export function setCascadeSentTime() {
    cascadeSentTime = Date.now();
}
let beforeRecordLatency;

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
        beforeRecordLatency = Date.now() - cascadeRecordingTime;
    });
    recorder.addEventListener('stop', () => {
        sendLatencyInfo();
    });
    return recorder;
}

export function sendLatencyInfo() {
    const { myId } = getState();
    let latencyInfo = {
        type              : 'latency_info',
        fromId            : myId,
        beforeRecordLatency,
        beforeSendLatency : cascadeSentTime - cascadeRecordingTime
    };
    serverSend(latencyInfo);
}
