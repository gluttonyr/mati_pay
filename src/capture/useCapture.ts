import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { AppState } from 'react-native';

import * as SmsReader from '../../modules/sms-reader';
import { isCaptureEnabled, startCapture } from './startCapture';

const POLL_MS = 5000;

export function useCapture() {
  const [status, setStatus] = useState<SmsReader.CaptureStatus | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [enabled, setEnabled] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setEnabled(await isCaptureEnabled());
      setStatus(await SmsReader.getStatus());
    } catch (e) {
      if (String((e as Error).message).includes('SMS_READER_UNAVAILABLE')) setUnavailable(true);
    }
  }, []);

  const resyncNow = useCallback(async () => {
    await SmsReader.resyncNow();
    await refresh();
  }, [refresh]);

  // Restart the service when it is down (e.g. after permissions were granted).
  const ensureStarted = useCallback(async () => {
    const s = await SmsReader.getStatus();
    if (!s.running || s.authRequired) await startCapture();
    await refresh();
  }, [refresh]);

  // Poll only while the screen is focused.
  useFocusEffect(
    useCallback(() => {
      let t: ReturnType<typeof setInterval> | null = null;
      const stop = () => {
        if (t) clearInterval(t);
        t = null;
      };
      const start = () => {
        stop();
        refresh();
        t = setInterval(refresh, POLL_MS);
      };
      if (AppState.currentState === 'active') start();
      const sub = AppState.addEventListener('change', (s) => (s === 'active' ? start() : stop()));
      return () => {
        stop();
        sub.remove();
      };
    }, [refresh]),
  );

  return { status, unavailable, enabled, refresh, resyncNow, ensureStarted };
}
