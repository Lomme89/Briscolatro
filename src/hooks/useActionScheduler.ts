import { useCallback, useEffect, useRef } from 'react';

/** Owns every delayed game action so unmounting the app cancels them together. */
export function useActionScheduler(fastMode: boolean) {
  const fastModeRef = useRef(fastMode);
  fastModeRef.current = fastMode;

  const activeTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const beat = useCallback(
    (milliseconds: number) =>
      fastModeRef.current ? Math.round(milliseconds * 0.45) : milliseconds,
    []
  );

  const scheduleAction = useCallback((action: () => void, delayMs: number) => {
    const timer = setTimeout(action, delayMs);
    activeTimersRef.current.push(timer);
    return timer;
  }, []);

  useEffect(
    () => () => {
      activeTimersRef.current.forEach(clearTimeout);
    },
    []
  );

  return { beat, scheduleAction };
}
