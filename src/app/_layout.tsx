import {
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/montserrat';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { AnimatedSplash } from '@/components/AnimatedSplash';
import { SessionProvider, useSession } from '@/session/SessionProvider';

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

function RootNavigator() {
  const { token, loading: sessionLoading } = useSession();
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
    Montserrat_800ExtraBold,
  });
  // A font that fails to load falls back to the system font rather than blocking the app.
  const loading = sessionLoading || (!fontsLoaded && !fontError);
  const [splash, setSplash] = useState(true);
  const endSplash = useCallback(() => setSplash(false), []);

  // The native splash (same logo, white) hands over at once to the animated one.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      {loading ? null : <Routes token={token} />}
      {splash ? <AnimatedSplash ready={!loading} onFinish={endSplash} /> : null}
    </View>
  );
}

function Routes({ token }: { token: string | null }) {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!token}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="assign" options={{ headerShown: true, title: 'Attribution', presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!token}>
        <Stack.Screen name="login" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </SessionProvider>
    </QueryClientProvider>
  );
}
