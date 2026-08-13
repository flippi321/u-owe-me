import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
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
import type { Profile } from '@/utils/auth';
import { fetchAllProfiles } from '@/utils/profiles';
import { formatCurrency } from '@/utils/currency';
import { initialsFrom } from '@/utils/format';
import { submitRecord } from '@/utils/records';

type SplitMode = 'equal' | 'specific';

function computeEqualShares(
  total: number,
  participantIds: string[],
  payerId: string,
  orderedPeople: Profile[]
): Record<string, number> {
  const n = participantIds.length;
  const base = Math.floor(total / n);
  const remainder = total - base * n;

  const shares: Record<string, number> = {};
  for (const id of participantIds) shares[id] = base;

  const remainderTarget = participantIds.includes(payerId)
    ? payerId
    : (orderedPeople.find((p) => participantIds.includes(p.id))?.id ?? participantIds[0]);

  shares[remainderTarget] += remainder;
  return shares;
}

function computeSpecificShares(participantIds: string[], specificAmounts: Record<string, string>): Record<string, number> {
  const shares: Record<string, number> = {};
  for (const id of participantIds) {
    const n = Number(specificAmounts[id]);
    shares[id] = Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
  }
  return shares;
}

type PendingReconciliation = {
  remaining: number;
  resolve: (confirmed: boolean) => void;
};

