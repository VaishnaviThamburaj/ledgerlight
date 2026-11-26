/** Small helpers for working with money safely (no floating-point surprises). */

/** Round to whole cents. */
export function toCents(value: number): number {
  return Math.round(value * 100);
}

export function round2(value: number): number {
  return toCents(value) / 100;
}

/** Two amounts are "equal" if they are within one cent of each other. */
export function sameMoney(a: number, b: number): boolean {
  return Math.abs(toCents(a) - toCents(b)) <= 1;
}

export function formatMoney(value: number | null | undefined, currency = "USD"): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

/**
 * Turn whatever a person types ("$1,240.50", "(12.00)", " 7 ") into a number.
 * Returns null for empty input and NaN for input that isn't a number.
 */
export function parseNumberInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const negative = /^\(.*\)$/.test(trimmed) || trimmed.startsWith("-");
  const cleaned = trimmed.replace(/[()$,\s-]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (Number.isNaN(n)) return Number.NaN;
  return negative ? -n : n;
}

/** Number to editable text. With `decimals`, shows at least that many (287.2 -> "287.20"). */
export function formatPlain(value: number | null, decimals?: number): string {
  if (value === null || Number.isNaN(value)) return "";
  if (decimals === undefined) return String(value);
  const actual = (String(value).split(".")[1] ?? "").length;
  return value.toFixed(Math.max(decimals, Math.min(actual, 6)));
}
