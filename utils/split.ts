import type { Profile } from './auth';

export function computeEqualShares(
  total: number,
  participantIds: string[],
  payerId: string,
  orderedPeople: Profile[]
): Record<string, number> {
  const n = participantIds.length;
  const base = Math.floor(total / n);
  const remainder = total - base * n;

  const shares: Record<string, number> = {};
  for (const id of participantIds) shares[id] = base;

  const remainderTarget = participantIds.includes(payerId)
    ? payerId
    : (orderedPeople.find((p) => participantIds.includes(p.id))?.id ?? participantIds[0]);

  shares[remainderTarget] += remainder;
  return shares;
}
