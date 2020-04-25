import React, { useContext, useEffect, useState } from 'react';
import Peer from 'simple-peer';
import { Context } from './Store';

const AddPeer = () => {
    // Once connected, this component will simply render null.
    const [isConnected, setIsConnected] = useState(false);
    const [myConnectionString, setMyConnectionString] = useState('');
    const [theirConnectionString, setTheirConnectionString] = useState('');
    const [them, setThem] = useState(null);
    const [state, dispatch] = useContext(Context);
    const { initiator, myStream } = state;

    useEffect(() => {
        const peer = new Peer({
            initiator,
            stream  : myStream,
            // Set to false for now, because with true it sends multiple signals
            // (will need full signaling server to relay multiple signals)
            trickle : false
        });
        // Provides the connection string to send to remote peer
        peer.on('signal', (connectionInfo) => {
            setMyConnectionString(JSON.stringify(connectionInfo));
        });
        // When the remote peer is connected, stop displaying the form
        peer.on('connect', () => {
            setIsConnected(true);
        });
        // Receive audio/video stream from remote peer
        peer.on('stream', (stream) => {
            dispatch({
                type : 'PEER_STREAM_ADD',
                peer,
                stream
            });
        });
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
        connectionFields.push(myConnectionField, theirConnectionField, submitButton);
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
