import { useEffect, useRef } from 'react';

/**
 * Periodically executes a callback while the tab is visible.
 * Useful to keep Supabase-backed data fresh as a fallback when realtime is unavailable.
 */
export function useAutoRefresh(callback: () => void | Promise<void>, delay: number, enabled = true) {
  // Temporarily disable auto-refresh globally due to stability issues.
  // To re-enable, set the environment variable VITE_ENABLE_AUTO_REFRESH=true
  // or remove this short-circuit. This makes the hook a no-op and prevents
  // components from entering a loading state because of background polling.
  const ENABLE_AUTO_REFRESH = import.meta.env.VITE_ENABLE_AUTO_REFRESH === 'true';

  // Note: do not return early here because hooks must be called in the same order.
  // We short-circuit inside the effects below when auto-refresh is disabled.

  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!ENABLE_AUTO_REFRESH) {
      return;
    }

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
  }, [delay, enabled, ENABLE_AUTO_REFRESH]);
}
