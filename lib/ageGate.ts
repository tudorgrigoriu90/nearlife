// Age-gate (T-089 core · GDPR-K, PRIVACY §3). Sweden's digital-consent age is 13. We collect the
// birth YEAR only (data minimization — never a full date of birth), so age is approximate to
// within a year; the gate uses `currentYear - birthYear`, the standard birth-year check. A user
// below the threshold is routed to a restricted, minimal-data path rather than blocked outright.
// Pure so the onboarding gate (T-089) and any server check evaluate it identically.

/** Sweden's GDPR-K age of digital consent. */
export const DIGITAL_CONSENT_AGE_SE = 13;

export type AgePath = 'full' | 'restricted';

/** Approximate age from birth year alone (max age reached during `currentYear`). */
export function ageFromBirthYear(birthYear: number, currentYear: number): number {
  return currentYear - birthYear;
}

/** Whether the user meets the digital-consent age threshold. */
export function meetsDigitalConsentAge(
  birthYear: number,
  currentYear: number,
  threshold: number = DIGITAL_CONSENT_AGE_SE,
): boolean {
  return ageFromBirthYear(birthYear, currentYear) >= threshold;
}

/** `full` for users at/above the threshold, else `restricted` (minimal-data path). */
export function agePath(
  birthYear: number,
  currentYear: number,
  threshold: number = DIGITAL_CONSENT_AGE_SE,
): AgePath {
  return meetsDigitalConsentAge(birthYear, currentYear, threshold) ? 'full' : 'restricted';
}
