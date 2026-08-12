import { StyleSheet, Text, View } from 'react-native';

import { Colors, Fonts } from '@/constants/theme';

type SummaryCardProps = {
  label: string;
  value: string;
  detail: string;
  tone?: 'accent' | 'sage' | 'neutral';
};

export function SummaryCard({ label, value, detail, tone = 'neutral' }: SummaryCardProps) {
  return (
    <View style={[styles.card, toneStyles[tone]]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    borderRadius: 24,
    padding: 18,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    shadowColor: Colors.light.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  label: {
    color: Colors.light.textMuted,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  value: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 28,
    lineHeight: 32,
    marginBottom: 6,
  },
  detail: {
    color: Colors.light.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});

const toneStyles = StyleSheet.create({
  accent: {
    borderColor: 'rgba(195, 74, 54, 0.35)',
    backgroundColor: 'rgba(255, 248, 239, 0.96)',
  },
  sage: {
    borderColor: 'rgba(122, 154, 126, 0.35)',
    backgroundColor: 'rgba(251, 248, 241, 0.96)',
  },
  neutral: {},
});