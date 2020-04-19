import React, { useState } from 'react';
import Peer from 'simple-peer';
import AudioVideoSetup from './AudioVideoSetup';
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

    const connectToOther = (event) => {
        event.preventDefault();
        other.signal(JSON.parse(otherConnectionString));
    };

    return <>
        { myStream ?
            <VideoSquare stream={myStream} /> :
            <AudioVideoSetup afterPermission={afterPermission} />
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
