const DECIMAL_CHUNK = /\d+\.\d{2}/g;
/** DECIMAL(10,2) — 8 digits before point */
const MAX_RESERVATION_PRICE = 99_999_999.99;

/**
 * Normalizes reservation `price` for MySQL DECIMAL(10,2).
 * When the client sums slot prices with `+=`, string values from JSON/MySQL
 * coerce numbers to strings and produce garbage like "0120.00120.00"; this
 * recovers by summing every `nnn.nn` chunk, otherwise parses a single number.
 */
export function sanitizeReservationPriceForMysql(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0 || value > MAX_RESERVATION_PRICE) return null;
    return value.toFixed(2);
  }

  const raw = String(value).trim().replace(/,/g, '');
  if (!raw) return null;

  const chunks = raw.match(DECIMAL_CHUNK);
  if (chunks && chunks.length > 0) {
    const sum = chunks.reduce((acc, c) => acc + parseFloat(c), 0);
    if (!Number.isFinite(sum) || sum < 0 || sum > MAX_RESERVATION_PRICE) return null;
    return sum.toFixed(2);
  }

  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n < 0 || n > MAX_RESERVATION_PRICE) return null;
  return n.toFixed(2);
}
