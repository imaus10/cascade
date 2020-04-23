import React, { useEffect, useState } from 'react';
import Peer from 'simple-peer';

const AddPeer = ({ addPeerStream, initiator, myStream }) => {
    // Once connected, this component will simply render null.
    const [isConnected, setIsConnected] = useState(false);
    const [myConnectionString, setMyConnectionString] = useState('');
    const [theirConnectionString, setTheirConnectionString] = useState('');
    const [them, setThem] = useState(null);

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
        // When the remote peer is connected
        peer.on('connect', () => {
            setIsConnected(true);
        });
        // Receive data from the remote peer
        peer.on('data', (data) => {
            console.log('received data: ', data.toString());
        });
        // Receive audio/video stream from remote peer
        peer.on('stream', (stream) => {
            addPeerStream({
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
