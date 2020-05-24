import React, { useCallback, useContext, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import AudioVideoSetup from './AudioVideoSetup';
import Countdown from './Countdown';
import { Context } from '../Store';
import usePrevious from '../../state/use-previous';
import { CASCADE_DONE, CASCADE_RECORDING, CASCADE_STANDBY, READY } from '../../state/modes';
import { setPlayLatency } from '../../state/actions/recording';
import { serverSend } from '../../state/actions/server';

const VideoSquare = ({ id, numColumns, stream }) => {
    const [state, dispatch] = useContext(Context);
    const { audioOutput, iAmInitiator, mode, myId, order } = state;
    const isMe = id === myId;
    const prevStream = usePrevious(stream);
    const prevAudioOutput = usePrevious(audioOutput);

    const videoRef = useCallback((node) => {
        if (node) {
            if (stream !== prevStream) {
                if ('srcObject' in node) {
                    node.srcObject = stream;
                } else {
                    node.src = URL.createObjectURL(stream);
                }
                if (!isMe) {
                    node.addEventListener('play', () => {
                        setPlayLatency(id);
                    });
                }
            }

            if (audioOutput && audioOutput !== prevAudioOutput) {
                // TODO: check if available, alert user if not
                // (Firefox needs setting enabled)
                // (Safari is ?)
                node.setSinkId(audioOutput);
            }
        }
    }, [audioOutput, stream]);

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

    const orderNumber = order.indexOf(id) + 1;
    const row = Math.ceil(orderNumber / numColumns);
    const numBeforeRow = (row - 1) * numColumns;
    const col = orderNumber - numBeforeRow;
    const gridStyle = {
        gridColumn : `${col} / span 1`,
        gridRow    : `${row} / span 1`,
        opacity    : isDragging ? 0.5 : 1,
    };
    const orderNumberStyle = {
        backgroundColor : mode === CASCADE_STANDBY ? 'yellow' : (
            mode === CASCADE_RECORDING ? 'red' : 'green'
        )
    };

    return (
        <div ref={dndRef} className="video-draggable" style={gridStyle}>
            { stream && <video autoPlay muted={isMe} ref={videoRef} /> }
            { isMe && <AudioVideoSetup /> }
            { orderNumber > 0 &&
                <span className="order-number" style={orderNumberStyle}>{orderNumber}</span> }
            { mode === CASCADE_STANDBY && isMe && iAmInitiator &&
                <Countdown /> }
        </div>
    );
};

export default VideoSquare;
