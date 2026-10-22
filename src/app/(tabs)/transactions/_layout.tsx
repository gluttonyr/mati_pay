import { Stack } from 'expo-router';

import { colors } from '@/theme/colors';

export default function TransactionsLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerTintColor: colors.text }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Détail de la transaction' }} />
    </Stack>
  );
}
