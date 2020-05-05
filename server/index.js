const { v4 : uuidv4 } = require('uuid');
const WebSocket = require('ws');

const server = new WebSocket.Server({ port : 8080 });

server.on('connection', (newClient) => {
    // For now, everybody's in one room.
    // TODO: group things into rooms.
    const id = uuidv4()
    newClient.id = id;
    console.log(`new connection opened: ${newClient.id}`);

    // The first signal is to broadcast to
    // all the other clients asking for an offer.
    server.clients.forEach((client) => {
        if (client.id !== newClient.id) {
            console.log(`sending initiate action to ${client.id}`);
            client.send(JSON.stringify({
                forId  : client.id,
                fromId : newClient.id,
                signal : 'initiate'
            }));
        }
    });

    // After that, just relay the signals back and forth.
    newClient.on('message', (data) => {
        console.log('received message:', data);
        const { forId, signal } = JSON.parse(data);
        server.clients.forEach((client) => {
            if (client.id === forId) {
                client.send(data);
            }
        });
    });

    // TODO: error handling, closing connections, etc.
});
