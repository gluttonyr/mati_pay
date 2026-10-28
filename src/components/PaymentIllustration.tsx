import { BadgeCheck, MessageSquareText } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Rect } from 'react-native-svg';

import { colors } from '@/theme/colors';

function useFloat(delay: number) {
  const reduced = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    const ease = Easing.inOut(Easing.sin);
    y.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(-8, { duration: 1400, easing: ease }), withTiming(0, { duration: 1400, easing: ease })), -1),
    );
  }, [delay, reduced, y]);
  return useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
}

// Phone receiving a payment SMS that turns into a validated deposit — decorative.
export function PaymentIllustration() {
  const smsFloat = useFloat(0);
  const paidFloat = useFloat(700);

  return (
    <View style={styles.box} aria-hidden importantForAccessibility="no-hide-descendants">
      <Svg width={260} height={190} viewBox="0 0 260 190">
        <Circle cx="130" cy="98" r="84" fill={colors.card} />
        <Rect x="95" y="28" width="70" height="138" rx="14" fill={colors.bg} stroke={colors.text} strokeWidth={3} />
        <Rect x="118" y="36" width="24" height="5" rx="2.5" fill={colors.text} />
        <Rect x="105" y="56" width="42" height="14" rx="7" fill={colors.border} />
        <Rect x="113" y="78" width="42" height="14" rx="7" fill={colors.green} />
        <Rect x="105" y="100" width="34" height="14" rx="7" fill={colors.border} />
        <Circle cx="130" cy="146" r="9" fill={colors.green} />
      </Svg>
      <Animated.View style={[styles.pill, styles.left, smsFloat]}>
        <MessageSquareText size={16} color={colors.text} />
        <Text style={styles.pillText}>SMS reçu</Text>
      </Animated.View>
      <Animated.View style={[styles.pill, styles.right, styles.paid, paidFloat]}>
        <BadgeCheck size={16} color={colors.onGreen} />
        <Text style={styles.pillText}>Paiement validé</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: 300, height: 190, alignSelf: 'center', alignItems: 'center' },
  pill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  left: { left: 0, top: 34 },
  right: { right: 0, bottom: 30 },
  paid: { backgroundColor: colors.green, borderColor: colors.green },
  pillText: { fontSize: 13, fontWeight: '700', color: colors.text },
});
