import { fetchCoinBalance } from './casino';
import { supabase } from './supabase';

// Must match the seed row's name in db_structure.sql exactly — its uuid is
// generated per-database, so it's always looked up by name, never hardcoded.
export const LADDER_GAME_NAME = 'The Ladder';

export const LADDER_SIDES = ['Red', 'Black'] as const;
export type LadderSide = (typeof LADDER_SIDES)[number];

// Cumulative payout multiplier on the ORIGINAL bet at each rung (not
// compounding per-step) — the climb slows down as the risk stacks up, same
// flat house-edge philosophy as the other two games.
export const LADDER_MULTIPLIERS: readonly number[] = [1.9, 3.5, 7, 14, 28];
export const LADDER_MAX_RUNGS = LADDER_MULTIPLIERS.length;

type Result<T> = { data: T; error: null } | { data: null; error: string };

export type LadderRoundResult = {
  betAmount: number;
  rungsCleared: number; // 0..LADDER_MAX_RUNGS
  busted: boolean;
  multiplier: number; // 0 if busted
  payout: number;
  net: number;
  transactionId: string;
};

// Called once per guess, client-side only — nothing is persisted until the
// round ends (bust or cash-out), so there's nothing to check the DB against
// yet. Each rung's reveal is purely a coin-flip-style 50/50 draw.
export function rollLadderSide(): LadderSide {
  return LADDER_SIDES[Math.floor(Math.random() * LADDER_SIDES.length)];
}

// Settles a completed round: either busted (wrong guess, net = -betAmount
// regardless of how far the ladder was climbed) or cashed out after
// clearing `rungsCleared` rungs (net = payout - betAmount). Exactly one
// coin_transactions row is written per round, no matter how many guesses it
// took to get there.
export async function settleLadderRound(
  userId: string,
  betAmount: number,
  rungsCleared: number,
  busted: boolean
): Promise<Result<LadderRoundResult>> {
  if (!Number.isInteger(betAmount) || betAmount <= 0) {
    return { data: null, error: 'Enter a bet greater than ¥0.' };
  }
  if (!busted && (rungsCleared <= 0 || rungsCleared > LADDER_MAX_RUNGS)) {
    return { data: null, error: 'Clear at least one rung before cashing out.' };
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
    .eq('name', LADDER_GAME_NAME)
    .maybeSingle();

  if (gameError) return { data: null, error: gameError.message };
  if (!game) return { data: null, error: "The Ladder isn't set up in the database yet." };

  const multiplier = busted ? 0 : LADDER_MULTIPLIERS[rungsCleared - 1];
  const payout = busted ? 0 : Math.round(betAmount * multiplier * 100) / 100;
  const net = busted ? -betAmount : payout - betAmount;

  const { data: transaction, error: insertError } = await supabase
    .from('coin_transactions')
    .insert({
      user_id: userId,
      type: 'game_play',
      amount: net,
      game_id: game.id,
      note: busted
        ? `The Ladder: bet ¥${betAmount}, busted after clearing ${rungsCleared} rung(s)`
        : `The Ladder: bet ¥${betAmount}, cashed out at rung ${rungsCleared}, ×${multiplier}`,
    })
    .select('id')
    .single();

  if (insertError || !transaction) {
    return { data: null, error: insertError?.message ?? 'Could not record the round.' };
  }

  return {
    data: { betAmount, rungsCleared, busted, multiplier, payout, net, transactionId: transaction.id },
    error: null,
  };
}
