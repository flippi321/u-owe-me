import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, SecondaryButton } from '@/components/auth/buttons';
import { Hand } from '@/components/casino/playing-card';
import { Colors, Fonts } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';
import {
  buildShuffledDeck,
  dealerShouldHit,
  handValue,
  isBlackjack,
  isBust,
  settleBlackjackRound,
  type BlackjackRoundResult,
  type Card,
} from '@/utils/blackjack';
import { fetchCoinBalance } from '@/utils/casino';
import { formatCurrency } from '@/utils/currency';

const BET_AMOUNTS = [100, 250, 500];

type Phase = 'betting' | 'player_turn' | 'dealer_turn';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function Blackjack() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [coinBalance, setCoinBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [betAmount, setBetAmount] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('betting');
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [doubled, setDoubled] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<BlackjackRoundResult | null>(null);

  const deckRef = useRef<Card[]>([]);

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

  const revealAndSettle = async (finalPlayer: Card[], startingDealer: Card[], isDoubled: boolean) => {
    if (!user || betAmount === null) return;

    setIsBusy(true);
    setPhase('dealer_turn');

    let dealerHand = startingDealer;
    const playerBust = isBust(finalPlayer);
    const playerHasNatural = isBlackjack(finalPlayer) && finalPlayer.length === 2 && !isDoubled;

    if (!playerBust && !playerHasNatural) {
      await sleep(400);
      const draw = () => deckRef.current.pop()!;
      while (dealerShouldHit(dealerHand)) {
        await sleep(500);
        dealerHand = [...dealerHand, draw()];
        setDealerCards(dealerHand);
      }
    }

    await sleep(300);
    const result = await settleBlackjackRound(user.id, betAmount, finalPlayer, dealerHand, isDoubled);

    setIsBusy(false);
    setPhase('betting');

    if (result.error) {
      setGameError(result.error);
      return;
    }

    setLastResult(result.data);
    await loadBalance(user.id);
  };

  const handleDeal = () => {
    if (!user || betAmount === null || isBusy) return;

    setGameError(null);
    setLastResult(null);
    setDoubled(false);

    deckRef.current = buildShuffledDeck();
    const draw = () => deckRef.current.pop()!;
    const newPlayer = [draw(), draw()];
    const newDealer = [draw(), draw()];
    setPlayerCards(newPlayer);
    setDealerCards(newDealer);

    if (isBlackjack(newPlayer) || isBlackjack(newDealer)) {
      void revealAndSettle(newPlayer, newDealer, false);
    } else {
      setPhase('player_turn');
    }
  };

  const handleHit = () => {
    if (phase !== 'player_turn' || isBusy) return;
    const draw = () => deckRef.current.pop()!;
    const updated = [...playerCards, draw()];
    setPlayerCards(updated);
    if (isBust(updated)) {
      void revealAndSettle(updated, dealerCards, false);
    }
  };

  const handleStand = () => {
    if (phase !== 'player_turn' || isBusy) return;
    void revealAndSettle(playerCards, dealerCards, false);
  };

  const handleDouble = () => {
    if (phase !== 'player_turn' || isBusy || playerCards.length !== 2 || betAmount === null) return;
    if (betAmount * 2 > coinBalance) return;
    const draw = () => deckRef.current.pop()!;
    const updated = [...playerCards, draw()];
    setPlayerCards(updated);
    setDoubled(true);
    void revealAndSettle(updated, dealerCards, true);
  };

  const isDisabled = isLoading || !!error || !user;
  const canDouble =
    phase === 'player_turn' &&
    !isBusy &&
    playerCards.length === 2 &&
    betAmount !== null &&
    betAmount * 2 <= coinBalance;

  const hideHole = phase === 'player_turn';
  const dealerTotal =
    dealerCards.length === 0 ? 0 : handValue(hideHole ? [dealerCards[0]] : dealerCards).total;
  const playerTotal = playerCards.length === 0 ? 0 : handValue(playerCards).total;

  const resultStyle =
    lastResult === null ? styles.resultPush : lastResult.net > 0 ? styles.resultWin : lastResult.net < 0 ? styles.resultLose : styles.resultPush;

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
          <Text style={styles.title}>Blackjack</Text>

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
                    const locked = phase !== 'betting' || isBusy;
                    return (
                      <Pressable
                        key={amount}
                        onPress={() => setBetAmount(amount)}
                        disabled={isDisabled || locked}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        style={({ pressed }) => [
                          styles.option,
                          isSelected && styles.optionSelected,
                          pressed && !isDisabled && !locked && styles.optionPressed,
                          (isDisabled || locked) && styles.optionDisabled,
                        ]}>
                        <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                          {formatCurrency(amount)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.tablePanel}>
                <View style={styles.handBlock}>
                  <Text style={styles.handLabel}>
                    Dealer{dealerCards.length > 0 ? (hideHole ? ` · ${dealerTotal}+` : ` · ${dealerTotal}`) : ''}
                  </Text>
                  {dealerCards.length > 0 ? (
                    <Hand cards={dealerCards} hideSecondCard={hideHole} />
                  ) : (
                    <View style={styles.emptyHand} />
                  )}
                </View>

                <View style={styles.handBlock}>
                  <Text style={styles.handLabel}>
                    You{playerCards.length > 0 ? ` · ${playerTotal}` : ''}
                    {doubled ? ' · doubled' : ''}
                  </Text>
                  {playerCards.length > 0 ? <Hand cards={playerCards} /> : <View style={styles.emptyHand} />}
                </View>
              </View>

              {phase === 'betting' ? (
                <PrimaryButton label="Deal" onPress={handleDeal} disabled={betAmount === null || isBusy} />
              ) : phase === 'dealer_turn' ? (
                <View style={[styles.panel, styles.panelCentered]}>
                  <ActivityIndicator color={Colors.light.accent} />
                  <Text style={styles.note}>Dealer is playing…</Text>
                </View>
              ) : (
                <View style={styles.actionsRow}>
                  <View style={styles.actionButton}>
                    <SecondaryButton label="Hit" onPress={handleHit} disabled={isBusy} />
                  </View>
                  <View style={styles.actionButton}>
                    <SecondaryButton label="Double" onPress={handleDouble} disabled={!canDouble} />
                  </View>
                  <View style={styles.actionButton}>
                    <PrimaryButton label="Stand" onPress={handleStand} disabled={isBusy} />
                  </View>
                </View>
              )}

              {gameError ? <Text style={styles.errorText}>{gameError}</Text> : null}

              {lastResult ? (
                <View style={[styles.panel, styles.panelCentered]}>
                  <Text style={resultStyle}>{resultCopy(lastResult)}</Text>
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

function resultCopy(result: BlackjackRoundResult): string {
  switch (result.outcome) {
    case 'player_blackjack':
      return 'Blackjack! You win.';
    case 'push':
      return 'Push — both hands hit blackjack, bet returned.';
    case 'player_bust':
      return 'Bust — you went over 21.';
    case 'dealer_bust':
      return 'Dealer busts — you win.';
    case 'player_win':
      return 'You win!';
    case 'dealer_win':
      return 'Dealer wins.';
  }
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
    gap: 8,
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
  tablePanel: {
    borderRadius: 28,
    padding: 20,
    backgroundColor: Colors.light.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.light.line,
    gap: 18,
  },
  handBlock: {
    gap: 10,
  },
  handLabel: {
    color: Colors.light.textMuted,
    fontFamily: Fonts.serif,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  emptyHand: {
    height: 92,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
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
  resultPush: {
    color: Colors.light.textMuted,
    fontFamily: Fonts.serif,
    fontSize: 18,
    textAlign: 'center',
  },
  resultNet: {
    color: Colors.light.textMuted,
    fontSize: 14,
  },
});
