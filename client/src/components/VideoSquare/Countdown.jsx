import React, { useContext, useEffect, useState } from 'react';
import { Context } from '../Store';
import {
    CASCADE_RECORDING,
    CASCADE_STANDBY_DURATION,
    changeMode
} from '../../state/actions/cascade';

const Countdown = () => {
    // Counts down to zero from here
    const countdownStart = 3;
    const [, dispatch] = useContext(Context);
    const [number, setNumber] = useState(countdownStart);
    useEffect(() => {
        if (number > 0) {
            setTimeout(() => {
                setNumber(number - 1);
            }, CASCADE_STANDBY_DURATION / countdownStart);
        } else {
            changeMode(CASCADE_RECORDING, dispatch);
        }
    }, [number]);
    return <span className="countdown">{number}</span>
};

export default Countdown;
