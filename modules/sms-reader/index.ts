import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export type CaptureConfig = { apiUrl: string; deviceId: string; deviceToken: string; senders: string[] };

export type CaptureStatus = {
  running: boolean;
  smsPermission: boolean;
  notificationPermission: boolean;
  batteryOptimizationIgnored: boolean;
  authRequired: boolean;
  queueSize: number;
  lastReceivedAt: number | null;
  lastSentAt: number | null;
  lastError: string | null;
};

export type LocalQueueItem = {
  fingerprint: string;
  expediteur: string;
  corps: string;
  receivedAt: number;
  tentatives: number;
  derniereErreur: string | null;
};

type SmsReaderNativeModule = {
  start(config: CaptureConfig): Promise<void>;
  stop(): Promise<void>;
  updateSenders(senders: string[]): Promise<void>;
  resyncNow(): Promise<void>;
  getStatus(): Promise<CaptureStatus>;
  listLocalQueue(): Promise<LocalQueueItem[]>;
  requestBatteryOptimizationExemption(): Promise<void>;
};

const nativeModule =
  Platform.OS === 'android' ? requireOptionalNativeModule<SmsReaderNativeModule>('SmsReader') : null;

function native(): SmsReaderNativeModule {
  if (!nativeModule) throw new Error('SMS_READER_UNAVAILABLE');
  return nativeModule;
}

export const start = async (config: CaptureConfig) => native().start(config);
export const stop = async () => native().stop();
export const updateSenders = async (senders: string[]) => native().updateSenders(senders);
export const resyncNow = async () => native().resyncNow();
export const getStatus = async () => native().getStatus();
export const listLocalQueue = async () => native().listLocalQueue();
export const requestBatteryOptimizationExemption = async () => native().requestBatteryOptimizationExemption();
