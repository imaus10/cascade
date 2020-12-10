const { spawn } = require('child_process');
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
let cascadeNumber = 0;

server.on('connection', (newClient) => {
    const myId = uuidv4();
    console.log(`joined room: ${myId}`);
    newClient.id = myId;
    order.push(myId);
    send(newClient, {
        type : 'MY_ID_SET',
        id   : myId,
    });

    // Broadcast the new order of participants,
    // including the new client ID.
    broadcast({
        type : 'ORDER_SET',
        order
    });

    // And then wait for messages
    newClient.on('message', (data) => {

        // Handle binary file messages first
        if (data instanceof Buffer) {
            const cascadeDir = `${outputDir}/cascade${cascadeNumber}`;
            if (!fs.existsSync(cascadeDir)) {
                fs.mkdirSync(cascadeDir);
            }
            const position = order.indexOf(myId);
            const outputPrefix = `${cascadeDir}/peer${position}`;
            // We're expecting two files:
            // first is the video, second is the metronome audio.
            const videoFileName = `${outputPrefix}_video.webm`;
            if (!fs.existsSync(videoFileName)) {
                console.log(`received video file from ${myId}`);
                fs.writeFile(videoFileName, data, (err) => {
                    if (err) {
                        console.error(`Error writing video file: ${err}`);
                    }
                });
            } else {
                console.log(`received audio file from ${myId}`);
                fs.writeFile(`${outputPrefix}_metronome.webm`, data, (err) => {
                    if (err) {
                        console.error(`Error writing audio file: ${err}`);
                        return;
                    }
                    const readyToCombine = order.every(
                        (id, index) => fs.existsSync(`${cascadeDir}/peer${index}_metronome.webm`)
                    );
                    if (readyToCombine) {
                        console.log('Timeshifting audio to match metronome');
                        const timeshift = spawn(
                            'python', ['-u', 'align_audio_to_metronome.py', cascadeDir]
                        )
                        timeshift.stdout.on('data', (data) => {
                            console.log(`Timeshift stdout:\n${data}`);
                        });
                        timeshift.stderr.on('data', (data) => {
                            console.log(`Timeshift stderr:\n${data}`);
                        });
                        timeshift.on('close', () => {
                            console.log('Timeshifting done.');
                        });
                        cascadeNumber += 1;
                    }
                });
            }
            return;
        }

        // If the message not a binary file, it's JSON
        const {
            forId,
            fromId,
            order : newOrder,
            type,
            ...rest
        } = JSON.parse(data);
        console.log(`${type} from ${myId}`);

        // Keep the connection alive.
        // TODO: is this just in ngrok?
        if (type === 'ping') {
            send(newClient, { type : 'pong' });
            return;
        };

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
        console.log(`left room: ${myId}`);
        const startIndex = order.indexOf(myId);
        order.splice(startIndex, 1);
        broadcast({
            type : 'ORDER_SET',
            order
        });
    });

    // TODO: error handling, etc.
});
