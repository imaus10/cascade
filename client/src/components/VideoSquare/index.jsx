import React, { useCallback, useContext, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import AudioVideoSetup from './AudioVideoSetup';
import { Context } from '../Store';

const VideoSquare = ({ id, isMe, numColumns, stream }) => {
    const [state, dispatch] = useContext(Context);
    const { iAmInitiator, myId, order } = state;

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
                id,
                videoElement : node
            });
        }
    }, [stream]);

    const dndRef = useRef(null);
    const [{ isDragging }, connectDrag] = useDrag({
        item    : { id, type : 'participant' },
        canDrag : () => iAmInitiator,
        collect : (monitor) => ({ isDragging : monitor.isDragging() })
    });
    const [, connectDrop] = useDrop({
        accept : 'participant',
        drop   : (item) => {
            dispatch({
                type       : 'SERVER_SEND',
                sendAction : {
                    type   : 'ORDER_SET',
                    fromId : myId,
                    order,
                }
            });
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

    const orderNumber = order.findIndex((otherId) => id === otherId) + 1;
    const row = Math.ceil(orderNumber / numColumns);
    const numBeforeRow = (row - 1) * numColumns;
    const col = orderNumber - numBeforeRow;
    const gridStyle = {
        gridColumn : `${col} / span 1`,
        gridRow    : `${row} / span 1`,
        opacity    : isDragging ? 0.5 : 1,
        position   : 'relative'
    };

    return (
        <div ref={dndRef} style={gridStyle}>
            { stream && <video autoPlay muted={isMe} ref={videoRef} /> }
            { isMe && <AudioVideoSetup /> }
            { orderNumber > 0 && <span className="order-number">{orderNumber}</span> }
        </div>
    );
};

export default VideoSquare;
