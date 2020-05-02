import React, { useCallback } from 'react';

const VideoSquare = ({ muted = false, stream }) => {
    const videoRef = useCallback((node) => {
        if (node) {
            if ('srcObject' in node) {
                node.srcObject = stream;
            } else {
                node.src = URL.createObjectURL(stream);
            }
        }
    }, [stream]);
    return stream && <video autoPlay muted={muted} ref={videoRef} />;
};

export default VideoSquare;
