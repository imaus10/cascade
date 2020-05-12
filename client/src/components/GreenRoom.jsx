import React, { useContext, useState } from 'react';
import { Context } from './Store';
import VideoSquare from './VideoSquare';
import Welcome from './Welcome';
import startCascade from '../state/cascade-actions';
import { MODES } from '../state/reducer';

const GreenRoom = () => {
    const [state, dispatch] = useContext(Context);
    console.log('STATE', state);
    const { iAmInitiator, mode, myId, myStream, streams } = state;
    const [showWelcome, setShowWelcome] = useState(true);

    if (showWelcome) {
        return <Welcome onClick={() => setShowWelcome(false)} />;
    }

    const getOtherStreams = () => {
        // During standby the streams are paused
        if (mode === MODES.CASCADE_STANDBY) return {};
        return streams;
    };
    const otherStreams = getOtherStreams();

    // Before connecting to the server, there is still 1 participant!
    const numParticipants = Object.values(otherStreams).length + 1;
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
            { <VideoSquare id={myId} numColumns={cols} stream={myStream} /> }
            { Object.entries(otherStreams).map(([id, stream]) =>
                <VideoSquare key={id} id={id} numColumns={cols} stream={stream} />
            ) }
        </main>
        <nav>
            { mode === MODES.READY && iAmInitiator && numParticipants > 1 &&
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
