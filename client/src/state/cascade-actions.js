import { MODES } from './reducer';

export default function startCascade(state, dispatch) {
    const { myId, myStream, peers } = state;
    // dispatch MODE_SET and broadcast via server
    // (server sets lock on new participants)
    const modeSetAction = {
        type   : 'MODE_SET',
        fromId : myId,
        mode   : MODES.CASCADE_STANDBY
    };
    dispatch(modeSetAction);
    // dispatch({
    //     type       : 'SERVER_SEND',
    //     sendAction : modeSetAction,
    //     fromId     : myId
    // });

    // Stop streaming
    Object.values(peers).forEach((peer) => {
        peer.removeStream(myStream);
    });

    // Initiator gets countdown
    // Start recording audio/video
    // Add stream back to next recipient
    // Multiple streams? Multiple tracks in a stream?
}
