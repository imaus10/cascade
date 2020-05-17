export function makeNewRecorder(stream, dispatch) {
    // TODO: use specific codecs. check browser compatibility.
    const recorder = new MediaRecorder(stream, { mimeType : 'video/webm' });
    recorder.addEventListener('dataavailable', ({ data }) => {
        dispatch({
            type : 'FILES_ADD',
            file : URL.createObjectURL(data),
        });
    });
    return recorder;
}
