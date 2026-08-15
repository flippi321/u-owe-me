import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

import { AuthField } from '@/components/auth/field';
import { PrimaryButton, SecondaryButton } from '@/components/auth/buttons';
import { Colors, Fonts } from '@/constants/theme';
import { cashOutCoins, fetchHouseDebts, type HouseDebtEntry } from '@/utils/casino';
import { formatCurrency } from '@/utils/currency';

const PASSWORD = 'AlanGay';

export default function HouseManagement() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 32, 560);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [entries, setEntries] = useState<HouseDebtEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedEntry, setSelectedEntry] = useState<HouseDebtEntry | null>(null);
  const [forgiveAmountText, setForgiveAmountText] = useState('');
  const [isForgiving, setIsForgiving] = useState(false);
  const [forgiveError, setForgiveError] = useState<string | null>(null);

  const loadDebts = async () => {
    const result = await fetchHouseDebts();
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setEntries(result.data);
      setError(null);
    }
  };

  const handleUnlock = async () => {
    if (passwordInput !== PASSWORD) {
      setPasswordError('Incorrect password.');
      setPasswordInput('');
      return;
    }

    setPasswordError(null);
    setIsUnlocked(true);
    setIsLoading(true);
    await loadDebts();
    setIsLoading(false);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDebts();
    setIsRefreshing(false);
  };

  const openForgiveModal = (entry: HouseDebtEntry) => {
    setForgiveError(null);
    setForgiveAmountText(String(entry.amount));
    setSelectedEntry(entry);
  };

  const closeForgiveModal = () => {
    if (isForgiving) return;
    setSelectedEntry(null);
  };

  const handleConfirmForgive = async () => {
    if (!selectedEntry) return;

    const amount = Number(forgiveAmountText);
    if (!Number.isInteger(amount) || amount <= 0 || amount > selectedEntry.amount) {
      setForgiveError(`Enter an amount between ¥1 and ${formatCurrency(selectedEntry.amount)}.`);
      return;
    }

    setIsForgiving(true);
    setForgiveError(null);

    const result = await cashOutCoins(selectedEntry.profile.id, amount, 'Forgiven by the house');

    if (result.error) {
      setIsForgiving(false);
      setForgiveError(result.error);
      return;
    }

    setSelectedEntry(null);
    setIsForgiving(false);
    await loadDebts();
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
          isUnlocked ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.light.accent}
              colors={[Colors.light.accent]}
            />
          ) : undefined
        }>
        <View style={[styles.container, { width: contentWidth }]}>
          <Text style={styles.title}>House Management</Text>

          {!isUnlocked ? (
            <View style={styles.panel}>
              <AuthField
                label="Password"
                isPassword
                value={passwordInput}
                onChangeText={setPasswordInput}
                onSubmitEditing={handleUnlock}
                returnKeyType="go"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
              <View style={styles.enterButtonWrap}>
                <PrimaryButton label="Enter" onPress={handleUnlock} disabled={passwordInput.length === 0} />
              </View>
            </View>
          ) : isLoading ? (
            <View style={[styles.panel, styles.panelCentered]}>
              <ActivityIndicator color={Colors.light.accent} />
            </View>
          ) : error ? (
            <View style={[styles.panel, styles.panelCentered]}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : entries.length === 0 ? (
            <View style={[styles.panel, styles.panelCentered]}>
              <Text style={styles.note}>Nobody has touched the coin machine yet.</Text>
            </View>
          ) : (
            <View style={styles.panel}>
              {entries.map((entry, index) => {
                const isLast = index === entries.length - 1;
                const canForgive = entry.amount > 0;
                const name = entry.profile.full_name ?? entry.profile.username;

                return (
                  <Pressable
                    key={entry.profile.id}
                    onPress={canForgive ? () => openForgiveModal(entry) : undefined}
                    disabled={!canForgive}
                    accessibilityRole={canForgive ? 'button' : undefined}
                    style={({ pressed }) => [
                      styles.row,
                      isLast && styles.rowLast,
                      canForgive && pressed && styles.rowPressed,
                    ]}>
                    <Text style={styles.rowName}>{name}</Text>
                    <Text style={[styles.rowAmount, entry.amount > 0 ? styles.amountOwed : styles.amountCredit]}>
                      {formatCurrency(entry.amount, { signDisplay: 'exceptZero' })}
                    </Text>
                    {canForgive ? (
                      <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.light.textMuted} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={selectedEntry !== null} transparent animationType="fade" onRequestClose={closeForgiveModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: Math.min(width - 48, 420) }]}>
            {selectedEntry ? (
              <>
                <Text style={styles.modalTitle}>
                  Forgive {selectedEntry.profile.full_name ?? selectedEntry.profile.username}&apos;s debt
                </Text>
                <Text style={styles.modalCaption}>
                  They currently owe the house {formatCurrency(selectedEntry.amount)}. Enter how much to write off.
                </Text>

                <View style={styles.amountRow}>
                  <View style={styles.currencyBadge}>
                    <Text style={styles.currencySymbol}>¥</Text>
                  </View>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    placeholderTextColor={Colors.light.textMuted}
                    keyboardType="numeric"
                    value={forgiveAmountText}
                    onChangeText={(text) => setForgiveAmountText(text.replace(/[^0-9]/g, ''))}
                    autoFocus
                    selectTextOnFocus
                  />
                </View>

                {forgiveError ? <Text style={styles.errorText}>{forgiveError}</Text> : null}

                <View style={styles.modalActions}>
                  <View style={styles.modalActionButton}>
                    <SecondaryButton label="Cancel" onPress={closeForgiveModal} disabled={isForgiving} />
                  </View>
                  <View style={styles.modalActionButton}>
                    <PrimaryButton label="Forgive" onPress={handleConfirmForgive} loading={isForgiving} />
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
    borderRadius: 28,
    padding: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    shadowColor: Colors.light.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
    gap: 14,
  },
  panelCentered: {
    alignItems: 'center',
  },
  note: {
    color: Colors.light.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  errorText: {
    color: Colors.light.accent,
    fontSize: 13,
    textAlign: 'center',
  },
  enterButtonWrap: {
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.line,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowName: {
    flex: 1,
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 16,
  },
  rowAmount: {
    fontSize: 15,
  },
  amountOwed: {
    color: Colors.light.accent,
  },
  amountCredit: {
    color: Colors.light.sage,
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
