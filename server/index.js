const { v4 : uuidv4 } = require('uuid');
const WebSocket = require('ws');

const server = new WebSocket.Server({ port : 8080 });

server.on('connection', (newClient) => {
    // For now, everybody's in one room.
    // TODO: group things into rooms.
    const id = uuidv4()
    newClient.id = id;
    newClient.order = server.clients.length;
    newClient.send(JSON.stringify({
        type  : 'id',
        forId : newClient.id
    }));

    const order = [...server.clients].sort((client1, client2) => client1.order - client2.order)
                                     .map((client) => client.id);
    server.clients.forEach((client) => {
        // Broadcast the new order of participants
        client.send(JSON.stringify({
            type : 'order',
            order
        }));
        if (client.id !== newClient.id) {
            // Broadcast to all the other clients asking for an offer.
            client.send(JSON.stringify({
                type   : 'signal',
                forId  : client.id,
                fromId : newClient.id,
                signal : 'initiate'
            }));
        }

    });

    // After that, just relay the signals back and forth.
    newClient.on('message', (data) => {
        const { forId, signal } = JSON.parse(data);
        server.clients.forEach((client) => {
            if (client.id === forId) {
                client.send(data);
            }
        });
    });

    // TODO: error handling, closing connections, etc.
});
