import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { PrimaryButton } from '@/components/auth/buttons';
import { AuthField } from '@/components/auth/field';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';

export default function Register() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 48, 420);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);

  const canSubmit =
    fullName.trim().length > 1 && username.trim().length > 2 && email.trim().length > 3 && password.length >= 6;

  const handleRegister = async () => {
    if (!canSubmit) return;

    const result = await register({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      username: username.trim().toLowerCase(),
    });

    if (result.error) return;

    if (result.needsEmailConfirmation) {
      Alert.alert('Confirm your email', 'We sent you a confirmation link — verify it, then log in.');
      router.replace('/login');
      return;
    }

    router.replace('/(tabs)/profile');
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
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Set up your profile to start splitting expenses.</Text>
          </View>

          <View style={styles.form}>
            <AuthField label="Full name" placeholder="Jamie Rivera" value={fullName} onChangeText={setFullName} autoCapitalize="words" textContentType="name" />
            <AuthField
              label="Username"
              placeholder="jamierivera"
              helperText="This is how friends will find and split with you."
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
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
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              isPassword
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <PrimaryButton label="Create Account" onPress={handleRegister} loading={isLoading} disabled={!canSubmit} />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/login">
              <Text style={styles.footerLink}>Log in</Text>
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
