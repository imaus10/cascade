import React, { useContext, useEffect } from 'react';
import { Context } from './Store';
import VideoSquare from './VideoSquare';
import usePrevious from '../state/use-previous';

const GreenRoom = () => {
    const [state, dispatch] = useContext(Context);
    console.log('STATE', state);
    const { iAmInitiator, myId, myStream, order, streams } = state;
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

    // Order comes from the server -
    // but before connecting to the server, there is still 1 participant!
    const numParticipants = order.length || 1;
    // Add a new row when the number of participants exceeds the perfect square
    // (2-4 partcipants have two columns, 5-9 have three columns, 10-16 have four columns, etc)
    const cols = Math.ceil(Math.sqrt(numParticipants));
    const rows = Math.ceil(numParticipants / cols);
    const colPct = 100 / cols;
    const rowPct = 100 / rows;
    const gridStyles = {
        display             : 'grid',
        flex                : 1, // Fill the space above nav
        gridTemplateColumns : `repeat(${cols}, ${colPct}%)`,
        gridTemplateRows    : `repeat(${cols}, ${rowPct}%)`,
    };

    const streamEntries = Object.entries(streams);
    return <>
        <main style={gridStyles}>
            <VideoSquare isMe id={myId} numColumns={cols} stream={myStream} />
            { streamEntries.map(([id, stream]) => {
                return <VideoSquare key={id} id={id} numColumns={cols} stream={stream} />;
            }) }
        </main>
        <nav>
            { iAmInitiator && streams.length > 0 &&
                <button className="big-go-button">GO</button> }
        </nav>
    </>;
};

export default GreenRoom;
