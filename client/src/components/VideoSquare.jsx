import React, { useCallback, useContext } from 'react';
import { Context } from './Store';

const VideoSquare = ({ isMe, stream }) => {
    const [, dispatch] = useContext(Context);
    const videoRef = useCallback((node) => {
        if (node) {
            if ('srcObject' in node) {
                node.srcObject = stream;
            } else {
                node.src = URL.createObjectURL(stream);
            }
            // The video element must be available elsewhere
            // to set audio output via setSinkId().
            dispatch({
                type         : 'VIDEO_ELEMENT_SET',
                videoElement : node
            });
        }
    }, [stream]);
    return stream && <video autoPlay muted={isMe} ref={videoRef} />;
};

export default VideoSquare;
