import { changeMode } from './cascade';
import { checkForNewPeers, handlePeerSignal } from './peers';
import { handleServerPingPong } from './recording';
import { getState } from '../reducer';

export function serverSend(sendAction) {
    const { server } = getState();
    server.send(JSON.stringify(sendAction));
}

export function makeServer(serverURL, dispatch) {
    // We set the server connection here because
    // we need access to dispatch in the event listeners.
    const server = new WebSocket(serverURL);
    server.addEventListener('open', () => console.log('opening socket'));
    // TODO: handle failed connection
    server.addEventListener('close', () => console.log('closing socket'));
    server.addEventListener('error', () => console.log('socket error'));
    server.addEventListener('message', ({ data }) => {
        const action = JSON.parse(data);
        console.log('ACTION (from server):', action);
        // Some actions have side effects and should only happen once.
        // (a single dispatch can call the reducer multiple times)
        switch (action.type) {
            case 'MODE_SET':
                changeMode(action.mode, dispatch);
                break;
            case 'ORDER_SET':
                checkForNewPeers(action, dispatch);
                break;
            case 'PEER_SIGNAL':
                handlePeerSignal(action, dispatch);
                break;
            case 'ping':
            case 'pong':
                handleServerPingPong(action);
                break;
            default:
                // Otherwise, messages from the server
                // are simply actions for the reducer.
                dispatch(action);
        }
    });
    setInterval(() => {
        // Keep the connection alive
        serverSend({ type : 'ping' });
    }, 30000);
    dispatch({
        type : 'SERVER_SET',
        server
    });
}
