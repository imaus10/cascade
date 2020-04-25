export const initialState = {
    initiator   : window.location.hash === '#init',
    myStream    : null,
    peerStreams : {}
};

export default function reducer(state, action) {
    switch (action.type) {
        case 'MY_STREAM_SET':
            return {
                ...state,
                myStream: action.stream
            };
        case 'PEER_STREAM_ADD':
            return {
                ...state,
                peerStreams: {
                    ...state.peerStreams,
                    // The initiator sets the ID based on the stream.
                    // The invitees set it based on the initiator's stream ID values.
                    // The IDs have to be the same across machines so
                    // the initiator can relay values correctly.
                    [action.peerId || action.stream.id]: {
                        peer   : action.peer,
                        stream : action.stream
                    }
                }
            };
        default:
            return state;
    }
};
