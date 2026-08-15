import type { Profile } from './auth';
import { supabase } from './supabase';

export type CoinTransactionType = 'buy_in' | 'cash_out' | 'game_play';

type Result<T> = { data: T; error: null } | { data: null; error: string };

export type HouseDebtEntry = {
  profile: Profile;
  amount: number; // positive = owes the house, negative = house owes them
};

// Same buy_in-minus-cash_out reduction as fetchCoinsOwed, but for every user
// at once — one query instead of N per-profile calls.
export async function fetchHouseDebts(): Promise<Result<HouseDebtEntry[]>> {
  const { data, error } = await supabase
    .from('coin_transactions')
    .select('user_id, amount')
    .in('type', ['buy_in', 'cash_out']);

  if (error) return { data: null, error: error.message };

  const totals = new Map<string, number>();
  for (const row of data ?? []) {
    totals.set(row.user_id, (totals.get(row.user_id) ?? 0) + Number(row.amount));
  }

  const ids = Array.from(totals.keys());
  if (ids.length === 0) return { data: [], error: null };

  const { data: profileRows, error: profileError } = await supabase.from('profiles').select('*').in('id', ids);
  if (profileError) return { data: null, error: profileError.message };

  const profilesById = Object.fromEntries((profileRows ?? []).map((p) => [p.id, p as Profile]));

  const entries = ids
    .map((id) => ({ profile: profilesById[id], amount: totals.get(id) ?? 0 }))
    .filter((entry): entry is HouseDebtEntry => Boolean(entry.profile))
    .sort((a, b) => b.amount - a.amount);

  return { data: entries, error: null };
}

export async function fetchCoinBalance(userId: string): Promise<Result<number>> {
  const { data, error } = await supabase.from('coin_transactions').select('amount').eq('user_id', userId);

  if (error) return { data: null, error: error.message };

  const balance = (data ?? []).reduce((total, row) => total + Number(row.amount), 0);

  return { data: balance, error: null };
}

// Real yen currently committed to the Asahi Fund: buy_in minus cash_out.
// Unlike fetchCoinBalance, this ignores game_play rows on purpose — wins
// and losses are pure coin movement and don't change what's owed, only an
// actual cash-out does (see db_structure.sql).
export async function fetchCoinsOwed(userId: string): Promise<Result<number>> {
  const { data, error } = await supabase
    .from('coin_transactions')
    .select('amount')
    .eq('user_id', userId)
    .in('type', ['buy_in', 'cash_out']);

  if (error) return { data: null, error: error.message };

  const owed = (data ?? []).reduce((total, row) => total + Number(row.amount), 0);

  return { data: owed, error: null };
}

export async function buyCoins(userId: string, amount: number): Promise<Result<{ transactionId: string }>> {
  if (!Number.isInteger(amount) || amount <= 0) {
    return { data: null, error: 'Enter an amount greater than ¥0.' };
  }

  const { data, error } = await supabase
    .from('coin_transactions')
    .insert({ user_id: userId, type: 'buy_in', amount })
    .select('id')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Could not buy coins.' };
  }

  return { data: { transactionId: data.id }, error: null };
}

// Cashes coins back out at the same 1=1 ratio they were bought in at,
// immediately reducing what the user owes the House (or increasing what
// the House owes them). A forgiven debt is mechanically the same operation
// — pass a note to distinguish it in the transaction history.
export async function cashOutCoins(
  userId: string,
  amount: number,
  note?: string
): Promise<Result<{ transactionId: string }>> {
  if (!Number.isInteger(amount) || amount <= 0) {
    return { data: null, error: 'Enter an amount greater than ¥0.' };
  }

  const { data, error } = await supabase
    .from('coin_transactions')
    .insert({ user_id: userId, type: 'cash_out', amount: -amount, note })
    .select('id')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Could not cash out coins.' };
  }

  return { data: { transactionId: data.id }, error: null };
}
