const WebSocket = require('ws');

const server = new WebSocket.Server({ port : 8080 });
exports.server = server;

function send(client, data, isJSON = true) {
    const sendData = isJSON ? JSON.stringify(data) : data;
    client.send(sendData);
}
exports.send = send;

exports.sendToOne = function(id, data, isJSON = true) {
    server.clients.forEach((client) => {
        if (client.id === id) {
            send(client, data, isJSON);
        }
    });
}

exports.broadcast = function(data, isJSON = true) {
    server.clients.forEach((client) => {
        send(client, data, isJSON);
    });
}

exports.broadcastExcept = function(exceptId, data, isJSON = true) {
    server.clients.forEach((client) => {
        if (client.id !== exceptId) {
            send(client, data, isJSON);
        }
    });
}
