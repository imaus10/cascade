import { CASCADE_DONE, getNextPeer } from './cascade';
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

// All the Web Audio API stuff below is to help match signals later.
// When the initiator starts the cascade, it sends a series of blips.
// The start of the 4th blip (at END_FREQ Hz) signals recording start.

let _audioCtx;
function audioCtx() {
    if (!_audioCtx) {
        // Safari, what the hell.
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        _audioCtx = new AudioContext();
    }
    return _audioCtx;
}

// TODO: make these controllable?
const blipFreq = 440;
// Interesting phenomenon:
// at higher than 40 BPM, when analyzing the streamed blips, there is no silence.
const bpm = 100;
const gainValue = 0.1;
const blipLength = 0.25; // seconds
export function sendBlips(dispatch) {
    console.log("SENDING BLIPS");
    const blipDest = audioCtx().createMediaStreamDestination();
    const blipStream = blipDest.stream;
    const nextPeer = getNextPeer();
    // use addStream() so we can use popStream()?
    nextPeer.addStream(blipStream);

    const makeBlip = () => {
        const { mode } = getState();
        if (mode === CASCADE_DONE) {
            window.clearInterval(blipIntervalId);
            // TODO: more cleanup
        }
        // TODO: use gain instead of making new nodes every time
        const osc = audioCtx().createOscillator();
        osc.frequency.value = blipFreq;
        const blipper = audioCtx().createGain();
        blipper.gain.value = gainValue;
        osc.connect(blipper);
        // Send to the speakers
        blipper.connect(audioCtx().destination);
        // Send to the analyzer to signal start recording
        listenToBlips(osc, dispatch);
        // And send to the cascade
        blipper.connect(blipDest);
        osc.start();
        osc.stop(audioCtx().currentTime + blipLength)
    };

    const bps = bpm / 60; // beats per second
    const beatInterval = 1000 / bps; // ms between beats
    const blipIntervalId = window.setInterval(makeBlip, beatInterval);
}

export function connectBlipListener(blipStream, dispatch) {
    const blipSource = audioCtx().createMediaStreamSource(blipStream);
    listenToBlips(blipSource, dispatch);
    // Send to the speakers
    blipSource.connect(audioCtx().destination);
}

export async function listenToBlips(blipSourceNode, dispatch) {
    console.log("LISTENING TO BLIPS");
    const analyzer = audioCtx().createAnalyser();
    analyzer.fftSize = 1024;
    blipSourceNode.connect(analyzer);

    const freqResolution = audioCtx().sampleRate / analyzer.fftSize;
    const timeResolution = Math.floor(1 / freqResolution * 1000); // ms
    const freqBins = new Uint8Array(analyzer.frequencyBinCount);
    const expectedFreqIndex = Math.floor(blipFreq / freqResolution);

    let blippin = false;
    const analyzerIntervalId = setInterval(() => {
        analyzer.getByteFrequencyData(freqBins);
        // Get the index of the frequency bin with the highest energy
        // maxEnergyIndex === -1 means silence
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

        // Helpful for debugging:
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

        if (maxEnergyIndex !== -1 && !blippin) {
            blippin = true;
            const binLow = Math.floor(maxEnergyIndex * freqResolution);
            const binHigh = Math.floor((maxEnergyIndex + 1) * freqResolution);
            console.log(`HEARD BLIP @ ${binLow}-${binHigh}Hz (bin ${maxEnergyIndex}, waiting for ${expectedFreqIndex})`);
            // const { mode } = getState();
            // if (mode === CASCADE_STANDBY) {
            //     changeMode(CASCADE_RECORDING, dispatch);
            // }
            // clearInterval(intervalId);
            // blipSourceNode.disconnect(analyzer);
        }
        if (maxEnergyIndex === -1 && blippin) {
            blippin = false;
        }
    }, timeResolution);
}
