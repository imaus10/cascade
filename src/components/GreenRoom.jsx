import React, { useContext } from 'react';
import AddPeers from './AddPeers';
import AudioVideoSetup from './AudioVideoSetup';
import { Context } from './Store';
import VideoSquare from './VideoSquare';
import './GreenRoom.css';

const GreenRoom = () => {
    const [state] = useContext(Context);
    console.log('STATE', state);
    const { myStream, streams } = state;

    return <>
        <div className="videos">
            { myStream ?
                <VideoSquare stream={myStream} /> :
                <AudioVideoSetup /> }
            { Object.entries(streams).map(([id, stream]) => {
                return <VideoSquare key={id} stream={stream} />;
            }) }
        </div>
        { myStream && <AddPeers /> }

    </>;
};

export default GreenRoom;
