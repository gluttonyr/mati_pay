import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import * as SmsReader from '../../modules/sms-reader';
import { startCapture } from './startCapture';

const POLL_MS = 5000;

export function useCapture() {
  const [status, setStatus] = useState<SmsReader.CaptureStatus | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const refresh = useCallback(async () => {
    try {
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
    if (!s.running) await startCapture();
    await refresh();
  }, [refresh]);

  // Poll only while the screen is focused.
  useFocusEffect(
    useCallback(() => {
      refresh();
      const t = setInterval(refresh, POLL_MS);
      return () => clearInterval(t);
    }, [refresh]),
  );

  return { status, unavailable, refresh, resyncNow, ensureStarted };
}
