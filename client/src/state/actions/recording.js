import getStats from 'getstats';
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
let receiveDelayAtRecordingStart;
function setReceiveDelay() {
    const { myId, order, peers } = getState();
    const prevId = order[order.indexOf(myId) - 1]
    if (prevId) {
        const prevPeer = peers[prevId];
        return new Promise((resolve) => {
            getStats(prevPeer._pc, (result) => {
                result.nomore(); // Just one time
                // This only works in Chrome.
                // TODO: does firefox report the same info?
                result.results.forEach((item) => {
                    const { id, mediaType, type } = item;
                    const isReceived = id.split('_').pop() === 'recv';
                    if (type === 'ssrc' && mediaType === 'video' && isReceived) {
                        receiveDelayAtRecordingStart = item.googCurrentDelayMs;
                        resolve();
                    }
                });
            }, 2000);
        });
    }
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
        await setReceiveDelay();
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
        receiveDelayAtRecordingStart,
    };
    serverSend(latencyInfo);
}
