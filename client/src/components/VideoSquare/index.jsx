import React, { useContext, useRef, useState } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import AudioVideoSetup from './AudioVideoSetup';
import Countdown from './Countdown';
import Video from './Video';
import { Context } from '../Store';
import {
    CASCADE_DONE,
    CASCADE_RECORDING,
    CASCADE_STANDBY,
    READY
} from '../../state/actions/cascade';
import { serverSend } from '../../state/actions/server';

const VideoSquare = ({
    col,
    id,
    isMe,
    numColumns,
    orderNumber,
    row,
    stream
}) => {
    const [state, dispatch] = useContext(Context);
    const { iAmInitiator, mode, myId, order } = state;

    const dndRef = useRef(null);
    const [{ isDragging }, connectDrag] = useDrag({
        item    : { id, type : 'participant' },
        canDrag : () => iAmInitiator && [READY, CASCADE_DONE].includes(mode),
        collect : (monitor) => ({ isDragging : monitor.isDragging() })
    });
    const [, connectDrop] = useDrop({
        accept : 'participant',
        drop   : (item) => {
            serverSend({
                type   : 'ORDER_SET',
                fromId : myId,
                order,
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

    const style = {
        gridColumn : `${col} / span 1`,
        gridRow    : `${row} / span 1`,
        opacity    : isDragging ? 0.5 : 1,
    };
    const [videoWidth, setVideoWidth] = useState(0);
    const left = dndRef.current ?
        `${((1 - (videoWidth / dndRef.current.clientWidth)) * 100 / 2) + 1}%` :
        0;
    const orderNumberStyle = {
        backgroundColor : mode === CASCADE_STANDBY ? 'yellow' : (
            mode === CASCADE_RECORDING ? 'red' : 'green'
        ),
        left
    };

    return (
        <div ref={dndRef} className="video-draggable" style={style}>
            <Video id={id} isMe={isMe} setVideoWidth={setVideoWidth} stream={stream} />
            { isMe && <AudioVideoSetup right={left} /> }
            { orderNumber > 0 &&
                <span className="order-number" style={orderNumberStyle}>{orderNumber}</span> }
            { mode === CASCADE_STANDBY && isMe && iAmInitiator &&
                <Countdown /> }
        </div>
    );
};

export default VideoSquare;
