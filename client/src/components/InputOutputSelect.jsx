import React, { useContext, useEffect, useState } from 'react';
import { Context } from './Store';

const InputOutputSelect = () => {
    const [state, dispatch] = useContext(Context);
    const { myStream, videoElement } = state;
    const [devices, setDevices] = useState([]);
    const [showSetup, setShowSetup] = useState(true);
    const [audioInput, setAudioInput] = useState(null);
    const [audioOutput, setAudioOutput] = useState(null);
    const [videoInput, setVideoInput] = useState(null);

    const setStream = async () => {
        if (myStream) {
            myStream.getTracks().forEach((track) => track.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
            audio : {
                deviceId : audioInput && {
                    exact : audioInput
                }
            },
            video : {
                deviceId : videoInput && {
                    exact : videoInput
                }
            }
        });
        dispatch({
            type : 'MY_STREAM_SET',
            stream
        });
    };

    useEffect(() => {
        const findDevices = async () => {
            const deviceList = await navigator.mediaDevices.enumerateDevices();
            setDevices(deviceList);
        };
        findDevices();
    }, []);

    useEffect(() => {
        // Called on the first render
        // (and any time audioInput or videoInput change)
        setStream();
    }, [audioInput, videoInput]);

    useEffect(() => {
        if (videoElement && audioOutput) {
            videoElement.setSinkId(audioOutput);
        }
    }, [audioOutput, videoElement]);

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
        <div className="io-settings">
            { showSetup ? <>
                { devicesSorted.map((deviceMap, index) => {
                    const label = kindLabels[index];
                    const [selectedDeviceId, setSelectedDeviceId] = selectedDevices[index];
                    return (
                        <label key={label}>
                            {label}
                            <select
                                onChange={(event) => setSelectedDeviceId(event.target.value)}
                                value={selectedDeviceId || 'default'}
                            >
                                { Object.values(deviceMap).map(({ deviceId, label }) => (
                                    <option key={deviceId} value={deviceId}>{label}</option>
                                )) }
                            </select>
                        </label>
                    );
                }) }
                <button onClick={() => setShowSetup(false)}>x</button>
            </> :
            <button onClick={() => setShowSetup(true)}>Audio/Video settings</button> }
        </div>
    );
};

export default InputOutputSelect;
