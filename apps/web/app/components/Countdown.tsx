'use client'

import { useEffect, useRef, useState } from "react";

type CountdownProps = {
    seconds: number
    onComplete: () => void
    className?: string
};

export function Countdown({ seconds, onComplete, className }: CountdownProps) {
    const [remaining, setRemaining] = useState(seconds);

    // Held in a ref so an inline callback prop doesn't restart the interval
    // (and reset the deadline) on every render.
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    useEffect(() => {
        const deadline = Date.now() + seconds * 1000;
        let fired = false;

        const tick = () => {
            const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
            setRemaining(left);
            if (left === 0 && !fired) {
                fired = true;
                onCompleteRef.current();
            }
        };

        tick();
        const id = setInterval(tick, 250);
        return () => clearInterval(id);
    }, [seconds]);

    const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
    const ss = String(remaining % 60).padStart(2, "0");
    return <span className={className}>{mm}:{ss}</span>;
}
