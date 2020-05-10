import Peer from 'simple-peer';

export function handleServerMessage(state, action) {
    const { myStream, peers, server } = state;
    // Sending dispatch in the action is kind of a hack...
    const { data, dispatch } = action;
    const {
        forId  : myId,
        fromId : theirId,
        order,
        signal : receiveSignal,
        type
    } = JSON.parse(data);
    if (type === 'id') {
        dispatch({
            type : 'MY_ID_SET',
            id   : myId,
        });
    } else if (type === 'order') {
        dispatch({
            type : 'ORDER_SET',
            order
        });
    } else if (type === 'signal') {
        const initiator = receiveSignal === 'initiate';
        const isNewPeer = !Object.keys(peers).includes(theirId);
        const peer = isNewPeer ?
            new Peer({
                initiator,
                stream : myStream,
            }) :
            peers[theirId];
        if (isNewPeer) {
            peer.on('signal', (signal) => {
                sendToServer(server, {
                    type   : 'signal',
                    forId  : theirId,
                    fromId : myId,
                    signal
                });
            });
            peer.on('stream', (theirStream) => {
                dispatch({
                    type   : 'STREAMS_ADD',
                    id     : theirId,
                    stream : theirStream
                });
            });
        }

        if (!initiator) {
            peer.signal(receiveSignal);
        }

        if (isNewPeer) {
            return {
                ...state,
                peers : {
                    ...peers,
                    [theirId] : peer
                }
            };
        }
    }

    return state;
}

export function sendToServer(server, data) {
    server.send(JSON.stringify(data));
}
