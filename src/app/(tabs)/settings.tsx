import { CheckCircle2, XCircle } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import client from '@/api/client';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import {
  requestBatteryExemption,
  requestNotificationPermission,
  requestSmsPermission,
  type StepResult,
} from '@/capture/permissions';
import { getDeviceId, stopCapture } from '@/capture/startCapture';
import { useCapture } from '@/capture/useCapture';
import { useSession } from '@/session/SessionProvider';
import { colors } from '@/theme/colors';

export default function Settings() {
  const { user, signOut } = useSession();
  const { status, refresh, ensureStarted } = useCapture();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const loggingOut = useRef(false);

  useEffect(() => {
    getDeviceId().then(setDeviceId).catch(() => {});
  }, []);

  const grant = async (request: () => Promise<StepResult>) => {
    const r = await request().catch(() => 'denied' as StepResult);
    if (r === 'blocked') await Linking.openSettings();
    else await ensureStarted().catch(() => refresh());
  };

  const logout = async () => {
    if (loggingOut.current) return;
    loggingOut.current = true;
    setBusy(true);
    try {
      const deviceId = await getDeviceId().catch(() => null);
      await stopCapture().catch(() => {});
      // Revoke while the JWT is still valid; a 401 here makes the interceptor sign out, which is harmless.
      if (deviceId) await client.post('/sms-capture/device/revoke', { deviceId }).catch(() => {});
      await signOut(); // the route guard in _layout sends us back to /login
    } finally {
      loggingOut.current = false;
      setBusy(false);
    }
  };

  const confirmLogout = () =>
    Alert.alert('Se déconnecter', 'La capture des SMS sera arrêtée sur cet appareil.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: logout },
    ]);

  const rows: { label: string; ok: boolean; request: () => Promise<StepResult> }[] = status
    ? [
        { label: 'Permission SMS', ok: status.smsPermission, request: requestSmsPermission },
        { label: 'Notifications', ok: status.notificationPermission, request: requestNotificationPermission },
        { label: 'Batterie sans restriction', ok: status.batteryOptimizationIgnored, request: requestBatteryExemption },
      ]
    : [];

  return (
    <Screen title="Réglages">
      <ScrollView>
        <Card>
          <Text style={styles.label}>Compte</Text>
          <Text style={styles.value}>{user ? `${user.prenom} ${user.nom}` : '-'}</Text>
          {(user as { email?: string } | null)?.email ? (
            <Text style={styles.sub}>{(user as { email?: string }).email}</Text>
          ) : null}
          <Text style={[styles.label, styles.gap]}>Identifiant de l&apos;appareil</Text>
          <Text style={styles.sub} selectable>
            {deviceId ?? '-'}
          </Text>
        </Card>

        {rows.map((r) => (
          <Card key={r.label} accent={r.ok ? colors.green : colors.error}>
            <View style={styles.row}>
              {r.ok ? (
                <CheckCircle2 size={20} color={colors.greenText} />
              ) : (
                <XCircle size={20} color={colors.errorText} />
              )}
              <Text style={styles.rowLabel}>{r.label}</Text>
              {!r.ok ? (
                <Pressable style={styles.btn} onPress={() => grant(r.request)} accessibilityRole="button">
                  <Text style={styles.btnText}>Autoriser</Text>
                </Pressable>
              ) : null}
            </View>
          </Card>
        ))}

        <Pressable
          style={[styles.logout, busy && { opacity: 0.5 }]}
          onPress={confirmLogout}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: colors.textSecondary, textTransform: 'uppercase' },
  gap: { marginTop: 12 },
  value: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: 4 },
  sub: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowLabel: { flex: 1, fontSize: 15, color: colors.text },
  btn: { backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  btnText: { color: colors.onGreen, fontWeight: '600' },
  logout: { borderColor: colors.errorText, borderWidth: 1, borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginVertical: 16 },
  logoutText: { color: colors.errorText, fontWeight: '600', fontSize: 16 },
});
