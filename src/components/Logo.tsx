import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme/colors';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHECK = 'M105 124 L116 135 L136 113';
const CHECK_LENGTH = 46;

function Silver({ id }: { id: string }) {
  return (
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#F4F5F7" />
        <Stop offset="0.55" stopColor="#BABEC4" />
        <Stop offset="1" stopColor="#6B7076" />
      </LinearGradient>
    </Defs>
  );
}

// The mark is three stacked layers (left leg, right leg, badge) sharing one 240x240 viewBox, so each can move alone.
export function Logo({ size = 96, animate = false, onDone }: { size?: number; animate?: boolean; onDone?: () => void }) {
  const reduced = useReducedMotion();
  const play = animate && !reduced;
  const legs = useSharedValue(play ? 0 : 1);
  const badge = useSharedValue(play ? 0 : 1);
  const check = useSharedValue(play ? 0 : 1);

  useEffect(() => {
    if (!play) {
      onDone?.();
      return;
    }
    const ease = Easing.out(Easing.cubic);
    legs.value = withTiming(1, { duration: 450, easing: ease });
    badge.value = withDelay(350, withSpring(1, { damping: 11, stiffness: 160 }));
    check.value = withDelay(650, withTiming(1, { duration: 350, easing: ease }));
    const t = setTimeout(() => onDone?.(), 1000);
    return () => clearTimeout(t);
    // Runs once per mount: the splash and login play the intro a single time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shift = size * 0.25;
  const leftStyle = useAnimatedStyle(() => ({ opacity: legs.value, transform: [{ translateX: (legs.value - 1) * shift }] }));
  const rightStyle = useAnimatedStyle(() => ({ opacity: legs.value, transform: [{ translateX: (1 - legs.value) * shift }] }));
  const badgeStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, badge.value * 2), transform: [{ scale: badge.value }] }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LENGTH * (1 - check.value) }));

  const layer = { width: size, height: size };
  return (
    <View style={layer} accessible accessibilityRole="image" accessibilityLabel="Logo Mati-Pay">
      <Animated.View style={[StyleSheet.absoluteFill, leftStyle]}>
        <Svg width={size} height={size} viewBox="0 0 240 240">
          <Silver id="mpl" />
          <Rect x="47" y="50" width="30" height="150" rx="15" fill="url(#mpl)" transform="rotate(18 62 125)" />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, rightStyle]}>
        <Svg width={size} height={size} viewBox="0 0 240 240">
          <Silver id="mpr" />
          <Rect x="163" y="50" width="30" height="150" rx="15" fill="url(#mpr)" transform="rotate(-18 178 125)" />
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, badgeStyle]}>
        <Svg width={size} height={size} viewBox="0 0 240 240">
          <Circle cx="120" cy="124" r="31" fill={colors.green} />
          <AnimatedPath
            d={CHECK}
            fill="none"
            stroke={colors.text}
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={CHECK_LENGTH}
            animatedProps={checkProps}
          />
        </Svg>
      </Animated.View>
    </View>
  );
}
