import { fetchCoinBalance } from './casino';
import { supabase } from './supabase';

// 9 uniform values per reel, independent draws: P(triple) = 1/81 (~1.2%),
// P(one adjacent pair) = 16/81 (~19.8%), P(lose) ≈ 79%. Expected return
// ≈ 71.6% of the bet — a real house edge with frequent small wins.
export const ASAHI_WHEEL_VALUES: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Must match the seed row's name in db_structure.sql exactly — its uuid is
// generated per-database, so it's always looked up by name, never hardcoded.
export const ASAHI_WHEEL_GAME_NAME = 'Asahi Wheel';

type Result<T> = { data: T; error: null } | { data: null; error: string };

export type AsahiWheelReels = [number, number, number];

export type AsahiWheelResult = {
  reels: AsahiWheelReels;
  multiplier: 0 | 3 | 10;
  betAmount: number;
  payout: number;
  net: number;
  transactionId: string;
};

// Position 1&3 matching alone (without 2) is not a win — only checks the
// two adjacent pairs, per spec.
export function computeAsahiWheelMultiplier(reels: AsahiWheelReels): 0 | 3 | 10 {
  const [a, b, c] = reels;
  if (a === b && b === c) return 10;
  if (a === b || b === c) return 3;
  return 0;
}

function rollReel(): number {
  return ASAHI_WHEEL_VALUES[Math.floor(Math.random() * ASAHI_WHEEL_VALUES.length)];
}

export async function playAsahiWheel(userId: string, betAmount: number): Promise<Result<AsahiWheelResult>> {
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
  // (db_structure.sql not (re-)run against this database), and single()
  // turns that into an opaque "Cannot coerce..." Postgres error instead of
  // the friendly message below.
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('id')
    .eq('name', ASAHI_WHEEL_GAME_NAME)
    .maybeSingle();

  if (gameError) return { data: null, error: gameError.message };
  if (!game) return { data: null, error: "Asahi Wheel isn't set up in the database yet." };

  const reels: AsahiWheelReels = [rollReel(), rollReel(), rollReel()];
  const multiplier = computeAsahiWheelMultiplier(reels);
  const payout = betAmount * multiplier;
  const net = payout - betAmount;

  const { data: transaction, error: insertError } = await supabase
    .from('coin_transactions')
    .insert({
      user_id: userId,
      type: 'game_play',
      amount: net,
      game_id: game.id,
      note: `Asahi Wheel: bet ¥${betAmount}, rolled ${reels.join('-')}, ×${multiplier}`,
    })
    .select('id')
    .single();

  if (insertError || !transaction) {
    return { data: null, error: insertError?.message ?? 'Could not record the spin.' };
  }

  return { data: { reels, multiplier, betAmount, payout, net, transactionId: transaction.id }, error: null };
}
