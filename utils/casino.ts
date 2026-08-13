import { supabase } from './supabase';

export type CoinTransactionType = 'buy_in' | 'cash_out' | 'game_play';

type Result<T> = { data: T; error: null } | { data: null; error: string };

// buy_in/cash_out are self-serve and always count. game_play needs a
// friend's stamp first (see db_structure.sql) — you shouldn't be able to
// confirm your own win.
export async function fetchCoinBalance(userId: string): Promise<Result<number>> {
  const { data, error } = await supabase
    .from('coin_transactions')
    .select('type, amount, stamped_by')
    .eq('user_id', userId);

  if (error) return { data: null, error: error.message };

  const balance = (data ?? []).reduce((total, row) => {
    if (row.type === 'game_play' && !row.stamped_by) return total;
    return total + Number(row.amount);
  }, 0);

  return { data: balance, error: null };
}

export async function buyCoins(userId: string, amount: number): Promise<Result<{ transactionId: string }>> {
  if (!Number.isInteger(amount) || amount <= 0) {
    return { data: null, error: 'Enter an amount greater than ¥0.' };
  }

  const { data, error } = await supabase
    .from('coin_transactions')
    .insert({ user_id: userId, type: 'buy_in', amount, stamped_by: null, stamped_at: null })
    .select('id')
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? 'Could not buy coins.' };
  }

  return { data: { transactionId: data.id }, error: null };
}
