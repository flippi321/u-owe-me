import { fetchCoinBalance } from './casino';
import { supabase } from './supabase';

export const COIN_FLIP_SIDES = ['English', 'Spanish'] as const;
export type CoinFlipSide = (typeof COIN_FLIP_SIDES)[number];

// Must match the seed row's name in db_structure.sql exactly — its uuid is
// generated per-database, so it's always looked up by name, never hardcoded.
export const COIN_FLIP_GAME_NAME = 'English or Spanish';

type Result<T> = { data: T; error: null } | { data: null; error: string };

export type CoinFlipResult = {
  guess: CoinFlipSide;
  outcome: CoinFlipSide;
  won: boolean;
  betAmount: number;
  payout: number;
  net: number;
  transactionId: string;
};

function flipCoin(): CoinFlipSide {
  return COIN_FLIP_SIDES[Math.floor(Math.random() * COIN_FLIP_SIDES.length)];
}

export async function playCoinFlip(
  userId: string,
  betAmount: number,
  guess: CoinFlipSide
): Promise<Result<CoinFlipResult>> {
  if (!Number.isInteger(betAmount) || betAmount <= 0) {
    return { data: null, error: 'Enter a bet greater than ¥0.' };
  }

  // Re-check against the DB rather than trusting the caller's on-screen
  // balance — the app is already the authority on the outcome, so it
  // should also be the authority on affordability at bet time.
  const balanceResult = await fetchCoinBalance(userId);
  if (balanceResult.error || balanceResult.data === null) {
    return { data: null, error: balanceResult.error ?? 'Could not check your balance.' };
  }
  if (betAmount > balanceResult.data) {
    return { data: null, error: "You don't have enough UOME Coins for that bet." };
  }

  // maybeSingle, not single — the row legitimately might not exist yet
  // (db_structure.sql not (re-)run against this database).
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id')
    .eq('name', COIN_FLIP_GAME_NAME)
    .maybeSingle();

  if (gameError) return { data: null, error: gameError.message };
  if (!game) return { data: null, error: "English or Spanish isn't set up in the database yet." };

  const outcome = flipCoin();
  const won = outcome === guess;
  const payout = won ? betAmount * 2 : 0;
  const net = won ? payout - betAmount : -betAmount;

  const { data: transaction, error: insertError } = await supabase
    .from('coin_transactions')
    .insert({
      user_id: userId,
      type: 'game_play',
      amount: net,
      game_id: game.id,
      note: `English or Spanish: bet ¥${betAmount}, called ${guess}, landed ${outcome}`,
    })
    .select('id')
    .single();

  if (insertError || !transaction) {
    return { data: null, error: insertError?.message ?? 'Could not record the flip.' };
  }

  return { data: { guess, outcome, won, betAmount, payout, net, transactionId: transaction.id }, error: null };
}
