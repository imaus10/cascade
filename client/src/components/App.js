import React from 'react';
import { DndProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import GreenRoom from './GreenRoom';
import ServerProvider from './ServerProvider';
import Store from './Store';
import './App.css';

const App = () => {
    // TODO: Splash to explain what it is, button to enter green room.
    return (
        <Store>
            <ServerProvider>
                <DndProvider backend={HTML5Backend}>
                    <GreenRoom />
                </DndProvider>
            </ServerProvider>
        </Store>
    );
};

export default App;
