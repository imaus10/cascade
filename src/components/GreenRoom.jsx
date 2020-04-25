import React, { useContext } from 'react';
import AddPeers from './AddPeers';
import AudioVideoSetup from './AudioVideoSetup';
import { Context } from './Store';
import VideoSquare from './VideoSquare';

const GreenRoom = () => {
    const [state] = useContext(Context);
    console.log(state);
    const { myStream, peerStreams } = state;

    return <>
        { myStream ?
            <VideoSquare stream={myStream} /> :
            <AudioVideoSetup /> }
        { Object.entries(peerStreams).map(([peerId, { stream }]) => {
            return <VideoSquare key={peerId} stream={stream} />;
        }) }
        { myStream && <AddPeers /> }

    </>;
};

export default GreenRoom;
