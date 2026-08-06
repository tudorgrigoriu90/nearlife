// Onboarding flow model (T-022 → T-024, T-089). A tiny ordered step machine so the sequence is
// unit-testable without a simulator; the screens (components/onboarding/*) render the current
// step and call `stepAfter` to advance. Steps are inserted here as each onboarding task lands:
//   T-022 welcome + location pre-prompt · T-023 hometown confirm · T-024 notification
//   pre-prompt + first Spotted · T-089 age-gate. The age-gate sits right after welcome, BEFORE any
//   permission ask or the first Spotted (which records collection data) — age must be established
//   before data processing (GDPR-K). Location-denied is NOT a step — it is a non-blocking outcome
//   (T-023) that drops the user into preview mode with the flow still completing.

export const ONBOARDING_STEPS = [
  'welcome',
  'ageGate',
  'locationPrePrompt',
  'hometownConfirm',
  'notificationPrePrompt',
  'firstSpotted',
  'done',
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const FIRST_STEP: OnboardingStep = ONBOARDING_STEPS[0];

/** The step after `step`, clamped at `done` (the terminal step). */
export function stepAfter(step: OnboardingStep): OnboardingStep {
  const i = ONBOARDING_STEPS.indexOf(step);
  return ONBOARDING_STEPS[Math.min(i + 1, ONBOARDING_STEPS.length - 1)];
}

/** True once onboarding has reached its terminal step. */
export function isComplete(step: OnboardingStep): boolean {
  return step === 'done';
}
