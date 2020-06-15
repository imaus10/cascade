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

function reconnectAudioOutput() {
    myAudioSource.connect(myAudioDestination);
}

export function connectBlipListener(stream) {
    const blipSource = audioCtx.createMediaStreamSource(stream);
    blipSource.connect(analyzer);
}

export const END_FREQ = 880;
const endFreqBinIndex = Math.floor(END_FREQ / freqResolution);
export function listenToBlips(dispatch) {
    let blippin = false;
    const intervalId = setInterval(() => {
        // Get the index of the highest-energy frequency bin
        analyzer.getByteFrequencyData(freqArray);
        let maxEnergy = 0;
        const maxEnergyIndex = freqArray.reduce(
            (accumulator, freqBinEnergy, index) => {
                if (freqBinEnergy > maxEnergy) {
                    maxEnergy = freqBinEnergy;
                    return index;
                }
                return accumulator;
            },
            -1
        );

        // maxEnergyIndex === -1 means silence
        if (maxEnergyIndex !== -1 && !blippin) {
            blippin = true;
            // const binLow = Math.floor(maxEnergyIndex * freqResolution);
            // const binHigh = Math.floor((maxEnergyIndex + 1) * freqResolution);
            // console.log(`max energy: ${binLow}-${binHigh} Hz`);
            if (maxEnergyIndex === endFreqBinIndex) {
                clearInterval(intervalId);
                changeMode(CASCADE_RECORDING, dispatch);
                const { iAmInitiator } = getState();
                if (iAmInitiator) {
                    reconnectAudioOutput();
                }
            }
        }
        if (maxEnergyIndex === -1 && blippin) {
            blippin = false;
        }
    }, timeResolution);
}
