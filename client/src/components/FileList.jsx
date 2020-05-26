import React, { useContext } from 'react';
import { Context } from './Store';

const FileList = () => {
    const [state] = useContext(Context);
    const { files } = state;
    return (
        <aside>
            { files.map((blobURL, index) =>
                <a
                    key={blobURL}
                    download={`cascade${index + 1}.webm`}
                    href={blobURL}
                >
                    Download cascade {index + 1} video
                </a>) }
        </aside>
    );
};

export default FileList;
