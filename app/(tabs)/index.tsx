import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { fetchBalances, type BalanceEntry } from '@/utils/balances';
import { formatCurrency } from '@/utils/currency';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 780;
  const contentWidth = Math.min(width - 32, 1120);

  const user = useAuthStore((state) => state.user);

  const [owedTo, setOwedTo] = useState<BalanceEntry[]>([]);
  const [owed, setOwed] = useState<BalanceEntry[]>([]);
  const [netBalance, setNetBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchBalances(user.id).then((result) => {
      if (cancelled) return;
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        setOwedTo(result.data.owedToMe);
        setOwed(result.data.iOwe);
        setNetBalance(result.data.netBalance);
        setError(null);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { width: contentWidth }]}>
          <View style={styles.logoWrap}>
            <BrandMark />
          </View>

          {!user ? (
            <View style={styles.balancePanel}>
              <Text style={styles.sectionLabel}>Net Balance</Text>
              <Text style={styles.guestNote}>Sign in with email to see your real balances.</Text>
            </View>
          ) : isLoading ? (
            <View style={styles.balancePanel}>
              <ActivityIndicator color={Colors.light.accent} />
            </View>
          ) : error ? (
            <View style={styles.balancePanel}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <>
              <View style={styles.balancePanel}>
                <Text style={styles.sectionLabel}>Net Balance</Text>
                <Text
                  style={[
                    styles.netBalance,
                    netBalance > 0 && styles.netBalancePositive,
                    netBalance < 0 && styles.netBalanceNegative,
                  ]}>
                  {formatCurrency(netBalance, { signDisplay: 'exceptZero' })}
                </Text>
                <Text style={styles.balanceCaption}>Overall amount currently owed across active groups.</Text>
              </View>

              <View style={[styles.listsWrap, isWide && styles.listsWrapWide]}>
                <View style={[styles.listPanel, isWide && styles.flexList]}>
                  <Text style={styles.listTitle}>Owed to</Text>
                  {owedTo.length === 0 ? (
                    <Text style={styles.emptyNote}>Nobody owes you anything right now.</Text>
                  ) : (
                    <View style={styles.listBody}>
                      {owedTo.map((entry) => (
                        <View key={entry.profile.id} style={styles.row}>
                          <View style={styles.rowLeft}>
                            <Text style={styles.rowName}>{entry.profile.full_name ?? entry.profile.username}</Text>
                            <Text style={styles.rowNote}>
                              {entry.recordCount} unsettled {entry.recordCount === 1 ? 'expense' : 'expenses'}
                            </Text>
                          </View>
                          <Text style={styles.rowAmount}>{formatCurrency(entry.amount)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={[styles.listPanel, isWide && styles.flexList]}>
                  <Text style={styles.listTitle}>Owed</Text>
                  {owed.length === 0 ? (
                    <Text style={styles.emptyNote}>You&apos;re all settled up.</Text>
                  ) : (
                    <View style={styles.listBody}>
                      {owed.map((entry) => (
                        <View key={entry.profile.id} style={styles.row}>
                          <View style={styles.rowLeft}>
                            <Text style={styles.rowName}>{entry.profile.full_name ?? entry.profile.username}</Text>
                            <Text style={styles.rowNote}>
                              {entry.recordCount} unsettled {entry.recordCount === 1 ? 'expense' : 'expenses'}
                            </Text>
                          </View>
                          <Text style={styles.rowAmount}>{formatCurrency(entry.amount)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </>
          )}
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
    alignItems: 'flex-start',
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
  netBalancePositive: {
    color: Colors.light.sage,
  },
  netBalanceNegative: {
    color: Colors.light.accent,
  },
  balanceCaption: {
    color: Colors.light.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 420,
    marginTop: 8,
  },
  guestNote: {
    color: Colors.light.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: {
    color: Colors.light.accent,
    fontSize: 14,
    textAlign: 'center',
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
  emptyNote: {
    color: Colors.light.textMuted,
    fontSize: 14,
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
});
