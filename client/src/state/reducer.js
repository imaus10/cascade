import { peerSendJSON, relayConnections } from './events';

export const initialState = {
    initiator    : window.location.hash === '#init',
    myStream     : null,
    peers        : {},
    streams      : {},
    videoElement : null
};

// This reducer is not a pure function and I'm not sorry about it.
// The PEER (singular) actions don't mutate state but just call Peer functions.
// That's because when the events are triggered,
// we need the most recent state provided in this reducer.
export default function reducer(state, action) {
    console.log('ACTION', action);
    const { peers, streams } = state;
    switch (action.type) {
        case 'MY_STREAM_SET':
            return {
                ...state,
                myStream : action.stream
            };
        case 'PEER_RELAY': {
            const { id } = action;
            relayConnections(peers, id);
            return state;
        }
        case 'PEER_SEND': {
            const { id, data } = action;
            peerSendJSON(peers[id], data);
            return state;
        }
        case 'PEER_SIGNAL': {
            const { id, signal } = action;
            peers[id].signal(signal);
            return state;
        }
        case 'PEERS_ADD':
            return {
                ...state,
                peers : {
                    ...peers,
                    // This ID should match on all machines so the initiator
                    // can relay signals between invitees automatically.
                    // It's initially set as Peer._id on the initiator's machine.
                    [action.id] : action.peer
                }
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
        default:
            return state;
    }
};
