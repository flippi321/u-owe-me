import { SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Colors, Fonts } from '@/constants/theme';

const owedTo = [
  { name: 'Alex', note: 'Dinner split', amount: '$84.00', due: 'Due today' },
  { name: 'Marco', note: 'Rent top-up', amount: '$128.00', due: 'Due Friday' },
  { name: 'Lina', note: 'Weekend trip', amount: '$56.00', due: 'Next week' },
];

const owed = [
  { name: 'Priya', note: 'Ride share', amount: '$21.50', due: 'Pending' },
  { name: 'Noah', note: 'Coffee run', amount: '$12.00', due: 'Paid' },
  { name: 'Jamie', note: 'Groceries', amount: '$34.75', due: 'Settled' },
];

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 780;
  const contentWidth = Math.min(width - 32, 1120);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { width: contentWidth }]}>
          <View style={styles.logoWrap}>
            <BrandMark />
          </View>

          <View style={styles.balancePanel}>
            <Text style={styles.sectionLabel}>Net Balance</Text>
            <Text style={styles.netBalance}>$428.50</Text>
            <Text style={styles.balanceCaption}>Overall amount currently owed across active groups.</Text>
          </View>

          <View style={[styles.listsWrap, isWide && styles.listsWrapWide]}>
            <View style={[styles.listPanel, isWide && styles.flexList]}>
              <Text style={styles.listTitle}>Owed to</Text>
              <View style={styles.listBody}>
                {owedTo.map((item) => (
                  <View key={item.name} style={styles.row}>
                    <View style={styles.rowLeft}>
                      <Text style={styles.rowName}>{item.name}</Text>
                      <Text style={styles.rowNote}>{item.note}</Text>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={styles.rowAmount}>{item.amount}</Text>
                      <Text style={styles.rowDue}>{item.due}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={[styles.listPanel, isWide && styles.flexList]}>
              <Text style={styles.listTitle}>Owed</Text>
              <View style={styles.listBody}>
                {owed.map((item) => (
                  <View key={item.name} style={styles.row}>
                    <View style={styles.rowLeft}>
                      <Text style={styles.rowName}>{item.name}</Text>
                      <Text style={styles.rowNote}>{item.note}</Text>
                    </View>
                    <View style={styles.rowRight}>
                      <Text style={styles.rowAmount}>{item.amount}</Text>
                      <Text style={styles.rowDue}>{item.due}</Text>
                    </View>
                  </View>
                ))}
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
    paddingVertical: 18,
    paddingBottom: 36,
  },
  container: {
    gap: 18,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  balancePanel: {
    borderRadius: 32,
    padding: 22,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    shadowColor: Colors.light.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
    alignItems: 'center',
  },
  sectionLabel: {
    color: Colors.light.accent,
    fontSize: 12,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  netBalance: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 42,
    lineHeight: 48,
    textAlign: 'center',
  },
  balanceCaption: {
    color: Colors.light.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 420,
    marginTop: 8,
  },
  listsWrap: {
    gap: 14,
  },
  listsWrapWide: {
    flexDirection: 'row',
  },
  flexList: {
    flex: 1,
  },
  listPanel: {
    borderRadius: 28,
    padding: 18,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
  },
  listTitle: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 22,
    marginBottom: 14,
  },
  listBody: {
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.line,
  },
  rowLeft: {
    flex: 1,
    gap: 3,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  rowName: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 16,
  },
  rowNote: {
    color: Colors.light.textMuted,
    fontSize: 13,
  },
  rowAmount: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 16,
  },
  rowDue: {
    color: Colors.light.textMuted,
    fontSize: 12,
  },
});
