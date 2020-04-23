import React, { useEffect, useState } from 'react';
import AddPeer from './AddPeer';

const AddPeers = (props) => {
    const initiator = window.location.hash === '#init';
    const [peerCount, setPeerCount] = useState(0);
    const [pendingConnections, setPendingConnections] = useState([]);

    const addNewConnection = () => {
        setPendingConnections([
            ...pendingConnections,
            <AddPeer key={peerCount} initiator={initiator} {...props} />
        ]);
        setPeerCount(peerCount + 1);
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
