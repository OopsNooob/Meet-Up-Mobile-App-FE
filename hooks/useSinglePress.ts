import { useRef, useCallback, useEffect } from 'react';

/**
 * Hook to prevent accidental multi-clicks/double-taps on buttons or clickable elements.
 * 
 * Features:
 * - Leading-edge execution: runs immediately on the first tap (0ms latency, snappy feel).
 * - Cooldown lock: blocks subsequent taps for `delay` ms (default 600ms).
 * - Async-aware: if callback returns a Promise, stays locked until the Promise resolves, then adds delay.
 * - Auto-cleanup on unmount to prevent memory leaks.
 */
export function useSinglePress<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 600
): (...args: Parameters<T>) => ReturnType<T> | void {
  const isLocked = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback reference fresh without causing hook rebuild
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (isLocked.current) {
        return;
      }

      isLocked.current = true;

      try {
        const result = callbackRef.current(...args);

        // Check if the result is a Promise
        if (result && typeof result.then === 'function') {
          return result
            .catch((err: any) => {
              // Let caller handle error, but still release lock after delay
              console.error('[useSinglePress] Error in async action:', err);
              throw err;
            })
            .finally(() => {
              timeoutRef.current = setTimeout(() => {
                isLocked.current = false;
              }, delay);
            });
        } else {
          timeoutRef.current = setTimeout(() => {
            isLocked.current = false;
          }, delay);
          return result;
        }
      } catch (err) {
        isLocked.current = false;
        throw err;
      }
    },
    [delay]
  );
}

export default useSinglePress;
