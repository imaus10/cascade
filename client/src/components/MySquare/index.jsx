import React, { useContext } from 'react';
import AudioVideoSetup from './AudioVideoSetup';
import { Context } from '../Store';
import VideoSquare from '../VideoSquare';

const MySquare = () => {
    const [state] = useContext(Context);
    const { myId, myStream, order } = state;
    const flexOrder = order.findIndex((id) => id === myId);
    return (
        <div className="my-stream" style={{ order : flexOrder }}>
            { myStream && <VideoSquare muted stream={myStream} /> }
            <AudioVideoSetup />
        </div>
    );
};

export default MySquare;
