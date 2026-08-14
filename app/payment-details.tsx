import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { PrimaryButton } from '@/components/auth/buttons';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { settleUp } from '@/utils/balances';
import { formatCurrency } from '@/utils/currency';
import { fetchPaymentsBetween, type PaymentDetail } from '@/utils/payments';

export default function PaymentDetailsScreen() {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 32, 640);

  const params = useLocalSearchParams<{ counterpartId: string; counterpartName: string; direction: string }>();
  const counterpartId = params.counterpartId;
  const counterpartName = params.counterpartName;
  const direction = params.direction === 'i_owe' ? 'i_owe' : 'owed_to_me';

  const user = useAuthStore((state) => state.user);

  const [payments, setPayments] = useState<PaymentDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSettling, setIsSettling] = useState(false);
  const [settleError, setSettleError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !counterpartId) return;
    const result = await fetchPaymentsBetween(user.id, counterpartId);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setPayments(result.data);
      setError(null);
    }
  }, [user, counterpartId]);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      load().then(() => setIsLoading(false));
    }, [load])
  );

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  const handleSettleAll = async () => {
    if (!user || !counterpartId) return;
    setIsSettling(true);
    setSettleError(null);

    const result = await settleUp(user.id, counterpartId);
    if (result.error) {
      setIsSettling(false);
      setSettleError(result.error);
      return;
    }

    setIsSettling(false);
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { width: contentWidth }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title}>{counterpartName}</Text>
              <Text style={styles.subtitle}>{direction === 'owed_to_me' ? 'owes you' : 'you owe'}</Text>
            </View>
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color={Colors.light.text} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.statusPanel}>
              <ActivityIndicator color={Colors.light.accent} />
            </View>
          ) : error ? (
            <View style={styles.statusPanel}>
              <Text style={styles.statusText}>{error}</Text>
            </View>
          ) : payments.length === 0 ? (
            <View style={styles.statusPanel}>
              <Text style={styles.statusText}>Nothing unsettled here.</Text>
            </View>
          ) : (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
              </View>

              <View style={styles.list}>
                {payments.map((payment, index) => {
                  const isLast = index === payments.length - 1;
                  const isSplit = payment.amount < payment.recordAmount;
                  return (
                    <Pressable
                      key={payment.id}
                      onPress={() => router.push({ pathname: '/edit-payment', params: { paymentId: payment.id } })}
                      style={({ pressed }) => [
                        styles.row,
                        isLast && styles.rowLast,
                        pressed && styles.rowPressed,
                      ]}
                      accessibilityRole="button">
                      <View style={styles.rowLeft}>
                        <Text style={styles.rowDescription}>{payment.description}</Text>
                        {isSplit ? (
                          <Text style={styles.rowNote}>
                            {formatCurrency(payment.amount)} of {formatCurrency(payment.recordAmount)}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.rowAmount}>{formatCurrency(payment.amount)}</Text>
                      <MaterialCommunityIcons name="chevron-right" size={20} color={Colors.light.textMuted} />
                    </Pressable>
                  );
                })}
              </View>

              {direction === 'owed_to_me' ? (
                <>
                  {settleError ? <Text style={styles.errorText}>{settleError}</Text> : null}
                  <PrimaryButton label="It's paid" onPress={handleSettleAll} loading={isSettling} />
                </>
              ) : null}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 28,
  },
  subtitle: {
    color: Colors.light.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
  },
  statusPanel: {
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    color: Colors.light.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: Colors.light.accent,
    fontSize: 13,
    textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  totalLabel: {
    color: Colors.light.textMuted,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalAmount: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 22,
  },
  list: {
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    paddingHorizontal: 16,
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
  rowLeft: {
    flex: 1,
    gap: 3,
  },
  rowDescription: {
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
    fontSize: 15,
  },
});
