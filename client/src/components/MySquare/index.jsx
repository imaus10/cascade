import React, { useContext } from 'react';
import AudioVideoSetup from './AudioVideoSetup';
import { Context } from '../Store';
import VideoSquare from '../VideoSquare';

const MySquare = () => {
    const [state] = useContext(Context);
    const { myStream } = state;
    return (
        <div className="my-stream">
            { myStream && <VideoSquare muted stream={myStream} /> }
            <AudioVideoSetup />
        </div>
    );
};

export default MySquare;
