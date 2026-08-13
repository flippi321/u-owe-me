import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

export default function AsahiWheel() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.backButton}>
        <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.light.text} />
      </Pressable>

      <View style={styles.container}>
        <Text style={styles.title}>Asahi Wheel</Text>
        <Text style={styles.caption}>Coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
    marginTop: 18,
    marginLeft: 18,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 20,
    color: Colors.light.text,
  },
  caption: {
    color: Colors.light.textMuted,
    fontSize: 14,
  },
});
