import { useEffect, useRef } from 'react';

/**
 * Periodically executes a callback while the tab is visible.
 * Useful to keep Supabase-backed data fresh as a fallback when realtime is unavailable.
 */
export function useAutoRefresh(callback: () => void | Promise<void>, delay: number, enabled = true) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || delay <= 0) {
      return;
    }

    const tick = () => {
      try {
        if (typeof document !== 'undefined' && document.hidden) {
          return;
        }
        const result = savedCallback.current();
        if (result instanceof Promise) {
          // Silence unhandled rejections
          result.catch(() => undefined);
        }
      } catch (err) {
        // Prevent interval from stopping due to sync errors
        console.error('Auto refresh callback failed:', err);
      }
    };

    if (typeof window === 'undefined') {
      return undefined;
    }

    const intervalId = window.setInterval(tick, delay);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [delay, enabled]);
}
