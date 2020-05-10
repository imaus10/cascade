const { v4 : uuidv4 } = require('uuid');
const WebSocket = require('ws');

const server = new WebSocket.Server({ port : 8080 });
let order = [];

function broadcastOrder() {
    server.clients.forEach((client) => {
        client.send(JSON.stringify({
            type : 'order',
            order
        }));
    });
}

server.on('connection', (newClient) => {
    // For now, everybody's in one room.
    // TODO: group things into rooms.
    const id = uuidv4()
    console.log(`opening ${id}`);
    newClient.id = id;
    order.push(id);
    newClient.send(JSON.stringify({
        type  : 'id',
        forId : newClient.id,
    }));

    // Broadcast the new order of participants,
    // including the new client ID.
    broadcastOrder();
    server.clients.forEach((client) => {
        if (client.id !== newClient.id) {
            // Broadcast to all the other clients asking for an offer signal.
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
                // Broadcast to all other clients
                if (client.id !== fromId) {
                    client.send(data);
                }
            }
        });
    });

    newClient.on('close', () => {
        console.log(`closing ${newClient.id}`);
        const startIndex = order.indexOf(newClient.id);
        order.splice(startIndex, 1);
        broadcastOrder();
    });

    // TODO: error handling, etc.
});
