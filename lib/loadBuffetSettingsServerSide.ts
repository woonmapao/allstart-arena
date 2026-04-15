import type { IBuffet_setting } from '@/interface/buffetSetting';
import { buffetSettingsFromRows } from '@/lib/buffetSettingsFromRows';

export type BuffetSettingsPageProps = {
  buffetSetting: IBuffet_setting;
  buffetStudentSetting: IBuffet_setting;
  buffetUniversitySetting: IBuffet_setting;
};

type BuffetSettingsApiPath = '/api/buffet/get_setting' | '/api/buffet/newbie/get_setting';

/**
 * Loads the three buffet price tiers during getServerSideProps.
 * Returns null if HOSTNAME is missing, the request fails, or isStudent 0/1/2 are not all present.
 */
export async function loadBuffetSettingsTriple(
  host: string | undefined,
  apiPath: BuffetSettingsApiPath,
): Promise<BuffetSettingsPageProps | null> {
  if (!host) {
    console.error('loadBuffetSettingsTriple: HOSTNAME is not set');
    return null;
  }

  const base = host.replace(/\/$/, '');
  const url = `${base}${apiPath}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (e) {
    console.error('loadBuffetSettingsTriple: fetch failed', e);
    return null;
  }

  if (!response.ok) {
    console.error(`loadBuffetSettingsTriple: ${url} returned HTTP ${response.status}`);
    return null;
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (e) {
    console.error('loadBuffetSettingsTriple: invalid JSON', e);
    return null;
  }

  return buffetSettingsFromRows(data);
}
