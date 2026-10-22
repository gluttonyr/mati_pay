import { useRouter } from 'expo-router';
import { BatteryCharging, Bell, MessageSquareText } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { type StepResult, requestBatteryExemption, requestNotificationPermission, requestSmsPermission } from '@/capture/permissions';
import { startCapture } from '@/capture/startCapture';
import { colors } from '@/theme/colors';

const steps = [
  { key: 'sms', Icon: MessageSquareText, title: 'Lecture des SMS', text: 'Nécessaire pour détecter les paiements reçus.', run: requestSmsPermission },
  { key: 'notif', Icon: Bell, title: 'Notifications', text: 'Affiche l’état de la capture en permanence.', run: requestNotificationPermission },
  { key: 'battery', Icon: BatteryCharging, title: 'Batterie', text: 'Évite que le système arrête la capture en arrière-plan.', run: requestBatteryExemption },
];

export default function Onboarding() {
  const router = useRouter();
  const [done, setDone] = useState<Record<string, StepResult | undefined>>({});
  const [error, setError] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<StepResult>) => {
    try {
      setError(null);
      setDone((d) => ({ ...d, [key]: undefined }));
      const res = await fn();
      setDone((d) => ({ ...d, [key]: res }));
    } catch {
      setError('Indisponible sur cette plateforme');
    }
  };

  const finish = async () => {
    await startCapture().catch(() => {}); // Accueil shows the reason if it could not start
    router.replace('/');
  };

  return (
    <Screen title="Configuration">
      <ScrollView>
        {steps.map(({ key, Icon, title, text, run: fn }) => (
          <Card key={key}>
            <Icon color={colors.text} size={22} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.text}>{text}</Text>
            <Pressable style={styles.btn} accessibilityRole="button" onPress={() => run(key, fn)}>
              <Text style={styles.btnText}>{done[key] === 'granted' ? 'Autorisé' : 'Autoriser'}</Text>
            </Pressable>
            {done[key] === 'denied' ? <Text style={styles.error}>Non autorisé pour le moment.</Text> : null}
            {done[key] === 'blocked' ? (
              <>
                <Text style={styles.error}>Refus définitif : activez-le dans les réglages de l’appli.</Text>
                <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()}>
                  <Text style={styles.skipText}>Ouvrir les réglages</Text>
                </Pressable>
              </>
            ) : null}
          </Card>
        ))}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable style={styles.skip} accessibilityRole="button" onPress={finish}>
          <Text style={styles.skipText}>Continuer</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 8 },
  text: { fontSize: 14, color: colors.textSecondary, marginTop: 2, marginBottom: 10 },
  btn: { backgroundColor: colors.green, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#000', fontWeight: '700' },
  error: { color: colors.errorText, marginBottom: 8 },
  skip: { paddingVertical: 14, alignItems: 'center' },
  skipText: { color: colors.textSecondary, fontWeight: '600' },
});
