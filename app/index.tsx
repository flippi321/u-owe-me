import { Link, Redirect, useRouter } from 'expo-router';
import { SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Divider, SocialButton } from '@/components/auth/buttons';
import { BrandMark } from '@/components/brand-mark';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';

export default function Landing() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 48, 420);
  const session = useAuthStore((state) => state.session);

  const continueAsGuest = () => router.replace('/(tabs)');

  if (session) return <Redirect href="/(tabs)" />;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { width: contentWidth }]}>
          <View style={styles.hero}>
            <BrandMark />
            <View style={styles.hairline} />
            <Text style={styles.heading}>Split bills.{'\n'}Settle up. Stay friends.</Text>
            <Text style={styles.subheading}>
              Track shared expenses with roommates, trips, and groups — and always know who owes who.
            </Text>
          </View>

          <View style={styles.actions}>
            <SocialButton label="Continue with Apple" icon="apple" variant="dark" onPress={continueAsGuest} />
            <SocialButton label="Continue with Google" icon="google" variant="light" onPress={continueAsGuest} />

            <Divider label="or" />

            <SocialButton
              label="Continue with Email"
              icon="email-outline"
              variant="light"
              onPress={() => router.push('/login')}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>New here? </Text>
              <Link href="/register">
                <Text style={styles.footerLink}>Create an account</Text>
              </Link>
            </View>

            <Text style={styles.legal}>
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </Text>
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
    justifyContent: 'center',
    paddingVertical: 32,
  },
  container: {
    gap: 44,
  },
  hero: {
    alignItems: 'center',
    gap: 18,
  },
  hairline: {
    width: 32,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.light.accent,
  },
  heading: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 30,
    lineHeight: 36,
    textAlign: 'center',
  },
  subheading: {
    color: Colors.light.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  actions: {
    gap: 14,
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
  legal: {
    color: Colors.light.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 10,
  },
});
