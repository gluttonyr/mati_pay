import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackgroundDecor } from '@/components/BackgroundDecor';
import { Logo } from '@/components/Logo';
import { colors } from '@/theme/colors';

export function Screen({ title, children }: { title?: string; children?: ReactNode }) {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <BackgroundDecor />
      {title ? (
        <View style={styles.header}>
          <View style={styles.logo}>
            <Logo size={34} />
          </View>
          <View>
            <Text style={styles.brand}>
              MATI <Text style={styles.pay}>PAY</Text>
            </Text>
            <Text style={styles.title}>{title}</Text>
          </View>
        </View>
      ) : null}
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { fontSize: 11, fontWeight: '800', letterSpacing: 2, color: colors.textSecondary },
  pay: { color: colors.greenText, fontWeight: '800' },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  body: { flex: 1, paddingHorizontal: 16 },
});
