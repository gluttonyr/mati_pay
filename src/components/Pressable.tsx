import type { ComponentProps } from 'react';
import { Pressable as RNPressable, type PressableStateCallbackType, type StyleProp, type ViewStyle } from 'react-native';

type Props = ComponentProps<typeof RNPressable>;

// Every press gets visible feedback (dim + slight shrink, ripple on Android) without each screen styling it.
const PRESSED: ViewStyle = { opacity: 0.6, transform: [{ scale: 0.98 }] };

export function Pressable({ style, android_ripple, ...props }: Props) {
  return (
    <RNPressable
      android_ripple={android_ripple ?? { color: 'rgba(0,0,0,0.08)', foreground: true }}
      {...props}
      style={(state: PressableStateCallbackType) => [
        (typeof style === 'function' ? style(state) : style) as StyleProp<ViewStyle>,
        state.pressed && !props.disabled ? PRESSED : null,
      ]}
    />
  );
}
