// All amounts in this app are JPY, which has no minor unit (no decimal places).
export function formatCurrency(amount: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    ...options,
  }).format(amount);
}
