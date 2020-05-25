import React, { useContext } from 'react';
import { Context } from './Store';
import VideoSquare from './VideoSquare';

const VideoGrid = () => {
    const [state] = useContext(Context);
    console.log('STATE', state);
    const { myId, myStream, order, streams } = state;

    const numParticipants = Object.values(streams).length + 1;
    // Add a new row when the number of participants exceeds the perfect square
    // (2-4 partcipants have two columns, 5-9 have three columns, 10-16 have four columns, etc)
    const cols = Math.ceil(Math.sqrt(numParticipants));
    const rows = Math.ceil(numParticipants / cols);
    const colPct = 100 / cols;
    const rowPct = 100 / rows;
    const gridStyles = {
        gridTemplateColumns : `repeat(${cols}, ${colPct}%)`,
        gridTemplateRows    : `repeat(${cols}, ${rowPct}%)`,
    };

    const getOrderProps = (id) => {
        const orderNumber = order.indexOf(id) + 1;
        const row = Math.ceil(orderNumber / cols);
        const numBeforeRow = (row - 1) * cols;
        const col = orderNumber - numBeforeRow;
        return {
            col,
            orderNumber,
            row
        };
    };

    return (
        <main className="video-grid" style={gridStyles}>
            <VideoSquare id={myId} stream={myStream} {...getOrderProps(myId)} />
            { Object.entries(streams).map(([id, stream]) =>
                <VideoSquare key={id} id={id} stream={stream} {...getOrderProps(id)} />
            ) }
        </main>
    );
};

export default VideoGrid;
