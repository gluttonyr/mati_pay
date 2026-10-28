import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';

import { colors } from '@/theme/colors';

const tones = {
  success: { bg: colors.green, fg: '#000000' },
  warning: { bg: '#FFE3B3', fg: colors.warningText },
  error: { bg: '#FFD6D6', fg: colors.errorText },
  neutral: { bg: colors.border, fg: colors.textSecondary },
} as const;

export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: keyof typeof tones }) {
  const t = tones[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Text style={[styles.text, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  text: { fontSize: 12, fontWeight: '600' },
});
