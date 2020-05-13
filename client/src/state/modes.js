// User is connecting audio/video, hasn't connected to server
export const SETUP = 0;
// Connected to server, waiting for initiator to press GO
export const READY = 1;
// Cascade has started but recording hasn't started yet.
// For initiator, there's a short countdown.
// For everyone else, it's just waiting on the stream to arrive.
export const CASCADE_STANDBY = 2;
// Cascade in progress!
// This will end for the initiator when they press the DONE button
// and for everyone else when the stream ends.
export const CASCADE_RECORDING = 3;
