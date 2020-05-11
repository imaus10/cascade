import { useContext, useEffect } from 'react';
import { Context } from './Store';
import usePrevious from '../state/use-previous';

const ServerProvider = ({ children }) => {
    const [state, dispatch] = useContext(Context);
    const { myStream } = state;
    const prevMyStream = usePrevious(myStream);
    const params = new URLSearchParams(window.location.search);
    const serverURL = params.get('server');
    useEffect(() => {
        // Start the server connection only when myStream is first initiated
        if (myStream && !prevMyStream && serverURL) {
            // We set the server connection here because
            // we need access to dispatch in the event listeners.
            const server = new WebSocket(serverURL);
            server.addEventListener('close', () => console.log('closing socket'));
            server.addEventListener('error', () => console.log('socket error'));
            server.addEventListener('open', () => console.log('opening socket'));
            server.addEventListener('message', ({ data }) => {
                // Messages from the server are simply actions for the reducer.
                dispatch({
                    ...JSON.parse(data),
                    // Weird, but we gotta pass this so Peers can trigger
                    // dispatches in response to events that haven't happened yet
                    dispatch
                });
            });
            dispatch({
                type : 'SERVER_SET',
                server
            });
            // TODO: handle failed connection
        }
    }, [myStream, prevMyStream, serverURL]);

    if (!serverURL) {
        return "You have to have a server. Sorry, that's just the way it is.";
    }

    return children;
};

export default ServerProvider;
