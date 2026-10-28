import { ArrowRight, Lock, Mail } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Pressable } from '@/components/Pressable';
import { Text, TextInput } from '@/components/Text';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ADMIN_ONLY_MESSAGE } from '@/api/auth';
import { BackgroundDecor } from '@/components/BackgroundDecor';
import { Logo } from '@/components/Logo';
import { PaymentIllustration } from '@/components/PaymentIllustration';
import { useSession } from '@/session/SessionProvider';
import { colors } from '@/theme/colors';

export default function Login() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy || !email || !password) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(e?.message === ADMIN_ONLY_MESSAGE ? ADMIN_ONLY_MESSAGE : (e?.response?.data?.message ?? 'Connexion impossible'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.root}>
      <BackgroundDecor />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <Logo size={96} animate />
            <Text style={styles.name}>
              MATI <Text style={styles.pay}>PAY</Text>
            </Text>
            <Text style={styles.tagline}>Validation des paiements Mobile Money</Text>
          </View>

          <Animated.View entering={FadeInDown.delay(400).duration(500)}>
            <PaymentIllustration />
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(600).duration(500)} style={styles.form}>
            <Text style={styles.formTitle}>Connexion administrateur</Text>
            <View style={styles.field}>
              <Mail size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                accessibilityLabel="Email"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View style={styles.field}>
              <Lock size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                placeholder="Mot de passe"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                autoComplete="password"
                accessibilityLabel="Mot de passe"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={submit}
              />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              style={({ pressed }) => [styles.button, (busy || pressed) && { opacity: 0.75 }]}
              onPress={submit}
              disabled={busy}
              accessibilityRole="button">
              {busy ? (
                <ActivityIndicator color={colors.onGreen} />
              ) : (
                <>
                  <Text style={styles.buttonText}>Se connecter</Text>
                  <ArrowRight size={18} color={colors.onGreen} />
                </>
              )}
            </Pressable>
            <Text style={styles.hint}>Accès réservé aux administrateurs MatiStore</Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 20 },
  brand: { alignItems: 'center', gap: 6 },
  name: { fontSize: 28, fontWeight: '800', letterSpacing: 5, color: colors.text, marginTop: 4 },
  pay: { color: colors.greenText, fontWeight: '800' },
  tagline: { fontSize: 14, color: colors.textSecondary },
  form: {
    gap: 12,
    padding: 18,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.bg,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.text },
  error: { color: colors.errorText, fontSize: 14 },
  button: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    backgroundColor: colors.green,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: { color: colors.onGreen, fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, color: colors.textSecondary, textAlign: 'center' },
});
