import React, { useCallback, useContext, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import AudioVideoSetup from './AudioVideoSetup';
import { Context } from '../Store';

const VideoSquare = ({ id, isMe, numColumns, stream }) => {
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
                    id,
                    videoElement : node
                });
            }
        }
    }, [stream]);

    const dndRef = useRef(null);
    const [{ isDragging }, connectDrag] = useDrag({
        item    : { id, type : 'participant' },
        collect : (monitor) => ({ isDragging : monitor.isDragging() })
    });
    const [, connectDrop] = useDrop({
        accept : 'participant',
        drop   : (item) => {
            dispatch({ type : 'ORDER_SEND' });
        },
        hover  : ({ id : hoveredOverId }) => {
            if (hoveredOverId !== id) {
                const myIndex = order.indexOf(id);
                const theirIndex = order.indexOf(hoveredOverId);
                const newOrder = [...order];
                newOrder[myIndex] = hoveredOverId;
                newOrder[theirIndex] = id;
                dispatch({
                    type  : 'ORDER_SET',
                    order : newOrder
                });
            }
        }
    });
    connectDrag(dndRef);
    connectDrop(dndRef);

    const cascadeOrder = order.findIndex((otherId) => id === otherId) + 1;
    const row = Math.ceil(cascadeOrder / numColumns);
    const numBeforeRow = (row - 1) * numColumns;
    const col = cascadeOrder - numBeforeRow;
    const style = {
        gridColumn : `${col} / span 1`,
        gridRow    : `${row} / span 1`,
        opacity    : isDragging ? 0.5 : 1,
        position   : 'relative'
    };
    const numberStyle = {
        left     : 0,
        position : 'absolute',
        top      : 0
    };

    return (
        <div ref={dndRef} style={style}>
            { stream && <video autoPlay muted={isMe} ref={videoRef} /> }
            { isMe && <AudioVideoSetup /> }
            { stream && <span style={numberStyle}>{cascadeOrder}</span> }
        </div>
    );
};

export default VideoSquare;
