import React, { useContext, useState } from 'react';
import { Context } from './Store';
import VideoGrid from './VideoGrid';
import Welcome from './Welcome';
import {
    CASCADE_DONE,
    CASCADE_RECORDING,
    READY,
    startCascade,
    stopCascade
} from '../state/actions/cascade';

const GreenRoom = () => {
    const [state, dispatch] = useContext(Context);
    const { files, iAmInitiator, mode, order } = state;
    const [showWelcome, setShowWelcome] = useState(true);

    if (showWelcome) {
        return <Welcome onClick={() => setShowWelcome(false)} />;
    }

    return <>
        <VideoGrid />
        <nav>
            { [READY, CASCADE_DONE].includes(mode) && iAmInitiator && order.length > 1 &&
                <button
                    className="big-button"
                    onClick={() => startCascade(dispatch)}
                >
                    GO
                </button> }
            { mode === CASCADE_RECORDING && iAmInitiator &&
                <button
                    className="big-button"
                    onClick={() => stopCascade(dispatch)}
                >
                    STOP
                </button> }
        </nav>
        <aside>
            { files.map((blobURL, index) =>
                <a
                    key={blobURL}
                    download={`cascade${index + 1}.webm`}
                    href={blobURL}
                >
                    Download cascade {index + 1} video
                </a>) }
        </aside>
    </>;
};

export default GreenRoom;
