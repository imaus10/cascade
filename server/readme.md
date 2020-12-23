# `cascade` server

A WebSocket server that:

- relays signals between clients to initiate peer-to-peer connection
- receives the audio and metronome recordings from the client and saves to disk
- calls Python script to analyze metronome recordings and generate an ffmpeg command to align audio

## Dependencies

The server requires `ffmpeg` with support for `.webm` containers to timestretch the audio recorded by the client browsers.

## Usage

Installation (includes Python dependencies):

```
npm install
```

Run on port 8080:

```
npm run start
```

There's one little complication with the client connecting to localhost - for security, the browser requires a WebSocket secure connection (`wss://`), which is not easily available for localhost. So, I use ngrok to make a public secure tunnel to localhost. [Install ngrok](https://ngrok.com/) and then run:

```
ngrok http 8080
```

Then you can connect to the server from the front end with a URL like so:

```
https://localhost:3000/cascade?serverURL=wss://{tunnel_id}.ngrok.io
```
