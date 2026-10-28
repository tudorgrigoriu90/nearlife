import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createTranslator, type Locale } from '../lib/i18n';
import { agePath, type AgePath } from '../lib/ageGate';
import type { Region } from '../lib/hometown';
import { AsyncStorageHometownStore, deriveHometown, type HometownLookup } from '../lib/hometownStore';
import { FIRST_STEP, isComplete, stepAfter, type OnboardingStep } from '../lib/onboarding';
import {
  getLocationFixOnce,
  requestLocationPermission,
  requestNotificationPermission,
  type PermissionOutcome,
} from '../lib/permissions';
import { monthOf } from '../lib/season';
import { contentFor } from '../lib/species/localized';
import { KRONOBERG_SPECIES } from '../lib/species/kronoberg';
import { thisWeek } from '../lib/thisWeek';
import AgeGateStep from './onboarding/AgeGateStep';
import OnboardingScaffold from './onboarding/OnboardingScaffold';
import SpeciesCard from './SpeciesCard';

// Onboarding orchestrator (T-022 → T-024). Renders the current step from the tested step machine
// (lib/onboarding.ts) and advances on the CTA. Each permission ask is preceded by our own
// pre-prompt explainer so it has context (USER-FLOWS §1). Onboarding ends with an immediate
// first Spotted card so the payoff is felt in the first minute (T-024). NOTE: OS permission
// behaviour needs a device run to verify; the flow machine + selection logic are unit-tested.

export interface OnboardingResult {
  locationOutcome: PermissionOutcome;
  /** From the age-gate (T-089): `restricted` routes the minimal-data path (no analytics offered). */
  agePath: AgePath;
  /**
   * The OS answer to the notification ask (T-201). Pressing "Turn on nudges" and granting it is
   * the opt-in, so the shell records notification consent from it.
   */
  notificationOutcome: PermissionOutcome;
  /** The home county (T-090), or null — location denied, no fix, or outside Sweden → preview. */
  hometown: Region | null;
}

const HOMETOWN_STORE = new AsyncStorageHometownStore();

/** Real device path: the locked hometown, else one fix resolved on-device and locked in. */
const deriveFromDevice = () => deriveHometown(getLocationFixOnce, HOMETOWN_STORE);

export default function OnboardingFlow({
  locale = 'en',
  onFirstSpotted,
  onComplete,
  resolveHome = deriveFromDevice,
}: {
  locale?: Locale;
  onFirstSpotted?: (speciesId: string) => void;
  onComplete: (result: OnboardingResult) => void;
  /** Seam for tests; production uses the device location + locked store. */
  resolveHome?: () => Promise<HometownLookup>;
}) {
  const tr = createTranslator(locale);
  const [step, setStep] = useState<OnboardingStep>(FIRST_STEP);
  const [locationOutcome, setLocationOutcome] = useState<PermissionOutcome>('denied');
  const [notificationOutcome, setNotificationOutcome] = useState<PermissionOutcome>('denied');
  const [lookup, setLookup] = useState<HometownLookup | null>(null);
  const hometown: Region | null = lookup?.region ?? null;
  // Defaults to the full path; the age-gate step sets it before the flow can complete (it sits
  // before every data-collecting step, so `done` is only ever reached with a real value).
  const [userAgePath, setUserAgePath] = useState<AgePath>('full');

  // The starter species: the most interesting active-this-week species (tested thisWeek logic),
  // falling back to the first seed species in a quiet week so onboarding always has a payoff.
  const starter = useMemo(() => {
    const active = thisWeek(KRONOBERG_SPECIES, monthOf(new Date()), new Set());
    return active[0]?.species ?? KRONOBERG_SPECIES[0];
  }, []);

  const advance = () => setStep((s) => stepAfter(s));

  useEffect(() => {
    if (isComplete(step)) onComplete({ locationOutcome, agePath: userAgePath, notificationOutcome, hometown });
    // onComplete is a stable callback from the parent; re-firing on identity change is undesired.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const askLocation = () => {
    void requestLocationPermission()
      .then(async (outcome) => {
        setLocationOutcome(outcome);
        if (outcome === 'granted') setLookup(await resolveHome());
      })
      // No hometown is a supported state (preview mode); a failed lookup must not strand onboarding.
      .catch(() => setLookup({ region: null, reason: 'no-fix' }))
      .finally(advance);
  };

  const askNotification = () => {
    // The outcome doesn't gate onboarding — the pull surface works without notifications.
    void requestNotificationPermission().then((outcome) => {
      setNotificationOutcome(outcome);
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
    case 'ageGate': {
      const currentYear = new Date().getFullYear();
      return (
        <AgeGateStep
          locale={locale}
          currentYear={currentYear}
          onSubmit={(birthYear) => {
            setUserAgePath(agePath(birthYear, currentYear));
            advance();
          }}
        />
      );
    }
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
      // No county (denied, no fix, outside Sweden) → nothing to confirm; preview mode (T-023).
      // The coordinates were resolved on-device and dropped before this step renders (T-090).
      // Outside Sweden is told so plainly (T-107) — not dropped into a preview with no explanation.
      if (lookup?.region === null && lookup.reason === 'outside-sweden') {
        return (
          <OnboardingScaffold
            emoji="🧭"
            title={tr('onboarding.outside.title')}
            body={tr('onboarding.outside.body')}
            ctaLabel={tr('onboarding.outside.cta')}
            onNext={advance}
          />
        );
      }
      if (locationOutcome === 'denied' || hometown === null) return <OnMount run={advance} />;
      const region = hometown;
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
            content={contentFor(starter.id, locale) ?? null}
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