export default function Plus() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 48, 420);

  const currentUser = useAuthStore((state) => state.user);

  const [step, setStep] = useState<1 | 2>(1);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [people, setPeople] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [payerPickerOpen, setPayerPickerOpen] = useState(false);
  const [mode, setMode] = useState<SplitMode>('equal');
  const [specificAmounts, setSpecificAmounts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingReconciliation, setPendingReconciliation] = useState<PendingReconciliation | null>(null);

  const confirmReconciliation = (remaining: number): Promise<boolean> =>
    new Promise((resolve) => {
      setPendingReconciliation({ remaining, resolve });
    });

  const resolveReconciliation = (confirmed: boolean) => {
    pendingReconciliation?.resolve(confirmed);
    setPendingReconciliation(null);
  };

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    fetchAllProfiles().then((result) => {
      if (cancelled) return;
      if (result.error) {
        setError(result.error);
      } else if (result.data) {
        const ordered = [
          ...result.data.filter((p) => p.id === currentUser.id),
          ...result.data.filter((p) => p.id !== currentUser.id),
        ];
        setPeople(ordered);
        setSelected(new Set([currentUser.id]));
        setPaidBy(currentUser.id);
        setError(null);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const nameFor = (person: Profile) => (person.id === currentUser?.id ? 'You' : (person.full_name ?? person.username));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setSpecificAmounts((amounts) => {
          if (!(id in amounts)) return amounts;
          const rest = { ...amounts };
          delete rest[id];
          return rest;
        });
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const resetWizard = () => {
    setStep(1);
    setDescription('');
    setAmount('');
    setSelected(currentUser ? new Set([currentUser.id]) : new Set());
    setPaidBy(currentUser?.id ?? null);
    setPayerPickerOpen(false);
    setMode('equal');
    setSpecificAmounts({});
    setSubmitError(null);
  };

  const handleClose = () => {
    resetWizard();
    router.push('/(tabs)');
  };

  const canGoNext = description.trim().length > 0 && Number(amount) > 0 && !isLoading && !error && paidBy !== null;

  const specificSum = Object.values(computeSpecificShares(Array.from(selected), specificAmounts)).reduce(
    (sum, value) => sum + value,
    0
  );
  const remaining = Number(amount) - specificSum;

  const handleFinish = async () => {
    if (!currentUser || !paidBy || selected.size === 0 || isSubmitting) return;

    const participantIds = Array.from(selected);
    let finalAmount = Number(amount);
    let perPersonAmounts: Record<string, number>;

    if (mode === 'equal') {
      perPersonAmounts = computeEqualShares(finalAmount, participantIds, paidBy, people);
    } else {
      const specificShares = computeSpecificShares(participantIds, specificAmounts);
      const sum = Object.values(specificShares).reduce((a, b) => a + b, 0);
      const shortfall = finalAmount - sum;

      if (Math.abs(shortfall) >= 100) {
        const confirmed = await confirmReconciliation(shortfall);
        if (!confirmed) return;
        finalAmount = sum;
      }

      perPersonAmounts = specificShares;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    const result = await submitRecord({
      description: description.trim(),
      amount: finalAmount,
      paidBy,
      perPersonAmounts,
    });
    setIsSubmitting(false);

    if (result.error) {
      setSubmitError(result.error);
      return;
    }

    resetWizard();
    router.replace('/(tabs)');
  };

  const payer = people.find((p) => p.id === paidBy) ?? null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { width: contentWidth }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.stepLabel}>Step {step} of 2</Text>
              <Text style={styles.title}>Add a cost</Text>
              <Text style={styles.subtitle}>
                {step === 1 ? 'You paid — split it with whoever was there.' : 'Decide who owes what.'}
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={20} color={Colors.light.text} />
            </Pressable>
          </View>

          {!currentUser ? (
            <View style={styles.statusPanel}>
              <Text style={styles.statusText}>Sign in with email to add a cost.</Text>
            </View>
          ) : step === 1 ? (
            <>
              <View style={styles.fieldRow}>
                <View style={styles.fieldIcon}>
                  <MaterialCommunityIcons name="minus" size={18} color={Colors.light.textMuted} />
                </View>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="What was it for?"
                  placeholderTextColor={Colors.light.textMuted}
                  value={description}
                  onChangeText={setDescription}
                />
              </View>

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

              <View style={styles.payerSection}>
                <Text style={styles.payerLabel}>Paid by</Text>

                {isLoading ? (
                  <View style={styles.statusPanel}>
                    <ActivityIndicator color={Colors.light.accent} />
                  </View>
                ) : error ? (
                  <View style={styles.statusPanel}>
                    <Text style={styles.statusText}>{error}</Text>
                  </View>
                ) : (
                  <>
                    <Pressable
                      onPress={() => setPayerPickerOpen((open) => !open)}
                      style={styles.fieldRow}
                      accessibilityRole="button">
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{payer ? initialsFrom(nameFor(payer)) : ''}</Text>
                      </View>
                      <Text style={styles.payerButtonLabel}>
                        {payer ? (payer.id === currentUser.id ? 'I paid' : `${nameFor(payer)} paid`) : 'Choose who paid'}
                      </Text>
                      <MaterialCommunityIcons
                        name={payerPickerOpen ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color={Colors.light.textMuted}
                      />
                    </Pressable>

                    {payerPickerOpen ? (
                      <View style={styles.peopleList}>
                        {people.map((person, index) => {
                          const isLast = index === people.length - 1;
                          const isPayer = paidBy === person.id;
                          return (
                            <Pressable
                              key={person.id}
                              onPress={() => {
                                setPaidBy(person.id);
                                setPayerPickerOpen(false);
                              }}
                              style={({ pressed }) => [
                                styles.personRow,
                                isLast && styles.personRowLast,
                                pressed && styles.personRowPressed,
                              ]}>
                              <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{initialsFrom(nameFor(person))}</Text>
                              </View>
                              <Text style={styles.personName}>{nameFor(person)}</Text>
                              {isPayer ? (
                                <MaterialCommunityIcons name="check" size={18} color={Colors.light.accent} />
                              ) : null}
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </>
                )}
              </View>

              <PrimaryButton label="Next" onPress={() => setStep(2)} disabled={!canGoNext} />
            </>
          ) : (
            <>
              <View style={styles.segmentedControl}>
                <Pressable
                  onPress={() => setMode('equal')}
                  style={[styles.segmentedOption, mode === 'equal' && styles.segmentedOptionActive]}>
                  <Text style={[styles.segmentedOptionLabel, mode === 'equal' && styles.segmentedOptionLabelActive]}>
                    Equal split
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setMode('specific')}
                  style={[styles.segmentedOption, mode === 'specific' && styles.segmentedOptionActive]}>
                  <Text
                    style={[styles.segmentedOptionLabel, mode === 'specific' && styles.segmentedOptionLabelActive]}>
                    Specific amounts
                  </Text>
                </Pressable>
              </View>

              <View style={styles.splitHeader}>
                <Text style={styles.splitTitle}>Split with</Text>
                <Text style={styles.splitCount}>
                  {selected.size} of {people.length} selected
                </Text>
              </View>

              <View style={styles.peopleList}>
                {people.map((person, index) => {
                  const isSelected = selected.has(person.id);
                  const isLast = index === people.length - 1;

                  return (
                    <Pressable
                      key={person.id}
                      onPress={() => toggle(person.id)}
                      style={({ pressed }) => [
                        styles.personRow,
                        isLast && styles.personRowLast,
                        pressed && styles.personRowPressed,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{initialsFrom(nameFor(person))}</Text>
                      </View>
                      <Text style={styles.personName}>{nameFor(person)}</Text>
                      {mode === 'specific' && isSelected ? (
                        <TextInput
                          style={styles.specificAmountInput}
                          placeholder="0"
                          placeholderTextColor={Colors.light.textMuted}
                          keyboardType="numeric"
                          value={specificAmounts[person.id] ?? ''}
                          onChangeText={(text) =>
                            setSpecificAmounts((prev) => ({ ...prev, [person.id]: text.replace(/[^0-9]/g, '') }))
                          }
                        />
                      ) : null}
                      <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected ? (
                          <MaterialCommunityIcons name="check" size={14} color={Colors.light.surface} />
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })}

                {mode === 'specific' ? (
                  <View style={styles.remainingRow}>
                    <Text style={styles.remainingLabel}>To Be Divided</Text>
                    <Text
                      style={[
                        styles.remainingValue,
                        remaining > 0 && styles.remainingValuePositive,
                        remaining < 0 && styles.remainingValueNegative,
                      ]}>
                      {formatCurrency(remaining)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

              <View style={styles.bottomNavRow}>
                <View style={styles.bottomNavButton}>
                  <SecondaryButton label="Previous" onPress={() => setStep(1)} disabled={isSubmitting} />
                </View>
                <View style={styles.bottomNavButton}>
                  <PrimaryButton
                    label="Finish"
                    onPress={handleFinish}
                    loading={isSubmitting}
                    disabled={selected.size === 0 || isSubmitting}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={pendingReconciliation !== null}
        transparent
        animationType="fade"
        onRequestClose={() => resolveReconciliation(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: contentWidth }]}>
            <Text style={styles.modalTitle}>Amounts don&apos;t add up</Text>
            <Text style={styles.modalBody}>
              The specific amounts leave ¥{Math.abs(pendingReconciliation?.remaining ?? 0)}{' '}
              {(pendingReconciliation?.remaining ?? 0) > 0 ? 'unassigned' : 'over-assigned'}. Continue to set the
              total to the sum of what you&apos;ve entered?
            </Text>
            <View style={styles.bottomNavRow}>
              <View style={styles.bottomNavButton}>
                <SecondaryButton label="Cancel" onPress={() => resolveReconciliation(false)} />
              </View>
              <View style={styles.bottomNavButton}>
                <PrimaryButton label="Continue" onPress={() => resolveReconciliation(true)} />
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
  stepLabel: {
    color: Colors.light.accent,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
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
  fieldInput: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 15,
    padding: 0,
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
  payerSection: {
    gap: 8,
  },
  payerLabel: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 16,
  },
  payerButtonLabel: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 15,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    padding: 4,
  },
  segmentedOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  segmentedOptionActive: {
    backgroundColor: Colors.light.text,
  },
  segmentedOptionLabel: {
    color: Colors.light.textMuted,
    fontSize: 13,
    fontFamily: Fonts.serif,
  },
  segmentedOptionLabelActive: {
    color: Colors.light.surface,
  },
  splitHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  splitTitle: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 20,
  },
  splitCount: {
    color: Colors.light.textMuted,
    fontSize: 12,
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
  peopleList: {
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    paddingHorizontal: 16,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.line,
  },
  personRowLast: {
    borderBottomWidth: 0,
  },
  personRowPressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.light.line,
  },
  avatarText: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 13,
  },
  personName: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 15,
  },
  specificAmountInput: {
    width: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.line,
    backgroundColor: Colors.light.surfaceAlt,
    textAlign: 'right',
    fontSize: 14,
    color: Colors.light.text,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.light.line,
    backgroundColor: Colors.light.surface,
  },
  checkboxChecked: {
    backgroundColor: Colors.light.text,
    borderColor: Colors.light.text,
  },
  remainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.line,
  },
  remainingLabel: {
    color: Colors.light.textMuted,
    fontSize: 14,
  },
  remainingValue: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 16,
  },
  remainingValuePositive: {
    color: Colors.light.sage,
  },
  remainingValueNegative: {
    color: Colors.light.accent,
  },
  bottomNavRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomNavButton: {
    flex: 1,
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
    gap: 16,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
  },
  modalTitle: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 20,
  },
  modalBody: {
    color: Colors.light.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
});
