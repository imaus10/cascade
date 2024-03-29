import React, { useContext, useEffect, useState } from 'react';
import { Context } from '../Store';
import { addStream, popStream } from '../../state/actions/peers';
import { makeRecorder } from '../../state/actions/recording';

const AudioVideoSetup = ({ style }) => {
    const [state, dispatch] = useContext(Context);
    const { audioOutput, myStream, peers } = state;
    const [devices, setDevices] = useState([]);
    const [showSetup, setShowSetup] = useState(false);
    const [audioInput, setAudioInput] = useState(null);
    const [videoInput, setVideoInput] = useState(null);
    const setAudioOutput = (deviceId) => {
        dispatch({
            type : 'AUDIO_OUTPUT_SET',
            deviceId
        });
    }

    useEffect(() => {
        // On Safari, enumerateDevices only works after getUserMedia is called.
        // So wait for that to happen before populating the dropdowns.
        // (Also, missing things even after it's called...)
        if (myStream && showSetup) {
            const findDevices = async () => {
                const deviceList = await navigator.mediaDevices.enumerateDevices();
                setDevices(deviceList);
            };
            findDevices();
        }
    }, [myStream, showSetup]);

    useEffect(() => {
        // Called on the first render
        // (and any time audioInput or videoInput change)
        const setStream = async () => {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio : {
                    deviceId         : audioInput && { exact : audioInput },
                    // These cause latency
                    autoGainControl  : { exact : false },
                    echoCancellation : false,
                    noiseSuppression : { exact : false },
                },
                video : {
                    deviceId : videoInput && { exact : videoInput }
                }
            });

            // Record the unprocessed input
            makeRecorder(stream, dispatch);

            if (myStream) {
                Object.values(peers).forEach((peer) => {
                    popStream(peer);
                    addStream(peer, stream);
                });
            }

            dispatch({
                type   : 'MY_STREAM_SET',
                stream
            });
        };
        setStream();
    }, [audioInput, videoInput]);

    const kinds = ['audioinput', 'audiooutput', 'videoinput'];
    const kindLabels = ['Audio Input', 'Audio Output', 'Video Input'];
    const selectedDevices = [
        [audioInput, setAudioInput],
        [audioOutput, setAudioOutput],
        [videoInput, setVideoInput]
    ];
    // Sort the available devices into the three buckets
    const devicesSorted = devices.reduce((accumulator, device) => {
        const { deviceId, kind } = device;
        const index = kinds.indexOf(kind);
        return [
            ...accumulator.slice(0, index),
            {
                ...accumulator[index],
                [deviceId] : device,
            },
            ...accumulator.slice(index + 1)
        ]
    }, [{}, {}, {}]);

    return (
        <section className="av-setup" style={style}>
            { showSetup ? <>
                { devicesSorted.map((deviceMap, index) => {
                    const devicesOfType = Object.values(deviceMap);
                    if (devicesOfType.length === 0) return null;
                    const label = kindLabels[index];
                    const [selectedDeviceId, setSelectedDeviceId] = selectedDevices[index];
                    return (
                        <label key={label}>
                            {label}
                            <select
                                onChange={(event) => setSelectedDeviceId(event.target.value)}
                                value={selectedDeviceId || 'default'}
                            >
                                { devicesOfType.map(({ deviceId, label }) => (
                                    <option key={deviceId} value={deviceId}>{label}</option>
                                )) }
                            </select>
                        </label>
                    );
                }) }
                <button onClick={() => setShowSetup(false)}>x</button>
            </> :
            <button onClick={() => setShowSetup(true)}>Audio/Video settings</button> }
        </section>
    );
};

export default AudioVideoSetup;
