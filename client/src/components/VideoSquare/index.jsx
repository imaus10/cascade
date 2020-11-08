import React, { useContext, useEffect, useRef, useState } from 'react';
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

    // This ridiculousness is to make the order number &
    // settings button hover over the video
    const [videoAspectRatio, setVideoAspectRatio] = useState(null);
    const [left, setLeft] = useState(0);
    const [top, setTop] = useState(0);
    useEffect(() => {
        const element = dndRef.current;
        if (element && videoAspectRatio) {
            const videoResizeObserver = new ResizeObserver((entries) => {
                entries.forEach((entry) => {
                    const { width, height } = entry.contentRect;
                    // Try to fill height
                    let videoHeight = height;
                    let videoWidth = videoHeight * videoAspectRatio;
                    // If width overflows, fill width
                    if (videoWidth > width) {
                        videoWidth = width;
                        videoHeight = videoWidth / videoAspectRatio;
                    }
                    setLeft((width - videoWidth) / 2);
                    setTop((height - videoHeight) / 2);
                });
            });
            videoResizeObserver.observe(element);
            return () => {
                videoResizeObserver.disconnect();
            };
        }
    }, [videoAspectRatio]);
    const showOrderNumber = orderNumber > 0 && videoAspectRatio && dndRef.current;
    const orderNumberStyle = {
        backgroundColor : mode === CASCADE_STANDBY ? 'yellow' : (
            mode === CASCADE_RECORDING ? 'red' : 'green'
        ),
        left            : `calc(${left}px + 1%)`,
        top             : `calc(${top}px + 1%)`
    };
    const settingsButtonStyle = {
        right : orderNumberStyle.left,
        top   : orderNumberStyle.top
    };

    return (
        <div ref={dndRef} className="video-draggable" style={style}>
            <Video id={id} isMe={isMe} setVideoAspectRatio={setVideoAspectRatio} stream={stream} />
            { isMe && <AudioVideoSetup style={settingsButtonStyle} /> }
            { showOrderNumber &&
                <span className="order-number" style={orderNumberStyle}>{orderNumber}</span> }
            { /*mode === CASCADE_STANDBY && isMe && iAmInitiator &&
                <Countdown />*/ }
        </div>
    );
};

export default VideoSquare;
