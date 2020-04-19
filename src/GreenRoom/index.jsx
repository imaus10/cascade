import React, { useState } from 'react';
import Peer from 'simple-peer';
import VideoSquare from '../VideoSquare';

const GreenRoom = () => {
    const [other, setOther] = useState(null);
    const [myConnectionString, setMyConnectionString] = useState('');
    const [otherConnectionString, setOtherConnectionString] = useState('');
    const [myStream, setMyStream] = useState(null);
    const [otherStream, setOtherStream] = useState(null);
    const initiator = window.location.hash === '#init';

    const afterPermission = (stream) => {
        setMyStream(stream);
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
        // Receive data from the remote peer
        peer.on('data', (data) => {
            console.log('received data: ', data.toString());
        });
        // Receive audio/video stream from remote peer
        peer.on('stream', (remoteStream) => {
            setOtherStream(remoteStream);
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
        { myStream ?
            <VideoSquare stream={myStream} /> :
            <button onClick={getPermission}>Let's go!</button>
        }
        { myStream &&
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
        { otherStream &&
            <VideoSquare stream={otherStream} />
        }
    </>;
};

export default GreenRoom;
