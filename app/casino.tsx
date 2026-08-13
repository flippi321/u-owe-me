import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { PrimaryButton, SecondaryButton } from '@/components/auth/buttons';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { buyCoins, fetchCoinBalance } from '@/utils/casino';
import { formatCurrency } from '@/utils/currency';

export default function Casino() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 32, 560);

  const user = useAuthStore((state) => state.user);

  const [coinBalance, setCoinBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [buyAmountText, setBuyAmountText] = useState('');
  const [isBuying, setIsBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  const loadBalance = useCallback(async (userId: string) => {
    const result = await fetchCoinBalance(userId);
    if (result.error) {
      setError(result.error);
    } else if (result.data !== null) {
      setCoinBalance(result.data);
      setError(null);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    loadBalance(user.id).then(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user, loadBalance]);

  const handleRefresh = async () => {
    if (!user) return;
    setIsRefreshing(true);
    await loadBalance(user.id);
    setIsRefreshing(false);
  };

  const openBuyModal = () => {
    setBuyError(null);
    setBuyAmountText('');
    setIsBuyModalOpen(true);
  };

  const closeBuyModal = () => {
    if (isBuying) return;
    setIsBuyModalOpen(false);
  };

  const handleConfirmBuy = async () => {
    if (!user) return;

    const amount = Number(buyAmountText);
    if (!Number.isInteger(amount) || amount <= 0) {
      setBuyError('Enter an amount greater than ¥0.');
      return;
    }

    setIsBuying(true);
    setBuyError(null);

    const result = await buyCoins(user.id, amount);

    if (result.error) {
      setIsBuying(false);
      setBuyError(result.error);
      return;
    }

    setIsBuyModalOpen(false);
    await loadBalance(user.id);
    setIsBuying(false);
  };

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
          <Text style={styles.title}>Strong Zero Casino</Text>

          {!user ? (
            <View style={[styles.panel, styles.panelCentered]}>
              <Text style={styles.sectionLabel}>UOME Coins</Text>
              <Text style={styles.note}>Sign in with email to see your coin balance.</Text>
            </View>
          ) : isLoading ? (
            <View style={[styles.panel, styles.panelCentered]}>
              <ActivityIndicator color={Colors.light.accent} />
            </View>
          ) : error ? (
            <View style={[styles.panel, styles.panelCentered]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <>
              <Pressable
                onPress={openBuyModal}
                accessibilityRole="button"
                accessibilityLabel="Buy UOME Coins"
                style={({ pressed }) => [styles.panel, styles.panelCentered, pressed && styles.panelPressed]}>
                <View style={styles.balanceBadge}>
                  <MaterialCommunityIcons name="plus" size={16} color={Colors.light.surface} />
                </View>
                <Text style={styles.sectionLabel}>UOME Coins</Text>
                <Text style={styles.balance}>{formatCurrency(coinBalance)}</Text>
                <Text style={styles.balanceCaption}>Tap to buy more coins · 1 coin = ¥1</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push('/asahi-wheel')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.gameRow, pressed && styles.gameRowPressed]}>
                <View style={styles.gameIconWrap}>
                  <MaterialCommunityIcons name="dice-multiple" size={22} color={Colors.light.accent} />
                </View>
                <View style={styles.gameRowText}>
                  <Text style={styles.gameTitle}>Asahi Wheel</Text>
                  <Text style={styles.gameSubtitle}>Coming soon</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={22} color={Colors.light.textMuted} />
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={isBuyModalOpen} transparent animationType="fade" onRequestClose={closeBuyModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: Math.min(width - 48, 420) }]}>
            <Text style={styles.modalTitle}>Buy UOME Coins</Text>
            <Text style={styles.modalCaption}>1 coin = ¥1, paid to the house.</Text>

            <View style={styles.amountRow}>
              <View style={styles.currencyBadge}>
                <Text style={styles.currencySymbol}>¥</Text>
              </View>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={Colors.light.textMuted}
                keyboardType="numeric"
                value={buyAmountText}
                onChangeText={(text) => setBuyAmountText(text.replace(/[^0-9]/g, ''))}
                autoFocus
              />
            </View>

            {buyError ? <Text style={styles.errorText}>{buyError}</Text> : null}

            <View style={styles.modalActions}>
              <View style={styles.modalActionButton}>
                <SecondaryButton label="Cancel" onPress={closeBuyModal} disabled={isBuying} />
              </View>
              <View style={styles.modalActionButton}>
                <PrimaryButton label="Buy" onPress={handleConfirmBuy} loading={isBuying} />
              </View>
            </View>
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
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingBottom: 36,
  },
  container: {
    gap: 16,
  },
  title: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 26,
    marginBottom: 4,
  },
  panel: {
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
  },
  panelCentered: {
    alignItems: 'center',
  },
  panelPressed: {
    opacity: 0.85,
  },
  balanceBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.accent,
  },
  sectionLabel: {
    color: Colors.light.accent,
    fontSize: 12,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  balance: {
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
    marginTop: 8,
  },
  note: {
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
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 24,
    padding: 16,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
  },
  gameRowPressed: {
    opacity: 0.85,
  },
  gameIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.accentSoft,
  },
  gameRowText: {
    flex: 1,
    gap: 2,
  },
  gameTitle: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 16,
  },
  gameSubtitle: {
    color: Colors.light.textMuted,
    fontSize: 13,
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
  modalCaption: {
    color: Colors.light.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    backgroundColor: Colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.light.line,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  currencyBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.accentSoft,
  },
  currencySymbol: {
    color: Colors.light.accent,
    fontFamily: Fonts.serif,
    fontSize: 16,
  },
  amountInput: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 28,
    fontWeight: '500',
    padding: 0,
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
