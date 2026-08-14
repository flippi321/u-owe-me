import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { PrimaryButton } from '@/components/auth/buttons';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { formatCurrency } from '@/utils/currency';
import { fetchPaymentById, updatePaymentAmount, type PaymentDetail } from '@/utils/payments';

export default function EditPaymentScreen() {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 48, 420);

  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const user = useAuthStore((state) => state.user);

  const [payment, setPayment] = useState<PaymentDetail | null>(null);
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !paymentId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchPaymentById(paymentId, user.id).then((result) => {
      if (cancelled) return;
      if (result.error) {
        setLoadError(result.error);
      } else if (result.data) {
        setPayment(result.data);
        setAmount(String(result.data.amount));
        setLoadError(null);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [user, paymentId]);

  const canSave = Number(amount) > 0 && !isSubmitting;

  const handleSave = async () => {
    if (!paymentId || !canSave) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await updatePaymentAmount(paymentId, Number(amount));
    setIsSubmitting(false);

    if (result.error) {
      setSubmitError(result.error);
      return;
    }

    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { width: contentWidth }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Edit cost</Text>
              <Text style={styles.subtitle}>Correct this share and save.</Text>
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
          ) : loadError || !payment ? (
            <View style={styles.statusPanel}>
              <Text style={styles.statusText}>{loadError ?? 'Payment not found.'}</Text>
            </View>
          ) : (
            <>
              <View style={styles.fieldRow}>
                <View style={styles.fieldIcon}>
                  <MaterialCommunityIcons name="minus" size={18} color={Colors.light.textMuted} />
                </View>
                <Text style={styles.fieldReadOnly}>{payment.description}</Text>
              </View>

              {payment.amount < payment.recordAmount ? (
                <Text style={styles.contextNote}>Part of a {formatCurrency(payment.recordAmount)} total</Text>
              ) : null}

              <View style={styles.amountRow}>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencySymbol}>¥</Text>
                  <Text style={styles.currencyCode}>JPY</Text>
                </View>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={Colors.light.textMuted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
                />
              </View>

              {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

              <PrimaryButton label="Save" onPress={handleSave} loading={isSubmitting} disabled={!canSave} />
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
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fieldIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surfaceAlt,
  },
  fieldReadOnly: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 15,
  },
  contextNote: {
    color: Colors.light.textMuted,
    fontSize: 12,
    marginTop: -8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  currencyBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.accentSoft,
  },
  currencySymbol: {
    color: Colors.light.accent,
    fontFamily: Fonts.serif,
    fontSize: 18,
    lineHeight: 20,
  },
  currencyCode: {
    color: Colors.light.accent,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  amountInput: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 32,
    fontWeight: '500',
    padding: 0,
  },
});
