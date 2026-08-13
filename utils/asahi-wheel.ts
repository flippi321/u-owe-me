import { fetchCoinBalance } from './casino';
import { supabase } from './supabase';

// 9 uniform values per reel, independent draws across 5 reels. A win is the
// longest run of consecutive equal reels anywhere in the line (not just
// starting from the left): P(2-run) ≈ 34.14%, P(3-run) ≈ 3.17%,
// P(4-run) ≈ 0.244%, P(5-run) ≈ 0.0152%, P(no win) ≈ 62.43%.
export const ASAHI_WHEEL_VALUES: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// Must match the seed row's name in db_structure.sql exactly — its uuid is
// generated per-database, so it's always looked up by name, never hardcoded.
export const ASAHI_WHEEL_GAME_NAME = 'Asahi Wheel';

type Result<T> = { data: T; error: null } | { data: null; error: string };

export type AsahiWheelReels = [number, number, number, number, number];

export type AsahiWheelMultiplier = 0 | 0.6 | 7 | 50 | 500;

export type AsahiWheelResult = {
  reels: AsahiWheelReels;
  multiplier: AsahiWheelMultiplier;
  winningIndices: number[];
  betAmount: number;
  payout: number;
  net: number;
  transactionId: string;
};

const MULTIPLIER_BY_RUN_LENGTH: Record<number, AsahiWheelMultiplier> = {
  2: 0.6,
  3: 7,
  4: 50,
  5: 500,
};

function findRuns(reels: AsahiWheelReels): { start: number; length: number }[] {
  const runs: { start: number; length: number }[] = [];
  let start = 0;
  for (let i = 1; i <= reels.length; i++) {
    if (i === reels.length || reels[i] !== reels[start]) {
      runs.push({ start, length: i - start });
      start = i;
    }
  }
  return runs;
}

// The payout tier is set by the single longest run anywhere in the line —
// ties for that length (e.g. two separate pairs) all get highlighted, since
// they share the same payout tier and hiding one would look like a bug.
export function computeAsahiWheelOutcome(reels: AsahiWheelReels): {
  multiplier: AsahiWheelMultiplier;
  winningIndices: number[];
} {
  const runs = findRuns(reels);
  const maxLength = Math.max(...runs.map((run) => run.length));

  if (maxLength < 2) return { multiplier: 0, winningIndices: [] };

  const winningIndices = runs
    .filter((run) => run.length === maxLength)
    .flatMap((run) => Array.from({ length: run.length }, (_, k) => run.start + k));

  return { multiplier: MULTIPLIER_BY_RUN_LENGTH[maxLength], winningIndices };
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

  const reels: AsahiWheelReels = [rollReel(), rollReel(), rollReel(), rollReel(), rollReel()];
  const { multiplier, winningIndices } = computeAsahiWheelOutcome(reels);
  const payout = Math.round(betAmount * multiplier * 100) / 100;
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

  return {
    data: { reels, multiplier, winningIndices, betAmount, payout, net, transactionId: transaction.id },
    error: null,
  };
}
