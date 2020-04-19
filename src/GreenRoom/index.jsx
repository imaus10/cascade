import React, { useState } from 'react';
import Peer from 'simple-peer';
import VideoSquare from '../VideoSquare';

const GreenRoom = () => {
    const [other, setOther] = useState(null);
    const [myConnectionString, setMyConnectionString] = useState('');
    const [otherConnectionString, setOtherConnectionString] = useState('');
    const [stream, setStream] = useState(null);
    const initiator = window.location.hash === '#init';

    const afterPermission = (stream) => {
        setStream(stream);
        const peer = new Peer({
            initiator,
            stream,
            // Set to false for now, because with true it sends multiple signals
            trickle: false
        });
        // Provides the connection string
        peer.on('signal', (connectionInfo) => {
            setMyConnectionString(JSON.stringify(connectionInfo));
        });
        // When the remote peer is connected
        peer.on('connect', () => {
            console.log('we connected!');
            peer.send('HELLO WORLD');
        });
        // When receiving data from the remote peer
        peer.on('data', (data) => {
            console.log('received data: ', data.toString());
        });
        setOther(peer);
    };

    const getPermission = () => {
        // Ask for webcam/microphone permission
        navigator.mediaDevices.getUserMedia({
            audio : true,
            video : true
        }).then(afterPermission);
    };

    const connectToOther = (event) => {
        event.preventDefault();
        other.signal(JSON.parse(otherConnectionString));
    };

    return <>
        <div>Welcome. Let's make the connections.</div>
        <div>First, let's enable your audio and video. So make yourself presentable. Put some pants on (or take them off if it's that kinda thing). Put on your makeup and/or mask. Enable your autotune whatnots.</div>
        { stream ?
            <VideoSquare stream={stream} /> :
            <button onClick={getPermission}>Let's go!</button>
        }
        { stream &&
            <form onSubmit={connectToOther}>
                <label>
                    Your connection info:
                    <textarea readOnly value={myConnectionString} />
                </label>
                <label>
                    Their connection info:
                    <textarea onChange={(event) => setOtherConnectionString(event.target.value)} />
                </label>
                <input type="submit" value="Connect" />
            </form>
        }
    </>;
};

export default GreenRoom;
