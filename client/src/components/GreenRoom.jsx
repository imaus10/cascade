import React, { useContext, useState } from 'react';
import { Context } from './Store';
import VideoSquare from './VideoSquare';
import Welcome from './Welcome';

const GreenRoom = () => {
    const [state] = useContext(Context);
    console.log('STATE', state);
    const { iAmInitiator, myId, myStream, order, streams } = state;
    const [ready, setReady] = useState(false);

    // Order comes from the server -
    // but before connecting to the server, there is still 1 participant!
    const numParticipants = order.length || 1;
    // Add a new row when the number of participants exceeds the perfect square
    // (2-4 partcipants have two columns, 5-9 have three columns, 10-16 have four columns, etc)
    const cols = Math.ceil(Math.sqrt(numParticipants));
    const rows = Math.ceil(numParticipants / cols);
    const colPct = 100 / cols;
    const rowPct = 100 / rows;
    const gridStyles = {
        display             : 'grid',
        flex                : 1, // Fill the space above nav
        gridTemplateColumns : `repeat(${cols}, ${colPct}%)`,
        gridTemplateRows    : `repeat(${cols}, ${rowPct}%)`,
    };

    return <>
        <main style={gridStyles}>
            { ready && <VideoSquare isMe id={myId} numColumns={cols} stream={myStream} /> }
            { order.map((id) => {
                return id === myId ?
                    null :
                    <VideoSquare key={id} id={id} numColumns={cols} stream={streams[id]} />;
            }) }
        </main>
        <nav>
            { !ready && <Welcome onClick={() => setReady(true)} /> }
            { ready && iAmInitiator && order.length > 1 &&
                <button className="big-go-button">GO</button> }
        </nav>
    </>;
};

export default GreenRoom;
