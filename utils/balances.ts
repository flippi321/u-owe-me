import type { Profile } from './auth';
import { supabase } from './supabase';

export type BalanceEntry = {
  profile: Profile;
  amount: number;
  recordCount: number;
};

export type Balances = {
  owedToMe: BalanceEntry[];
  iOwe: BalanceEntry[];
  netBalance: number;
};

type Totals = Map<string, { amount: number; count: number }>;

function addTotal(totals: Totals, id: string, amount: number) {
  const current = totals.get(id) ?? { amount: 0, count: 0 };
  totals.set(id, { amount: current.amount + amount, count: current.count + 1 });
}

export async function fetchBalances(userId: string): Promise<{ data: Balances | null; error: string | null }> {
  const { data, error } = await supabase.from('payments').select('amount, owed_by, paid_by').eq('is_settled', false);

  if (error) return { data: null, error: error.message };

  const owedToMeTotals: Totals = new Map();
  const iOweTotals: Totals = new Map();

  for (const row of data ?? []) {
    const amount = Number(row.amount);

    if (row.paid_by === userId && row.owed_by !== userId) {
      addTotal(owedToMeTotals, row.owed_by, amount);
    } else if (row.owed_by === userId && row.paid_by !== userId) {
      addTotal(iOweTotals, row.paid_by, amount);
    }
  }

  const counterpartIds = Array.from(new Set([...owedToMeTotals.keys(), ...iOweTotals.keys()]));

  let profilesById: Record<string, Profile> = {};
  if (counterpartIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', counterpartIds);

    if (profileError) return { data: null, error: profileError.message };
    profilesById = Object.fromEntries((profileRows ?? []).map((p) => [p.id, p as Profile]));
  }

  const toEntries = (totals: Totals): BalanceEntry[] =>
    Array.from(totals.entries())
      .map(([id, { amount, count }]) => ({ profile: profilesById[id], amount, recordCount: count }))
      .filter((entry): entry is BalanceEntry => Boolean(entry.profile))
      .sort((a, b) => b.amount - a.amount);

  const owedToMe = toEntries(owedToMeTotals);
  const iOwe = toEntries(iOweTotals);
  const netBalance =
    owedToMe.reduce((sum, entry) => sum + entry.amount, 0) - iOwe.reduce((sum, entry) => sum + entry.amount, 0);

  return { data: { owedToMe, iOwe, netBalance }, error: null };
}
