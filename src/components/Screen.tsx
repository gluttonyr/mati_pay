import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/theme/colors';

export function Screen({ title, children }: { title?: string; children?: ReactNode }) {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, paddingHorizontal: 16, paddingVertical: 12 },
  body: { flex: 1, paddingHorizontal: 16 },
});
