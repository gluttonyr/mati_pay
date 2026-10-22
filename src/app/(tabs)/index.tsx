import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import client from '@/api/client';
import { store } from '@/session/SessionProvider';
import { useCapture } from '@/capture/useCapture';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { colors } from '@/theme/colors';
import type { CaptureStatus } from '../../../modules/sms-reader';

const ONBOARDED_KEY = 'mati-pay-onboarded';

// Reason in priority order: auth, SMS permission, service, battery.
function stopReason(s: CaptureStatus): string | null {
  if (s.authRequired) return 'Reconnexion requise';
  if (!s.smsPermission) return 'Permission SMS refusée';
  if (!s.running) return 'Service arrêté';
  if (!s.batteryOptimizationIgnored) return 'Optimisation de batterie active';
  return null;
}

const fmt = (ms: number | null) => (ms ? new Date(ms).toLocaleString('fr-FR') : 'Jamais');

export default function Home() {
  const router = useRouter();
  const { status, unavailable, resyncNow, ensureStarted } = useCapture();
  const [busy, setBusy] = useState(false);

  // First launch: send the admin through the permissions steps once.
  useEffect(() => {
    (async () => {
      if (unavailable || (await store.get(ONBOARDED_KEY))) return;
      await store.set(ONBOARDED_KEY, '1');
      router.push('/onboarding');
    })().catch(() => {});
  }, [unavailable, router]);

  const sms = useQuery({
    queryKey: ['sms-counts'],
    queryFn: async () => (await client.get('/sms-capture', { params: { page: 1, limit: 1 } })).data.data.counts,
  });
  const deposits = useQuery({
    queryKey: ['deposits-to-reconcile'],
    queryFn: async () =>
      (await client.get('/transactions/admin', { params: { page: 1, limit: 1 } })).data.data.counts
        .captureReconciliation as number,
  });

  const reason = status ? stopReason(status) : null;

  return (
    <Screen title="Accueil">
      <ScrollView>
        {unavailable ? (
          <Card><Text style={styles.text}>Capture indisponible sur cette plateforme</Text></Card>
        ) : status ? (
          <Card accent={reason ? colors.error : colors.green}>
            {reason ? (
              <>
                <StatusPill label="Capture arrêtée" tone="error" />
                <Text style={styles.reason}>{reason}</Text>
                <Pressable accessibilityRole="button" onPress={() => router.push('/onboarding')}>
                  <Text style={styles.link}>Configurer les autorisations</Text>
                </Pressable>
              </>
            ) : (
              <StatusPill label="Capture active" tone="success" />
            )}
            <Text style={styles.row}>Dernier SMS reçu : {fmt(status.lastReceivedAt)}</Text>
            <Text style={styles.row}>Dernier envoi réussi : {fmt(status.lastSentAt)}</Text>
            <Text style={styles.row}>{status.queueSize} SMS en attente d’envoi</Text>
          </Card>
        ) : null}

        <View style={styles.counters}>
          <Counter label="Sans transaction" value={sms.data?.SANS_TRANSACTION} onPress={() => router.push('/sms?statut=SANS_TRANSACTION')} />
          <Counter label="SMS à rapprocher" value={sms.data?.A_RAPPROCHER} onPress={() => router.push('/sms?statut=A_RAPPROCHER')} />
          <Counter label="Dépôts à rapprocher" value={deposits.data} onPress={() => router.push('/transactions?filtre=A_RAPPROCHER')} />
        </View>

        {!unavailable ? (
          <Pressable
            style={[styles.btn, busy && { opacity: 0.5 }]}
            disabled={busy}
            accessibilityRole="button"
            onPress={async () => {
              setBusy(true);
              try {
                await ensureStarted();
                await resyncNow();
              } catch {
                // status refresh will show the reason
              } finally {
                setBusy(false);
              }
            }}>
            <Text style={styles.btnText}>Relire les SMS maintenant</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Counter({ label, value, onPress }: { label: string; value?: number; onPress: () => void }) {
  return (
    <Pressable style={styles.counter} accessibilityRole="button" onPress={onPress}>
      <Text style={styles.count}>{value ?? '–'}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: { color: colors.textSecondary },
  reason: { color: colors.errorText, fontWeight: '600', marginTop: 6 },
  link: { color: colors.greenText, fontWeight: '600', marginTop: 6 },
  row: { color: colors.text, marginTop: 6 },
  counters: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  counter: { flex: 1, backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 12 },
  count: { fontSize: 24, fontWeight: '700', color: colors.text },
  countLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  btn: { backgroundColor: colors.green, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: '#000', fontWeight: '700' },
});
