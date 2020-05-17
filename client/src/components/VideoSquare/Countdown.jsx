import React, { useContext, useEffect, useState } from 'react';
import { Context } from '../Store';
import { changeMode } from '../../state/actions/cascade';
import { CASCADE_RECORDING } from '../../state/modes';

const Countdown = () => {
    const [, dispatch] = useContext(Context);
    const [number, setNumber] = useState(3);
    useEffect(() => {
        if (number > 0) {
            setTimeout(() => {
                setNumber(number - 1);
            }, 2000);
        } else {
            changeMode(CASCADE_RECORDING, dispatch);
        }
    }, [number]);
    return <span className="countdown">{number}</span>
};

export default Countdown;
