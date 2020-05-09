import React, { useContext, useEffect, useState } from 'react';
import { Context } from '../Store';

const InputOutputSelect = () => {
    const [state, dispatch] = useContext(Context);
    const { myStream, videoElements } = state;
    const [devices, setDevices] = useState([]);
    const [showSetup, setShowSetup] = useState(false);
    const [audioInput, setAudioInput] = useState(null);
    const [audioOutput, setAudioOutput] = useState(null);
    const [videoInput, setVideoInput] = useState(null);

    const setStream = async () => {
        if (myStream) {
            myStream.getTracks().forEach((track) => track.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
            audio : {
                autoGainControl  : { exact : false },
                deviceId         : audioInput && {
                    exact : audioInput
                },
                echoCancellation : false,
                noiseSuppression : { exact : false },
            },
            video : {
                deviceId : videoInput && {
                    exact : videoInput
                }
            }
        });
        // Safari, what the hell.
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(audioCtx.destination);
        dispatch({
            type : 'MY_STREAM_SET',
            stream
        });
    };

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
        setStream();
    }, [audioInput, videoInput]);

    useEffect(() => {
        const nodes = Object.values(videoElements);
        if (nodes.length && audioOutput) {
            nodes.setSinkId(audioOutput);
        }
    }, [audioOutput, videoElements]);

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

    return showSetup ? <>
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
    <button onClick={() => setShowSetup(true)}>Audio/Video settings</button>;
};

export default InputOutputSelect;
