import { useEffect, useRef, useCallback, useState } from 'react';

const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'click'];
const WARN_SECS = 60; // show warning this many seconds before auto-logout

export function useInactivityLogout(timeoutMinutes: number, onLogout: () => void) {
  const [secsLeft, setSecsLeft] = useState<number | null>(null);

  const logoutRef   = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const warnRef     = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logoutFnRef = useRef(onLogout);
  logoutFnRef.current = onLogout;

  const clearAll = useCallback(() => {
    if (logoutRef.current)   clearTimeout(logoutRef.current);
    if (warnRef.current)     clearTimeout(warnRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    logoutRef.current = warnRef.current = intervalRef.current = null;
    setSecsLeft(null);
  }, []);

  const reset = useCallback(() => {
    clearAll();
    if (timeoutMinutes <= 0) return;

    const totalMs  = timeoutMinutes * 60 * 1000;
    const warnMs   = Math.max(totalMs - WARN_SECS * 1000, 0);
    const actualWarnSecs = Math.min(WARN_SECS, timeoutMinutes * 60);

    warnRef.current = setTimeout(() => {
      let s = actualWarnSecs;
      setSecsLeft(s);
      intervalRef.current = setInterval(() => {
        s--;
        setSecsLeft(s > 0 ? s : 0);
        if (s <= 0) { clearInterval(intervalRef.current!); intervalRef.current = null; }
      }, 1000);
    }, warnMs);

    logoutRef.current = setTimeout(() => logoutFnRef.current(), totalMs);
  }, [timeoutMinutes, clearAll]);

  useEffect(() => {
    if (timeoutMinutes <= 0) { clearAll(); return; }
    reset();
    EVENTS.forEach(e => window.addEventListener(e, reset, { passive: true }));
    return () => {
      clearAll();
      EVENTS.forEach(e => window.removeEventListener(e, reset));
    };
  }, [timeoutMinutes, reset, clearAll]);

  return { secsLeft, dismiss: reset };
}
