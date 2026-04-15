import type { IBuffet_setting } from '@/interface/buffetSetting';

type BuffetSettingRow = IBuffet_setting & { isStudent?: number | string | null };

function rowForTier(rows: BuffetSettingRow[], tier: number): BuffetSettingRow | undefined {
  return rows.find((row) => Number(row.isStudent) === tier);
}

/**
 * Maps `SELECT * FROM buffet_setting` (or `_newbie`) rows to the three UI tiers.
 * Expects one row per isStudent value 0 (general), 1 (student), 2 (university).
 */
export function buffetSettingsFromRows(rows: unknown): {
  buffetSetting: IBuffet_setting;
  buffetStudentSetting: IBuffet_setting;
  buffetUniversitySetting: IBuffet_setting;
} | null {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const normalized: BuffetSettingRow[] = [];
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') {
      continue;
    }
    const row = raw as BuffetSettingRow;
    if (row.court_price === undefined || row.court_price === null) {
      continue;
    }
    if (row.isStudent === undefined || row.isStudent === null || Number.isNaN(Number(row.isStudent))) {
      continue;
    }
    normalized.push(row);
  }

  const general = rowForTier(normalized, 0);
  const student = rowForTier(normalized, 1);
  const university = rowForTier(normalized, 2);

  if (!general || !student || !university) {
    return null;
  }

  return {
    buffetSetting: general,
    buffetStudentSetting: student,
    buffetUniversitySetting: university,
  };
}
