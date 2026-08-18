import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AlmanacScreen from './components/AlmanacScreen';
import OnboardingFlow from './components/OnboardingFlow';
import SpeciesCard from './components/SpeciesCard';
import ThisWeekScreen from './components/ThisWeekScreen';
import CatchMinigame from './components/minigame/CatchMinigame';
import ProtectTip from './components/catch/ProtectTip';
import FreeCatchSheet from './components/catch/FreeCatchSheet';
import PledgeConfirm from './components/helped/PledgeConfirm';
import SettingsScreen from './components/SettingsScreen';
import DataExportView from './components/DataExportView';
import DeleteAccountConfirm from './components/DeleteAccountConfirm';
import LinkEmail from './components/LinkEmail';
import BadgesScreen from './components/BadgesScreen';
import ImpactScreen from './components/ImpactScreen';
import { useCollection } from './components/useCollection';
import { useTracker } from './components/useTracker';
import {
  applyConsentChange,
  DEFAULT_CONSENT,
  type ConsentKind,
  type ConsentState,
} from './lib/consent';
import { AsyncStorageConsentStore } from './lib/consentStore';
import {
  DEFAULT_DUAL_LANGUAGE,
  isDualActive,
  setDualEnabled,
  setSecondaryLocale,
  type DualLanguageSettings,
} from './lib/dualLanguage';
import { AsyncStorageDualLanguageStore } from './lib/dualLanguageStore';
import type { ContentLocale } from './lib/i18n/contentLocale';
import { deleteAccount, SupabaseDeletionGateway } from './lib/accountDeletion';
import { SupabaseAuthGateway } from './lib/accountLinking';
import { getSupabase } from './lib/supabase';
import { buildDataExport, exportToJson } from './lib/dataExport';
import { KRONOBERG_REGION } from './lib/hometown';
import { spottedIds, tierStateFor } from './lib/collection';
import {
  canCatch,
  registerCatch,
  remainingFreeCatches,
  type FreeCatchState,
} from './lib/freeCatch';
import { isPrimeCatch } from './lib/primeBonus';
import { gradeFromScore } from './lib/minigame/grade';
import { seasonKeyOf } from './lib/season';
import { detectDeviceLocale } from './lib/i18n/deviceLocale';
import { createTranslator, type Locale } from './lib/i18n';
import { createSpeciesRepository } from './lib/speciesRepositoryFactory';
import type { HelpKind } from './lib/collection';
import type { SpeciesContent } from './lib/species/content';
import type { Species } from './lib/species/types';

const INITIAL_FREE_CATCH: FreeCatchState = {
  fullGame: false,
  freeCatchesUsed: 0,
  freeCatchSeason: null,
};

// The species catalogue is read through the repository seam (T-057), not the bundled module
// directly, so the source can swap to the seeded Supabase tables without touching the shell. The
// default is the bundled Kronoberg set the app runs on today; the source swaps to a Supabase-backed
// repo once the DB is seeded (T-055 content seed). Module-level so its identity is stable.
// Supabase when configured, bundled data otherwise, with a fallback on failure (T-057).
const SPECIES_REPO = createSpeciesRepository();

// Device-local consent persistence (T-088) — granular opt-ins survive restarts. Module-level so
// its identity is stable across renders.
const CONSENT_STORE = new AsyncStorageConsentStore();

// Mother-tongue dual display preference (T-148) — device-local, off by default, survives restarts.
const DUAL_LANGUAGE_STORE = new AsyncStorageDualLanguageStore();

// Prototype app shell (E2). Onboarding (T-022+) runs first; once complete, a minimal tab
// switcher between the "This week" pull surface (T-117) and the Almanac grid (T-025); tapping a
// species opens its card (T-026). No navigation library yet — local state is enough for the
// throwaway prototype. Collection is empty until persistence lands (T-027, Supabase-gated);
// tap-to-collect is T-029.

type Tab = 'thisWeek' | 'almanac';

