import React, { useEffect, useState } from 'react';
import { beepFreqs, sendBlip } from '../../state/actions/recording';

const CASCADE_STANDBY_DURATION = 6000; // milliseconds

const Countdown = () => {
    // Counts down to zero from here
    const startCount = 3;
    const [number, setNumber] = useState(startCount);
    useEffect(() => {
        if (number > 0) {
            setTimeout(() => {
                const newNumber = number - 1;
                sendBlip(newNumber > 0 ? beepFreqs[0] : beepFreqs[1]);
                setNumber(newNumber);
            }, CASCADE_STANDBY_DURATION / startCount);
        }
    }, [number]);
    return <span className="countdown">{number}</span>
};

export default Countdown;
