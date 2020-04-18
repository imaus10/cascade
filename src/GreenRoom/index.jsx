import React, { useEffect, useState } from 'react';
import VideoSquare from '../VideoSquare';

const GreenRoom = () => {
    const [stream, setStream] = useState(null);
    useEffect(() => {
        // Ask for webcam/microphone permission
        navigator.mediaDevices.getUserMedia({
            audio : true,
            video : true
        }).then(setStream);
    }, []);

    return <>
        <div>Welcome. Let's make the connections.</div>
        <div>First, let's enable your audio and video. So make yourself presentable. Put some pants on (or take them off if it's that kinda thing). Put on your makeup and/or mask. Enable your autotune whatnots.</div>
        <VideoSquare stream={stream} />
    </>;
};

export default GreenRoom;
