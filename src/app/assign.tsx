import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckSquare, Square } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { assignSms, fmtMontant, getSms, phonesMatch } from '@/api/sms';
import { getTransaction } from '@/api/transactions';
import { Card } from '@/components/Card';
import { colors } from '@/theme/colors';

const errorInfo = (e: unknown) => {
  const data = (e as { response?: { data?: { message?: string | string[]; code?: string } } })?.response?.data;
  const m = data?.message;
  return { message: (Array.isArray(m) ? m.join(' ') : m) || 'Attribution impossible. Réessayez.', code: data?.code };
};

function Side({ title, rows }: { title: string; rows: { label: string; value: string; flag?: boolean }[] }) {
  return (
    <Card style={styles.side}>
      <Text style={styles.sideTitle}>{title}</Text>
      {rows.map((r) => (
        <View key={r.label} style={[styles.field, r.flag && styles.flag]}>
          <Text style={styles.label}>{r.label}</Text>
          <Text style={styles.value}>{r.value}</Text>
        </View>
      ))}
    </Card>
  );
}

export default function Assign() {
  const { smsId, transactionId } = useLocalSearchParams<{ smsId: string; transactionId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const sms = useQuery({ queryKey: ['sms', 'detail', smsId], queryFn: () => getSms(smsId) });
  const tx = useQuery({ queryKey: ['transactions', 'detail', transactionId], queryFn: () => getTransaction(transactionId) });
  const [confirmed, setConfirmed] = useState(false);
  const [serverMismatch, setServerMismatch] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditWarning, setCreditWarning] = useState(false);
  const busy = useRef(false);

  const back = () => router.replace(`/transactions/${transactionId}`);
  const m = useMutation({
    mutationFn: () => assignSms(smsId, transactionId, confirmed),
    onSuccess: async (r) => {
      await Promise.all([qc.invalidateQueries({ queryKey: ['sms'] }), qc.invalidateQueries({ queryKey: ['transactions'] })]);
      if (r.creditSucceeded) back();
      else setCreditWarning(true);
    },
    onError: (e) => {
      const { message, code } = errorInfo(e);
      if (code === 'PHONE_MISMATCH') setServerMismatch(true);
      setError(message);
    },
    onSettled: () => {
      busy.current = false;
    },
  });

  const s = sms.data;
  const t = tx.data;
  if (!s || !t) {
    return (
      <SafeAreaView style={styles.root}>
        {sms.isError || tx.isError ? <Text style={styles.err}>Données introuvables</Text> : <ActivityIndicator color={colors.greenText} />}
      </SafeAreaView>
    );
  }

  const amountDiff = s.montant == null || Number(s.montant) !== Number(t.montant);
  const phoneDiff = serverMismatch || (!!s.telephone && !!t.numeroTelephone && !phonesMatch(s.telephone, t.numeroTelephone));
  const disabled = m.isPending || creditWarning || amountDiff || (phoneDiff && !confirmed);
  const submit = () => {
    if (busy.current || disabled) return;
    busy.current = true;
    setError(null);
    m.mutate();
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Attribuer le SMS à la transaction</Text>
        <View style={styles.sides}>
          <Side
            title="SMS"
            rows={[
              { label: 'Montant', value: fmtMontant(s.montant), flag: amountDiff },
              { label: 'Téléphone', value: s.telephone || '—', flag: phoneDiff },
              { label: 'Référence', value: s.reference || '—' },
              { label: 'Reçu le', value: new Date(s.receivedAt).toLocaleString('fr-FR') },
            ]}
          />
          <Side
            title="Transaction"
            rows={[
              { label: 'Client', value: t.userName || '—' },
              { label: 'Montant', value: fmtMontant(t.montant), flag: amountDiff },
              { label: 'Téléphone', value: t.numeroTelephone || '—', flag: phoneDiff },
              { label: 'Créée le', value: new Date(t.createdAt).toLocaleString('fr-FR') },
            ]}
          />
        </View>

        {amountDiff ? <Text style={styles.err}>Le montant du SMS est différent de celui de la transaction.</Text> : null}
        {phoneDiff ? (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: confirmed }}
            style={styles.check}
            onPress={() => setConfirmed((c) => !c)}>
            {confirmed ? <CheckSquare color={colors.greenText} size={24} /> : <Square color={colors.textSecondary} size={24} />}
            <Text style={styles.checkText}>Je confirme que ce paiement appartient à ce client</Text>
          </Pressable>
        ) : null}
        {error ? <Text style={styles.err}>{error}</Text> : null}

        {creditWarning ? (
          <>
            <Text style={styles.warn}>Paiement attribué, mais le crédit 1XBET reste à traiter.</Text>
            <Pressable accessibilityRole="button" style={styles.button} onPress={back}>
              <Text style={styles.buttonText}>Continuer</Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            style={[styles.button, disabled && styles.buttonOff]}
            onPress={submit}>
            {m.isPending ? <ActivityIndicator color="#000000" /> : <Text style={styles.buttonText}>Confirmer l’attribution</Text>}
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 12 },
  sides: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  side: { flexGrow: 1, flexBasis: 240, marginBottom: 0 },
  sideTitle: { fontWeight: '700', color: colors.text, marginBottom: 8 },
  field: { marginBottom: 6, padding: 4, borderRadius: 8 },
  flag: { backgroundColor: '#FFE3B3' },
  label: { color: colors.textSecondary, fontSize: 13 },
  value: { color: colors.text, fontSize: 15, fontWeight: '600' },
  check: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  checkText: { flex: 1, color: colors.text, fontWeight: '600' },
  err: { color: colors.errorText, marginTop: 12 },
  warn: { color: colors.warningText, fontWeight: '700', marginTop: 12 },
  button: { backgroundColor: colors.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  buttonOff: { opacity: 0.4 },
  buttonText: { color: '#000000', fontWeight: '700', fontSize: 16 },
});
