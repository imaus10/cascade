import React, { useContext } from 'react';
import { Context } from '../Store';

const Countdown = () => {
    const [state] = useContext(Context);
    const { countdown } = state;
    return <span className="countdown">{countdown}</span>
};

export default Countdown;
