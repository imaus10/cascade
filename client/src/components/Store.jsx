import React, { createContext, useReducer } from "react";
import reducer, { initialState } from '../state/reducer';

const Store = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, initialState);
    return (
        <Context.Provider value={[state, dispatch]}>
            {children}
        </Context.Provider>
    )
};

export const Context = createContext(initialState);
export default Store;
