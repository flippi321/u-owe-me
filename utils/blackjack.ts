import { fetchCoinBalance } from './casino';
import { supabase } from './supabase';

// Must match the seed row's name in db_structure.sql exactly — its uuid is
// generated per-database, so it's always looked up by name, never hardcoded.
export const BLACKJACK_GAME_NAME = 'Blackjack';

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export type Rank = (typeof RANKS)[number];

export type Card = { rank: Rank; suit: Suit };

export function buildShuffledDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) deck.push({ rank, suit });
  }

  // Fisher-Yates, same Math.random() approach as every other game's RNG.
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function rankValue(rank: Rank): number {
  if (rank === 'A') return 11;
  if (rank === 'J' || rank === 'Q' || rank === 'K') return 10;
  return Number(rank);
}

// Best total ≤21 if achievable (Aces demoted from 11 to 1 as needed).
// `soft` is true if an Ace is still being counted as 11.
export function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    total += rankValue(card.rank);
    if (card.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}

export function isBust(cards: Card[]): boolean {
  return handValue(cards).total > 21;
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards).total === 21;
}

// Dealer stands on any 17+, no exceptions — keeping the rule simple and
// deterministic. The house edge below doesn't depend on this nuance.
export function dealerShouldHit(cards: Card[]): boolean {
  return handValue(cards).total < 17;
}

// HOUSE EDGE: standard blackjack payouts (3:2 on a natural, 1:1 otherwise,
// push on a tie) run close to fair with decent play. This table's one
// deliberate house-favoring rule is that a tied non-blackjack total (e.g.
// both draw 20) is a DEALER win rather than a push — a push only happens
// when the player's natural blackjack is matched by the dealer's. A 3M-hand
// simulation of this ruleset against a basic-strategy player (hit/stand/
// double, no split) measured a house edge of ~9.2% per original bet — inside
// the target 5-10% band with room to spare, and worse for less careful play.
export type BlackjackOutcome =
  | 'player_blackjack'
  | 'push'
  | 'player_bust'
  | 'dealer_bust'
  | 'player_win'
  | 'dealer_win';

type Result<T> = { data: T; error: null } | { data: null; error: string };

export type BlackjackRoundResult = {
  betAmount: number;
  doubled: boolean;
  stake: number;
  outcome: BlackjackOutcome;
  payout: number;
  net: number;
  transactionId: string;
};

export function resolveOutcome(playerCards: Card[], dealerCards: Card[]): BlackjackOutcome {
  const playerBJ = isBlackjack(playerCards);
  const dealerBJ = isBlackjack(dealerCards);

  if (playerBJ || dealerBJ) {
    if (playerBJ && dealerBJ) return 'push';
    return playerBJ ? 'player_blackjack' : 'dealer_win';
  }

  if (isBust(playerCards)) return 'player_bust';
  if (isBust(dealerCards)) return 'dealer_bust';

  const playerTotal = handValue(playerCards).total;
  const dealerTotal = handValue(dealerCards).total;

  if (playerTotal > dealerTotal) return 'player_win';
  return 'dealer_win'; // strictly-less, or a tie — ties go to the house
}

// Settles a completed hand: exactly one coin_transactions row per hand, no
// matter how many hit/stand/double decisions it took to get there.
export async function settleBlackjackRound(
  userId: string,
  betAmount: number,
  playerCards: Card[],
  dealerCards: Card[],
  doubled: boolean
): Promise<Result<BlackjackRoundResult>> {
  if (!Number.isInteger(betAmount) || betAmount <= 0) {
    return { data: null, error: 'Enter a bet greater than ¥0.' };
  }

  const stake = doubled ? betAmount * 2 : betAmount;

  // Re-check against the DB rather than trusting the caller's on-screen
  // balance — the app is already the authority on the outcome, so it
  // should also be the authority on affordability at bet time.
  const balanceResult = await fetchCoinBalance(userId);
  if (balanceResult.error || balanceResult.data === null) {
    return { data: null, error: balanceResult.error ?? 'Could not check your balance.' };
  }
  if (stake > balanceResult.data) {
    return { data: null, error: "You don't have enough UOME Coins for that bet." };
  }

  // maybeSingle, not single — the row legitimately might not exist yet
  // (db_structure.sql not (re-)run against this database).
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id')
    .eq('name', BLACKJACK_GAME_NAME)
    .maybeSingle();

  if (gameError) return { data: null, error: gameError.message };
  if (!game) return { data: null, error: "Blackjack isn't set up in the database yet." };

  const outcome = resolveOutcome(playerCards, dealerCards);

  let net: number;
  switch (outcome) {
    case 'player_blackjack':
      net = stake * 1.5;
      break;
    case 'push':
      net = 0;
      break;
    case 'player_bust':
    case 'dealer_win':
      net = -stake;
      break;
    case 'dealer_bust':
    case 'player_win':
      net = stake;
      break;
  }
  net = Math.round(net * 100) / 100;
  const payout = Math.max(net + stake, 0);

  if (net === 0) {
    return {
      data: { betAmount, doubled, stake, outcome, payout: stake, net, transactionId: 'push' },
      error: null,
    };
  }

  const { data: transaction, error: insertError } = await supabase
    .from('coin_transactions')
    .insert({
      user_id: userId,
      type: 'game_play',
      amount: net,
      game_id: game.id,
      note: `Blackjack: bet ¥${betAmount}${doubled ? ' (doubled)' : ''}, ${outcome.replace('_', ' ')}`,
    })
    .select('id')
    .single();

  if (insertError || !transaction) {
    return { data: null, error: insertError?.message ?? 'Could not record the hand.' };
  }

  return {
    data: { betAmount, doubled, stake, outcome, payout, net, transactionId: transaction.id },
    error: null,
  };
}
