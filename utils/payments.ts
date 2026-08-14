import { supabase } from './supabase';

export type PaymentDetail = {
  id: string;
  amount: number; // this payment's share
  recordId: string;
  description: string;
  recordAmount: number; // the record's total, for the "of ¥X" comparison
  direction: 'owed_to_me' | 'i_owe';
};

type Result<T> = { data: T; error: null } | { data: null; error: string };

async function attachRecords(
  paymentRows: { id: string; amount: number; record_id: string; owed_by: string; paid_by: string }[],
  userId: string
): Promise<Result<PaymentDetail[]>> {
  if (paymentRows.length === 0) return { data: [], error: null };

  const recordIds = Array.from(new Set(paymentRows.map((p) => p.record_id)));
  const { data: recordRows, error: recordError } = await supabase
    .from('records')
    .select('id, description, amount')
    .in('id', recordIds);

  if (recordError) return { data: null, error: recordError.message };

  const recordsById = Object.fromEntries((recordRows ?? []).map((r) => [r.id, r]));

  const details = paymentRows
    .map((p) => {
      const record = recordsById[p.record_id];
      if (!record) return null;
      return {
        id: p.id,
        amount: Number(p.amount),
        recordId: p.record_id,
        description: record.description,
        recordAmount: Number(record.amount),
        direction: p.paid_by === userId ? 'owed_to_me' : 'i_owe',
      } satisfies PaymentDetail;
    })
    .filter((d): d is PaymentDetail => d !== null);

  return { data: details, error: null };
}

export async function fetchPaymentsBetween(userId: string, counterpartId: string): Promise<Result<PaymentDetail[]>> {
  const { data: paymentRows, error } = await supabase
    .from('payments')
    .select('id, amount, record_id, owed_by, paid_by')
    .eq('is_settled', false)
    .or(
      `and(paid_by.eq.${userId},owed_by.eq.${counterpartId}),and(paid_by.eq.${counterpartId},owed_by.eq.${userId})`
    );

  if (error) return { data: null, error: error.message };

  return attachRecords(paymentRows ?? [], userId);
}

export async function fetchPaymentById(paymentId: string, userId: string): Promise<Result<PaymentDetail>> {
  const { data: paymentRow, error } = await supabase
    .from('payments')
    .select('id, amount, record_id, owed_by, paid_by')
    .eq('id', paymentId)
    .single();

  if (error || !paymentRow) return { data: null, error: error?.message ?? 'Payment not found.' };

  const result = await attachRecords([paymentRow], userId);
  if (result.data === null) return result;

  const detail = result.data[0];
  if (!detail) return { data: null, error: 'Payment not found.' };
  return { data: detail, error: null };
}

export async function updatePaymentAmount(paymentId: string, amount: number): Promise<{ error: string | null }> {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: 'Enter an amount greater than ¥0.' };
  }

  const { error } = await supabase
    .from('payments')
    .update({ amount })
    .eq('id', paymentId)
    .eq('is_settled', false);

  if (error) return { error: error.message };
  return { error: null };
}
