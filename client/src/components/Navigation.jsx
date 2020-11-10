import React, { useContext } from 'react';
import { Context } from './Store';
import {
    CASCADE_DONE,
    CASCADE_RECORDING,
    CASCADE_STANDBY,
    READY,
    startCascade,
    stopCascade
} from '../state/actions/cascade';

const Navigation = () => {
    const [state, dispatch] = useContext(Context);
    const { iAmInitiator, mode, myId, order } = state;
    const lastId = order[order.length - 1];
    const iAmLast = myId === lastId;
    return (
        <nav>
            { [READY, CASCADE_DONE].includes(mode) && iAmInitiator && order.length > 1 &&
                <button
                    className="big-button"
                    onClick={() => startCascade(dispatch)}
                >
                    GO
                </button> }
            { mode === CASCADE_RECORDING && iAmLast &&
                <button
                    className="big-button"
                    onClick={() => stopCascade(dispatch)}
                >
                    STOP
                </button> }
        </nav>
    );
};

export default Navigation;
