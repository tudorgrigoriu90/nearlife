import { useEffect, useState } from 'react';
import { createTranslator, type Locale } from '../lib/i18n';
import { resolveHometown } from '../lib/hometown';
import { FIRST_STEP, isComplete, stepAfter, type OnboardingStep } from '../lib/onboarding';
import { requestLocationPermission, type PermissionOutcome } from '../lib/permissions';
import OnboardingScaffold from './onboarding/OnboardingScaffold';

// Onboarding orchestrator (T-022, extended in T-023/T-024). Renders the current step from the
// tested step machine (lib/onboarding.ts) and advances on the CTA. The welcome and location
// pre-prompt are implemented here; the pre-prompt explainer shows BEFORE the OS dialog so the
// permission ask has context (USER-FLOWS §1). Steps not yet built auto-advance so the flow
// completes end-to-end today. NOTE: OS permission behaviour needs a device run to verify.

export interface OnboardingResult {
  locationOutcome: PermissionOutcome;
}

export default function OnboardingFlow({
  locale = 'en',
  onComplete,
}: {
  locale?: Locale;
  onComplete: (result: OnboardingResult) => void;
}) {
  const tr = createTranslator(locale);
  const [step, setStep] = useState<OnboardingStep>(FIRST_STEP);
  const [locationOutcome, setLocationOutcome] = useState<PermissionOutcome>('denied');

  const advance = () => setStep((s) => stepAfter(s));

  useEffect(() => {
    if (isComplete(step)) onComplete({ locationOutcome });
    // onComplete is a stable callback from the parent; re-firing on identity change is undesired.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const askLocation = () => {
    void requestLocationPermission().then((outcome) => {
      setLocationOutcome(outcome);
      advance();
    });
  };

  switch (step) {
    case 'welcome':
      return (
        <OnboardingScaffold
          emoji="🌿"
          title={tr('onboarding.welcome.title')}
          body={tr('onboarding.welcome.body')}
          ctaLabel={tr('onboarding.welcome.cta')}
          onNext={advance}
        />
      );
    case 'locationPrePrompt':
      return (
        <OnboardingScaffold
          emoji="📍"
          title={tr('onboarding.location.title')}
          body={tr('onboarding.location.body')}
          footnote={tr('onboarding.location.privacy')}
          ctaLabel={tr('onboarding.location.cta')}
          onNext={askLocation}
        />
      );
    case 'hometownConfirm': {
      // Location denied → no region to confirm; skip to preview mode (non-blocking, T-023).
      if (locationOutcome === 'denied') return <StepAdvancer onMount={advance} />;
      // Prototype resolves any location to Kronoberg; coordinates are already discarded.
      const region = resolveHometown();
      return (
        <OnboardingScaffold
          emoji="🏡"
          title={tr('onboarding.hometown.title')}
          body={`${region.name}\n\n${tr('onboarding.hometown.body')}`}
          ctaLabel={tr('onboarding.hometown.cta', { region: region.name })}
          onNext={advance}
        />
      );
    }
    default:
      // Steps implemented by later tasks (T-024) auto-advance until the flow completes.
      return <StepAdvancer onMount={advance} />;
  }
}

function StepAdvancer({ onMount }: { onMount: () => void }) {
  useEffect(() => {
    onMount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
