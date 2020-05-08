import Peer from 'simple-peer';

export const initialState = {
    myId         : null,
    myStream     : null,
    order        : [],
    peers        : {},
    server       : null,
    streams      : {},
    videoElement : null
};

function replacePeerStreams(state, action) {
    const { myStream : oldStream, peers } = state;
    const { stream : newStream } = action;
    Object.values(peers).forEach((peer) => {
        peer.removeStream(oldStream)
        peer.addStream(newStream);
    });
}

function handleServerMessage(state, action) {
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
                server.send(JSON.stringify({
                    type   : 'signal',
                    forId  : theirId,
                    fromId : myId,
                    signal
                }));
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

// This reducer is not quite a pure function and I'm not sorry about it.
// The SERVER_MESSAGE action will sometimes not mutate state but just call peer.signal().
// Basically I'm hijacking the reducer to get the current state
// when a message is received from the server.
export default function reducer(state, action) {
    console.log('ACTION', action);
    const { streams } = state;
    switch (action.type) {
        case 'MY_ID_SET':
            return {
                ...state,
                myId : action.id
            };
        case 'MY_STREAM_SET': {
            replacePeerStreams(state, action);
            return {
                ...state,
                myStream : action.stream
            };
        }
        case 'ORDER_SET':
            return {
                ...state,
                order : action.order
            };
        case 'SERVER_MESSAGE':
            return handleServerMessage(state, action)
        case 'SERVER_SET':
            return {
                ...state,
                server : action.server
            };
        case 'STREAMS_ADD':
            return {
                ...state,
                streams : {
                    ...streams,
                    // This ID matches the peer ID
                    [action.id] : action.stream,
                }
            };
        case 'VIDEO_ELEMENT_SET':
            return {
                ...state,
                videoElement : action.videoElement
            };
        default: {
            console.error('Unknown action:', action);
            return state;
        }
    }
};
