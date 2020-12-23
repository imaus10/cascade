# `cascade` client

A React app that:

- Connects all participants with audio & video streaming
- Coordinates the cascade
- Generates metronome audio, for later syncing
- Records the camera video/microphone audio and the metronome audio

## Usage

Install:

```
npm install
```

Run client on localhost:3000:

```
npm run start
```

I've been hosting the front end on Github Pages because it's easy and free. I use the [`gh-pages`](https://github.com/tschaub/gh-pages) project to deploy the static build. To do the same, all you need to do is fork this project to your Github account, change the `homepage` entry in `package.json` to point to your repo, and then run:

```
npm run deploy
```

The `cascade` front end will then be hosted at `{username}.github.io/cascade`.

The front end won't do anything unless it's connected to the server. To do that, pass the server URL in the `server` query parameter; for example: `imaus10.github.io/cascade?server=wss://{ngrok tunnel id}.ngrok.io`.

## Structure

This app is a small number of UI elements and a metric butt-ton of state management. So I used the React `Context` API with `useReducer()` to make a global state that can be accessed from anywhere in the code.
