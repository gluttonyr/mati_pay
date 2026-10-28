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

// Why the last start failed, shown on Accueil instead of a generic "Service arrêté".
let lastStartError: string | null = null;
export const getStartError = () => lastStartError;

function describe(e: any): string {
  const code = e?.response?.status;
  if (code === 404) return 'Le serveur n’a pas encore le module Mati-Pay (404)';
  if (code === 401 || code === 403) return 'Reconnexion requise';
  if (code) return `Le serveur a refusé le démarrage (${code})`;
  if (e?.request) return 'Serveur injoignable : vérifiez la connexion';
  return e?.message ?? 'Démarrage impossible';
}

// Per-phone switch (Réglages): a consultation-only phone must neither read SMS nor send "ready" heartbeats.
const CAPTURE_ENABLED_KEY = 'mati-pay-capture-enabled';
export const isCaptureEnabled = async () => (await store.get(CAPTURE_ENABLED_KEY)) !== '0';
export const setCaptureEnabled = (on: boolean) => store.set(CAPTURE_ENABLED_KEY, on ? '1' : '0');

// SMS received before this date are never validated automatically (backend rule); shown in Réglages.
const ACTIVATED_AT_KEY = 'mati-pay-activated-at';
export type Activation = { at: string; reset: boolean };
// `reset`: the date comes from "Réinitialiser" rather than this phone's first activation.
export async function getActivatedAt(): Promise<Activation | null> {
  const raw = await store.get(ACTIVATED_AT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Activation;
  } catch {
    return { at: raw, reset: false }; // stored as a bare date by an earlier version
  }
}

// Register this device, fetch senders, start the native capture. Throws SMS_READER_UNAVAILABLE off Android.
// resetActivation: move this phone's activation date to now, so older payment SMS are ignored.
export async function startCapture({ resetActivation = false } = {}) {
  if (!(await isCaptureEnabled())) {
    lastStartError = null;
    return;
  }
  try {
    const deviceId = await getDeviceId();
    const senders = await fetchSenders(); // before register: register revokes the previous token
    const reg = await client.post(resetActivation ? '/sms-capture/device/reset-activation' : '/sms-capture/device/register', { deviceId });
    const at = reg.data.data.activatedAt ? String(reg.data.data.activatedAt) : null;
    if (at) {
      const prev = await getActivatedAt();
      await store.set(ACTIVATED_AT_KEY, JSON.stringify({ at, reset: resetActivation || (!!prev?.reset && prev.at === at) }));
    }
    await SmsReader.start({
      apiUrl: Constants.expoConfig?.extra?.apiUrl,
      deviceId,
      deviceToken: reg.data.data.token,
      senders,
    });
    lastStartError = null;
  } catch (e) {
    lastStartError = describe(e);
    throw e;
  }
}

// No revoke here: signOut also runs on a 401, and a failing revoke would re-enter signOut.
export const stopCapture = () => SmsReader.stop();
