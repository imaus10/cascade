import React, { useState } from 'react';
import FileList from './FileList';
import Navigation from './Navigation';
import VideoGrid from './VideoGrid';
import Welcome from './Welcome';

const GreenRoom = () => {
    const [showWelcome, setShowWelcome] = useState(true);

    if (showWelcome) {
        return <Welcome onClick={() => setShowWelcome(false)} />;
    }

    return <>
        <VideoGrid />
        <Navigation />
        <FileList />
    </>;
};

export default GreenRoom;
