import React, { useContext, useState } from 'react';
import { Context } from './Store';
import Navigation from './Navigation';
import VideoGrid from './VideoGrid';
import Welcome from './Welcome';

const GreenRoom = () => {
    const [state] = useContext(Context);
    const { files } = state;
    const [showWelcome, setShowWelcome] = useState(true);

    if (showWelcome) {
        return <Welcome onClick={() => setShowWelcome(false)} />;
    }

    return <>
        <VideoGrid />
        <Navigation />
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
