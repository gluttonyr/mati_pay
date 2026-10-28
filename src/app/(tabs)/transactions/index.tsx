import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Pressable';
import { Text, TextInput } from '@/components/Text';

import { fmtMontant, getSms } from '@/api/sms';
import { listTransactions, STATUT_LABEL, type ListTransactionsParams, type Transaction } from '@/api/transactions';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { usePollWhileFocused } from '@/hooks/usePollWhileFocused';
import { colors } from '@/theme/colors';

type Filter = 'TOUS' | 'A_RAPPROCHER' | 'EN_ATTENTE' | 'VALIDEE' | 'REJETEE';

const FILTERS: { key: Filter; label: string; params: Partial<ListTransactionsParams> }[] = [
  { key: 'TOUS', label: 'Toutes', params: {} },
  { key: 'A_RAPPROCHER', label: 'À rapprocher', params: { captureReconciliation: true, type: 'DEPOT' } },
  { key: 'EN_ATTENTE', label: 'En attente', params: { open: true } },
  { key: 'VALIDEE', label: 'Validées', params: { status: 'VALIDEE' } },
  { key: 'REJETEE', label: 'Refusées', params: { status: 'REJETEE' } },
];

const LIMIT = 20;

export default function TransactionsList() {
  const router = useRouter();
  const { filtre, selectForSms } = useLocalSearchParams<{ filtre?: string; selectForSms?: string }>();
  // Links carry ?filtre=...: follow it live, until the user picks another chip.
  const [picked, setPicked] = useState<{ key: Filter; param?: string } | null>(null);
  const fromParam = FILTERS.find((f) => f.key === filtre)?.key;
  const filter = picked && picked.param === filtre ? picked.key : (fromParam ?? 'TOUS');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const q = useInfiniteQuery({
    queryKey: ['transactions', filter, search],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listTransactions({
        page: pageParam,
        limit: LIMIT,
        search: search || undefined,
        ...FILTERS.find((f) => f.key === filter)!.params,
      }),
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length + 1 : undefined),
  });
  usePollWhileFocused(() => q.refetch(), 15000);
  // Selection ends once the SMS is attributed (assign invalidates ['sms'], which refetches this).
  const smsToAssign = useQuery({ queryKey: ['sms', 'detail', selectForSms], enabled: !!selectForSms, queryFn: () => getSms(selectForSms!) });
  const selecting = !!selectForSms && smsToAssign.isSuccess && smsToAssign.data.statut !== 'ATTRIBUE';
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  // A payment cannot go to a validated, cancelled or admin-rejected transaction.
  const blocked = (t: Transaction) =>
    t.statut === 'VALIDEE' || t.statut === 'ANNULEE' || (t.statut === 'REJETEE' && !!t.valideParId);
  const open = (t: Transaction) =>
    router.push(selecting ? `/assign?smsId=${selectForSms}&transactionId=${t.trackingId}` : `/transactions/${t.trackingId}`);

  const header = (
    <View style={styles.header}>
      {selecting ? <Text style={styles.banner}>Choisissez la transaction à laquelle attribuer ce SMS.</Text> : null}
      {selectForSms && smsToAssign.isLoading ? <Text style={styles.banner}>Chargement du SMS…</Text> : null}
      {selectForSms && smsToAssign.isError ? <Text style={styles.err}>SMS introuvable : sélection impossible.</Text> : null}
      <TextInput
        style={styles.search}
        placeholder="Rechercher (client, numéro, référence)"
        placeholderTextColor={colors.textSecondary}
        value={input}
        onChangeText={setInput}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={FILTERS}
        keyExtractor={(f) => f.key}
        style={styles.filters}
        renderItem={({ item: f }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f.key }}
            onPress={() => setPicked({ key: f.key, param: filtre })}
            style={[styles.chip, filter === f.key && styles.chipOn]}>
            <Text style={[styles.chipText, filter === f.key && styles.chipTextOn]}>{f.label}</Text>
          </Pressable>
        )}
      />
    </View>
  );

  return (
    <Screen title="Transactions">
      <FlatList
        data={items}
        keyExtractor={(t) => t.trackingId}
        ListHeaderComponent={header}
        stickyHeaderIndices={[0]}
        refreshing={q.isRefetching && !q.isFetchingNextPage}
        onRefresh={() => q.refetch()}
        onEndReached={() => q.hasNextPage && !q.isFetchingNextPage && q.fetchNextPage()}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          q.isLoading ? (
            <ActivityIndicator color={colors.greenText} />
          ) : (
            <Text style={q.isError ? styles.err : styles.empty}>
              {q.isError ? 'Chargement impossible. Tirez pour réessayer.' : 'Aucune transaction'}
            </Text>
          )
        }
        ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator color={colors.greenText} /> : undefined}
        renderItem={({ item: t }) => {
          const st = STATUT_LABEL[t.statut] ?? { label: t.statut, tone: 'neutral' as const };
          return (
            <Pressable
              accessibilityRole="button"
              disabled={selecting && blocked(t)}
              style={selecting && blocked(t) ? styles.blocked : undefined}
              onPress={() => open(t)}>
              <Card accent={t.captureReconciliationRequired ? colors.warning : undefined}>
                <View style={styles.row}>
                  <Text style={styles.name} numberOfLines={1}>{t.userName || '—'}</Text>
                  <Text style={styles.amount}>{fmtMontant(t.montant)}</Text>
                </View>
                <Text style={styles.meta}>
                  {t.type === 'DEPOT' ? 'Dépôt' : 'Retrait'} · {t.operateur ?? '—'} · {t.numeroTelephone ?? '—'}
                </Text>
                <Text style={styles.meta}>{new Date(t.createdAt).toLocaleString('fr-FR')}</Text>
                <View style={styles.pills}>
                  <StatusPill label={st.label} tone={st.tone} />
                  {selecting && blocked(t) ? <StatusPill label="Ne peut pas recevoir ce paiement" tone="neutral" /> : null}
                  {t.captureReconciliationRequired ? <StatusPill label="À rapprocher" tone="warning" /> : null}
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.bg },
  banner: { color: colors.warningText, fontWeight: '600', marginBottom: 8 },
  search: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  filters: { marginVertical: 10, flexGrow: 0 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, backgroundColor: colors.bg },
  chipOn: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  chipTextOn: { color: colors.onGreen },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  name: { color: colors.text, fontWeight: '700', fontSize: 15, flex: 1 },
  amount: { color: colors.greenText, fontWeight: '700' },
  meta: { color: colors.textSecondary, marginTop: 2, fontSize: 13 },
  blocked: { opacity: 0.45 },
  pills: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  err: { color: colors.errorText, marginTop: 24, textAlign: 'center' },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 24 },
});
