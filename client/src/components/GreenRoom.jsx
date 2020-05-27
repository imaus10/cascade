import React, { useContext, useState } from 'react';
import FileList from './FileList';
import Navigation from './Navigation';
import { Context } from './Store';
import VideoGrid from './VideoGrid';
import Welcome from './Welcome';

const GreenRoom = () => {
    const [state] = useContext(Context);
    console.log('STATE', state);

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
