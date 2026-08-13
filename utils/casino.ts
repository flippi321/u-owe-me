import { supabase } from './supabase';

export type CoinTransactionType = 'buy_in' | 'cash_out' | 'game_play';

type Result<T> = { data: T; error: null } | { data: null; error: string };

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
// the House owes them).
export async function cashOutCoins(userId: string, amount: number): Promise<Result<{ transactionId: string }>> {
  if (!Number.isInteger(amount) || amount <= 0) {
    return { data: null, error: 'Enter an amount greater than ¥0.' };
  }

  const { data, error } = await supabase
    .from('coin_transactions')
    .insert({ user_id: userId, type: 'cash_out', amount: -amount })
    .select('id')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Could not cash out coins.' };
  }

  return { data: { transactionId: data.id }, error: null };
}
