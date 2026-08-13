import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { AuthField } from '@/components/auth/field';
import { PrimaryButton } from '@/components/auth/buttons';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';

export default function Login() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 48, 420);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);

  const canSubmit = email.trim().length > 3 && password.length > 0;

  const handleLogin = async () => {
    if (!canSubmit) return;
    const result = await login(email.trim(), password);
    if (!result.error) router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { width: contentWidth }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.light.text} />
          </Pressable>

          <View style={styles.headerBlock}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to continue splitting bills.</Text>
          </View>

          <View style={styles.form}>
            <AuthField
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <AuthField
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              isPassword
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
            />

            <Pressable
              onPress={() => Alert.alert('Check your inbox', 'A reset link has been sent (mock).')}
              hitSlop={8}
              style={styles.forgotWrap}>
              <Text style={styles.forgotLabel}>Forgot password?</Text>
            </Pressable>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <PrimaryButton label="Log In" onPress={handleLogin} loading={isLoading} disabled={!canSubmit} />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New to U Owe Me? </Text>
            <Link href="/register">
              <Text style={styles.footerLink}>Create an account</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingBottom: 36,
  },
  container: {
    gap: 28,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
  },
  headerBlock: {
    gap: 8,
  },
  title: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 28,
  },
  subtitle: {
    color: Colors.light.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
  },
  forgotLabel: {
    color: Colors.light.accent,
    fontSize: 13,
  },
  errorText: {
    color: Colors.light.accent,
    fontSize: 13,
    textAlign: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  footerText: {
    color: Colors.light.textMuted,
    fontSize: 14,
  },
  footerLink: {
    color: Colors.light.accent,
    fontFamily: Fonts.serif,
    fontSize: 14,
  },
});
