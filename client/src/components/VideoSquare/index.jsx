import React, { useCallback, useContext } from 'react';
import AudioVideoSetup from './AudioVideoSetup';
import { Context } from '../Store';

const VideoSquare = ({ id, isMe, stream }) => {
    const [state, dispatch] = useContext(Context);
    const { order } = state;
    const videoRef = useCallback((node) => {
        if (node) {
            if ('srcObject' in node) {
                node.srcObject = stream;
            } else {
                node.src = URL.createObjectURL(stream);
            }
            // The video element must be available elsewhere
            // to set audio output via setSinkId().
            if (isMe) {
                dispatch({
                    type         : 'VIDEO_ELEMENT_SET',
                    videoElement : node
                });
            }
        }
    }, [stream]);

    const number = order.findIndex((otherId) => id === otherId) + 1;
    const style = {
        order    : number,
        position : 'relative'
    };
    if (isMe) {
        style.display = 'flex';
        style.flexDirection = 'column';
    }
    const numberStyle = {
        left     : 0,
        position : 'absolute',
        top      : 0
    };

    return (
        <div style={style}>
            { stream && <video autoPlay muted={isMe} ref={videoRef} /> }
            { isMe && <AudioVideoSetup /> }
            { stream && <span style={numberStyle}>{number}</span> }
        </div>
    );
};

export default VideoSquare;
