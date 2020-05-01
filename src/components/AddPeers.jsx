import React, { useContext, useState } from 'react';
import AddPeer from './AddPeer';
import { Context } from './Store';
import './AddPeers.css';

const AddPeers = () => {
    const [state] = useContext(Context);
    const { initiator } = state;
    const [pendingConnections, setPendingConnections] = useState([
        <AddPeer key={0} />
    ]);

    const addNewConnection = () => {
        setPendingConnections([
            ...pendingConnections,
            <AddPeer key={pendingConnections.length} />
        ]);
    };

    return (
        <div className="pending-connections">
            { pendingConnections }
            { initiator &&
                <button onClick={addNewConnection}>Invite another friend</button> }
        </div>
    );
};

export default AddPeers;
