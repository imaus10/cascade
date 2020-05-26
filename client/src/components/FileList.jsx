import React, { useContext } from 'react';
import { Context } from './Store';

const FileList = () => {
    const [state] = useContext(Context);
    const { files } = state;
    return (
        <aside>
            { files.map(([fileName, blobURL], index) =>
                <a
                    key={blobURL}
                    download={fileName}
                    href={blobURL}
                >
                    Download your video for cascade {index + 1}
                </a>) }
        </aside>
    );
};

export default FileList;
