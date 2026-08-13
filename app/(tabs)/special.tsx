import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, SecondaryButton } from '@/components/auth/buttons';
import { Colors, Fonts } from '@/constants/theme';

export default function Special() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="alert-outline" size={34} color={Colors.light.accent} />
        </View>

        <Text style={styles.title}>Content warning</Text>
        <Text style={styles.body}>
          The following page contains content that may be considered <Text style={styles.bodyBold}>Haram</Text>. Do
          you want to continue?
        </Text>

        <View style={styles.actions}>
          <View style={styles.actionButton}>
            <SecondaryButton label="No" onPress={() => router.replace('/(tabs)')} />
          </View>
          <View style={styles.actionButton}>
            <PrimaryButton label="Yes" onPress={() => router.push('/casino')} />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.accentSoft,
    marginBottom: 8,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    color: Colors.light.text,
  },
  body: {
    color: Colors.light.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 340,
    marginTop: 4,
    marginBottom: 20,
  },
  bodyBold: {
    fontWeight: '700',
    color: Colors.light.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 320,
  },
  actionButton: {
    flex: 1,
  },
});
