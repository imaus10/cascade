import React, { useState } from 'react';
import AddPeers from './AddPeers';
import AudioVideoSetup from './AudioVideoSetup';
import VideoSquare from '../VideoSquare';

const GreenRoom = () => {
    const [myStream, setMyStream] = useState(null);
    const [peerStreams, setPeerStreams] = useState([]);
    // TODO: Use Context for global state
    const addPeerStream = (peerStream) => {
        setPeerStreams([
            ...peerStreams,
            peerStream
        ]);
    };

    return <>
        { myStream ?
            <VideoSquare stream={myStream} /> :
            <AudioVideoSetup afterPermission={setMyStream} /> }
        { peerStreams.map(({ stream }) => {
            return <VideoSquare key={stream} stream={stream} />;
        }) }
        { myStream && <AddPeers addPeerStream={addPeerStream} myStream={myStream} /> }

    </>;
};

export default GreenRoom;
