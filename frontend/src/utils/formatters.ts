export function formatINR(amount: number | null | undefined): string {
  const val = Number(amount || 0);
  return '₹' + val.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
}
