import Peer from 'simple-peer';

// Use this function to make Peers so we only have to change
// the options in one place if/when we enable trickling
export function makePeer(initiator, stream) {
    return new Peer({
        initiator,
        stream,
        // Set to false for now, because with true it sends multiple signals
        // (will need full signaling server to relay multiple signals)
        trickle : false
    });
}

export function peerSendJSON(peer, json) {
    peer.send(JSON.stringify(json));
}

export function relayConnections(peers, newId) {
    console.log(`adding peer ${newId}`);
    const oldPeers = Object.entries(peers).filter(([id, peer]) => peer.connected && id !== newId);
    oldPeers.forEach(([otherId, otherPeer]) => {
        console.log(`sending initiate action to peer ${otherId} for new peer ${newId}`);
        // This will start the ball rolling.
        // Then otherPeer will send an offer here,
        // which we can route to the right peer using forId.
        // That peer will make an answer and send it here,
        // which we again route back to otherPeer using fromId.
        peerSendJSON(otherPeer, {
            action : 'initiate',
            forId  : otherId,
            fromId : newId,
        });
    });
};

export function addRelayListeners(peer, state, dispatch) {
    const { initiator, myStream } = state;

    // The room creator just relays the actions
    const sendToPeer = (data) => {
        const { action, forId, fromId } = data;
        console.log(`relaying ${action} for ${forId} from ${fromId}`);
        dispatch({
            type : 'PEER_SEND',
            id   : forId,
            data
        });
    }

    // The invitees to the room have their connections to each other
    // handled by responding to actions relayed by the room creator,
    // who has already connected to all participants individually.
    const handlePeerAction = (data) => {
        const {
            action,
            forId  : myId,
            fromId : theirId,
            signal
        } = data;
        console.log(`receiving ${action} from ${theirId}`);
        // These actions generate either an offer or an answer
        // and should make a new peer
        if (action === 'initiate' || action === 'offer') {
            const shouldInitiate = action === 'initiate';
            const handledPeer = makePeer(shouldInitiate, myStream);
            handledPeer.on('signal', (sendSignal) => {
                const sendAction = shouldInitiate ? 'offer' : 'answer';
                console.log(`sending ${sendAction} for ${theirId}`);
                if (['offer', 'answer'].includes(sendSignal.type)) {
                    peerSendJSON(peer, {
                        action : sendAction,
                        forId  : theirId,
                        fromId : myId,
                        signal : sendSignal,
                    });
                } else {
                    // In practice, seeing { renegotiate: true } signal being
                    // emitted by the answerer, which we can apparently ignore
                    // TODO: send all signals? would need to check if peer exists
                    // before calling makePeer.
                    // (in reducer, if action is func, call it with state)
                    console.log('not sending unknown signal type');
                }
            });
            handledPeer.on('stream', (stream) => {
                dispatch({
                    type : 'STREAMS_ADD',
                    id   : theirId,
                    stream
                });
            });
            if (!shouldInitiate) {
                // Signal is the offer, generate an answer.
                handledPeer.signal(signal);
            }
            dispatch({
                type : 'PEERS_ADD',
                // This is the Peer._id sent from the initiator's machine.
                id   : theirId,
                peer : handledPeer
            });
        } else if (action === 'answer') {
            // The offer has received the answer, it just has to signal.
            console.log('signaling answer');
            dispatch({
                type : 'PEER_SIGNAL',
                id   : theirId,
                signal
            });
        }
    }

    peer.on('data', (data) => {
        const action = JSON.parse(data.toString());
        if (initiator) {
            sendToPeer(action);
        } else {
            handlePeerAction(action);
        }
    });
}

export function replacePeerStreams(peers, oldStream, newStream) {
    Object.values(peers).forEach((peer) => {
        peer.removeStream(oldStream)
        peer.addStream(newStream);
    });
}
