import { CASCADE_RECORDING, changeMode } from './cascade';
import { serverSend } from './server';
import { getState } from '../reducer';

let recorder;
let cascadeRecordingTime;
let beforeRecordLatency;

export function makeRecorder(stream, dispatch) {
    // TODO: use specific codecs. check browser compatibility.
    recorder = new MediaRecorder(stream, { mimeType : 'video/webm' });
    recorder.addEventListener('dataavailable', ({ data }) => {
        const { files, myId, order } = getState();
        dispatch({
            type     : 'FILES_ADD',
            blobURL  : URL.createObjectURL(data),
            fileName : `cascade${files.length + 1}_video${order.indexOf(myId) + 1}.webm`
        });
    });
    recorder.addEventListener('start', async () => {
        beforeRecordLatency = Date.now() - cascadeRecordingTime;
        sendLatencyInfo();
    });
    return recorder;
}

export function startRecording() {
    cascadeRecordingTime = Date.now();
    recorder.start();
}

export function stopRecording() {
    recorder.stop();
}

export function sendLatencyInfo() {
    const { myId } = getState();
    let latencyInfo = {
        type   : 'latency_info',
        fromId : myId,
        beforeRecordLatency,
    };
    serverSend(latencyInfo);
}

// All the Web Audio API stuff below is to precisely signal
// when to start recording. When the initiator starts the cascade,
// it silences its audio stream and sends a series of blips.
// The start of the last blip signals recording start.
// This is called in-band signaling.

// Safari, what the hell.
const AudioContext = window.AudioContext || window.webkitAudioContext;
export const audioCtx = new AudioContext();

const analyzer = audioCtx.createAnalyser();
analyzer.fftSize = 1024;
const freqResolution = audioCtx.sampleRate / analyzer.fftSize;
const timeResolution = Math.floor(1 / freqResolution * 1000); // ms
const freqArray = new Uint8Array(analyzer.frequencyBinCount);

let myAudioSource;
let myAudioDestination;
export function makeBlipStream(stream) {
    myAudioSource = audioCtx.createMediaStreamSource(stream);
    // Play the unprocessed input
    // Strangely, there is a delay when hearing the audio via the video element.
    // But the delay is noticeably shorter when using the Web Audio API...
    // (But only in Chrome?)
    // TODO: set device output properly. See:
    // https://stackoverflow.com/questions/41863094/how-to-select-destination-output-device-using-web-audio-api
    myAudioSource.connect(audioCtx.destination);

    myAudioDestination = audioCtx.createMediaStreamDestination();
    myAudioSource.connect(myAudioDestination);

    const blipStream = myAudioDestination.stream;
    // Add the video track(s) back to the blip'd audio stream
    const videoTracks = stream.getVideoTracks();
    videoTracks.forEach((track) => blipStream.addTrack(track.clone()));
    return blipStream;
}

export function silenceAudioOutput() {
    myAudioSource.disconnect(myAudioDestination);
}

export function sendBlip(frequency) {
    const blipper = audioCtx.createOscillator();
    blipper.frequency.value = frequency;

    const gainNode = audioCtx.createGain();
    gainNode.gain.value = 0.25;

    blipper.connect(gainNode);
    gainNode.connect(myAudioDestination);
    gainNode.connect(audioCtx.destination);
    gainNode.connect(analyzer);

    blipper.start();
    blipper.stop(audioCtx.currentTime + 0.2);
}

export function reconnectAudioOutput() {
    myAudioSource.connect(myAudioDestination);
}

export function connectBlipListener(stream) {
    const blipSource = audioCtx.createMediaStreamSource(stream);
    blipSource.connect(analyzer);
}

export const NUM_BLIPS = 3;
export function listenToBlips(dispatch) {
    let blippin = false;
    let blipCount = 0;
    const intervalId = setInterval(() => {
        analyzer.getByteFrequencyData(freqArray);
        const totalEnergy = freqArray.reduce(
            (accumulator, freqBinEnergy) => accumulator + freqBinEnergy,
            0
        );
        if (totalEnergy > 0 && !blippin) {
            blippin = true;
            blipCount += 1;
            if (blipCount === NUM_BLIPS) {
                clearInterval(intervalId);
                changeMode(CASCADE_RECORDING, dispatch);
            }
        }
        if (blippin && totalEnergy === 0) {
            blippin = false;
        }
    }, timeResolution);
}
