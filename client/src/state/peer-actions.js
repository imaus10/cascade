import Peer from 'simple-peer';

export function makeNewPeer(initiator, newId, state, dispatch) {
    const { myId, myStream } = state;
    const peer = new Peer({
        initiator,
        stream : myStream,
    });
    peer.on('signal', (signal) => {
        dispatch({
            type       : 'SERVER_SEND',
            sendAction : {
                type   : 'PEER_SIGNAL',
                forId  : newId,
                fromId : myId,
                signal
            }
        });
    });
    peer.on('stream', (theirStream) => {
        dispatch({
            type   : 'STREAMS_ADD',
            id     : newId,
            stream : theirStream
        });
    });
    dispatch({
        type : 'PEERS_ADD',
        id   : newId,
        peer
    });
    return peer;
}

export function handlePeerSignal(state, action) {
    const { peers } = state;
    const {
        dispatch,
        fromId : theirId,
        signal : receiveSignal
    } = action;
    const existingPeer = peers[theirId];
    const peer = existingPeer || makeNewPeer(false, theirId, state, dispatch);
    peer.signal(receiveSignal);
}
