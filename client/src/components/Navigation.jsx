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
    const { iAmInitiator, mode, order } = state;
    return (
        <nav>
            { [READY, CASCADE_DONE].includes(mode) && iAmInitiator && order.length > 1 &&
                <button
                    className="big-button"
                    onClick={() => startCascade(dispatch)}
                >
                    GO
                </button> }
            { /*mode === CASCADE_RECORDING && iAmInitiator &&*/
                mode === CASCADE_STANDBY &&
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
