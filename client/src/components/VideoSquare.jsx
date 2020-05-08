import React, { useCallback, useContext } from 'react';
import { Context } from './Store';

const VideoSquare = ({ id, muted, stream }) => {
    const [state, dispatch] = useContext(Context);
    const { order } = state;
    const flexOrder = order.findIndex((otherId) => id === otherId);
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
    return stream && <video autoPlay muted={muted} ref={videoRef} style={{ order : flexOrder }} />;
};

export default VideoSquare;
