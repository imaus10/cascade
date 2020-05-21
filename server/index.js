const { v4 : uuidv4 } = require('uuid');
const WebSocket = require('ws');

const server = new WebSocket.Server({ port : 8080 });
let order = [];

function send(client, data, isJSON = true) {
    const sendData = isJSON ? JSON.stringify(data) : data;
    client.send(sendData);
}

function sendToOne(id, data, isJSON = true) {
    server.clients.forEach((client) => {
        if (client.id === id) {
            send(client, data, isJSON);
        }
    });
}

function broadcast(data, isJSON = true) {
    server.clients.forEach((client) => {
        send(client, data, isJSON);
    });
}

function broadcastExcept(exceptId, data, isJSON = true) {
    server.clients.forEach((client) => {
        if (client.id !== exceptId) {
            send(client, data, isJSON);
        }
    });
}

function broadcastOrder() {
    broadcast({
        type : 'ORDER_SET',
        order
    });
}

server.on('connection', (newClient) => {
    // For now, everybody's in one room.
    // TODO: group things into rooms.
    const id = uuidv4()
    console.log(`opening ${id}`);
    newClient.id = id;
    order.push(id);
    send(newClient, {
        type : 'MY_ID_SET',
        id   : newClient.id,
    });

    // Broadcast the new order of participants,
    // including the new client ID.
    broadcastOrder();

    // After that, relay the signals back and forth
    // (and a few other odds & ends)
    newClient.on('message', (data) => {
        const {
            forId,
            fromId,
            order : newOrder,
            type,
            ...rest
        } = JSON.parse(data);

        // Keep the connection alive
        if (type === 'ping') {
            send(newClient, { type : 'pong' });
            return;
        };

        if (type === 'latency_info') {
            const orderNumber = order.indexOf(fromId);
            // TODO: use this for automatic slicing
            console.log(`Latency info from ${orderNumber}:\n`, rest);
            return;
        }

        // Save new ordering in case new participants join
        // after some reordering has occurred.
        // (Or a connection gets dropped and then they come back...)
        if (type === 'ORDER_SET') {
            order = newOrder;
        }

        // forId tells us if it's a specific or broadcast message
        if (forId) {
            sendToOne(forId, data, false);
        } else {
            broadcastExcept(fromId, data, false);
        }
    });

    newClient.on('close', () => {
        console.log(`closing ${newClient.id}`);
        const startIndex = order.indexOf(newClient.id);
        order.splice(startIndex, 1);
        broadcastOrder();
    });

    // TODO: error handling, etc.
});
