import { supabase } from './supabase';

export type SubmitRecordParams = {
  description: string;
  amount: number; // final, already-reconciled record total (integer yen)
  paidBy: string; // profile id
  perPersonAmounts: Record<string, number>; // owed_by profile id -> integer yen owed to paidBy
};

type SubmitRecordResult = { data: { recordId: string }; error: null } | { data: null; error: string };

export async function submitRecord(params: SubmitRecordParams): Promise<SubmitRecordResult> {
  const { description, amount, paidBy, perPersonAmounts } = params;
  const participantIds = Object.keys(perPersonAmounts);

  const { data: record, error: recordError } = await supabase
    .from('records')
    .insert({
      description,
      amount,
      paid_by: paidBy,
      is_split: participantIds.length > 1,
    })
    .select('id')
    .single();

  if (recordError || !record) {
    return { data: null, error: recordError?.message ?? 'Could not create the record.' };
  }

  const now = new Date().toISOString();
  const paymentsRows = participantIds.map((personId) => ({
    record_id: record.id,
    owed_by: personId,
    paid_by: paidBy,
    amount: perPersonAmounts[personId],
    is_settled: personId === paidBy,
    settled_at: personId === paidBy ? now : null,
  }));

  const { error: paymentsError } = await supabase.from('payments').insert(paymentsRows);

  if (paymentsError) {
    // Best-effort rollback: don't leave an orphaned records row with no payments.
    await supabase.from('records').delete().eq('id', record.id);
    return { data: null, error: paymentsError.message };
  }

  return { data: { recordId: record.id }, error: null };
}
