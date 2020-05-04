import React, { useContext, useEffect, useState } from 'react';
import { Context } from './Store';
import { addRelayListeners, makePeer } from '../state/events';

const AddPeer = () => {
    const [state, dispatch] = useContext(Context);
    const { initiator, myStream } = state;
    const [isConnected, setIsConnected] = useState(false);
    const [myConnectionString, setMyConnectionString] = useState('');
    const [theirConnectionString, setTheirConnectionString] = useState('');
    const [them, setThem] = useState(null);

    useEffect(() => {
        const peer = makePeer(initiator, myStream);
        // Provides the connection string to send to remote peer
        peer.on('signal', (connectionInfo) => {
            setMyConnectionString(JSON.stringify(connectionInfo));
        });
        // When the remote peer is connected
        peer.on('connect', () => {
            // Stop displaying the form
            setIsConnected(true);
            if (initiator) {
                // Automatically route signals between invitees
                dispatch({
                    type : 'PEER_RELAY',
                    id   : peer._id,
                });
            }
        });
        // Receive audio/video stream from remote peer
        peer.on('stream', (stream) => {
            dispatch({
                type : 'STREAMS_ADD',
                id   : peer._id,
                stream
            });
        });
        peer.on('error', (error) => {
            console.error('Peer error:', error);
        });
        addRelayListeners(peer, state, dispatch);
        dispatch({
            type : 'PEERS_ADD',
            // The ID of the direct connections won't match across machines, but
            // that doesn't matter because no signals need to be routed for them.
            id   : peer._id,
            peer
        });
        // Save the peer for this component so we can signal on form submit
        setThem(peer);
    }, []);

    if (isConnected) return null;

    const connectToOther = (event) => {
        event.preventDefault();
        them.signal(JSON.parse(theirConnectionString));
    };

    // Form logic is different if you're the initiator of the offer
    // or responding to the offer with an answer
    const myConnectionLabel = initiator ?
        'Send this connection info to your friend' :
        'Reply to your friend with your connection info';
    const theirConnectionLabel = initiator ?
        'Your friend should reply with their own connection info, paste it here' :
        'Paste the connection info sent from your friend here';
    const myConnectionField = <label key="my-connection">
        { myConnectionLabel }:
        <textarea readOnly value={myConnectionString} />
    </label>;
    const theirConnectionField = <label key="their-connection">
        { theirConnectionLabel }:
        <textarea
            onChange={(event) => setTheirConnectionString(event.target.value)}
            value={theirConnectionString}
        />
    </label>;
    const submitButton = <input key="connect" type="submit" value="Connect!" />;
    const connectionFields = [];
    if (initiator) {
        if (myConnectionString) {
            connectionFields.push(myConnectionField, theirConnectionField, submitButton);
        } else {
            connectionFields.push('Generating connection info...');
        }
    } else {
        connectionFields.push(theirConnectionField, submitButton);
        // The responder has to hit connect first to generate their answer
        if (myConnectionString) {
            connectionFields.push(myConnectionField);
        }
    }

    return <form onSubmit={connectToOther}>
        { connectionFields }
    </form>;
};

export default AddPeer;
