import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Pressable';
import { Text, TextInput } from '@/components/Text';

import { fmtMontant, listSms, type Sms, type SmsStatut } from '@/api/sms';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { usePollWhileFocused } from '@/hooks/usePollWhileFocused';
import { colors } from '@/theme/colors';
import { listLocalQueue } from '../../../../modules/sms-reader';

type Filter = SmsStatut | 'TOUS' | 'FILE';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'TOUS', label: 'Tous' },
  { key: 'ATTRIBUE', label: 'Attribués' },
  { key: 'SANS_TRANSACTION', label: 'Sans transaction' },
  { key: 'A_RAPPROCHER', label: 'À rapprocher' },
  { key: 'IGNORE', label: 'Ignorés' },
  { key: 'FILE', label: 'En file' },
];

const ACCENT: Record<SmsStatut, string> = {
  ATTRIBUE: colors.green,
  A_RAPPROCHER: colors.warning,
  SANS_TRANSACTION: colors.textSecondary,
  IGNORE: colors.textSecondary,
};

const LIMIT = 20;

export default function SmsList() {
  const router = useRouter();
  const { statut } = useLocalSearchParams<{ statut?: string }>();
  // Home links here with ?statut=...: preselect it, until the user picks another chip.
  const [picked, setPicked] = useState<{ key: Filter; param?: string } | null>(null);
  const fromParam = FILTERS.find((f) => f.key === statut)?.key;
  const filter = picked && picked.param === statut ? picked.key : (fromParam ?? 'TOUS');
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setSearch(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  const remote = filter !== 'FILE';
  const q = useInfiniteQuery({
    queryKey: ['sms', filter, search],
    enabled: remote,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listSms({
        page: pageParam,
        limit: LIMIT,
        statut: filter === 'TOUS' ? undefined : (filter as SmsStatut),
        search: search || undefined,
      }),
    getNextPageParam: (last, pages) => (pages.length * LIMIT < last.total ? pages.length + 1 : undefined),
  });
  const queue = useQuery({ queryKey: ['sms-local-queue'], enabled: !remote, queryFn: listLocalQueue, retry: false });
  // New SMS reach the server in the background: refresh without asking for a pull.
  usePollWhileFocused(() => (remote ? q.refetch() : queue.refetch()));

  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  const header = (
    <View style={styles.header}>
      <TextInput
        style={styles.search}
        placeholder="Rechercher (référence, expéditeur, numéro)"
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
            onPress={() => setPicked({ key: f.key, param: statut })}
            style={[styles.chip, filter === f.key && styles.chipOn]}>
            <Text style={[styles.chipText, filter === f.key && styles.chipTextOn]}>{f.label}</Text>
          </Pressable>
        )}
      />
    </View>
  );

  if (!remote) {
    return (
      <Screen title="SMS">
        {header}
        {queue.isLoading ? (
          <ActivityIndicator color={colors.greenText} />
        ) : queue.isError ? (
          <Text style={styles.empty}>File locale indisponible sur cette plateforme</Text>
        ) : (
          <FlatList
            data={queue.data}
            keyExtractor={(m) => m.fingerprint}
            ListEmptyComponent={<Text style={styles.empty}>Aucun SMS en file</Text>}
            renderItem={({ item: m }) => (
              <Card accent={colors.warning}>
                <Text style={styles.sender}>{m.expediteur}</Text>
                <Text style={styles.meta}>{new Date(m.receivedAt).toLocaleString('fr-FR')}</Text>
                <Text style={styles.body} numberOfLines={3}>{m.corps}</Text>
                {m.derniereErreur ? <Text style={styles.err}>{m.derniereErreur}</Text> : null}
              </Card>
            )}
          />
        )}
      </Screen>
    );
  }

  return (
    <Screen title="SMS">
      <FlatList
        data={items}
        keyExtractor={(s) => s.trackingId}
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
              {q.isError ? 'Chargement impossible. Tirez pour réessayer.' : 'Aucun SMS'}
            </Text>
          )
        }
        ListFooterComponent={q.isFetchingNextPage ? <ActivityIndicator color={colors.greenText} /> : undefined}
        renderItem={({ item: s }: { item: Sms }) => (
          <Pressable accessibilityRole="button" onPress={() => router.push(`/sms/${s.trackingId}`)}>
            <Card accent={ACCENT[s.statut]}>
              <View style={styles.row}>
                <Text style={styles.sender}>{s.expediteur}</Text>
                <Text style={styles.amount}>{fmtMontant(s.montant)}</Text>
              </View>
              <Text style={styles.meta}>{new Date(s.receivedAt).toLocaleString('fr-FR')}</Text>
              {s.reference ? <Text style={styles.meta}>Réf. {s.reference}</Text> : null}
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.bg },
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
  chipTextOn: { color: '#000000' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  sender: { color: colors.text, fontWeight: '700', fontSize: 15 },
  amount: { color: colors.greenText, fontWeight: '700' },
  meta: { color: colors.textSecondary, marginTop: 2, fontSize: 13 },
  body: { color: colors.text, marginTop: 6 },
  err: { color: colors.errorText, marginTop: 6, textAlign: 'center' },
  empty: { color: colors.textSecondary, textAlign: 'center', marginTop: 24 },
});
