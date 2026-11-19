import type { CatchSpot } from './catchSpots';
import type { TranslationKey } from './i18n';

// Dangers that come and go (T-327 · review I-22 b, c). A spot is excluded for what is always
// there (T-049, T-326); ice, the hunting season and the dark are true only some months or hours,
// so the catch-spot screen names them instead of hiding the spot all year.
//
// Everything is computed on the phone from the spot's own coordinates: no position leaves it.

export interface SpotWarning {
  key: Extract<TranslationKey, 'catchSpot.ice' | 'catchSpot.hunting' | 'catchSpot.dark'>;
  params?: { time: string };
}

/** Freshwater and coast spots, December to March: "Never go onto ice". */
export const ICE_MONTHS: readonly number[] = [12, 1, 2, 3];

/**
 * Months with hunting on land, per county (GADM id → months). Filled by the Director from
 * Naturvårdsverket's published seasons (T-328); a county without a row shows no hunting line,
 * never a guessed one.
 */
// keep: T-328 — empty until the Director fills it; spotWarnings reads it by default.
export const HUNTING_MONTHS: Record<string, readonly number[]> = {};

const STOCKHOLM_MONTH = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Stockholm', month: 'numeric' });
const STOCKHOLM_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Stockholm',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const DARK_WARNING_MS = 60 * 60 * 1000;
const DAY_MS = 86_400_000;
const RAD = Math.PI / 180;

/**
 * Sunset on the day around `when` at a place, by the standard sunrise equation (solar disc's upper
 * edge with refraction, −0.833°). Accurate to a few minutes, which is all a "dark at" line needs.
 * Null under the midnight sun and in the polar night, when the sun does not set or rise.
 */
export function sunsetAt(when: Date, at: { lat: number; lon: number }): Date | null {
  const julian = when.getTime() / DAY_MS + 2440587.5;
  const n = Math.round(julian - 2451545 - 0.0009 + at.lon / 360);
  const noon = 2451545 + 0.0009 - at.lon / 360 + n;
  const m = (357.5291 + 0.98560028 * (noon - 2451545)) % 360;
  const c = 1.9148 * Math.sin(m * RAD) + 0.02 * Math.sin(2 * m * RAD) + 0.0003 * Math.sin(3 * m * RAD);
  const lambda = (m + c + 180 + 102.9372) % 360;
  const transit = noon + 0.0053 * Math.sin(m * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);
  const sinDecl = Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD);
  const cosDecl = Math.cos(Math.asin(sinDecl));
  const cosHour = (Math.sin(-0.833 * RAD) - Math.sin(at.lat * RAD) * sinDecl) / (Math.cos(at.lat * RAD) * cosDecl);
  if (cosHour < -1 || cosHour > 1) return null;
  const set = transit + Math.acos(cosHour) / RAD / 360;
  return new Date((set - 2440587.5) * DAY_MS);
}

/** The lines the catch-spot screen shows for this spot now, most serious first. */
export function spotWarnings(
  spot: CatchSpot,
  regionId: string,
  now: Date,
  huntingMonths: Record<string, readonly number[]> = HUNTING_MONTHS,
): SpotWarning[] {
  const month = Number(STOCKHOLM_MONTH.format(now));
  const warnings: SpotWarning[] = [];
  if (spot.habitat !== 'land' && ICE_MONTHS.includes(month)) warnings.push({ key: 'catchSpot.ice' });
  if (spot.habitat === 'land' && (huntingMonths[regionId] ?? []).includes(month)) {
    warnings.push({ key: 'catchSpot.hunting' });
  }
  const sunset = sunsetAt(now, spot);
  if (sunset !== null) {
    const left = sunset.getTime() - now.getTime();
    if (left > 0 && left <= DARK_WARNING_MS) {
      warnings.push({ key: 'catchSpot.dark', params: { time: STOCKHOLM_TIME.format(sunset) } });
    }
  }
  return warnings;
}
