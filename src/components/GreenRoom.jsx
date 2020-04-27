import React, { useContext } from 'react';
import AddPeers from './AddPeers';
import AudioVideoSetup from './AudioVideoSetup';
import { Context } from './Store';
import VideoSquare from './VideoSquare';

const GreenRoom = () => {
    const [state] = useContext(Context);
    console.log('STATE', state);
    const { myStream, streams } = state;

    return <>
        { myStream ?
            <VideoSquare stream={myStream} /> :
            <AudioVideoSetup /> }
        { Object.entries(streams).map(([id, stream]) => {
            return <VideoSquare key={id} stream={stream} />;
        }) }
        { myStream && <AddPeers /> }

    </>;
};

export default GreenRoom;
