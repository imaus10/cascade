import { CASCADE_RECORDING, CASCADE_STANDBY } from './modes';

function getNextId(state) {
    const { myId, order } = state;
    const nextIndex = order.indexOf(myId) + 1;
    return order[nextIndex];
}

export function startCascade(state, dispatch) {
    const { myId } = state;
    // dispatch MODE_SET and broadcast via server
    // (server will set lock on new participants)
    const modeSetAction = {
        type   : 'MODE_SET',
        fromId : myId,
        mode   : CASCADE_STANDBY
    };
    dispatch(modeSetAction);
    dispatch({
        type       : 'SERVER_SEND',
        sendAction : modeSetAction
    });
}

export function handleModeChange(newMode, state) {
    const newState = {
        ...state,
        mode : newMode,
    };
    if (newMode === CASCADE_STANDBY) {
        stopStreaming(state);
        newState.streams = {};
    } else if (newMode === CASCADE_RECORDING) {
        sendStreams(state);
    }
    return newState;
}

function stopStreaming(state) {
    const { myStream, peers } = state;
    Object.values(peers).forEach((peer) => {
        peer.removeStream(myStream);
    });
}

function sendStreams(state) {
    const { myId, myStream, order, peers, streams } = state;
    const nextId = getNextId(state);
    if (nextId) {
        const nextPeer = peers[nextId];
        const myIndex = order.indexOf(myId);
        const myTracks = myStream.getTracks();
        const otherTracks = order.slice(0, myIndex).reduce((accumulator, id) => {
            return [
                ...accumulator,
                ...streams[id].getTracks()
            ];
        }, []);
        const tracks = [
            ...otherTracks,
            ...myTracks
        ];
        // TODO: how to provide order?
        // Maybe could add tracks one by one in a particular order?
        // Is that guaranteed to be received in the same order?
        // Will there be sync issues? Let's keep it TODO til we need do.
        const cascadeStream = new MediaStream(tracks);
        console.log('sending stream:', cascadeStream);
        console.log('tracks:', tracks);
        // Cascade the streams
        nextPeer.addStream(cascadeStream);
    }
}
