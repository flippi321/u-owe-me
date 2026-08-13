import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAudioPlayer } from 'expo-audio';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
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
import { SlotReel } from '@/components/casino/reel';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import { ASAHI_WHEEL_VALUES, playAsahiWheel, type AsahiWheelResult } from '@/utils/asahi-wheel';
import { fetchCoinBalance } from '@/utils/casino';
import { formatCurrency } from '@/utils/currency';

const REEL_COUNT = 5;
const REEL_ROTATIONS = [3, 4, 5, 6, 7];
const REEL_DURATIONS = [1200, 1850, 2500, 3150, 3800];
const BET_AMOUNTS = [100, 250, 500];

const REEL_GAP = 8;
const MIN_REEL_WIDTH = 48;
const MAX_REEL_WIDTH = 72;

export default function AsahiWheel() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { width: screenWidth } = useWindowDimensions();
  const contentWidth = Math.min(screenWidth - 32, 420);
  const reelWidth = Math.min(
    MAX_REEL_WIDTH,
    Math.max(MIN_REEL_WIDTH, Math.floor((contentWidth - 20 * 2 - REEL_GAP * (REEL_COUNT - 1)) / REEL_COUNT))
  );
  const reelFontSize = Math.max(18, Math.min(30, Math.round(reelWidth * 0.42)));

  const reelLandPlayer = useAudioPlayer(require('@/assets/sounds/reel-land.wav'));
  const winPlayer = useAudioPlayer(require('@/assets/sounds/win.wav'));
  const losePlayer = useAudioPlayer(require('@/assets/sounds/lose.wav'));

  const [coinBalance, setCoinBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [betAmount, setBetAmount] = useState<number | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinError, setSpinError] = useState<string | null>(null);
  const [spinToken, setSpinToken] = useState(0);
  const [pendingResult, setPendingResult] = useState<AsahiWheelResult | null>(null);
  const [landedCount, setLandedCount] = useState(0);
  const [revealedResult, setRevealedResult] = useState<AsahiWheelResult | null>(null);

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
    if (landedCount < REEL_COUNT || !pendingResult || !user) return;

    setRevealedResult(pendingResult);
    if (pendingResult.multiplier > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      winPlayer.seekTo(0);
      winPlayer.play();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      losePlayer.seekTo(0);
      losePlayer.play();
    }
    loadBalance(user.id).then(() => setIsSpinning(false));
    // winPlayer/losePlayer are stable player instances from useAudioPlayer —
    // including them would retrigger this effect on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landedCount, pendingResult, user, loadBalance]);

  const handleReelLanded = () => {
    setLandedCount((count) => count + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    reelLandPlayer.seekTo(0);
    reelLandPlayer.play();
  };

  const handleSpin = async () => {
    if (!user || betAmount === null) return;

    if (betAmount > coinBalance) {
      setSpinError("You don't have enough UOME Coins for that bet.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSpinning(true);
    setSpinError(null);
    setRevealedResult(null);

    const result = await playAsahiWheel(user.id, betAmount);

    if (result.error) {
      setIsSpinning(false);
      setSpinError(result.error);
      return;
    }

    setPendingResult(result.data);
    setLandedCount(0);
    setSpinToken((token) => token + 1);
  };

  const isDisabled = isSpinning || isLoading || !!error || !user;

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
          <Text style={styles.title}>Asahi Wheel</Text>

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
                <View style={styles.betOptionsRow}>
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
                          styles.betOption,
                          isSelected && styles.betOptionSelected,
                          pressed && !isDisabled && styles.betOptionPressed,
                          isDisabled && styles.betOptionDisabled,
                        ]}>
                        <Text style={[styles.betOptionLabel, isSelected && styles.betOptionLabelSelected]}>
                          {formatCurrency(amount)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.reelsPanel}>
                <View style={styles.reelsRow}>
                  {Array.from({ length: REEL_COUNT }).map((_, i) => (
                    <SlotReel
                      key={i}
                      values={ASAHI_WHEEL_VALUES}
                      targetValue={pendingResult?.reels[i] ?? null}
                      spinToken={spinToken}
                      rotations={REEL_ROTATIONS[i]}
                      durationMs={REEL_DURATIONS[i]}
                      onLanded={handleReelLanded}
                      width={reelWidth}
                      fontSize={reelFontSize}
                      isWinning={revealedResult?.winningIndices.includes(i) ?? false}
                    />
                  ))}
                </View>
              </View>

              {spinError ? <Text style={styles.errorText}>{spinError}</Text> : null}

              <PrimaryButton
                label="Spin"
                onPress={handleSpin}
                loading={isSpinning}
                disabled={isDisabled || betAmount === null}
              />

              {revealedResult ? (
                <View style={[styles.panel, styles.panelCentered]}>
                  <Text style={revealedResult.multiplier > 0 ? styles.resultWin : styles.resultLose}>
                    {revealedResult.multiplier > 0
                      ? `You won ${formatCurrency(revealedResult.payout)}! (×${revealedResult.multiplier})`
                      : `You lost ${formatCurrency(revealedResult.betAmount)}.`}
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
  betOptionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  betOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    backgroundColor: Colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.light.line,
  },
  betOptionSelected: {
    backgroundColor: Colors.light.accent,
    borderColor: Colors.light.accent,
  },
  betOptionPressed: {
    opacity: 0.8,
  },
  betOptionDisabled: {
    opacity: 0.5,
  },
  betOptionLabel: {
    color: Colors.light.text,
    fontFamily: Fonts.serif,
    fontSize: 16,
  },
  betOptionLabelSelected: {
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
  reelsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
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
