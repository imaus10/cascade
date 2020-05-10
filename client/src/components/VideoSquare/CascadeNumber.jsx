import React, { useContext } from 'react';
import { Context } from '../Store';

const CascadeNumber = ({ orderNumber }) => {
    const [state] = useContext(Context);
    const { myId, stream } = state;
    const numberStyle = {
        alignItems      : 'center',
        backgroundColor : 'white',
        border          : '1px solid black',
        borderRadius    : '50%',
        display         : 'flex',
        height          : '2rem',
        justifyContent  : 'center',
        left            : '1%',
        position        : 'absolute',
        top             : '2%',
        width           : '2rem'
    };
    return stream && myId ? (
        <span style={numberStyle}>{orderNumber}</span>
    ) : null;
};

export default CascadeNumber;
