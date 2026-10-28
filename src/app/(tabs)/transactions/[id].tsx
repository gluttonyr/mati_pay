import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Pressable';
import { Text, TextInput } from '@/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fmtMontant, listSms, smsCandidates, type Sms } from '@/api/sms';
import { getTransaction, STATUT_LABEL } from '@/api/transactions';
import { Card } from '@/components/Card';
import { StatusPill } from '@/components/StatusPill';
import { MANUAL_ASSIGN_ENABLED } from '@/config/features';
import { colors } from '@/theme/colors';

const fmtDate = (d: string) => new Date(d).toLocaleString('fr-FR');

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || '—'}</Text>
    </View>
  );
}

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [searching, setSearching] = useState(false);
  const [free, setFree] = useState(false);
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setTerm(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const tx = useQuery({ queryKey: ['transactions', 'detail', id], queryFn: () => getTransaction(id) });
  const linked = useQuery({ queryKey: ['sms', 'linked', id], queryFn: () => listSms({ page: 1, limit: 5, transactionId: id }) });
  const t = tx.data;
  const validated = t?.statut === 'VALIDEE';
  const candidates = useQuery({
    queryKey: ['sms', 'candidates', id],
    enabled: searching && !!t && !validated,
    queryFn: () => smsCandidates(id),
  });
  const freeRes = useQuery({
    queryKey: ['sms', 'free', term],
    enabled: searching && free && term.length > 0,
    queryFn: () => listSms({ page: 1, limit: 20, search: term }),
  });

  if (!t) {
    return (
      <SafeAreaView style={styles.root} edges={[]}>
        {tx.isError ? <Text style={styles.err}>Transaction introuvable</Text> : <ActivityIndicator color={colors.greenText} />}
      </SafeAreaView>
    );
  }

  const st = STATUT_LABEL[t.statut] ?? { label: t.statut, tone: 'neutral' as const };
  const assign = (s: Sms) => router.push(`/assign?smsId=${s.trackingId}&transactionId=${id}`);
  const smsRow = (s: Sms) => (
    <Pressable key={s.trackingId} accessibilityRole="button" onPress={() => assign(s)}>
      <Card>
        <Text style={styles.value}>{s.expediteur} · {fmtMontant(s.montant)}</Text>
        <Text style={styles.label}>{fmtDate(s.receivedAt)}</Text>
        <Text style={styles.label}>Réf. {s.reference ?? '—'} · {s.telephone ?? '—'}</Text>
      </Card>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <ScrollView contentContainerStyle={styles.content}>
        <StatusPill label={st.label} tone={st.tone} />
        <Card style={styles.mt}>
          <Field label="Client" value={t.userName} />
          <Field label="Montant" value={fmtMontant(t.montant)} />
          <Field label="Type" value={t.type === 'DEPOT' ? 'Dépôt' : 'Retrait'} />
          <Field label="Opérateur" value={t.operateur} />
          <Field label="Numéro" value={t.numeroTelephone} />
          <Field label="Référence" value={t.referencePaiement} />
          <Field label="Créée le" value={fmtDate(t.createdAt)} />
          {t.motifRejet ? <Field label="Motif du refus" value={t.motifRejet} /> : null}
        </Card>

        <Text style={styles.section}>SMS lié</Text>
        {linked.isLoading ? (
          <ActivityIndicator color={colors.greenText} />
        ) : linked.data?.items.length ? (
          linked.data.items.map((s) => (
            <Card key={s.trackingId} accent={colors.green}>
              <Text style={styles.value}>{s.expediteur} · {fmtMontant(s.montant)}</Text>
              <Text style={styles.label}>{fmtDate(s.receivedAt)}</Text>
              <Text selectable style={styles.body}>{s.corps}</Text>
            </Card>
          ))
        ) : (
          <Text style={styles.label}>Aucun SMS lié</Text>
        )}

        {MANUAL_ASSIGN_ENABLED && !validated ? (
          <>
            <Pressable accessibilityRole="button" style={styles.button} onPress={() => setSearching(true)}>
              <Text style={styles.buttonText}>Chercher un SMS</Text>
            </Pressable>
            {searching ? (
              <View style={styles.mt}>
                <Text style={styles.section}>SMS proposés</Text>
                {candidates.isLoading ? <ActivityIndicator color={colors.greenText} /> : null}
                {candidates.isError ? <Text style={styles.err}>Chargement impossible</Text> : null}
                {candidates.data?.length === 0 ? <Text style={styles.label}>Aucun SMS candidat</Text> : null}
                {candidates.data?.map(smsRow)}
                <Pressable accessibilityRole="button" style={styles.linkBtn} onPress={() => setFree(true)}>
                  <Text style={styles.linkText}>Recherche libre</Text>
                </Pressable>
                {free ? (
                  <>
                    <TextInput
                      style={styles.search}
                      placeholder="Référence, expéditeur, numéro"
                      placeholderTextColor={colors.textSecondary}
                      value={input}
                      onChangeText={setInput}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {freeRes.isLoading ? <ActivityIndicator color={colors.greenText} /> : null}
                    {freeRes.data?.items.filter((s) => s.statut !== 'ATTRIBUE').map(smsRow)}
                  </>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  mt: { marginTop: 12 },
  section: { color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 8, marginBottom: 8 },
  body: { color: colors.text, marginTop: 6, fontSize: 15 },
  field: { marginBottom: 8 },
  label: { color: colors.textSecondary, fontSize: 13 },
  value: { color: colors.text, fontSize: 15, fontWeight: '600' },
  err: { color: colors.errorText, textAlign: 'center', marginTop: 12 },
  search: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginVertical: 8 },
  button: { backgroundColor: colors.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  buttonText: { color: '#000000', fontWeight: '700', fontSize: 16 },
  linkBtn: { paddingVertical: 10, alignItems: 'center' },
  linkText: { color: colors.greenText, fontWeight: '700' },
});
