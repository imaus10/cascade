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

function broadcastExcept(exceptId, dataOrFunction, isJSON = true) {
    server.clients.forEach((client) => {
        if (client.id !== exceptId) {
            const data = typeof dataOrFunction === 'function' ?
                dataOrFunction(client) :
                dataOrFunction;
            send(client, data, isJSON);
        }
    });
}

function broadcastOrder() {
    broadcast({
        type : 'order',
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
        type  : 'id',
        forId : newClient.id,
    });

    // Broadcast the new order of participants,
    // including the new client ID.
    broadcastOrder();
    // Broadcast to all the other clients asking for an offer signal.
    broadcastExcept(newClient.id, (client) => ({
        type   : 'signal',
        forId  : client.id,
        fromId : newClient.id,
        signal : 'initiate'
    }));

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
