import React, { useCallback, useContext } from 'react';
import { Context } from '../Store';
import usePrevious from '../../state/use-previous';

const Video = ({ id, isMe, setVideoAspectRatio, stream }) => {
    const [state] = useContext(Context);
    const { audioOutput } = state;

    const prevStream = usePrevious(stream);
    const prevAudioOutput = usePrevious(audioOutput);
    const videoRef = useCallback((node) => {
        if (node) {
            if (stream !== prevStream) {
                node.addEventListener('loadedmetadata', ({ target }) => {
                    setVideoAspectRatio(target.videoWidth / target.videoHeight);
                });
                if ('srcObject' in node) {
                    node.srcObject = stream;
                } else {
                    node.src = URL.createObjectURL(stream);
                }
            }

            if (audioOutput && audioOutput !== prevAudioOutput) {
                // TODO: check if available, alert user if not
                // (Firefox needs setting enabled)
                // (Safari is ?)
                node.setSinkId(audioOutput);
            }
        }
    }, [audioOutput, stream]);

    return stream ?
        <video autoPlay muted={isMe} ref={videoRef} /> :
        null;
};

export default Video;
