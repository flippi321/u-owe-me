import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/auth/buttons';
import { SlotReel } from '@/components/casino/reel';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { COIN_FLIP_SIDES, playCoinFlip, type CoinFlipResult, type CoinFlipSide } from '@/utils/coin-flip';
import { fetchCoinBalance } from '@/utils/casino';
import { formatCurrency } from '@/utils/currency';

const BET_AMOUNTS = [100, 250, 500];
const REEL_ROTATIONS = 12;
const REEL_DURATION_MS = 3200;

export default function CoinFlip() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [coinBalance, setCoinBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [betAmount, setBetAmount] = useState<number | null>(null);
  const [guess, setGuess] = useState<CoinFlipSide | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipError, setFlipError] = useState<string | null>(null);
  const [spinToken, setSpinToken] = useState(0);
  const [pendingResult, setPendingResult] = useState<CoinFlipResult | null>(null);
  const [hasLanded, setHasLanded] = useState(false);
  const [revealedResult, setRevealedResult] = useState<CoinFlipResult | null>(null);

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

  useEffect(() => {
    if (!hasLanded || !pendingResult || !user) return;

    setRevealedResult(pendingResult);
    loadBalance(user.id).then(() => setIsFlipping(false));
  }, [hasLanded, pendingResult, user, loadBalance]);

  const handleReelLanded = () => setHasLanded(true);

  const handleFlip = async () => {
    if (!user || betAmount === null || guess === null) return;

    if (betAmount > coinBalance) {
      setFlipError("You don't have enough UOME Coins for that bet.");
      return;
    }

    setIsFlipping(true);
    setFlipError(null);
    setRevealedResult(null);

    const result = await playCoinFlip(user.id, betAmount, guess);

    if (result.error) {
      setIsFlipping(false);
      setFlipError(result.error);
      return;
    }

    setPendingResult(result.data);
    setHasLanded(false);
    setSpinToken((token) => token + 1);
  };

  const isDisabled = isFlipping || isLoading || !!error || !user;

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <Text style={styles.title}>English or Spanish</Text>

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
              <View style={[styles.panel, styles.panelCentered]}>
                <Text style={styles.sectionLabel}>UOME Coins</Text>
                <Text style={styles.balance}>{formatCurrency(coinBalance)}</Text>
              </View>

              <View style={styles.panel}>
                <Text style={styles.betLabel}>Bet</Text>
                <View style={styles.optionsRow}>
                  {BET_AMOUNTS.map((amount) => {
                    const isSelected = betAmount === amount;
                    return (
                      <Pressable
                        key={amount}
                        onPress={() => setBetAmount(amount)}
                        disabled={isDisabled}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        style={({ pressed }) => [
                          styles.option,
                          isSelected && styles.optionSelected,
                          pressed && !isDisabled && styles.optionPressed,
                          isDisabled && styles.optionDisabled,
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
                <Text style={styles.betLabel}>Call it</Text>
                <View style={styles.optionsRow}>
                  {COIN_FLIP_SIDES.map((side) => {
                    const isSelected = guess === side;
                    return (
                      <Pressable
                        key={side}
                        onPress={() => setGuess(side)}
                        disabled={isDisabled}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        style={({ pressed }) => [
                          styles.option,
                          isSelected && styles.optionSelected,
                          pressed && !isDisabled && styles.optionPressed,
                          isDisabled && styles.optionDisabled,
                        ]}>
                        <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{side}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.reelsPanel}>
                <SlotReel
                  values={COIN_FLIP_SIDES}
                  targetValue={pendingResult?.outcome ?? null}
                  spinToken={spinToken}
                  rotations={REEL_ROTATIONS}
                  durationMs={REEL_DURATION_MS}
                  onLanded={handleReelLanded}
                  width={220}
                  fontSize={24}
                />
              </View>

              {flipError ? <Text style={styles.errorText}>{flipError}</Text> : null}

              <PrimaryButton
                label="Flip"
                onPress={handleFlip}
                loading={isFlipping}
                disabled={isDisabled || betAmount === null || guess === null}
              />

              {revealedResult ? (
                <View style={[styles.panel, styles.panelCentered]}>
                  <Text style={revealedResult.won ? styles.resultWin : styles.resultLose}>
                    {revealedResult.won
                      ? `${revealedResult.outcome}! You won ${formatCurrency(revealedResult.payout)}.`
                      : `${revealedResult.outcome}! You lost ${formatCurrency(revealedResult.betAmount)}.`}
                  </Text>
                  <Text style={styles.resultNet}>
                    {formatCurrency(revealedResult.net, { signDisplay: 'always' })}
                  </Text>
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
    fontSize: 36,
    lineHeight: 42,
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
