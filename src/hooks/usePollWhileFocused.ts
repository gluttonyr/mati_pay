import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

// Refetch every `ms` while the screen is focused and the app is in the foreground, so new SMS show up without pulling.
export function usePollWhileFocused(refetch: () => unknown, ms = 10000) {
  const latest = useRef(refetch);
  useEffect(() => {
    latest.current = refetch;
  });

  useFocusEffect(
    useCallback(() => {
      let t: ReturnType<typeof setInterval> | null = null;
      const stop = () => {
        if (t) clearInterval(t);
        t = null;
      };
      const start = () => {
        stop();
        latest.current();
        t = setInterval(() => latest.current(), ms);
      };
      if (AppState.currentState === 'active') start();
      const sub = AppState.addEventListener('change', (s) => (s === 'active' ? start() : stop()));
      return () => {
        stop();
        sub.remove();
      };
    }, [ms]),
  );
}
