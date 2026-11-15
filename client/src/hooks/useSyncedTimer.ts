import { useState, useEffect, useRef } from 'react';

/**
 * High-accuracy synchronized timer hook.
 * Uses server timestamp to correct local clock drift.
 */
export function useSyncedTimer(phaseEndsAt?: number, serverNow?: number): number {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!phaseEndsAt || !serverNow) return 0;
    const offset = serverNow - Date.now();
    return Math.max(0, Math.ceil((phaseEndsAt - (Date.now() + offset)) / 1000));
  });

  const offsetRef = useRef<number>(0);

  useEffect(() => {
    if (serverNow) {
      offsetRef.current = serverNow - Date.now();
    }
  }, [serverNow]);

  useEffect(() => {
    if (!phaseEndsAt) {
      setSecondsLeft(0);
      return;
    }

    const update = () => {
      const nowSynced = Date.now() + offsetRef.current;
      const remainingMs = phaseEndsAt - nowSynced;
      const secs = Math.max(0, Math.ceil(remainingMs / 1000));
      setSecondsLeft(secs);
    };

    update();
    const interval = setInterval(update, 250);

    return () => clearInterval(interval);
  }, [phaseEndsAt]);

  return secondsLeft;
}
