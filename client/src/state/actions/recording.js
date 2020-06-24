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
function initAudioCtx() {
    // Safari, what the hell.
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
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

let analyzer;
let blipSource;
export function connectBlipListener(stream) {
    blipSource = audioCtx.createMediaStreamSource(stream);
    blipSource.connect(analyzer);
}

export const beepFreqs = [440, 880];
export async function listenToBlips(dispatch) {
    analyzer = audioCtx.createAnalyser();
    analyzer.fftSize = 1024;
    const freqResolution = audioCtx.sampleRate / analyzer.fftSize;
    const timeResolution = Math.floor(1 / freqResolution * 1000); // ms
    const freqBins = new Uint8Array(analyzer.frequencyBinCount);
    const expectedFreqIndices = beepFreqs.map((freq) => Math.floor(freq / freqResolution));

    let blippin = false;
    const intervalId = setInterval(() => {
        analyzer.getByteFrequencyData(freqBins);
        // Get the index of the frequency bin with the highest energy
        const maxEnergyIndex = freqBins.reduce(
            (currentMaxIndex, energy, index) => {
                const currentMaxEnergy = freqBins[currentMaxIndex] || 0;
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

        // maxEnergyIndex === -1 means silence
        if (maxEnergyIndex !== -1 && !blippin && expectedFreqIndices.includes(maxEnergyIndex)) {
            blippin = true;
            const freqIndex = expectedFreqIndices.indexOf(maxEnergyIndex);
            console.log(`HEARD BLIP @ ${beepFreqs[freqIndex]}`);
            if (freqIndex === beepFreqs.length - 1) {
                clearInterval(intervalId);
                changeMode(CASCADE_RECORDING, dispatch);
                const { iAmInitiator } = getState();
                if (iAmInitiator) {
                    reconnectAudioOutput();
                } else {
                    blipSource.disconnect(analyzer);
                }
            }
        }
        if (maxEnergyIndex === -1 && blippin) {
            blippin = false;
        }
    }, timeResolution);
}
