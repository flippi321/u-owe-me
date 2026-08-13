import { Colors, Fonts } from '@/constants/theme';
import React from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';

export default function Statistics() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Statistics</Text>
      <Text style={styles.note}>Placeholder statistics screen — mock data only.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.serif, fontSize: 20, color: Colors.light.text },
  note: { color: Colors.light.textMuted, marginTop: 8 },
});
