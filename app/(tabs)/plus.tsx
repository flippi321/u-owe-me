import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { PrimaryButton, SecondaryButton } from '@/components/auth/buttons';
import { SlotReel } from '@/components/casino/reel';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import type { Profile } from '@/utils/auth';
import { COIN_FLIP_SIDES, type CoinFlipSide } from '@/utils/coin-flip';
import { fetchAllProfiles } from '@/utils/profiles';
import { formatCurrency } from '@/utils/currency';
import { initialsFrom } from '@/utils/format';
import { submitRecord } from '@/utils/records';

type SplitMode = 'equal' | 'specific' | 'english-spanish';

type GameCaller = 'you' | 'them';

const REEL_ROTATIONS = 12;
const REEL_DURATION_MS = 3200;

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

  const reelLandPlayer = useAudioPlayer(require('@/assets/sounds/reel-land.wav'));
  const winPlayer = useAudioPlayer(require('@/assets/sounds/win.wav'));
  const losePlayer = useAudioPlayer(require('@/assets/sounds/lose.wav'));

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [people, setPeople] = useState<Profile[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [payerPickerOpen, setPayerPickerOpen] = useState(false);
  const [mode, setMode] = useState<SplitMode>('equal');
  const [specificAmounts, setSpecificAmounts] = useState<Record<string, string>>({});
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingReconciliation, setPendingReconciliation] = useState<PendingReconciliation | null>(null);

  const descriptionInputRef = useRef<TextInput>(null);
  const amountInputRef = useRef<TextInput>(null);

  // English or Spanish game state (step 3)
  const [gameCaller, setGameCaller] = useState<GameCaller | null>(null);
  const [gameCall, setGameCall] = useState<CoinFlipSide | null>(null);
  const [spinToken, setSpinToken] = useState(0);
  const [pendingOutcome, setPendingOutcome] = useState<CoinFlipSide | null>(null);
  const [revealedOutcome, setRevealedOutcome] = useState<CoinFlipSide | null>(null);
  const [gameSaved, setGameSaved] = useState(false);

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
        setPaidBy(currentUser.id);
        setError(null);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  // Focus the description field whenever step 1 comes into view — on first
  // mount, and again after resetWizard() or backing up from step 2, since
  // this screen stays mounted as a tab rather than remounting.
  useEffect(() => {
    if (step === 1) descriptionInputRef.current?.focus();
  }, [step]);

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
    setSelected(new Set());
    setPaidBy(currentUser?.id ?? null);
    setPayerPickerOpen(false);
    setMode('equal');
    setSpecificAmounts({});
    setOpponentId(null);
    setSubmitError(null);
    setGameCaller(null);
    setGameCall(null);
    setSpinToken(0);
    setPendingOutcome(null);
    setRevealedOutcome(null);
    setGameSaved(false);
  };

  const handleClose = () => {
    resetWizard();
    router.push('/(tabs)');
  };

  const canGoNext = description.trim().length > 0 && Number(amount) > 0 && !isLoading && !error && paidBy !== null;

  const handleGoToSplit = () => {
    if (!canGoNext) return;
    // Coming back from a Double or Nothing run that got abandoned — land on
    // the normal split UI, not the leftover opponent picker.
    if (mode === 'english-spanish') {
      setMode('equal');
      setSelected(new Set());
    }
    setStep(2);
  };

  const handleDoubleOrNothing = () => {
    if (!canGoNext) return;
    setMode('english-spanish');
    setSelected(new Set());
    setOpponentId(null);
    setStep(2);
  };

  const specificSum = Object.values(computeSpecificShares(Array.from(selected), specificAmounts)).reduce(
    (sum, value) => sum + value,
    0
  );
  const remaining = Number(amount) - specificSum;

  const equalShares =
    mode === 'equal' && selected.size > 0 && Number(amount) > 0
      ? computeEqualShares(Number(amount), Array.from(selected), paidBy ?? '', people)
      : {};

  const allSelected = people.length > 0 && selected.size === people.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
      setSpecificAmounts({});
    } else {
      setSelected(new Set(people.map((person) => person.id)));
    }
  };

  const handleFinish = async () => {
    if (!currentUser || !paidBy || selected.size === 0 || isSubmitting || mode === 'english-spanish') return;

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

  const handlePlay = () => {
    if (!opponentId) return;
    setGameCaller(Math.random() < 0.5 ? 'you' : 'them');
    setStep(3);
  };

  // Whoever calls it wins the call: a correct call by you doubles what the
  // opponent owes, a correct call by them forgives it — a wrong call flips
  // that outcome the other way.
  const doubled =
    gameCaller !== null && revealedOutcome !== null && gameCall !== null
      ? gameCaller === 'you'
        ? gameCall === revealedOutcome
        : gameCall !== revealedOutcome
      : null;

  const opponent = people.find((p) => p.id === opponentId) ?? null;

  const saveGameResult = async () => {
    if (!currentUser || !paidBy || !opponentId || doubled === null || gameSaved) return;

    const stake = Number(amount);
    const finalShare = doubled ? stake * 2 : 0;

    setSubmitError(null);
    setIsSubmitting(true);
    const result = await submitRecord({
      description: description.trim(),
      amount: stake,
      paidBy,
      perPersonAmounts: { [opponentId]: finalShare },
    });
    setIsSubmitting(false);

    if (result.error) {
      setSubmitError(result.error);
      return;
    }

    setGameSaved(true);
  };

  const handleCall = (call: CoinFlipSide) => {
    if (gameCall !== null) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGameCall(call);
    setRevealedOutcome(null);
    setPendingOutcome(COIN_FLIP_SIDES[Math.floor(Math.random() * COIN_FLIP_SIDES.length)]);
    setSpinToken((token) => token + 1);
  };

  const handleReelLanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    reelLandPlayer.seekTo(0);
    reelLandPlayer.play();
    setRevealedOutcome(pendingOutcome);
  };

  useEffect(() => {
    if (revealedOutcome === null || doubled === null) return;

    if (doubled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      losePlayer.seekTo(0);
      losePlayer.play();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      winPlayer.seekTo(0);
      winPlayer.play();
    }
    saveGameResult();
    // winPlayer/losePlayer are stable player instances from useAudioPlayer —
    // including them (or saveGameResult, recreated each render) would
    // retrigger this effect on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealedOutcome, doubled]);

  const handleDone = () => {
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
              <Text style={styles.stepLabel}>Step {step} of {mode === 'english-spanish' ? 3 : 2}</Text>
              <Text style={styles.title}>Add a cost</Text>
              <Text style={styles.subtitle}>
                {step === 1
                  ? 'You paid — split it with whoever was there.'
                  : step === 2
                    ? mode === 'english-spanish'
                      ? 'Pick one person to call it with.'
                      : 'Decide who owes what.'
                    : 'Call it — double or nothing.'}
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

              <PrimaryButton label="Next" onPress={handleGoToSplit} disabled={!canGoNext} />
              <Pressable
                onPress={handleDoubleOrNothing}
                disabled={!canGoNext}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.doubleOrNothingButton,
                  !canGoNext && styles.doubleOrNothingDisabled,
                  pressed && canGoNext && styles.doubleOrNothingPressed,
                ]}>
                <Text style={styles.doubleOrNothingLabel}>Double or Nothing</Text>
              </Pressable>
            </>
          ) : step === 2 ? (
            mode === 'english-spanish' ? (
              <>
                <View style={styles.splitHeader}>
                  <Text style={styles.splitTitle}>Call it with</Text>
                  <Text style={styles.splitCount}>{opponentId ? '1 selected' : 'none selected'}</Text>
                </View>

                <View style={styles.peopleList}>
                  {people
                    .filter((person) => person.id !== currentUser?.id)
                    .map((person, index, arr) => {
                      const isSelected = opponentId === person.id;
                      const isLast = index === arr.length - 1;

                      return (
                        <Pressable
                          key={person.id}
                          onPress={() => setOpponentId(isSelected ? null : person.id)}
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

                <View style={styles.bottomNavRow}>
                  <View style={styles.bottomNavButton}>
                    <SecondaryButton label="Previous" onPress={() => setStep(1)} />
                  </View>
                  <View style={styles.bottomNavButton}>
                    <PrimaryButton label="Play" onPress={handlePlay} disabled={!opponentId} />
                  </View>
                </View>
              </>
            ) : (
              <>
                <Pressable
                  onPress={() => setMode(mode === 'specific' ? 'equal' : 'specific')}
                  style={styles.specificToggleRow}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: mode === 'specific' }}>
                  <View style={styles.specificToggleText}>
                    <Text style={styles.specificToggleLabel}>Specific amounts</Text>
                    <Text style={styles.specificToggleCaption}>
                      {mode === 'specific'
                        ? 'Enter exact amounts per person below.'
                        : "Off — everyone's share is split equally."}
                    </Text>
                  </View>
                  <Switch
                    value={mode === 'specific'}
                    onValueChange={(value) => setMode(value ? 'specific' : 'equal')}
                    trackColor={{ false: Colors.light.line, true: Colors.light.accent }}
                    thumbColor={Colors.light.surface}
                    ios_backgroundColor={Colors.light.line}
                  />
                </Pressable>

                  <View style={styles.splitHeader}>
                    <Text style={styles.splitTitle}>Split with</Text>
                    <View style={styles.splitHeaderRight}>
                      <Text style={styles.splitCount}>
                        {selected.size} of {people.length} selected
                      </Text>
                      <Pressable onPress={toggleSelectAll} hitSlop={8} accessibilityRole="button">
                        <Text style={styles.selectAllLink}>{allSelected ? 'Clear all' : 'Select all'}</Text>
                      </Pressable>
                    </View>
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
                          {isSelected && mode === 'specific' ? (
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
                          ) : isSelected && mode === 'equal' ? (
                            <Text style={styles.equalAmountDisplay} numberOfLines={1}>
                              {formatCurrency(equalShares[person.id] ?? 0)}
                            </Text>
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
              )
          ) : (
            <>
              <View style={styles.panelCentered}>
                <Text style={styles.gameStakeLabel}>At stake for {opponent ? nameFor(opponent) : '—'}</Text>
                <Text style={styles.gameStakeAmount}>{formatCurrency(Number(amount))}</Text>
                <Text style={styles.gameCallerNote}>
                  {gameCaller === 'you' ? 'Your call' : `${opponent ? nameFor(opponent) : 'Their'} call`}
                </Text>
              </View>

              <View style={styles.optionsRow}>
                {COIN_FLIP_SIDES.map((side) => {
                  const isSelected = gameCall === side;
                  return (
                    <Pressable
                      key={side}
                      onPress={() => handleCall(side)}
                      disabled={gameCall !== null}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      style={({ pressed }) => [
                        styles.option,
                        isSelected && styles.optionSelected,
                        pressed && gameCall === null && styles.optionPressed,
                        gameCall !== null && !isSelected && styles.optionDisabled,
                      ]}>
                      <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{side}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {gameCall !== null ? (
                <View style={styles.reelsPanel}>
                  <SlotReel
                    values={COIN_FLIP_SIDES}
                    targetValue={pendingOutcome}
                    spinToken={spinToken}
                    rotations={REEL_ROTATIONS}
                    durationMs={REEL_DURATION_MS}
                    onLanded={handleReelLanded}
                    width={220}
                    fontSize={24}
                  />
                </View>
              ) : null}

              {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}

              {revealedOutcome !== null && doubled !== null ? (
                <>
                  <View style={styles.panelCentered}>
                    <Text style={doubled ? styles.resultNegative : styles.resultPositive}>
                      {revealedOutcome}! {opponent ? nameFor(opponent) : 'They'} now{' '}
                      {doubled ? `owes ${formatCurrency(Number(amount) * 2)}` : 'owes nothing — forgiven'}.
                    </Text>
                  </View>
                  {gameSaved ? (
                    <PrimaryButton label="Done" onPress={handleDone} />
                  ) : (
                    <PrimaryButton label="Save" onPress={saveGameResult} loading={isSubmitting} />
                  )}
                </>
              ) : null}

              {revealedOutcome === null ? (
                <SecondaryButton label="Previous" onPress={() => setStep(2)} disabled={gameCall !== null} />
              ) : null}
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
  doubleOrNothingButton: {
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.light.surface,
    borderWidth: 1.5,
    borderColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doubleOrNothingDisabled: {
    opacity: 0.5,
  },
  doubleOrNothingPressed: {
    opacity: 0.8,
  },
  doubleOrNothingLabel: {
    color: Colors.light.accent,
    fontFamily: Fonts.serif,
    fontSize: 16,
    letterSpacing: 0.3,
  },
  specificToggleRow: {
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
  specificToggleText: {
    flex: 1,
    gap: 2,
  },
  specificToggleLabel: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 16,
  },
  specificToggleCaption: {
    color: Colors.light.textMuted,
    fontSize: 12,
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
  splitHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  splitCount: {
    color: Colors.light.textMuted,
    fontSize: 12,
  },
  selectAllLink: {
    color: Colors.light.accent,
    fontSize: 12,
    fontFamily: Fonts.serif,
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
  equalAmountDisplay: {
    width: 72,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.line,
    backgroundColor: Colors.light.surfaceAlt,
    textAlign: 'right',
    fontSize: 14,
    color: Colors.light.textMuted,
    paddingVertical: 6,
    paddingHorizontal: 8,
    opacity: 0.7,
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
  panelCentered: {
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 4,
  },
  gameStakeLabel: {
    color: Colors.light.accent,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  gameStakeAmount: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 36,
    marginTop: 4,
  },
  gameCallerNote: {
    color: Colors.light.textMuted,
    fontSize: 13,
    marginTop: 6,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: Colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.light.line,
  },
  optionSelected: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  optionPressed: {
    opacity: 0.8,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionLabel: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 16,
  },
  optionLabelSelected: {
    color: Colors.light.surface,
  },
  reelsPanel: {
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    paddingVertical: 20,
    alignItems: 'center',
  },
  resultPositive: {
    color: Colors.light.sage,
    fontFamily: Fonts.serif,
    fontSize: 17,
    textAlign: 'center',
  },
  resultNegative: {
    color: Colors.light.accent,
    fontFamily: Fonts.serif,
    fontSize: 17,
    textAlign: 'center',
  },
});
