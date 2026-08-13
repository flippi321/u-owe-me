import type { Profile } from './auth';
import { supabase } from './supabase';

export type LeaderboardEntry = {
  profile: Profile;
  amount: number;
};

export type Leaderboard = {
  topLenders: LeaderboardEntry[]; // most currently owed to them by others
  bottomDwellers: LeaderboardEntry[]; // most they currently owe to others
};

export async function fetchLeaderboard(): Promise<{ data: Leaderboard | null; error: string | null }> {
  const { data, error } = await supabase.from('payments').select('amount, owed_by, paid_by').eq('is_settled', false);
  if (error) return { data: null, error: error.message };

  const lentTotals = new Map<string, number>();
  const owedTotals = new Map<string, number>();

  for (const row of data ?? []) {
    const amount = Number(row.amount);
    lentTotals.set(row.paid_by, (lentTotals.get(row.paid_by) ?? 0) + amount);
    owedTotals.set(row.owed_by, (owedTotals.get(row.owed_by) ?? 0) + amount);
  }

  const ids = Array.from(new Set([...lentTotals.keys(), ...owedTotals.keys()]));
  if (ids.length === 0) return { data: { topLenders: [], bottomDwellers: [] }, error: null };

  const { data: profileRows, error: profileError } = await supabase.from('profiles').select('*').in('id', ids);
  if (profileError) return { data: null, error: profileError.message };

  const profilesById = Object.fromEntries((profileRows ?? []).map((p) => [p.id, p as Profile]));

  const toEntries = (totals: Map<string, number>): LeaderboardEntry[] =>
    Array.from(totals.entries())
      .map(([id, amount]) => ({ profile: profilesById[id], amount }))
      .filter((entry): entry is LeaderboardEntry => Boolean(entry.profile) && entry.amount > 0)
      .sort((a, b) => b.amount - a.amount);

  return {
    data: { topLenders: toEntries(lentTotals), bottomDwellers: toEntries(owedTotals) },
    error: null,
  };
}
