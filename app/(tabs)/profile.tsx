import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';

const initialsFrom = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase())
    .slice(0, 2)
    .join('');

export default function Profile() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 32, 560);

  const profile = useAuthStore((state) => state.profile);
  const signOut = useAuthStore((state) => state.signOut);

  const memberSince = profile
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : null;

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { width: contentWidth }]}>
          {profile ? (
            <>
              <View style={styles.headerPanel}>
                {profile.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitials}>{initialsFrom(profile.full_name ?? profile.username)}</Text>
                  </View>
                )}
                <Text style={styles.fullName}>{profile.full_name}</Text>
                <Text style={styles.username}>@{profile.username}</Text>
                <Text style={styles.memberSince}>Member since {memberSince}</Text>
              </View>

              <View style={styles.panel}>
                <Text style={styles.panelTitle}>Account</Text>
                <View style={styles.row}>
                  <MaterialCommunityIcons name="account-outline" size={18} color={Colors.light.icon} />
                  <Text style={styles.rowLabel}>Username</Text>
                  <Text style={styles.rowValue}>@{profile.username}</Text>
                </View>
                <View style={styles.row}>
                  <MaterialCommunityIcons name="badge-account-outline" size={18} color={Colors.light.icon} />
                  <Text style={styles.rowLabel}>Full name</Text>
                  <Text style={styles.rowValue}>{profile.full_name}</Text>
                </View>
                <View style={[styles.row, styles.rowLast]}>
                  <MaterialCommunityIcons name="calendar-blank-outline" size={18} color={Colors.light.icon} />
                  <Text style={styles.rowLabel}>Joined</Text>
                  <Text style={styles.rowValue}>{memberSince}</Text>
                </View>
              </View>
            </>
          ) : (
            <View style={styles.headerPanel}>
              <View style={styles.avatarFallback}>
                <MaterialCommunityIcons name="account-outline" size={36} color={Colors.light.accent} />
              </View>
              <Text style={styles.fullName}>Guest</Text>
              <Text style={styles.memberSince}>Sign in with email to save your profile and expenses.</Text>
            </View>
          )}

          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [styles.signOut, pressed && styles.signOutPressed]}
            accessibilityRole="button">
            <MaterialCommunityIcons name="logout" size={18} color={Colors.light.accent} />
            <Text style={styles.signOutLabel}>{profile ? 'Sign out' : 'Back to landing'}</Text>
          </Pressable>
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
    gap: 16,
  },
  headerPanel: {
    borderRadius: 32,
    padding: 26,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    shadowColor: Colors.light.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
    alignItems: 'center',
    gap: 4,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 12,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.light.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarInitials: {
    color: Colors.light.accent,
    fontFamily: Fonts.serif,
    fontSize: 28,
  },
  fullName: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 22,
  },
  username: {
    color: Colors.light.textMuted,
    fontSize: 14,
  },
  memberSince: {
    color: Colors.light.textMuted,
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  panel: {
    borderRadius: 28,
    padding: 18,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    gap: 4,
  },
  panelTitle: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 18,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.line,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLabel: {
    flex: 1,
    color: Colors.light.textMuted,
    fontSize: 14,
  },
  rowValue: {
    color: Colors.light.text,
    fontSize: 14,
    fontFamily: Fonts.serif,
  },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.light.line,
    backgroundColor: Colors.light.surface,
  },
  signOutPressed: {
    opacity: 0.7,
  },
  signOutLabel: {
    color: Colors.light.accent,
    fontFamily: Fonts.serif,
    fontSize: 15,
  },
});
