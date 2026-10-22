import { PermissionsAndroid, Platform } from 'react-native';

import * as SmsReader from '../../modules/sms-reader';

const P = PermissionsAndroid.PERMISSIONS;

export type StepResult = 'granted' | 'denied' | 'blocked';

export async function requestSmsPermission(): Promise<StepResult> {
  const r = await PermissionsAndroid.requestMultiple([P.RECEIVE_SMS, P.READ_SMS]);
  const v = [r[P.RECEIVE_SMS], r[P.READ_SMS]];
  if (v.every((x) => x === 'granted')) return 'granted';
  return v.includes('never_ask_again') ? 'blocked' : 'denied';
}

export async function requestNotificationPermission(): Promise<StepResult> {
  if (Platform.OS !== 'android' || Platform.Version < 33) return 'granted';
  const r = await PermissionsAndroid.request(P.POST_NOTIFICATIONS);
  return r === 'granted' ? 'granted' : r === 'never_ask_again' ? 'blocked' : 'denied';
}

// The system dialog gives no result: read the real state back.
export async function requestBatteryExemption(): Promise<StepResult> {
  await SmsReader.requestBatteryOptimizationExemption();
  return (await SmsReader.getStatus()).batteryOptimizationIgnored ? 'granted' : 'denied';
}
