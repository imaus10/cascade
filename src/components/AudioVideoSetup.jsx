import React, { useContext } from 'react';
import { Context } from './Store';

const AudioVideoSetup = () => {
    const [, dispatch] = useContext(Context);

    // TODO: allow choice of audio/video input
    const getPermission = () => {
        // Ask for webcam/microphone permission
        navigator.mediaDevices.getUserMedia({
            audio : true,
            video : true
        }).then((stream) => {
            dispatch({
                type : 'MY_STREAM_SET',
                stream
            });
        });
    };

    return <section>
        <div>Welcome. Let's make the connections.</div>
        <div>First, let's enable your audio and video. So make yourself presentable. Put some pants on (or take them off if it's that kinda thing). Put on your makeup and/or mask. Enable your autotune whatnots.</div>
        <button onClick={getPermission}>Let's go!</button>
    </section>
};

export default AudioVideoSetup;
