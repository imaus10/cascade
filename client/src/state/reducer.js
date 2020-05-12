import { handlePeerSignal, makeNewPeer } from './peer-actions';

export const initialState = {
    // This needs to be stored here so all video elements output sound to the same place.
    audioOutput   : null,
    // The initiator is whoever is in the first spot.
    // They have all the power. They get to rearrange the order of the cascade.
    // And they press the big GO button.
    iAmInitiator  : false,
    // UUID generated by the server
    myId          : null,
    // MediaStream object containing audio/video
    myStream      : null,
    // The order of the participants - how the audios cascades
    order         : [],
    // Direct connections to other participants via WebRTC that provide the streams
    // Keys are the server-generated IDs
    peers         : {},
    // WebSocket server connection to send the initial WebRTC signals (and a biiiit more after)
    server        : null,
    // MediaStream objects for remote peers
    // Keys are the server-generated IDs
    streams       : {},
};

// This reducer is not quite a pure function and I'm not sorry about it.
// Some actions will not mutate state but just
// message the server, send data to Peers, etc.
// Basically I'm hijacking the reducer to get
// the current state in response to events.
export default function reducer(state, action) {
    console.log('ACTION', action);
    const { myId, peers, server, streams } = state;
    switch (action.type) {
        case 'AUDIO_OUTPUT_SET':
            return {
                ...state,
                audioOutput : action.deviceId
            };
        case 'MY_ID_SET':
            return {
                ...state,
                myId : action.id
            };
        case 'MY_STREAM_SET':
            return {
                ...state,
                myStream : action.stream
            };
        case 'ORDER_SET': {
            const { order : newOrder } = action;
            const myOrderIndex = newOrder.findIndex((otherId) => myId === otherId);
            const iAmInitiator = myOrderIndex === 0;
            return {
                ...state,
                iAmInitiator,
                order : newOrder
            };
        }
        case 'PEER_SIGNAL': {
            handlePeerSignal(state, action);
            return state;
        }
        case 'PEERS_ADD':
            return {
                ...state,
                peers : {
                    ...peers,
                    [action.id] : action.peer
                }
            };
        case 'PEERS_NEW': {
            const { dispatch, id : newId} = action;
            // Makes the initiator peer and dispatches PEERS_ADD
            makeNewPeer(true, newId, state, dispatch);
            return state;
        }
        case 'SERVER_SEND': {
            server.send(JSON.stringify(action.sendAction));
            return state;
        }
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
        default: {
            console.error('Unknown action:', action);
            return state;
        }
    }
};
