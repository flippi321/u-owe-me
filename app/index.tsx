import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { SummaryCard } from '@/components/summary-card';
import { Colors, Fonts } from '@/constants/theme';

const summaryCards = [
  {
    label: 'Total owed',
    value: '$428.50',
    detail: 'Across 6 active conversations and 3 shared bills.',
    tone: 'accent' as const,
  },
  {
    label: 'Settled this week',
    value: '$312.00',
    detail: 'Three repayments marked complete in the mock ledger.',
    tone: 'sage' as const,
  },
  {
    label: 'Open groups',
    value: '4',
    detail: 'Dinner, rent, travel, and errands remain active.',
    tone: 'neutral' as const,
  },
];

const balances = [
  { name: 'Alex', context: 'Dinner split', amount: '$84.00', due: 'Due today', tone: 'accent' },
  { name: 'Priya', context: 'Ride share', amount: '$21.50', due: 'Pending', tone: 'sage' },
  { name: 'Marco', context: 'Rent top-up', amount: '$128.00', due: 'Due Friday', tone: 'accent' },
  { name: 'Noah', context: 'Coffee run', amount: '$12.00', due: 'Paid', tone: 'sage' },
];

const activity = [
  { title: 'Dinner at Vale', note: 'You covered the full check for 4 people.', amount: '$96.00', time: '2h ago' },
  { title: 'Taxi back home', note: 'Split evenly between you and Priya.', amount: '$21.50', time: 'Yesterday' },
  { title: 'Apartment rent', note: 'Marco sent his share of the shared month.', amount: '$128.00', time: 'Mon' },
];

const actions = ['Add expense', 'Request payment', 'View groups'];

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const contentWidth = Math.min(width - 32, 1120);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { width: contentWidth }]}>
          <View style={styles.heroSection}>
            <Text style={styles.kicker}>U OWE ME</Text>
            <View style={styles.heroRow}>
              <View style={styles.heroCopy}>
                <Text style={styles.title}>Keep shared money calm, visible, and easy to settle.</Text>
                <Text style={styles.subtitle}>
                  Mock data only. Designed to scale cleanly across phones and tablets while keeping the
                  warm editorial feel from the attached HTML.
                </Text>
              </View>
              <View style={styles.markWrap}>
                <BrandMark />
              </View>
            </View>
          </View>

          <View style={styles.summaryRow}>
            {summaryCards.map((card) => (
              <SummaryCard key={card.label} {...card} />
            ))}
          </View>

          <View style={[styles.grid, isWide && styles.gridWide]}>
            <View style={[styles.panel, styles.balancesPanel]}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>Balances</Text>
                <Text style={styles.panelHint}>Live mock ledger</Text>
              </View>

              <View style={styles.list}>
                {balances.map((item) => (
                  <View key={item.name} style={styles.balanceRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{item.name.slice(0, 1)}</Text>
                    </View>
                    <View style={styles.balanceCopy}>
                      <Text style={styles.balanceName}>{item.name}</Text>
                      <Text style={styles.balanceContext}>{item.context}</Text>
                    </View>
                    <View style={styles.balanceMeta}>
                      <Text style={styles.balanceAmount}>{item.amount}</Text>
                      <Text style={[styles.balanceDue, item.tone === 'accent' ? styles.dueAccent : styles.dueSage]}>
                        {item.due}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.sideColumn}>
              <View style={[styles.panel, styles.actionsPanel]}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>Quick actions</Text>
                  <Text style={styles.panelHint}>Prototype controls</Text>
                </View>
                <View style={styles.actionsRow}>
                  {actions.map((action, index) => (
                    <Pressable
                      key={action}
                      style={[
                        styles.actionButton,
                        index === 0 ? styles.actionPrimary : styles.actionSecondary,
                      ]}>
                      <Text style={index === 0 ? styles.actionPrimaryText : styles.actionSecondaryText}>
                        {action}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={[styles.panel, styles.activityPanel]}>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelTitle}>Recent activity</Text>
                  <Text style={styles.panelHint}>Mock timeline</Text>
                </View>

                <View style={styles.activityList}>
                  {activity.map((item) => (
                    <View key={item.title} style={styles.activityRow}>
                      <View style={styles.activityDot} />
                      <View style={styles.activityCopy}>
                        <View style={styles.activityTopRow}>
                          <Text style={styles.activityTitle}>{item.title}</Text>
                          <Text style={styles.activityAmount}>{item.amount}</Text>
                        </View>
                        <Text style={styles.activityNote}>{item.note}</Text>
                        <Text style={styles.activityTime}>{item.time}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
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
    paddingVertical: 20,
    paddingBottom: 36,
  },
  container: {
    gap: 22,
  },
  heroSection: {
    gap: 18,
    padding: 20,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 248, 239, 0.72)',
    borderWidth: 1,
    borderColor: Colors.light.line,
  },
  kicker: {
    color: Colors.light.accent,
    fontSize: 12,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
  },
  heroRow: {
    gap: 20,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  heroCopy: {
    flex: 1,
    minWidth: 260,
    gap: 12,
  },
  title: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 34,
    lineHeight: 40,
    maxWidth: 640,
  },
  subtitle: {
    color: Colors.light.textMuted,
    fontSize: 15,
    lineHeight: 23,
    maxWidth: 640,
  },
  markWrap: {
    flexGrow: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  grid: {
    gap: 14,
  },
  gridWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  panel: {
    borderRadius: 28,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    padding: 18,
    shadowColor: Colors.light.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
  },
  balancesPanel: {
    flex: 1.15,
  },
  sideColumn: {
    flex: 0.85,
    gap: 14,
  },
  actionsPanel: {
    gap: 14,
  },
  activityPanel: {
    gap: 14,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  panelTitle: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 22,
  },
  panelHint: {
    color: Colors.light.textMuted,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  list: {
    gap: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.line,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.accentSoft,
  },
  avatarText: {
    color: Colors.light.accent,
    fontFamily: Fonts.serif,
    fontSize: 18,
  },
  balanceCopy: {
    flex: 1,
    gap: 4,
  },
  balanceName: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '600',
  },
  balanceContext: {
    color: Colors.light.textMuted,
    fontSize: 13,
  },
  balanceMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  balanceAmount: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 18,
  },
  balanceDue: {
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  dueAccent: {
    color: Colors.light.accent,
  },
  dueSage: {
    color: Colors.light.sage,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionPrimary: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  actionSecondary: {
    backgroundColor: Colors.light.surfaceAlt,
    borderColor: Colors.light.line,
  },
  actionPrimaryText: {
    color: '#FFF9F4',
    fontWeight: '700',
  },
  actionSecondaryText: {
    color: Colors.light.text,
    fontWeight: '600',
  },
  activityList: {
    gap: 14,
  },
  activityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 7,
    backgroundColor: Colors.light.sage,
  },
  activityCopy: {
    flex: 1,
    gap: 6,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.line,
  },
  activityTopRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  activityTitle: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 15,
    fontWeight: '600',
  },
  activityAmount: {
    color: Colors.light.accent,
    fontFamily: Fonts.serif,
    fontSize: 16,
  },
  activityNote: {
    color: Colors.light.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  activityTime: {
    color: Colors.light.sage,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});