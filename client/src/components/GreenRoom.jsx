import React, { useContext, useState } from 'react';
import { Context } from './Store';
import VideoSquare from './VideoSquare';
import Welcome from './Welcome';
import { startCascade } from '../state/cascade-actions';
import { READY } from '../state/modes';

const GreenRoom = () => {
    const [state, dispatch] = useContext(Context);
    console.log('STATE', state);
    const { iAmInitiator, mode, myId, myStream, streams } = state;
    const [showWelcome, setShowWelcome] = useState(true);

    if (showWelcome) {
        return <Welcome onClick={() => setShowWelcome(false)} />;
    }

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

    return <>
        <main className="video-grid" style={gridStyles}>
            <VideoSquare id={myId} numColumns={cols} stream={myStream} />
            { Object.entries(streams).map(([id, stream]) =>
                <VideoSquare key={id} id={id} numColumns={cols} stream={stream} />
            ) }
        </main>
        <nav>
            { mode === READY && iAmInitiator && numParticipants > 1 &&
                <button
                    className="big-go-button"
                    onClick={() => startCascade(state, dispatch)}
                >
                    GO
                </button> }
        </nav>
    </>;
};

export default GreenRoom;
