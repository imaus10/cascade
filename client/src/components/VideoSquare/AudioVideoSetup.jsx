import React, { useState } from 'react';
import InputOutputSelect from './InputOutputSelect';

const AudioVideoSetup = () => {
    const [showWelcome, setShowWelcome] = useState(true);

    const welcomeMessage = <>
        <div>Welcome. Let's make the connections.</div>
        <div>First, enable your audio and video. Before you click the button, put on headphones so there's no feedback!</div>
        <button onClick={() => setShowWelcome(false)}>
            Let's go!
        </button>
    </>;

    const afterWelcomeStyles = {
        bottom         : 0,
        justifyContent : 'space-between',
        position       : 'absolute'
    };
    const style = {
        alignItems    : 'center',
        display       : 'flex',
        flexDirection : showWelcome ? 'column' : 'row',
        ...(showWelcome ? {} : afterWelcomeStyles)
    };

    return (
        <section style={style}>
            { showWelcome ?
                welcomeMessage :
                <InputOutputSelect /> }
        </section>
    );
};

export default AudioVideoSetup;
