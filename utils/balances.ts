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

  // Net the two directions per counterpart so someone who owes you ¥1000
  // while you owe them ¥500 shows up once — as ¥500 owed to you — instead
  // of appearing in both lists at once.
  const owedToMe: BalanceEntry[] = [];
  const iOwe: BalanceEntry[] = [];

  for (const id of counterpartIds) {
    const profile = profilesById[id];
    if (!profile) continue;

    const owedToMeAmount = owedToMeTotals.get(id)?.amount ?? 0;
    const iOweAmount = iOweTotals.get(id)?.amount ?? 0;
    const recordCount = (owedToMeTotals.get(id)?.count ?? 0) + (iOweTotals.get(id)?.count ?? 0);
    const net = owedToMeAmount - iOweAmount;

    if (net > 0) {
      owedToMe.push({ profile, amount: net, recordCount });
    } else if (net < 0) {
      iOwe.push({ profile, amount: -net, recordCount });
    }
  }

  owedToMe.sort((a, b) => b.amount - a.amount);
  iOwe.sort((a, b) => b.amount - a.amount);

  const netBalance =
    owedToMe.reduce((sum, entry) => sum + entry.amount, 0) - iOwe.reduce((sum, entry) => sum + entry.amount, 0);

  return { data: { owedToMe, iOwe, netBalance }, error: null };
}

// Marks every unsettled payment between the two users as settled, in both
// directions at once. This is only ever offered when the net balance is in
// userId's favor (they're owed more than they owe) — see payment-details.tsx
// — so a debtor can never unilaterally clear what they owe. UI-only rounding
// (nearest ¥100) is never applied here — this clears the exact underlying
// amounts.
export async function settleUp(userId: string, counterpartId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('payments')
    .update({ is_settled: true, settled_at: new Date().toISOString() })
    .eq('is_settled', false)
    .or(`and(paid_by.eq.${userId},owed_by.eq.${counterpartId}),and(paid_by.eq.${counterpartId},owed_by.eq.${userId})`);

  if (error) return { error: error.message };
  return { error: null };
}
