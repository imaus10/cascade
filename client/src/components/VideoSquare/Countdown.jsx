import React, { useContext, useEffect, useState } from 'react';
import { Context } from '../Store';
import { MODES } from '../../state/reducer';

const Countdown = () => {
    const [, dispatch] = useContext(Context);
    const [number, setNumber] = useState(3);
    useEffect(() => {
        if (number === 0) {
            dispatch({
                type : 'MODE_SET',
                mode : MODES.CASCADE_RECORDING
            });
        } else {
            setTimeout(() => {
                setNumber(number - 1);
            }, 2000);
        }
    }, [number]);
    return <span className="countdown">{number}</span>
};

export default Countdown;
