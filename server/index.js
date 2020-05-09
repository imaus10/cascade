const { v4 : uuidv4 } = require('uuid');
const WebSocket = require('ws');

const server = new WebSocket.Server({ port : 8080 });
let order = [];

server.on('connection', (newClient) => {
    // For now, everybody's in one room.
    // TODO: group things into rooms.
    const id = uuidv4()
    newClient.id = id;
    order.push(id);
    newClient.send(JSON.stringify({
        type  : 'id',
        forId : newClient.id,
    }));

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
        const {
            forId,
            fromId,
            order : newOrder,
            type
        } = JSON.parse(data);

        // Save new ordering in case new participants join
        // after some reordering has occurred.
        if (type === 'order') {
            order = newOrder;
        }

        server.clients.forEach((client) => {
            if (forId) {
                // Send to just one client
                if (client.id === forId) {
                    client.send(data);
                }
            } else {
                // If forId is not set, broadcast to all other clients
                if (client.id !== fromId) {
                    client.send(data);
                }
            }

        });
    });

    // TODO: error handling, closing connections, etc.
});
