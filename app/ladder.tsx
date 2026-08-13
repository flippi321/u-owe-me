import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SecondaryButton } from '@/components/auth/buttons';
import { SlotReel } from '@/components/casino/reel';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { fetchCoinBalance } from '@/utils/casino';
import { formatCurrency } from '@/utils/currency';
import {
  LADDER_MAX_RUNGS,
  LADDER_MULTIPLIERS,
  LADDER_SIDES,
  rollLadderSide,
  settleLadderRound,
  type LadderRoundResult,
  type LadderSide,
} from '@/utils/ladder';

const BET_AMOUNTS = [100, 250, 500];
const REEL_ROTATIONS = 8;
const REEL_DURATION_MS = 1600;

export default function Ladder() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [coinBalance, setCoinBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [betAmount, setBetAmount] = useState<number | null>(null);
  const [roundActive, setRoundActive] = useState(false);
  const [rungsCleared, setRungsCleared] = useState(0);
  const [pendingGuess, setPendingGuess] = useState<LadderSide | null>(null);
  const [pendingOutcome, setPendingOutcome] = useState<LadderSide | null>(null);
  const [spinToken, setSpinToken] = useState(0);
  const [isResolving, setIsResolving] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [ladderError, setLadderError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<LadderRoundResult | null>(null);

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

  const resetRound = (keepBet: boolean) => {
    setRoundActive(false);
    setRungsCleared(0);
    if (!keepBet) setBetAmount(null);
    setPendingGuess(null);
    setPendingOutcome(null);
  };

  const handleGuess = (side: LadderSide) => {
    if (!user || betAmount === null || isResolving || isSettling) return;

    setRoundActive(true);
    setLadderError(null);
    setLastResult(null);

    const outcome = rollLadderSide();
    setPendingGuess(side);
    setPendingOutcome(outcome);
    setIsResolving(true);
    setSpinToken((token) => token + 1);
  };

  const handleReelLanded = async () => {
    setIsResolving(false);

    if (!user || betAmount === null || pendingGuess === null || pendingOutcome === null) return;

    if (pendingGuess === pendingOutcome) {
      setRungsCleared((count) => count + 1);
      return;
    }

    setIsSettling(true);
    const result = await settleLadderRound(user.id, betAmount, rungsCleared, true);
    setIsSettling(false);

    if (result.error) {
      setLadderError(result.error);
      return;
    }

    setLastResult(result.data);
    await loadBalance(user.id);
    resetRound(true);
  };

  const handleCashOut = async () => {
    if (!user || betAmount === null || rungsCleared === 0 || isResolving || isSettling) return;

    setIsSettling(true);
    setLadderError(null);

    const result = await settleLadderRound(user.id, betAmount, rungsCleared, false);

    setIsSettling(false);

    if (result.error) {
      setLadderError(result.error);
      return;
    }

    setLastResult(result.data);
    await loadBalance(user.id);
    resetRound(false);
  };

  const isBusy = isResolving || isSettling;
  const isDisabled = isBusy || isLoading || !!error || !user;
  const currentMultiplier = rungsCleared > 0 ? LADDER_MULTIPLIERS[rungsCleared - 1] : 0;
  const currentPayout = betAmount !== null ? Math.round(betAmount * currentMultiplier * 100) / 100 : 0;
  const ladderComplete = rungsCleared >= LADDER_MAX_RUNGS;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={26} color={Colors.light.text} />
        </Pressable>

        {user ? (
          <View style={styles.balanceBadge}>
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.light.accent} />
            ) : (
              <>
                <MaterialCommunityIcons name="currency-jpy" size={14} color={Colors.light.accent} />
                <Text style={styles.balanceBadgeText} numberOfLines={1}>
                  {error ? '—' : formatCurrency(coinBalance)}
                </Text>
              </>
            )}
          </View>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <Text style={styles.title}>The Ladder</Text>

          {!user ? (
            <View style={[styles.panel, styles.panelCentered]}>
              <Text style={styles.note}>Sign in with email to play.</Text>
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
              <View style={styles.panel}>
                <Text style={styles.betLabel}>Bet</Text>
                <View style={styles.optionsRow}>
                  {BET_AMOUNTS.map((amount) => {
                    const isSelected = betAmount === amount;
                    return (
                      <Pressable
                        key={amount}
                        onPress={() => setBetAmount(amount)}
                        disabled={isDisabled || roundActive}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        style={({ pressed }) => [
                          styles.option,
                          isSelected && styles.optionSelected,
                          pressed && !isDisabled && !roundActive && styles.optionPressed,
                          (isDisabled || roundActive) && styles.optionDisabled,
                        ]}>
                        <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                          {formatCurrency(amount)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.panel}>
                <View style={styles.rungRow}>
                  {LADDER_MULTIPLIERS.map((multiplier, index) => {
                    const rung = index + 1;
                    const cleared = rung <= rungsCleared;
                    const isNext = rung === rungsCleared + 1 && !ladderComplete;
                    return (
                      <View
                        key={rung}
                        style={[styles.rung, cleared && styles.rungCleared, isNext && styles.rungNext]}>
                        <Text style={[styles.rungLabel, cleared && styles.rungLabelCleared]}>×{multiplier}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.rungCaption}>
                  {rungsCleared > 0
                    ? `Cleared ${rungsCleared}/${LADDER_MAX_RUNGS} · current winnings ${formatCurrency(currentPayout)}`
                    : 'Guess right to start climbing.'}
                </Text>
              </View>

              <View style={styles.reelsPanel}>
                <SlotReel
                  values={LADDER_SIDES}
                  targetValue={pendingOutcome}
                  spinToken={spinToken}
                  rotations={REEL_ROTATIONS}
                  durationMs={REEL_DURATION_MS}
                  onLanded={handleReelLanded}
                  width={200}
                  fontSize={24}
                />
              </View>

              {!ladderComplete ? (
                <View style={styles.optionsRow}>
                  {LADDER_SIDES.map((side) => (
                    <Pressable
                      key={side}
                      onPress={() => handleGuess(side)}
                      disabled={isDisabled || betAmount === null}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.option,
                        pressed && !isDisabled && betAmount !== null && styles.optionPressed,
                        (isDisabled || betAmount === null) && styles.optionDisabled,
                      ]}>
                      <Text style={styles.optionLabel}>{side}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.note}>Top of the ladder — cash out to collect.</Text>
              )}

              {rungsCleared > 0 ? (
                <SecondaryButton
                  label={`Cash Out — ${formatCurrency(currentPayout)}`}
                  onPress={handleCashOut}
                  disabled={isBusy}
                />
              ) : null}

              {ladderError ? <Text style={styles.errorText}>{ladderError}</Text> : null}

              {lastResult ? (
                <View style={[styles.panel, styles.panelCentered]}>
                  <Text style={lastResult.busted ? styles.resultLose : styles.resultWin}>
                    {lastResult.busted
                      ? `Wrong call — you lost ${formatCurrency(lastResult.betAmount)}.`
                      : `Cashed out at ×${lastResult.multiplier}! You won ${formatCurrency(lastResult.payout)}.`}
                  </Text>
                  <Text style={styles.resultNet}>{formatCurrency(lastResult.net, { signDisplay: 'always' })}</Text>
                </View>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginHorizontal: 18,
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
  },
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: Colors.light.surface,
    borderWidth: 1.5,
    borderColor: Colors.light.accent,
  },
  balanceBadgeText: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 14,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingBottom: 36,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 16,
    gap: 16,
  },
  title: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 26,
    textAlign: 'center',
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
  },
  panelCentered: {
    alignItems: 'center',
  },
  note: {
    color: Colors.light.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    color: Colors.light.accent,
    fontSize: 14,
    textAlign: 'center',
  },
  betLabel: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 16,
    marginBottom: 10,
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
  rungRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  rung: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.light.line,
  },
  rungCleared: {
    backgroundColor: Colors.light.sage,
    borderColor: Colors.light.sage,
  },
  rungNext: {
    borderColor: Colors.light.accent,
    borderWidth: 2,
  },
  rungLabel: {
    color: Colors.light.textMuted,
    fontFamily: Fonts.serif,
    fontSize: 12,
  },
  rungLabelCleared: {
    color: Colors.light.surface,
  },
  rungCaption: {
    color: Colors.light.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  reelsPanel: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.line,
    alignItems: 'center',
  },
  resultWin: {
    color: Colors.light.sage,
    fontFamily: Fonts.serif,
    fontSize: 18,
    textAlign: 'center',
  },
  resultLose: {
    color: Colors.light.accent,
    fontFamily: Fonts.serif,
    fontSize: 18,
    textAlign: 'center',
  },
  resultNet: {
    color: Colors.light.textMuted,
    fontSize: 14,
    marginTop: 6,
  },
});
