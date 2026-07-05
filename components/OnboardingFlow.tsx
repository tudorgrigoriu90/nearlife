import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale } from '../lib/i18n';
import { resolveHometown } from '../lib/hometown';
import { FIRST_STEP, isComplete, stepAfter, type OnboardingStep } from '../lib/onboarding';
import {
  requestLocationPermission,
  requestNotificationPermission,
  type PermissionOutcome,
} from '../lib/permissions';
import { monthOf } from '../lib/season';
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';
import { thisWeek } from '../lib/thisWeek';
import OnboardingScaffold from './onboarding/OnboardingScaffold';
import SpeciesCard from './SpeciesCard';

// Onboarding orchestrator (T-022 → T-024). Renders the current step from the tested step machine
// (lib/onboarding.ts) and advances on the CTA. Each permission ask is preceded by our own
// pre-prompt explainer so it has context (USER-FLOWS §1). Onboarding ends with an immediate
// first Spotted card so the payoff is felt in the first minute (T-024). NOTE: OS permission
// behaviour needs a device run to verify; the flow machine + selection logic are unit-tested.

export interface OnboardingResult {
  locationOutcome: PermissionOutcome;
}

export default function OnboardingFlow({
  locale = 'en',
  onFirstSpotted,
  onComplete,
}: {
  locale?: Locale;
  onFirstSpotted?: (speciesId: string) => void;
  onComplete: (result: OnboardingResult) => void;
}) {
  const tr = createTranslator(locale);
  const [step, setStep] = useState<OnboardingStep>(FIRST_STEP);
  const [locationOutcome, setLocationOutcome] = useState<PermissionOutcome>('denied');

  // The starter species: the most interesting active-this-week species (tested thisWeek logic),
  // falling back to the first seed species in a quiet week so onboarding always has a payoff.
  const starter = useMemo(() => {
    const active = thisWeek(KRONOBERG_SPECIES, monthOf(new Date()), new Set());
    return active[0]?.species ?? KRONOBERG_SPECIES[0];
  }, []);

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

  const askNotification = () => {
    // The outcome doesn't gate onboarding — the pull surface works without notifications.
    void requestNotificationPermission().then(advance);
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
      if (locationOutcome === 'denied') return <OnMount run={advance} />;
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
    case 'notificationPrePrompt':
      return (
        <OnboardingScaffold
          emoji="🔔"
          title={tr('onboarding.notif.title')}
          body={tr('onboarding.notif.body')}
          ctaLabel={tr('onboarding.notif.cta')}
          onNext={askNotification}
        />
      );
    case 'firstSpotted':
      return (
        <View style={styles.spottedWrap}>
          {/* Mark the starter Spotted on entry — the payoff persists into the almanac. */}
          <OnMount run={() => onFirstSpotted?.(starter.id)} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{tr('onboarding.firstSpotted.badge')} 🎉</Text>
          </View>
          <SpeciesCard
            species={starter}
            locale={locale}
            tier={{ spotted: true, caught: false, helped: false }}
          />
          <Pressable style={styles.spottedCta} onPress={advance} accessibilityRole="button">
            <Text style={styles.spottedCtaText}>{tr('onboarding.firstSpotted.cta')}</Text>
          </Pressable>
        </View>
      );
    default:
      return <OnMount run={advance} />;
  }
}

/** Runs `run` exactly once when this component mounts (lets a switch case fire an effect). */
function OnMount({ run }: { run: () => void }) {
  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

const styles = StyleSheet.create({
  spottedWrap: { flex: 1, backgroundColor: '#f4f8f2' },
  badge: { paddingTop: 52, paddingBottom: 8, alignItems: 'center', backgroundColor: '#eaf4ea' },
  badgeText: { fontSize: 14, fontWeight: '700', color: '#2f7d4f' },
  spottedCta: { margin: 20, paddingVertical: 16, borderRadius: 14, backgroundColor: '#3a7d44', alignItems: 'center' },
  spottedCtaText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
