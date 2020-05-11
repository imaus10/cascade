import React from 'react';

const Welcome = ({ onClick }) => {
    return <>
        <div>Welcome. Let's make the connections.</div>
        <div>First, enable your audio and video. Before you click the button, put on headphones so there's no feedback!</div>
        <button onClick={onClick}>
            Let's go!
        </button>
    </>;
};

export default Welcome;
