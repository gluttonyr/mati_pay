import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { GitCompareArrows, MessageSquareText, RefreshCw, Wallet } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Pressable';
import { Text } from '@/components/Text';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import client from '@/api/client';
import { store } from '@/session/SessionProvider';
import { getStartError } from '@/capture/startCapture';
import { useCapture } from '@/capture/useCapture';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { usePollWhileFocused } from '@/hooks/usePollWhileFocused';
import { colors } from '@/theme/colors';
import type { CaptureStatus } from '../../../modules/sms-reader';

const ONBOARDED_KEY = 'mati-pay-onboarded';

// Reason in priority order: auth, SMS permission, service (with the server's answer), battery.
// `permission` says whether the onboarding link can actually fix it.
function stopReason(s: CaptureStatus): { text: string; permission: boolean } | null {
  if (s.authRequired) return { text: 'Reconnexion requise', permission: false };
  if (!s.smsPermission) return { text: 'Permission SMS refusée', permission: true };
  if (!s.running) return { text: getStartError() ?? 'Service arrêté', permission: false };
  if (!s.batteryOptimizationIgnored) return { text: 'Optimisation de batterie active', permission: true };
  return null;
}

const fmt = (ms: number | null) => (ms ? new Date(ms).toLocaleString('fr-FR') : 'Jamais');

export default function Home() {
  const router = useRouter();
  const { status, unavailable, enabled, resyncNow, ensureStarted } = useCapture();
  const [busy, setBusy] = useState(false);
  const [resyncNote, setResyncNote] = useState<string | null>(null);

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

  usePollWhileFocused(() => {
    sms.refetch();
    deposits.refetch();
  }, 15000);

  const reason = status ? stopReason(status) : null;

  return (
    <Screen title="Accueil">
      <ScrollView>
        {unavailable ? (
          <Card><Text style={styles.text}>Capture indisponible sur cette plateforme</Text></Card>
        ) : !enabled ? (
          <Card accent={colors.border}>
            <StatusPill label="Capture désactivée sur ce téléphone" tone="neutral" />
            <Text style={styles.row}>Consultation seule. La capture se réactive dans Réglages.</Text>
          </Card>
        ) : status ? (
          <Card accent={reason ? colors.error : colors.green}>
            {reason ? (
              <>
                <StatusPill label="Capture arrêtée" tone="error" />
                <Text style={styles.reason}>{reason.text}</Text>
                {reason.permission ? (
                  <Pressable accessibilityRole="button" onPress={() => router.push('/onboarding')}>
                    <Text style={styles.link}>Configurer les autorisations</Text>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <View style={styles.live}>
                <Pulse />
                <StatusPill label="Capture active" tone="success" />
              </View>
            )}
            <Text style={styles.row}>Dernier SMS reçu : {fmt(status.lastReceivedAt)}</Text>
            <Text style={styles.row}>Dernier envoi réussi : {fmt(status.lastSentAt)}</Text>
            <Text style={styles.row}>{status.queueSize} SMS en attente d’envoi</Text>
          </Card>
        ) : null}

        <View style={styles.counters}>
          <Counter Icon={MessageSquareText} label="Sans transaction" value={sms.data?.SANS_TRANSACTION} onPress={() => router.push('/sms?statut=SANS_TRANSACTION')} />
          <Counter Icon={GitCompareArrows} label="SMS à rapprocher" value={sms.data?.A_RAPPROCHER} onPress={() => router.push('/sms?statut=A_RAPPROCHER')} />
          <Counter Icon={Wallet} label="Dépôts à rapprocher" value={deposits.data} onPress={() => router.push('/transactions?filtre=A_RAPPROCHER')} />
        </View>

        {!unavailable && enabled ? (
          <Pressable
            style={[styles.btn, busy && { opacity: 0.7 }]}
            disabled={busy}
            accessibilityRole="button"
            accessibilityState={{ busy }}
            onPress={async () => {
              setBusy(true);
              setResyncNote(null);
              try {
                await ensureStarted();
                await resyncNow();
                sms.refetch();
                setResyncNote(`Relecture lancée à ${new Date().toLocaleTimeString('fr-FR')}`);
              } catch {
                setResyncNote('Relecture impossible : voir la raison ci-dessus');
              } finally {
                setBusy(false);
              }
            }}>
            {busy ? <ActivityIndicator color={colors.onGreen} /> : <RefreshCw size={18} color={colors.onGreen} />}
            <Text style={styles.btnText}>{busy ? 'Relecture en cours…' : 'Relire les SMS maintenant'}</Text>
          </Pressable>
        ) : null}
        {resyncNote ? <Text style={styles.note}>{resyncNote}</Text> : null}
      </ScrollView>
    </Screen>
  );
}

// Green dot with an expanding ring: the capture is listening.
function Pulse() {
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (!reduced) p.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1);
  }, [reduced, p]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - p.value), transform: [{ scale: 1 + p.value * 1.6 }] }));
  return (
    <View style={styles.pulse}>
      <Animated.View style={[styles.pulseRing, ring]} />
      <View style={styles.pulseDot} />
    </View>
  );
}

function Counter({ Icon, label, value, onPress }: { Icon: typeof Wallet; label: string; value?: number; onPress: () => void }) {
  return (
    <Pressable style={styles.counter} accessibilityRole="button" onPress={onPress}>
      <Icon size={18} color={colors.greenText} />
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
  btn: { backgroundColor: colors.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  btnText: { color: colors.onGreen, fontWeight: '700' },
  live: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  note: { color: colors.textSecondary, textAlign: 'center', marginTop: 10, fontSize: 13 },
  pulse: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: colors.green },
  pulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.greenText },
});
