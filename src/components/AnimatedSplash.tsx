import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Text } from '@/components/Text';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Logo } from '@/components/Logo';
import { colors } from '@/theme/colors';

// Plays the logo intro over the app, then fades out once the session is ready (`ready`).
export function AnimatedSplash({ ready, onFinish }: { ready: boolean; onFinish: () => void }) {
  const [introDone, setIntroDone] = useState(false);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!introDone || !ready) return;
    opacity.value = withTiming(0, { duration: 350 });
    const t = setTimeout(onFinish, 360);
    return () => clearTimeout(t);
  }, [introDone, ready, opacity, onFinish]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, style]} pointerEvents="none">
      <Logo size={160} animate onDone={() => setIntroDone(true)} />
      <Animated.View entering={FadeInDown.delay(800).duration(400)}>
        <Text style={styles.name}>
          MATI <Text style={styles.pay}>PAY</Text>
        </Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 20, zIndex: 10 },
  name: { fontSize: 30, fontWeight: '800', letterSpacing: 5, color: colors.text },
  pay: { color: colors.greenText, fontWeight: '800' },
});
