import { Colors, Fonts } from '@/constants/theme';
import React from 'react';
import { SafeAreaView, StyleSheet, Text } from 'react-native';

export default function Plus() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Add</Text>
      <Text style={styles.note}>Create a new expense, request, or group (mock).</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: Fonts.serif, fontSize: 20, color: Colors.light.text },
  note: { color: Colors.light.textMuted, marginTop: 8 },
});
