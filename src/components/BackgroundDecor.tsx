import { BadgeCheck, Coins, MessageSquareText, Smartphone, Wallet, Zap } from 'lucide-react-native';
import { StyleSheet, View, type DimensionValue } from 'react-native';

import { colors } from '@/theme/colors';

type Spot = { Icon: typeof Wallet; top: DimensionValue; left?: DimensionValue; right?: DimensionValue; size: number; rotate: string; green?: boolean };

// Faint payment motifs scattered behind the content; purely decorative.
const SPOTS: Spot[] = [
  { Icon: MessageSquareText, top: '14%', right: '6%', size: 34, rotate: '12deg', green: true },
  { Icon: Coins, top: '32%', left: '4%', size: 28, rotate: '-14deg' },
  { Icon: BadgeCheck, top: '52%', right: '10%', size: 30, rotate: '8deg' },
  { Icon: Wallet, top: '70%', left: '8%', size: 32, rotate: '10deg', green: true },
  { Icon: Smartphone, top: '86%', right: '18%', size: 28, rotate: '-10deg' },
  { Icon: Zap, top: '22%', left: '42%', size: 22, rotate: '18deg' },
];

export function BackgroundDecor() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" importantForAccessibility="no-hide-descendants" aria-hidden>
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBottom]} />
      {SPOTS.map(({ Icon, size, rotate, green, ...pos }, i) => (
        <View key={i} style={[styles.spot, pos, { transform: [{ rotate }], opacity: green ? 0.22 : 0.08 }]}>
          <Icon size={size} color={green ? colors.greenText : colors.text} strokeWidth={1.6} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  spot: { position: 'absolute' },
  blob: { position: 'absolute', backgroundColor: colors.green, opacity: 0.12, borderRadius: 999 },
  blobTop: { width: 220, height: 220, top: -90, right: -80 },
  blobBottom: { width: 260, height: 260, bottom: -120, left: -110 },
});
