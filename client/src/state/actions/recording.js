import {
    CASCADE_DONE,
    CASCADE_RECORDING,
    CASCADE_STANDBY,
    changeMode,
    getNextPeer
} from './cascade';
import { addStream } from './peers';
import { serverSend } from './server';
import { getState, initialState } from '../reducer';

let recorder;
let cascadeRecordingTime;
let beforeRecordLatency;

export function makeRecorder(stream, dispatch) {
    // TODO: use specific codecs. check browser compatibility.
    recorder = new MediaRecorder(stream, { mimeType : 'video/webm' });
    recorder.addEventListener('dataavailable', ({ data }) => {
        const { server } = getState();
        server.send(data);
        // dispatch({
        //     type     : 'FILES_ADD',
        //     blobURL  : URL.createObjectURL(data),
        //     fileName : `cascade${files.length + 1}_video${order.indexOf(myId) + 1}.webm`
        // });
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

const blipFreq = 440;
const doubleBlipFreq = blipFreq * 4;
let blipCount = -1;
export function sendBlips(dispatch) {
    console.log("SENDING BLIPS");
    const blipDest = audioCtx().createMediaStreamDestination();
    const blipStream = blipDest.stream;
    const nextPeer = getNextPeer();
    addStream(nextPeer, blipStream);

    const gainValue = 0.1;
    const blipLength = 0.1; // seconds
    const osc = audioCtx().createOscillator();
    osc.frequency.value = blipFreq;
    // Connect oscillator to gain node
    const blipper = audioCtx().createGain();
    blipper.gain.value = 0;
    osc.connect(blipper);
    // Send blips to the analyzer for blip tracking
    listenToBlips(blipper, dispatch);
    // And send blips down the cascade
    blipper.connect(blipDest);
    osc.start();

    // Turn the gain on and off to make a blip
    const makeBlip = () => {
        const { mode } = getState();
        if (mode === CASCADE_DONE) {
            osc.stop();
            window.clearInterval(blipIntervalId);
            blipCount = -1;
            return;
        }
        if (blipCount !== -1) {
            // Send out a blip an octave higher every 4 blips
            // to signal record start
            if (blipCount % 4 === 0) {
                osc.frequency.setValueAtTime(doubleBlipFreq, audioCtx().currentTime);
                osc.frequency.setValueAtTime(blipFreq, audioCtx().currentTime + blipLength);
            }
            blipCount += 1;
        }
        blipper.gain.setValueAtTime(gainValue, audioCtx().currentTime);
        blipper.gain.setValueAtTime(0, audioCtx().currentTime + blipLength);
    };

    const bpm = 100;
    const bps = bpm / 60; // beats per second
    const beatInterval = 1000 / bps; // ms between beats
    const blipIntervalId = window.setInterval(makeBlip, beatInterval);
}

export function sendRecordSignal() {
    console.log("SENDING RECORD BLIPS");
    // This signals to the makeBlip() function
    // to start sending high blips every 4th blip
    blipCount = 0;
}

export function connectBlipListener(blipStream, dispatch) {
    const blipSource = audioCtx().createMediaStreamSource(blipStream);
    listenToBlips(blipSource, dispatch);
}

export function listenToBlips(blipSourceNode, dispatch) {
    console.log("LISTENING TO BLIPS");
    const { myId, order, peers } = getState();
    const iAmLast = order[order.length - 1] === myId;
    const analyzer = audioCtx().createAnalyser();
    analyzer.fftSize = 256;
    blipSourceNode.connect(analyzer);
    // Send blips to the speakers
    analyzer.connect(audioCtx().destination);

    const freqResolution = audioCtx().sampleRate / analyzer.fftSize;
    const timeResolution = Math.floor(1 / freqResolution * 1000); // ms
    const freqBins = new Uint8Array(analyzer.frequencyBinCount);
    const blipBin = Math.floor(blipFreq / freqResolution);
    const doubleBlipBin = Math.floor(doubleBlipFreq / freqResolution);

    let firstBlip = true;
    let blippin = false;
    const analyzerIntervalId = setInterval(() => {
        const { countdown, mode } = getState();
        if (mode === CASCADE_DONE) {
            clearInterval(analyzerIntervalId);
            blipSourceNode.disconnect(analyzer);
            return;
        }

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

        if (maxEnergyIndex !== -1 && !blippin) {
            blippin = true;

            // The last peer, on receiving the first blip,
            // signals to the initiator that everything's good to go.
            if (firstBlip && iAmLast) {
                firstBlip = false;
                const initiatorId = order[0];
                const initiator = peers[initiatorId];
                initiator.send(JSON.stringify({
                    type : 'SEND_RECORD_SIGNAL'
                }));
            }

            // const binLow = Math.floor(maxEnergyIndex * freqResolution);
            // const binHigh = Math.floor((maxEnergyIndex + 1) * freqResolution);
            // console.log(`HEARD BLIP @ ${binLow}-${binHigh}Hz (bin ${maxEnergyIndex}, waiting for ${expectedFreqIndex})`);

            const blipBinDistance = Math.abs(blipBin - maxEnergyIndex);
            const doubleBlipBinDistance = Math.abs(doubleBlipBin - maxEnergyIndex)
            if (doubleBlipBinDistance < blipBinDistance) {
                console.log(`HEARD HIGH BLIP NEAR ${doubleBlipFreq}Hz`);
                if (mode === CASCADE_STANDBY) {
                    if (countdown === initialState.countdown) {
                        // Start recording on the very first high blip
                        startRecording();
                    }
                    if (countdown === 1) {
                        changeMode(CASCADE_RECORDING, dispatch);
                        dispatch({
                            type      : 'COUNTDOWN_SET',
                            countdown : initialState.countdown
                        });
                    } else {
                        dispatch({
                            type      : 'COUNTDOWN_SET',
                            countdown : countdown - 1
                        });
                    }
                }
            } else {
                console.log(`HEARD LOW BLIP NEAR ${blipFreq}Hz`);
            }
        }

        if (maxEnergyIndex === -1 && blippin) {
            blippin = false;
        }
    }, timeResolution);
}
