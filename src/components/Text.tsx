import type { ComponentProps } from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet, type TextStyle } from 'react-native';

// Custom fonts ignore fontWeight on Android, so each weight is its own family (loaded in app/_layout).
const FAMILY: Record<string, string> = {
  '400': 'Montserrat_400Regular',
  normal: 'Montserrat_400Regular',
  '500': 'Montserrat_500Medium',
  '600': 'Montserrat_600SemiBold',
  '700': 'Montserrat_700Bold',
  bold: 'Montserrat_700Bold',
  '800': 'Montserrat_800ExtraBold',
  '900': 'Montserrat_800ExtraBold',
};

function withFont<S>(style: S) {
  const flat = (StyleSheet.flatten(style as never) ?? {}) as TextStyle;
  if (flat.fontFamily) return style;
  return [style, { fontFamily: FAMILY[String(flat.fontWeight ?? '400')] ?? FAMILY['400'], fontWeight: undefined }];
}

// React 19: `ref` is a plain prop, passed through with the rest.
export function Text({ style, ...props }: ComponentProps<typeof RNText>) {
  return <RNText {...props} style={withFont(style) as never} />;
}

export function TextInput({ style, ...props }: ComponentProps<typeof RNTextInput>) {
  return <RNTextInput {...props} style={withFont(style) as never} />;
}
