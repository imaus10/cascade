import React, { useEffect, useState } from 'react';
import { reconnectAudioOutput, sendBlip, NUM_BLIPS } from '../../state/actions/recording';

const CASCADE_STANDBY_DURATION = 6000; // milliseconds

const Countdown = () => {
    // Counts down to zero from here
    const [number, setNumber] = useState(NUM_BLIPS);
    useEffect(() => {
        if (number > 0) {
            setTimeout(() => {
                const newNumber = number - 1;
                sendBlip(newNumber > 0 ? 440 : 880);
                setNumber(newNumber);
            }, CASCADE_STANDBY_DURATION / NUM_BLIPS);
        } else {
            reconnectAudioOutput();
        }
    }, [number]);
    return <span className="countdown">{number}</span>
};

export default Countdown;
