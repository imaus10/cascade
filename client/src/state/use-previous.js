import { useEffect, useRef } from 'react';

export default function usePrevious(value) {
    const prevRef = useRef();
    useEffect(() => {
        prevRef.current = value;
    }, [value]);
    return prevRef.current;
}