export default function App() {
  // Device locale by default; a user override from Settings takes precedence (T-123).
  const [localeOverride, setLocaleOverride] = useState<Locale | null>(null);
  const locale = localeOverride ?? detectDeviceLocale();
  const tr = createTranslator(locale);
  const collection = useCollection();
  // Almanac catalogue, loaded async through the repository seam (T-057). Defaults to the bundled
  // set (no behaviour change) until a DB-backed repo is injected. Names re-localize in the grid.
  const [almanacSpecies, setAlmanacSpecies] = useState<Species[]>([]);
  const [speciesLoading, setSpeciesLoading] = useState(true);
  // Selected species' card content, loaded through the repository (T-059). Keyed by species id so a
  // stale result from a previously-open card is never shown against the newly-selected species.
  const [cardContent, setCardContent] = useState<{ speciesId: string; content: SpeciesContent | null } | null>(
    null,
  );
  // Mother-tongue dual display (F13.3). The settings live here; the secondary content is loaded
  // through the same repository seam as the primary, keyed by species id AND locale so a stale
  // result can never be painted against the wrong species or a language the user just changed.
  const [dualLanguage, setDualLanguage] = useState<DualLanguageSettings>(DEFAULT_DUAL_LANGUAGE);
  const [secondaryCardContent, setSecondaryCardContent] = useState<{
    speciesId: string;
    locale: ContentLocale;
    content: SpeciesContent | null;
  } | null>(null);
  const [onboarded, setOnboarded] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [tab, setTab] = useState<Tab>('thisWeek');
  const [showSettings, setShowSettings] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showLinkEmail, setShowLinkEmail] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showImpact, setShowImpact] = useState(false);
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [consent, setConsentState] = useState<ConsentState>(DEFAULT_CONSENT);
  // Under-13 (age-gate, T-089) → minimal-data path: behavioural analytics is never offered.
  const [analyticsLocked, setAnalyticsLocked] = useState(false);
  const track = useTracker(consent);
  const [selected, setSelected] = useState<Species | null>(null);
  const [catching, setCatching] = useState<Species | null>(null);
  const [caughtTip, setCaughtTip] = useState<Species | null>(null);
  const [pledge, setPledge] = useState<{ species: Species; kind: HelpKind } | null>(null);
  const [paywall, setPaywall] = useState(false);
  const [freeCatch, setFreeCatch] = useState<FreeCatchState>(INITIAL_FREE_CATCH);

  const toggleConsent = (kind: ConsentKind, value: boolean) => {
    // The age gate lives in `applyConsentChange` (T-197) rather than here: it is a T-089 safety
    // rule, and a rule that exists only inside a component handler is one refactor away from
    // vanishing without a test going red. It returns the same object when it refuses, so a
    // blocked change costs no write.
    const next = applyConsentChange(consent, kind, value, analyticsLocked);
    if (next === consent) return;
    // Persist every change so the choice survives a restart (GDPR consent record, T-088).
    setConsentState(next);
    void CONSENT_STORE.save(next);
  };

  // Validation-funnel instrumentation (T-035): session start, and This Week opened whenever the
  // user is on that tab (covers both the initial view and switching back to it). `track` is
  // stable across renders (useTracker), so this fires once per mount despite the dependency.
  useEffect(() => {
    track('session_start', {});
  }, [track]);

  // Rehydrate persisted consent on launch (T-088). Until it resolves, consent stays at the all-off
  // default, so nothing (analytics included) fires without a stored grant.
  useEffect(() => {
    let cancelled = false;
    CONSENT_STORE.load()
      .then((stored) => {
        if (!cancelled) setConsentState(stored);
      })
      .catch(() => {
        // A load failure keeps the safe all-off default already in state.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (onboarded && tab === 'thisWeek' && !showSettings && exportJson === null) {
      track('this_week_opened', {});
    }
  }, [onboarded, tab, showSettings, exportJson, track]);

  // Load the Almanac catalogue via the repository (T-057). One-shot on mount / repo change; the
  // grid localizes names itself, so this doesn't need to re-run on a locale switch.
  useEffect(() => {
    let cancelled = false;
    SPECIES_REPO.listSpecies(locale)
      .then((list) => {
        if (!cancelled) {
          setAlmanacSpecies(list.map((entry) => entry.species));
          setSpeciesLoading(false);
        }
      })
      .catch(() => {
        // A failed load clears loading rather than crashing the shell; the DB-backed repo
        // surfaces its own errors (SupabaseSpeciesGateway throws with context).
        if (!cancelled) setSpeciesLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot load; grid re-localizes names
  }, []);

  // Load the selected species' Tier-1 content through the repository (T-059). Fires when a card
  // opens or the locale changes; the id-keyed result guards against showing a stale species' card.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    const speciesId = selected.id;
    SPECIES_REPO.getContent(speciesId, locale)
      .then((content) => {
        if (!cancelled) setCardContent({ speciesId, content });
      })
      .catch(() => {
        if (!cancelled) setCardContent({ speciesId, content: null });
      });
    return () => {
      cancelled = true;
    };
  }, [selected, locale]);

  // Rehydrate the dual-display preference (T-148); until it resolves the feature stays off.
  useEffect(() => {
    let cancelled = false;
    DUAL_LANGUAGE_STORE.load()
      .then((stored) => {
        if (!cancelled) setDualLanguage(stored);
      })
      .catch(() => {
        // A load failure keeps the safe off default already in state.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Is a second language actually being shown? Re-derived every render because it depends on the
  // primary locale, which the user can change at any time (isDualActive, T-148).
  const dualActive = isDualActive(dualLanguage, locale as ContentLocale);
  const secondaryLocale = dualActive ? dualLanguage.secondaryLocale : null;

  const updateDualLanguage = (next: DualLanguageSettings) => {
    setDualLanguage(next);
    void DUAL_LANGUAGE_STORE.save(next);
  };

  // Load the selected species' content in the mother tongue, alongside the primary read above.
  // Skipped entirely when dual display is off, so the default experience does no extra work.
  // No clean-up branch needed when dual display is off: the render site only paints this when it
  // matches both the open species and the currently-selected language, so a stale value can never
  // reach the card and clearing it here would just be an extra render.
  useEffect(() => {
    if (!selected || secondaryLocale === null) return;
    let cancelled = false;
    const speciesId = selected.id;
    SPECIES_REPO.getContentInLocale(speciesId, secondaryLocale)
      .then((content) => {
        if (!cancelled) setSecondaryCardContent({ speciesId, locale: secondaryLocale, content });
      })
      .catch(() => {
        // A failed secondary read degrades to the single-language card, never a blank half.
        if (!cancelled) setSecondaryCardContent({ speciesId, locale: secondaryLocale, content: null });
      });
    return () => {
      cancelled = true;
    };
  }, [selected, secondaryLocale]);

  const exportMyData = () => {
    const bundle = buildDataExport({
      exportedAt: new Date().toISOString(),
      profile: { homeRegion: previewMode ? null : KRONOBERG_REGION.id },
      consent,
      collection: collection.records,
    });
    setExportJson(exportToJson(bundle));
  };

  // GDPR erasure (T-093): invoke the server-side delete, then return to a fresh, signed-out state.
  // Returns whether it succeeded so the confirm screen can show a retryable error on failure.
  const confirmDeleteAccount = async (): Promise<boolean> => {
    try {
      const result = await deleteAccount(new SupabaseDeletionGateway(getSupabase()));
      if (!result.ok) return false;
    } catch {
      return false;
    }
    setShowDelete(false);
    setShowSettings(false);
    setSelected(null);
    setConsentState(DEFAULT_CONSENT);
    void CONSENT_STORE.save(DEFAULT_CONSENT);
    setOnboarded(false); // back to first-run — the account is gone
    return true;
  };

  const seasonKey = seasonKeyOf(new Date());
  const remaining = remainingFreeCatches(freeCatch, seasonKey);

  // Catch entry (T-034): a free user gets 3 catches/season; the 4th attempt shows the gentle
  // sheet instead of the minigame. The counter increments only on a successful catch.
  const attemptCatch = (species: Species) => {
    if (canCatch(freeCatch, seasonKey)) {
      track('catch_attempted', { speciesId: species.id });
      setCatching(species);
    } else {
      track('free_catches_exhausted', {});
      setPaywall(true);
    }
  };

  if (!onboarded) {
    return (
      <OnboardingFlow
        locale={locale}
        onFirstSpotted={(speciesId) => {
          collection.spot(speciesId);
          track('species_spotted', { speciesId, source: 'onboarding' });
        }}
        onComplete={({ locationOutcome, agePath }) => {
          setPreviewMode(locationOutcome === 'denied');
          setAnalyticsLocked(agePath === 'restricted');
          setOnboarded(true);
        }}
      />
    );
  }

  if (exportJson !== null) {
    return (
      <>
        <DataExportView json={exportJson} locale={locale} onDone={() => setExportJson(null)} />
        <StatusBar style="auto" />
      </>
    );
  }

  if (showDelete) {
    return (
      <>
        <DeleteAccountConfirm
          locale={locale}
          onConfirm={confirmDeleteAccount}
          onCancel={() => setShowDelete(false)}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (showLinkEmail) {
    return (
      <>
        <LinkEmail
          locale={locale}
          gateway={new SupabaseAuthGateway(getSupabase())}
          onDone={() => setShowLinkEmail(false)}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (showBadges) {
    return (
      <>
        <BadgesScreen
          locale={locale}
          species={almanacSpecies}
          records={collection.records}
          onDone={() => setShowBadges(false)}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (showImpact) {
    return (
      <>
        <ImpactScreen
          locale={locale}
          records={collection.records}
          onDone={() => setShowImpact(false)}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (showSettings) {
    return (
      <>
        <SettingsScreen
          locale={locale}
          consent={consent}
          analyticsLocked={analyticsLocked}
          dualLanguage={dualLanguage}
          onToggleConsent={toggleConsent}
          onSelectLocale={(loc) => setLocaleOverride(loc)}
          onToggleDualLanguage={(enabled) =>
            updateDualLanguage(setDualEnabled(dualLanguage, enabled))
          }
          onSelectSecondaryLocale={(loc) =>
            updateDualLanguage(setSecondaryLocale(dualLanguage, loc, locale as ContentLocale))
          }
          onExportData={exportMyData}
          onLinkEmail={() => setShowLinkEmail(true)}
          onDeleteAccount={() => setShowDelete(true)}
          onDone={() => setShowSettings(false)}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (caughtTip) {
    // Catch-success delight moment: contextual protect tip, kept clean — no upsell (invariant #4).
    return (
      <>
        <ProtectTip species={caughtTip} locale={locale} onDone={() => setCaughtTip(null)} />
        <StatusBar style="auto" />
      </>
    );
  }

  if (pledge) {
    // Helped-tier confirmation — clean, no upsell (invariant #4).
    return (
      <>
        <PledgeConfirm
          species={pledge.species}
          kind={pledge.kind}
          locale={locale}
          onDone={() => setPledge(null)}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (catching) {
    const target = catching;
    return (
      <>
        <CatchMinigame
          category={target.category}
          locale={locale}
          onCancel={() => setCatching(null)}
          onComplete={({ success, score }) => {
            setCatching(null);
            if (success) {
              // Counter increments on success only; the attempt was already gated by canCatch.
              setFreeCatch((prev) => registerCatch(prev, seasonKey));
              // Prime bonus when caught within the species' active window (GDD §6, T-074).
              collection.markCaught(target.id, isPrimeCatch(target, new Date()));
              track('catch_succeeded', {
                speciesId: target.id,
                // Derive the analytics grade from the unified 0–1 score (success ⇒ perfect|good).
                grade: gradeFromScore(true, score) === 'perfect' ? 'perfect' : 'good',
              });
              setCaughtTip(target);
            }
          }}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (selected) {
    return (
      <View style={styles.root}>
        <SpeciesCard
          species={selected}
          content={cardContent?.speciesId === selected.id ? cardContent.content : null}
          locale={locale}
          secondaryLocale={secondaryLocale}
          secondaryContent={
            // Only paint the mother-tongue half when it belongs to *this* species and to the
            // language currently selected — otherwise a slow read could land on the wrong card.
            secondaryCardContent?.speciesId === selected.id &&
            secondaryCardContent.locale === secondaryLocale
              ? secondaryCardContent.content
              : null
          }
          tier={tierStateFor(collection.records, selected.id)}
          fullGame={freeCatch.fullGame}
          onBack={() => setSelected(null)}
          onFindNearby={attemptCatch}
          onPledge={(species, kind) => {
            // Helped tier: one-tap honor-system pledge (GDD §5) → mark Helped + confirm.
            collection.help(species.id, kind);
            setPledge({ species, kind });
          }}
          nearbyNote={freeCatch.fullGame ? undefined : tr('catch.remaining', { count: remaining })}
        />
        {paywall ? <FreeCatchSheet locale={locale} onClose={() => setPaywall(false)} /> : null}
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {previewMode ? (
        <View style={styles.previewBanner}>
          <Text style={styles.previewText}>{tr('preview.banner')}</Text>
        </View>
      ) : null}
      <View style={styles.screen}>
        {tab === 'thisWeek' ? (
          <ThisWeekScreen
            locale={locale}
            spottedIds={spottedIds(collection.records)}
            onSelectSpecies={(species) => {
              // Tapping a This Week entry marks it Spotted and opens its card (same as a
              // notification tap, USER-FLOWS §4).
              collection.spot(species.id);
              track('species_spotted', { speciesId: species.id, source: 'this_week' });
              setSelected(species);
            }}
          />
        ) : (
          <AlmanacScreen
            species={almanacSpecies}
            loading={speciesLoading}
            records={collection.records}
            locale={locale}
            onSelectSpecies={setSelected}
            onOpenBadges={() => setShowBadges(true)}
            onOpenImpact={() => setShowImpact(true)}
          />
        )}
      </View>
      <View style={styles.tabBar}>
        <TabButton label={tr('thisWeek.title')} active={tab === 'thisWeek'} onPress={() => setTab('thisWeek')} />
        <TabButton label={tr('almanac.title')} active={tab === 'almanac'} onPress={() => setTab('almanac')} />
        <TabButton label={`⚙ ${tr('nav.settings')}`} active={false} onPress={() => setShowSettings(true)} />
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tab} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f8f2' },
  screen: { flex: 1 },
  previewBanner: { backgroundColor: '#fbe9c6', paddingTop: 44, paddingBottom: 8, paddingHorizontal: 16 },
  previewText: { fontSize: 12, color: '#7a5a1f', textAlign: 'center' },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#d4e0d2',
    backgroundColor: '#fff',
    paddingBottom: 24,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabText: { fontSize: 14, color: '#7a8a7c', fontWeight: '600' },
  tabTextActive: { color: '#2f5d34' },
});
