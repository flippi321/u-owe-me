import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { PrimaryButton, SecondaryButton } from '@/components/auth/buttons';
import { BrandMark } from '@/components/brand-mark';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { fetchBalances, settleUp, type BalanceEntry } from '@/utils/balances';
import { fetchCoinBalance } from '@/utils/casino';
import { formatCurrency } from '@/utils/currency';

// Display-only rounding for the settle-up popup — never written back to the DB.
const roundToNearestHundred = (amount: number) => Math.round(amount / 100) * 100;

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 780;
  const contentWidth = Math.min(width - 32, 1120);

  const user = useAuthStore((state) => state.user);

  const [owedTo, setOwedTo] = useState<BalanceEntry[]>([]);
  const [owed, setOwed] = useState<BalanceEntry[]>([]);
  const [interpersonalNetBalance, setInterpersonalNetBalance] = useState(0);
  const [asahiFundBalance, setAsahiFundBalance] = useState(0);
  // Coins bought (net of cash-outs) are yen you've handed to the Asahi Fund
  // — a debt like any other, so it comes out of the overall Net Balance.
  // Derived at render time (rather than combined once when fetched) so the
  // two numbers can never drift out of sync if one of the two fetches below
  // fails on a later refresh while the other succeeds.
  const netBalance = interpersonalNetBalance - Math.max(asahiFundBalance, 0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedEntry, setSelectedEntry] = useState<BalanceEntry | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  const loadBalances = useCallback(async (userId: string) => {
    const [balancesResult, coinResult] = await Promise.all([fetchBalances(userId), fetchCoinBalance(userId)]);

    if (balancesResult.error) {
      setError(balancesResult.error);
    } else if (balancesResult.data) {
      setOwedTo(balancesResult.data.owedToMe);
      setOwed(balancesResult.data.iOwe);
      setInterpersonalNetBalance(balancesResult.data.netBalance);
      setError(null);
    }

    if (coinResult.data !== null) setAsahiFundBalance(coinResult.data);
  }, []);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    loadBalances(user.id).then(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user, loadBalances]);

  const handleRefresh = async () => {
    if (!user) return;
    setIsRefreshing(true);
    await loadBalances(user.id);
    setIsRefreshing(false);
  };

  const openSettlePopup = (entry: BalanceEntry) => {
    setSettleError(null);
    setSelectedEntry(entry);
  };

  const closeSettlePopup = () => {
    if (isSettling) return;
    setSelectedEntry(null);
  };

  const handleConfirmPaid = async () => {
    if (!user || !selectedEntry) return;
    setIsSettling(true);
    setSettleError(null);

    const result = await settleUp(user.id, selectedEntry.profile.id);

    if (result.error) {
      setIsSettling(false);
      setSettleError(result.error);
      return;
    }

    setSelectedEntry(null);
    await loadBalances(user.id);
    setIsSettling(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.light.accent}
            colors={[Colors.light.accent]}
          />
        }>
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
                        <Pressable
                          key={entry.profile.id}
                          onPress={() => openSettlePopup(entry)}
                          accessibilityRole="button"
                          style={({ pressed }) => [styles.row, styles.rowPressable, pressed && styles.rowPressed]}>
                          <View style={styles.rowLeft}>
                            <Text style={styles.rowName}>{entry.profile.full_name ?? entry.profile.username}</Text>
                            <Text style={styles.rowNote}>
                              {entry.recordCount} unsettled {entry.recordCount === 1 ? 'expense' : 'expenses'}
                            </Text>
                          </View>
                          <Text style={styles.rowAmount}>{formatCurrency(entry.amount)}</Text>
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>

                <View style={[styles.listPanel, isWide && styles.flexList]}>
                  <Text style={styles.listTitle}>Owed</Text>
                  {owed.length === 0 && asahiFundBalance <= 0 ? (
                    <Text style={styles.emptyNote}>You&apos;re all settled up.</Text>
                  ) : (
                    <View style={styles.listBody}>
                      {asahiFundBalance > 0 ? (
                        <Pressable
                          onPress={() => router.push('/casino')}
                          accessibilityRole="button"
                          style={({ pressed }) => [styles.row, styles.rowPressable, pressed && styles.rowPressed]}>
                          <View style={styles.rowLeft}>
                            <Text style={styles.rowName}>Asahi Fund</Text>
                            <Text style={styles.rowNote}>UOME Coins bought</Text>
                          </View>
                          <Text style={styles.rowAmount}>{formatCurrency(asahiFundBalance)}</Text>
                        </Pressable>
                      ) : null}
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

      <Modal
        visible={selectedEntry !== null}
        transparent
        animationType="fade"
        onRequestClose={closeSettlePopup}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: Math.min(width - 48, 420) }]}>
            {selectedEntry ? (
              <>
                <Text style={styles.modalTitle}>
                  {selectedEntry.profile.full_name ?? selectedEntry.profile.username} owes you
                </Text>
                <Text style={styles.modalAmount}>{formatCurrency(roundToNearestHundred(selectedEntry.amount))}</Text>
                <Text style={styles.modalCaption}>
                  {selectedEntry.recordCount} unsettled {selectedEntry.recordCount === 1 ? 'expense' : 'expenses'} ·
                  rounded to the nearest ¥100
                </Text>

                {settleError ? <Text style={styles.errorText}>{settleError}</Text> : null}

                <View style={styles.modalActions}>
                  <View style={styles.modalActionButton}>
                    <SecondaryButton label="Cancel" onPress={closeSettlePopup} disabled={isSettling} />
                  </View>
                  <View style={styles.modalActionButton}>
                    <PrimaryButton label="It's paid" onPress={handleConfirmPaid} loading={isSettling} />
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
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
  rowPressable: {
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  rowPressed: {
    backgroundColor: Colors.light.surfaceAlt,
  },
  modalOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23, 17, 15, 0.5)',
    padding: 24,
  },
  modalCard: {
    borderRadius: 24,
    padding: 24,
    gap: 8,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
  },
  modalTitle: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 18,
  },
  modalAmount: {
    color: Colors.light.sage,
    fontFamily: Fonts.serif,
    fontSize: 36,
    marginTop: 4,
  },
  modalCaption: {
    color: Colors.light.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalActionButton: {
    flex: 1,
  },
});
