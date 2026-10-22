import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fmtMontant, getSms, type Sms } from '@/api/sms';
import { Card } from '@/components/Card';
import { StatusPill } from '@/components/StatusPill';
import { colors } from '@/theme/colors';

const STATUT: Record<Sms['statut'], { label: string; tone: 'success' | 'warning' | 'neutral' }> = {
  ATTRIBUE: { label: 'Attribué', tone: 'success' },
  A_RAPPROCHER: { label: 'À rapprocher', tone: 'warning' },
  SANS_TRANSACTION: { label: 'Sans transaction', tone: 'neutral' },
  IGNORE: { label: 'Ignoré', tone: 'neutral' },
};

function origine(s: Sms) {
  if (s.origineAttribution === 'AUTO_MATI_PAY') return 'Validé automatiquement par Mati-Pay';
  if (s.origineAttribution === 'MATISTORE') return 'Déjà validé par MatiStore';
  if (s.origineAttribution === 'MANUEL') return `Attribué par ${s.attribuePar ?? 'un administrateur'}`;
  return null;
}

const fmtDate = (d: string) => new Date(d).toLocaleString('fr-FR');

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || '—'}</Text>
    </View>
  );
}

export default function SmsDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const q = useQuery({ queryKey: ['sms', 'detail', id], queryFn: () => getSms(id) });
  const s = q.data;

  if (!s) {
    return (
      <SafeAreaView style={styles.root} edges={[]}>
        {q.isError ? <Text style={styles.err}>SMS introuvable</Text> : <ActivityIndicator color={colors.greenText} />}
      </SafeAreaView>
    );
  }

  const st = STATUT[s.statut];
  const o = origine(s);
  return (
    <SafeAreaView style={styles.root} edges={[]}>
      <ScrollView contentContainerStyle={styles.content}>
        <StatusPill label={st.label} tone={st.tone} />
        <Card style={styles.mt}>
          <Text style={styles.label}>SMS reçu le {fmtDate(s.receivedAt)}</Text>
          <Text selectable style={styles.body}>{s.corps}</Text>
        </Card>

        <Card>
          <Field label="Expéditeur" value={s.expediteur} />
          <Field label="Opérateur" value={s.operateur} />
          <Field label="Montant" value={s.montant == null ? null : fmtMontant(s.montant)} />
          <Field label="Téléphone" value={s.telephone} />
          <Field label="Référence" value={s.reference} />
          {s.motif ? <Field label="Motif" value={s.motif} /> : null}
        </Card>

        {s.transaction ? (
          <Card accent={colors.green}>
            <Text style={styles.label}>Transaction liée</Text>
            {o ? <Text style={styles.origin}>{o}</Text> : null}
            <Field label="Client" value={s.transaction.client} />
            <Field label="Montant" value={fmtMontant(s.transaction.montant)} />
            <Field label="Téléphone" value={s.transaction.numeroTelephone} />
            <Field label="Statut" value={s.transaction.statut} />
            <Field label="Créée le" value={fmtDate(s.transaction.createdAt)} />
          </Card>
        ) : null}

        {s.statut !== 'ATTRIBUE' && s.reference ? (
          <Pressable
            accessibilityRole="button"
            style={styles.button}
            onPress={() => router.push(`/transactions?selectForSms=${s.trackingId}`)}>
            <Text style={styles.buttonText}>Attribuer à une transaction</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16 },
  mt: { marginTop: 12 },
  body: { color: colors.text, marginTop: 6, fontSize: 15 },
  field: { marginBottom: 8 },
  label: { color: colors.textSecondary, fontSize: 13 },
  value: { color: colors.text, fontSize: 15, fontWeight: '600' },
  origin: { color: colors.greenText, fontWeight: '700', marginVertical: 6 },
  err: { color: colors.errorText, textAlign: 'center', marginTop: 24 },
  button: { backgroundColor: colors.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 6 },
  buttonText: { color: '#000000', fontWeight: '700', fontSize: 16 },
});
