import React from 'react';
import GreenRoom from './GreenRoom';
import Store from './Store';
import './App.css';

const App = () => {
    // TODO: Splash to explain what it is, button to enter green room.
    return (
        <Store>
            <GreenRoom />
        </Store>
    );
};

export default App;
