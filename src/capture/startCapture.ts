import Constants from 'expo-constants';
import { randomUUID } from 'expo-crypto';

import client from '@/api/client';
import { store } from '@/session/SessionProvider';
import * as SmsReader from '../../modules/sms-reader';

const DEVICE_ID_KEY = 'mati-pay-device-id';

export async function getDeviceId(): Promise<string> {
  let id = await store.get(DEVICE_ID_KEY);
  if (!id) {
    id = randomUUID();
    await store.set(DEVICE_ID_KEY, id);
  }
  return id;
}

// Senders = non-empty notificationTitleAdmin of active operators.
export async function fetchSenders(): Promise<string[]> {
  const res = await client.get('/operateurs');
  const ops: { notificationTitleAdmin?: string | null; active?: boolean }[] = res.data.data ?? [];
  return ops.filter((o) => o.active && o.notificationTitleAdmin?.trim()).map((o) => o.notificationTitleAdmin!.trim());
}

export async function refreshSenders() {
  await SmsReader.updateSenders(await fetchSenders());
}

// Register this device, fetch senders, start the native capture. Throws SMS_READER_UNAVAILABLE off Android.
export async function startCapture() {
  const deviceId = await getDeviceId();
  const reg = await client.post('/sms-capture/device/register', { deviceId });
  const senders = await fetchSenders();
  await SmsReader.start({
    apiUrl: Constants.expoConfig?.extra?.apiUrl,
    deviceId,
    deviceToken: reg.data.data.token,
    senders,
  });
}

// No revoke here: signOut also runs on a 401, and a failing revoke would re-enter signOut.
export const stopCapture = () => SmsReader.stop();
