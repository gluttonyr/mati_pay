import { PermissionsAndroid, Platform } from 'react-native';

import * as SmsReader from '../../modules/sms-reader';

const P = PermissionsAndroid.PERMISSIONS;

export async function requestSmsPermission() {
  const r = await PermissionsAndroid.requestMultiple([P.RECEIVE_SMS, P.READ_SMS]);
  return r[P.RECEIVE_SMS] === 'granted' && r[P.READ_SMS] === 'granted';
}

export async function requestNotificationPermission() {
  if (Platform.OS !== 'android' || Platform.Version < 33) return true;
  return (await PermissionsAndroid.request(P.POST_NOTIFICATIONS)) === 'granted';
}

export async function requestBatteryExemption() {
  await SmsReader.requestBatteryOptimizationExemption();
  return true;
}
