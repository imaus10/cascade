import React, { useContext, useEffect, useState } from 'react';
import AddPeer from './AddPeer';
import { Context } from './Store';

const AddPeers = () => {
    const [state] = useContext(Context);
    const { initiator } = state;
    const [pendingConnections, setPendingConnections] = useState([]);

    const addNewConnection = () => {
        setPendingConnections([
            ...pendingConnections,
            <AddPeer key={pendingConnections.length} />
        ]);
    };

    useEffect(() => {
        addNewConnection();
    }, []);

    return <>
        { pendingConnections }
        { initiator &&
            <button onClick={addNewConnection}>Invite another friend</button> }
    </>;
};

export default AddPeers;
