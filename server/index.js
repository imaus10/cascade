const fs = require('fs');
const { v4 : uuidv4 } = require('uuid');
const { broadcast, broadcastExcept, send, sendToOne, server } = require('./send-utils');

const outputDir = 'output';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Keep track of cascade order.
// For now, everybody's in one room.
// TODO: group things into rooms.
let order = [];

server.on('connection', (newClient) => {
    const id = uuidv4();
    console.log(`joined room: ${id}`);
    newClient.id = id;
    order.push(id);
    send(newClient, {
        type : 'MY_ID_SET',
        id   : newClient.id,
    });

    // Broadcast the new order of participants,
    // including the new client ID.
    broadcast({
        type : 'ORDER_SET',
        order
    });

    // And then wait for messages
    newClient.on('message', (data) => {
        const cascadeNumber = order.indexOf(id);
        const outputFileName = `${outputDir}/peer${cascadeNumber}`
        if (data instanceof Buffer) {
            // We're expecting two files:
            // first is the video, second is the metronome audio.
            const videoFileName = `${outputFileName}.webm`;
            if (!fs.existsSync(videoFileName)) {
                console.log(`received video file from ${id}`);
                fs.writeFile(videoFileName, data, (err) => {
                    if (err) {
                        console.error(`Error writing video file: ${err}`);
                    }
                });
            } else {
                console.log(`received audio file from ${id}`);
                fs.writeFile(`${outputFileName}_metronome.webm`, data, (err) => {
                    console.error(`Error writing audio file: ${err}`);
                });
            }
            return;
        }

        const {
            forId,
            fromId,
            order : newOrder,
            type,
            ...rest
        } = JSON.parse(data);
        console.log(`${type} from ${id}`);

        // Keep the connection alive.
        // TODO: is this just in ngrok?
        if (type === 'ping') {
            send(newClient, { type : 'pong' });
            return;
        };

        if (type === 'sync_info') {
            // TODO: use this for adaptive timestretching
            fs.writeFile(`${outputFileName}.json`, JSON.stringify(rest), (err) => {
                if (err) {
                    console.error(`Error writing sync file: ${err}`);
                }
            });
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
        console.log(`left room: ${newClient.id}`);
        const startIndex = order.indexOf(newClient.id);
        order.splice(startIndex, 1);
        broadcast({
            type : 'ORDER_SET',
            order
        });
    });

    // TODO: error handling, etc.
});
