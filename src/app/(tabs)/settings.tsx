import { CheckCircle2, Radio, RotateCcw, XCircle } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Pressable } from '@/components/Pressable';
import { Text } from '@/components/Text';

import client from '@/api/client';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import {
  requestBatteryExemption,
  requestNotificationPermission,
  requestSmsPermission,
  type StepResult,
} from '@/capture/permissions';
import {
  type Activation,
  getActivatedAt,
  getDeviceId,
  getStartError,
  setCaptureEnabled,
  startCapture,
  stopCapture,
} from '@/capture/startCapture';
import { useCapture } from '@/capture/useCapture';
import { useSession } from '@/session/SessionProvider';
import { colors } from '@/theme/colors';

const fmtDateTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR')}`;
};

export default function Settings() {
  const { user, signOut } = useSession();
  const { status, enabled, refresh, ensureStarted } = useCapture();
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [activatedAt, setActivatedAt] = useState<Activation | null>(null);
  const [resetNote, setResetNote] = useState<string | null>(null);
  const loggingOut = useRef(false);

  useEffect(() => {
    getDeviceId().then(setDeviceId).catch(() => {});
    getActivatedAt().then(setActivatedAt).catch(() => {});
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
      const id = deviceId ?? (await getDeviceId().catch(() => null));
      await stopCapture().catch(() => {});
      // Revoke while the JWT is still valid; a 401 here makes the interceptor sign out, which is harmless.
      if (id) await client.post('/sms-capture/device/revoke', { deviceId: id }, { timeout: 5000 }).catch(() => {});
      await signOut(); // the route guard in _layout sends us back to /login
    } finally {
      loggingOut.current = false;
      setBusy(false);
    }
  };

  const toggleCapture = async (on: boolean) => {
    setSwitching(true);
    try {
      await setCaptureEnabled(on);
      if (on) {
        await startCapture().catch(() => {}); // Accueil shows the reason if it can't start
        setActivatedAt(await getActivatedAt());
      } else {
        await stopCapture().catch(() => {});
        const id = deviceId ?? (await getDeviceId().catch(() => null));
        if (id) await client.post('/sms-capture/device/revoke', { deviceId: id }, { timeout: 5000 }).catch(() => {});
      }
    } finally {
      await refresh();
      setSwitching(false);
    }
  };

  const resetActivation = async () => {
    setSwitching(true);
    try {
      setResetNote(null);
      await startCapture({ resetActivation: true });
      const a = await getActivatedAt();
      setActivatedAt(a);
      setResetNote(a ? `Vérification réinitialisée le ${fmtDateTime(a.at)}` : 'Vérification réinitialisée');
    } catch {
      Alert.alert('Réinitialisation impossible', getStartError() ?? 'Réessayez plus tard.');
    } finally {
      await refresh();
      setSwitching(false);
    }
  };

  const confirmReset = () =>
    Alert.alert(
      'Réinitialiser la vérification',
      'Les SMS de paiement reçus avant maintenant ne valideront plus aucun dépôt automatiquement. Ils restent visibles pour une attribution manuelle.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Réinitialiser', style: 'destructive', onPress: resetActivation },
      ],
    );

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
          {user?.email ? <Text style={styles.sub}>{user.email}</Text> : null}
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

        <Card accent={enabled ? colors.green : colors.border}>
          <View style={styles.row}>
            <Radio size={20} color={enabled ? colors.greenText : colors.textSecondary} />
            <View style={styles.switchText}>
              <Text style={styles.rowLabel}>Capturer les SMS sur ce téléphone</Text>
              <Text style={styles.sub}>
                {enabled
                  ? 'Ce téléphone lit les SMS de paiement et garde les dépôts ouverts.'
                  : 'Consultation seule : aucun SMS lu, aucun signal envoyé.'}
              </Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={toggleCapture}
              disabled={switching}
              trackColor={{ true: colors.green, false: colors.border }}
              thumbColor={colors.bg}
              accessibilityLabel="Capturer les SMS sur ce téléphone"
            />
          </View>
          {enabled ? (
            <View style={styles.reset}>
              <View style={styles.since}>
                <Text style={styles.label}>
                  {activatedAt?.reset ? 'Dernière réinitialisation' : 'Première activation sur ce téléphone'}
                </Text>
                <Text style={styles.sinceDate}>{activatedAt ? fmtDateTime(activatedAt.at) : '—'}</Text>
                <Text style={styles.sub}>Seuls les SMS reçus après cette date valident un dépôt automatiquement.</Text>
              </View>
              <Pressable
                style={[styles.resetBtn, switching && { opacity: 0.7 }]}
                onPress={confirmReset}
                disabled={switching}
                accessibilityRole="button"
                accessibilityState={{ busy: switching }}>
                {switching ? <ActivityIndicator color={colors.text} /> : <RotateCcw size={16} color={colors.text} />}
                <Text style={styles.resetText}>{switching ? 'Réinitialisation…' : 'Réinitialiser la vérification à maintenant'}</Text>
              </Pressable>
              {resetNote ? <Text style={styles.resetNote}>{resetNote}</Text> : null}
            </View>
          ) : null}
        </Card>

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
  switchText: { flex: 1 },
  reset: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 10 },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  resetText: { color: colors.text, fontWeight: '600' },
  since: { gap: 2 },
  sinceDate: { fontSize: 18, fontWeight: '700', color: colors.text },
  resetNote: { fontSize: 13, color: colors.greenText, textAlign: 'center' },
  btn: { backgroundColor: colors.green, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minHeight: 44, justifyContent: 'center' },
  btnText: { color: colors.onGreen, fontWeight: '600' },
  logout: { borderColor: colors.errorText, borderWidth: 1, borderRadius: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginVertical: 16 },
  logoutText: { color: colors.errorText, fontWeight: '600', fontSize: 16 },
});
