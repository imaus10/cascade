import React, { useState } from 'react';
import Peer from 'simple-peer';
import VideoSquare from '../VideoSquare';

const GreenRoom = () => {
    const [stream, setStream] = useState(null);
    const [connectionString, setConnectionString] = useState(null);

    const afterPermission = (stream) => {
        setStream(stream);
        const me = new Peer({
            initiator: true,
            stream
        });
        // Provides the connection string
        me.on('signal', (connectionInfo) => {
            setConnectionString(JSON.stringify(connectionInfo));
        });
    };

    const getPermission = () => {
        // Ask for webcam/microphone permission
        navigator.mediaDevices.getUserMedia({
            audio : true,
            video : true
        }).then(afterPermission);
    };

    return <>
        <div>Welcome. Let's make the connections.</div>
        <div>First, let's enable your audio and video. So make yourself presentable. Put some pants on (or take them off if it's that kinda thing). Put on your makeup and/or mask. Enable your autotune whatnots.</div>
        { stream ?
            <VideoSquare stream={stream} /> :
            <button onClick={getPermission}>Let's go!</button>
        }
        { connectionString &&
            <>
                {console.log(connectionString)}
                <div>Your connection string:</div>
                <textarea readOnly value={connectionString} />
            </>
        }
    </>;
};

export default GreenRoom;
