import React, { useContext, useEffect } from 'react';
import AudioVideoSetup from './AudioVideoSetup';
import { Context } from './Store';
import VideoSquare from './VideoSquare';
import './GreenRoom.css';
import usePrevious from '../state/use-previous';

const GreenRoom = () => {
    const [state, dispatch] = useContext(Context);
    console.log('STATE', state);
    const { myStream, streams } = state;
    const prevMyStream = usePrevious(myStream);

    const params = new URLSearchParams(window.location.search);
    const serverURL = params.get('signalServer');
    useEffect(() => {
        // Start the server connection only when myStream is first initiated
        if (myStream && !prevMyStream && serverURL) {
            // We set the server connection here because
            // we need access to dispatch in the event listeners.
            const signalServer = new WebSocket(serverURL);
            signalServer.addEventListener('close', () => console.log('closing socket'));
            signalServer.addEventListener('error', () => console.log('socket error'));
            signalServer.addEventListener('open', () => console.log('opening socket'));
            signalServer.addEventListener('message', ({ data }) => {
                console.log('message from server:', data);
                dispatch({
                    type : 'PEER_SIGNAL',
                    data,
                    dispatch
                });
            });
            dispatch({
                type : 'SIGNAL_SERVER_SET',
                signalServer
            });
            // TODO: handle failed connection
        }
    }, [myStream, prevMyStream, serverURL]);

    if (!serverURL) {
        return "You have to have a server. Sorry, that's just the way it is.";
    }

    return (
        <div className="videos">
            <div className="my-stream">
                { myStream && <VideoSquare stream={myStream} /> }
                <AudioVideoSetup />
            </div>
            { Object.entries(streams).map(([id, stream]) => {
                return <VideoSquare key={id} stream={stream} />;
            }) }
        </div>
    );
};

export default GreenRoom;
