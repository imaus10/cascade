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
// The start of the last blip (at END_FREQ Hz) signals recording start.
// This is called in-band signaling.

let audioCtx;
let analyzer;
function initAudioCtx() {
    // Safari, what the hell.
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    analyzer = audioCtx.createAnalyser();
    analyzer.fftSize = 1024;
}

let myAudioSource;
let myAudioDestination;
export function makeBlipStream(stream) {
    if (!audioCtx) {
        initAudioCtx();
    }
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
    console.log('SENDING BLIP');
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

export const beepFreqs = [440, 880];
export function listenToBlips(dispatch) {
    const freqResolution = audioCtx.sampleRate / analyzer.fftSize;
    const timeResolution = Math.floor(1 / freqResolution * 1000); // ms
    const freqArray = new Uint8Array(analyzer.frequencyBinCount);
    const freqBinIndices = beepFreqs.map((freq) => Math.floor(freq / freqResolution));

    let blippin = false;
    const intervalId = setInterval(() => {
        analyzer.getByteFrequencyData(freqArray);
        // Check which of the expected freq bins has a higher energy
        const maxFreqIndex = freqBinIndices.reduce(
            (currentMaxIndex, freqBinIndex, index) => {
                const energy = freqArray[freqBinIndex];
                const currentMaxEnergy = freqArray[freqBinIndices[currentMaxIndex]] || 0;
                if (energy > 0 && energy > currentMaxEnergy) {
                    return index;
                }
                return currentMaxIndex;
            },
            -1
        );

        // if (maxFreqIndex !== -1) {
        //     const freqStrings = freqArray.reduce((accumulator, freqBinEnergy, index) => {
        //         if (freqBinEnergy > 0) {
        //             const binLow = Math.floor(index * freqResolution);
        //             const binHigh = Math.floor((index + 1) * freqResolution);
        //             return [
        //                 ...accumulator,
        //                 `${binLow}-${binHigh}: ${freqBinEnergy}`
        //             ];
        //         }
        //         return accumulator;
        //     }, []);
        //     console.log(freqStrings.join('\t'));
        // }

        // maxFreqIndex === -1 means silence
        if (maxFreqIndex !== -1 && !blippin) {
            blippin = true;
            console.log(`HEARD BLIP @ ${beepFreqs[maxFreqIndex]}`);
            if (maxFreqIndex === beepFreqs.length - 1) {
                clearInterval(intervalId);
                changeMode(CASCADE_RECORDING, dispatch);
                const { iAmInitiator } = getState();
                if (iAmInitiator) {
                    reconnectAudioOutput();
                }
            }
        }
        if (maxFreqIndex === -1 && blippin) {
            blippin = false;
        }
    }, timeResolution);
}
