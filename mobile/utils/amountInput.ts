export function evaluateAmountInput(value: string): number | null {
  const normalized = value
    .replace(/[¥￥,，\s]/g, "")
    .replace(/。/g, ".")
    .replace(/[－—]/g, "-")
    .replace(/[＋]/g, "+");

  if (!normalized) return null;
  if (!/^[+-]?\d*(?:\.\d+)?(?:[+-]\d*(?:\.\d+)?)*$/.test(normalized)) return null;

  const tokens = normalized.match(/[+-]?\d*(?:\.\d+)?/g)?.filter(Boolean) ?? [];
  if (tokens.length === 0) return null;

  const total = tokens.reduce((sum, token) => sum + Number(token), 0);
  if (!Number.isFinite(total) || total <= 0) return null;

  return Math.round(total * 100) / 100;
}
