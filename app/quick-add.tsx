import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
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
import type { Profile } from '@/utils/auth';
import { initialsFrom } from '@/utils/format';
import { fetchAllProfiles } from '@/utils/profiles';
import { submitRecord } from '@/utils/records';
import { computeEqualShares } from '@/utils/split';

type Relationship = 'they_owe_all' | 'split_i_paid' | 'split_they_paid' | 'i_owe_all';

const RELATIONSHIP_OPTIONS: { value: Relationship; label: string; caption: string }[] = [
  { value: 'they_owe_all', label: 'They owe it all', caption: 'I paid, full amount' },
  { value: 'split_i_paid', label: 'We split it — I paid', caption: 'I paid, split evenly' },
  { value: 'split_they_paid', label: 'We split it — they paid', caption: 'They paid, split evenly' },
  { value: 'i_owe_all', label: 'I owe it all', caption: 'They paid, full amount' },
];

export default function QuickAdd() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width - 48, 420);

  const currentUser = useAuthStore((state) => state.user);

  const [step, setStep] = useState<1 | 2>(1);
  const [people, setPeople] = useState<Profile[]>([]);
  const [otherId, setOtherId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const descriptionInputRef = useRef<TextInput>(null);
  const amountInputRef = useRef<TextInput>(null);

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
        setPeople(result.data.filter((p) => p.id !== currentUser.id));
        setError(null);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (step === 2) descriptionInputRef.current?.focus();
  }, [step]);

  const nameFor = (person: Profile) => person.full_name ?? person.username;
  const other = people.find((p) => p.id === otherId) ?? null;

  const resetWizard = () => {
    setStep(1);
    setOtherId(null);
    setDescription('');
    setAmount('');
    setRelationship(null);
    setSubmitError(null);
  };

  const handleClose = () => {
    resetWizard();
    router.push('/(tabs)');
  };

  const canFinish =
    description.trim().length > 0 && Number(amount) > 0 && relationship !== null && !isSubmitting;

  const handleFinish = async () => {
    if (!currentUser || !otherId || !relationship || !canFinish) return;

    const amt = Number(amount);
    let paidBy: string;
    let perPersonAmounts: Record<string, number>;

    switch (relationship) {
      case 'they_owe_all':
        paidBy = currentUser.id;
        perPersonAmounts = { [otherId]: amt };
        break;
      case 'split_i_paid':
        paidBy = currentUser.id;
        perPersonAmounts = computeEqualShares(amt, [currentUser.id, otherId], currentUser.id, people);
        break;
      case 'split_they_paid':
        paidBy = otherId;
        perPersonAmounts = computeEqualShares(amt, [currentUser.id, otherId], otherId, people);
        break;
      case 'i_owe_all':
        paidBy = otherId;
        perPersonAmounts = { [currentUser.id]: amt };
        break;
    }

    setSubmitError(null);
    setIsSubmitting(true);
    const result = await submitRecord({
      description: description.trim(),
      amount: amt,
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { width: contentWidth }]}>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.stepLabel}>Step {step} of 2</Text>
              <Text style={styles.title}>Quick add</Text>
              <Text style={styles.subtitle}>
                {step === 1 ? "Who's this with?" : 'Fill in the details.'}
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
              {isLoading ? (
                <View style={styles.statusPanel}>
                  <ActivityIndicator color={Colors.light.accent} />
                </View>
              ) : error ? (
                <View style={styles.statusPanel}>
                  <Text style={styles.statusText}>{error}</Text>
                </View>
              ) : (
                <View style={styles.peopleList}>
                  {people.map((person, index) => {
                    const isSelected = otherId === person.id;
                    const isLast = index === people.length - 1;

                    return (
                      <Pressable
                        key={person.id}
                        onPress={() => setOtherId(person.id)}
                        style={({ pressed }) => [
                          styles.personRow,
                          isLast && styles.personRowLast,
                          pressed && styles.personRowPressed,
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>{initialsFrom(nameFor(person))}</Text>
                        </View>
                        <Text style={styles.personName}>{nameFor(person)}</Text>
                        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                          {isSelected ? (
                            <MaterialCommunityIcons name="check" size={14} color={Colors.light.surface} />
                          ) : null}
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <PrimaryButton label="Next" onPress={() => setStep(2)} disabled={!otherId} />
            </>
          ) : (
            <>
              <View style={styles.fieldRow}>
                <View style={styles.fieldIcon}>
                  <MaterialCommunityIcons name="minus" size={18} color={Colors.light.textMuted} />
                </View>
                <TextInput
                  ref={descriptionInputRef}
                  style={styles.fieldInput}
                  placeholder="What was it for?"
                  placeholderTextColor={Colors.light.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => amountInputRef.current?.focus()}
                />
              </View>

              <View style={styles.amountRow}>
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencySymbol}>¥</Text>
                </View>
                <TextInput
                  ref={amountInputRef}
                  style={styles.amountInput}
                  placeholder="0"
                  placeholderTextColor={Colors.light.textMuted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>

              <Text style={styles.relationshipLabel}>With {other ? nameFor(other) : ''}</Text>

              <View style={styles.relationshipGrid}>
                {RELATIONSHIP_OPTIONS.map((option) => {
                  const isSelected = relationship === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setRelationship(option.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: isSelected }}
                      style={({ pressed }) => [
                        styles.relationshipCard,
                        isSelected && styles.relationshipCardSelected,
                        pressed && !isSelected && styles.relationshipCardPressed,
                      ]}>
                      <Text
                        style={[
                          styles.relationshipCardLabel,
                          isSelected && styles.relationshipCardLabelSelected,
                        ]}>
                        {option.label}
                      </Text>
                      <Text
                        style={[
                          styles.relationshipCardCaption,
                          isSelected && styles.relationshipCardCaptionSelected,
                        ]}>
                        {option.caption}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

              <View style={styles.bottomNavRow}>
                <View style={styles.bottomNavButton}>
                  <PrimaryButton
                    label="Finish"
                    onPress={handleFinish}
                    loading={isSubmitting}
                    disabled={!canFinish}
                  />
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
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.surfaceAlt,
  },
  fieldInput: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 18,
    padding: 0,
  },
  amountRow: {
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
  currencyBadge: {
    width: 40,
    height: 40,
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
  amountInput: {
    flex: 1,
    color: Colors.light.text,
    fontSize: 18,
    fontWeight: '500',
    padding: 0,
  },
  relationshipLabel: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 16,
  },
  relationshipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  relationshipCard: {
    flexBasis: '47%',
    flexGrow: 1,
    borderRadius: 18,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 4,
  },
  relationshipCardSelected: {
    backgroundColor: Colors.light.text,
    borderColor: Colors.light.text,
  },
  relationshipCardPressed: {
    opacity: 0.8,
  },
  relationshipCardLabel: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 14,
  },
  relationshipCardLabelSelected: {
    color: Colors.light.surface,
  },
  relationshipCardCaption: {
    color: Colors.light.textMuted,
    fontSize: 11,
  },
  relationshipCardCaptionSelected: {
    color: Colors.light.accentSoft,
  },
  bottomNavRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomNavButton: {
    flex: 1,
  },
});
