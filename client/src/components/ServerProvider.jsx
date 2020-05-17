import { useContext, useEffect } from 'react';
import { Context } from './Store';
import usePrevious from '../state/use-previous';
import { makeServer } from '../state/actions/server';

const ServerProvider = ({ children }) => {
    const [state, dispatch] = useContext(Context);
    const { myStream } = state;
    const prevMyStream = usePrevious(myStream);
    const params = new URLSearchParams(window.location.search);
    const serverURL = params.get('server');
    useEffect(() => {
        // Start the server connection only when myStream is first initiated
        if (myStream && !prevMyStream && serverURL) {
            makeServer(serverURL, dispatch);
        }
    }, [myStream, prevMyStream, serverURL]);

    if (!serverURL) {
        return "You have to have a server. Sorry, that's just the way it is.";
    }

    return children;
};

export default ServerProvider;
