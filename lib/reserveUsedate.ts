import { format, isValid, parse, parseISO } from 'date-fns';
import { enGB } from 'date-fns/locale';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function firstString(value: unknown): string | null {
  if (value == null) return null;
  if (Array.isArray(value)) return firstString(value[0]);
  if (typeof value !== 'string') return null;
  const s = value.trim();
  return s.length ? s : null;
}

/**
 * Converts client `usedate` (ISO yyyy-MM-dd or date-fns `dd MMMM yyyy` with English months)
 * to MySQL DATE string yyyy-MM-dd.
 */
export function normalizeUsedateForMysql(value: unknown): string | null {
  const s = firstString(value);
  if (!s) return null;

  if (ISO_DATE.test(s)) {
    const d = parse(s, 'yyyy-MM-dd', new Date());
    return isValid(d) ? s : null;
  }

  for (const pattern of ['dd MMMM yyyy', 'd MMMM yyyy'] as const) {
    const d = parse(s, pattern, new Date(), { locale: enGB });
    if (isValid(d)) return format(d, 'yyyy-MM-dd');
  }

  return null;
}

/**
 * Formats DB DATE values for API responses so existing UI can keep comparing to
 * `format(date, 'dd MMMM yyyy')`.
 */
export function formatUsedateForClient(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) {
    if (!isValid(value)) return '';
    return format(value, 'dd MMMM yyyy', { locale: enGB });
  }

  const s = String(value).trim();
  if (!s) return '';

  const head = s.slice(0, 10);
  if (ISO_DATE.test(head)) {
    const d = parseISO(head);
    if (isValid(d)) return format(d, 'dd MMMM yyyy', { locale: enGB });
  }

  return s;
}

export function mapRowsUsedateForClient<T extends { usedate?: unknown }>(rows: T[]): T[] {
  return rows.map((row) => ({ ...row, usedate: formatUsedateForClient(row.usedate) }));
}
