import React, { useContext, useEffect } from 'react';
import { Context } from './Store';
import VideoSquare from './VideoSquare';
import './GreenRoom.css';
import usePrevious from '../state/use-previous';

const GreenRoom = () => {
    const [state, dispatch] = useContext(Context);
    console.log('STATE', state);
    const { myId, myStream, streams } = state;
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
                dispatch({
                    type : 'SERVER_MESSAGE',
                    data,
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

    return (
        <main className="videos">
            <VideoSquare isMe id={myId} stream={myStream} />
            { Object.entries(streams).map(([id, stream]) => {
                return <VideoSquare key={id} id={id} stream={stream} />;
            }) }
        </main>
    );
};

export default GreenRoom;
