import { useEffect, useMemo, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
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
import FamilyScreen from './components/FamilyScreen';
import StoreScreen from './components/StoreScreen';
import CountiesScreen from './components/CountiesScreen';
import CatchSpotRoute from './components/CatchSpotRoute';
import { commonNameFor } from './lib/species/localized';
import { useCommunityImpact } from './components/useCommunityImpact';
import { useEntitlements } from './components/useEntitlements';
import { useTravelOffer } from './components/useTravelOffer';
import { useCollection } from './components/useCollection';
import { usePushRegistration } from './components/usePushRegistration';
import { useThisWeek } from './components/useThisWeek';
import { useAlmanacCatalogue } from './components/useAlmanacCatalogue';
import {
  onNotificationTap,
  requestNotificationPermission,
  showNotificationsInForeground,
  getLocationFixOnce,
} from './lib/permissions';
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
import { ensureAnonymousSession, getSupabase } from './lib/supabase';
import { hasSupabaseConfig } from './lib/supabaseConfig';
import { SupabaseCommunityImpactSource, type CommunityImpactSource } from './lib/communityImpact';
import { SupabaseEntitlementSource, type EntitlementClient, type EntitlementSource } from './lib/entitlement';
import { AsyncStorageEntitlementStore } from './lib/entitlementStore';
import { AsyncStorageTravelStore } from './lib/travelStore';
import { SupabaseCatchSpotSource, type CatchSpotClient, type CatchSpotSource } from './lib/catchSpots';
import { AsyncStorageCatchSpotStore } from './lib/catchSpotStore';
import { SupabaseFamilyGateway } from './lib/family';
import { canCollectIn, regionAccess, type County } from './lib/regionAccess';
import { RevenueCatPurchaseGateway, loadRevenueCat, revenueCatKey, type PurchaseGateway } from './lib/purchases';
import { TrackingPurchaseGateway } from './lib/salesFunnel';
import {
  buildDataExport,
  exportToJson,
  householdForExport,
  SupabaseExportSource,
  type ExportClient,
  type ExportHousehold,
  type PurchaseRecord,
} from './lib/dataExport';
import type { Region } from './lib/hometown';
import { AsyncStorageHometownStore } from './lib/hometownStore';
import { AsyncStorageOnboardingStore } from './lib/onboardingStore';
import { AsyncStorageLocaleStore } from './lib/localeStore';
import { spottedIds, tierStateFor } from './lib/collection';
import { canCatch, freeCatchStateFrom, remainingFreeCatches } from './lib/freeCatch';
import { isPrimeCatch } from './lib/primeBonus';
import { openIdentifier } from './lib/identify';
import { gradeFromScore } from './lib/minigame/grade';
import { monthOf, seasonKeyOf } from './lib/season';
import { detectDeviceLocale } from './lib/i18n/deviceLocale';
import { createTranslator, type Locale } from './lib/i18n';
import { createSpeciesRepository } from './lib/speciesRepositoryFactory';
import type { HelpKind } from './lib/collection';
import type { SpeciesContent } from './lib/species/content';
import type { Species } from './lib/species/types';

// The species catalogue is read through the repository seam (T-057), not the bundled module
// directly, so the source can swap to the seeded Supabase tables without touching the shell. The
// default is the bundled Kronoberg set the app runs on today; the source swaps to a Supabase-backed
// repo once the DB is seeded (T-055 content seed). Module-level so its identity is stable.
// Supabase when configured, bundled data otherwise, with a fallback on failure (T-057).
const SPECIES_REPO = createSpeciesRepository();

// Community totals source (T-081), built on first use so importing App never creates a client
// (tests have no Supabase config). null without a backend: the Impact screen keeps its note.
let communitySource: CommunityImpactSource | null | undefined;
// What the user owns, read from the server (T-083/T-217) and cached on the device. Built on first
// use like the community source.
const ENTITLEMENT_STORE = new AsyncStorageEntitlementStore();
// Which counties the travel banner has offered (T-218). Counties and times only, never positions.
const TRAVEL_STORE = new AsyncStorageTravelStore();
let entitlementSourceInstance: EntitlementSource | null | undefined;
function entitlementSource(): EntitlementSource | null {
  if (entitlementSourceInstance === undefined) {
    entitlementSourceInstance = hasSupabaseConfig()
      ? new SupabaseEntitlementSource(getSupabase() as unknown as EntitlementClient, ensureAnonymousSession)
      : null;
  }
  return entitlementSourceInstance;
}

// Catch spots (T-068): the county's spots, cached for offline use outdoors. Null without a backend:
// catching then works as before, with no spot to walk to.
const CATCH_SPOT_STORE = new AsyncStorageCatchSpotStore();
let catchSpotSourceInstance: CatchSpotSource | null | undefined;
function catchSpotSource(): CatchSpotSource | null {
  if (catchSpotSourceInstance === undefined) {
    catchSpotSourceInstance = hasSupabaseConfig()
      ? new SupabaseCatchSpotSource(getSupabase() as unknown as CatchSpotClient)
      : null;
  }
  return catchSpotSourceInstance;
}

// Store purchases (T-084), built on first use: the native module exists only in builds made after
// react-native-purchases was added, and without it the Store just hides its buy buttons.
let purchaseGatewayInstance: PurchaseGateway | undefined;
function purchaseGateway(): PurchaseGateway {
  purchaseGatewayInstance ??= new RevenueCatPurchaseGateway(loadRevenueCat(), revenueCatKey(), ensureAnonymousSession);
  return purchaseGatewayInstance;
}

// After a purchase the server learns of it from RevenueCat's webhook, usually within seconds but
// not instantly, so the app re-reads a few times rather than once.
const AFTER_PURCHASE_REREAD_MS = [0, 2_000, 6_000, 15_000];

function communityImpactSource(): CommunityImpactSource | null {
  if (communitySource === undefined) {
    communitySource = hasSupabaseConfig() ? new SupabaseCommunityImpactSource(getSupabase()) : null;
  }
  return communitySource;
}

// Device-local consent persistence (T-088) — granular opt-ins survive restarts. Module-level so
// its identity is stable across renders.
const CONSENT_STORE = new AsyncStorageConsentStore();

// Language chosen in Settings (T-211) — survives restarts, and with it the notification language.
const LOCALE_STORE = new AsyncStorageLocaleStore();

// Onboarding completion + age path (T-209) — so a relaunch goes straight to the app.
const ONBOARDING_STORE = new AsyncStorageOnboardingStore();

// Locked home county (T-090) — set once from an on-device location lookup, survives restarts.
const HOMETOWN_STORE = new AsyncStorageHometownStore();

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
  // Held back with onboarding (below) so a Swedish user never sees an English first frame.
  const [localeLoaded, setLocaleLoaded] = useState(false);
  const locale = localeOverride ?? detectDeviceLocale();
  const tr = createTranslator(locale);
  const collection = useCollection();
  // Almanac catalogue, loaded async through the repository seam (T-057). Defaults to the bundled
  // set (no behaviour change) until a DB-backed repo is injected. Names re-localize in the grid.
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
  // Nothing renders until the stored onboarding record is read: a returning user must not see the
  // welcome screen flash up first (T-209).
  const [onboardingLoaded, setOnboardingLoaded] = useState(false);
  // No home county (location denied, no fix, outside Sweden) is preview mode (T-023 / T-090).
  const [hometown, setHometown] = useState<Region | null>(null);
  const previewMode = hometown === null;
  const [tab, setTab] = useState<Tab>('thisWeek');
  const [showSettings, setShowSettings] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showLinkEmail, setShowLinkEmail] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [showImpact, setShowImpact] = useState(false);
  const { entitlements, refresh: refreshEntitlements } = useEntitlements({
    source: entitlementSource(),
    store: ENTITLEMENT_STORE,
  });
  const [showFamily, setShowFamily] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [showCounties, setShowCounties] = useState(false);
  // The county This Week and the Almanac show (T-105): home unless the user is looking around
  // another one. Notifications always follow the home county.
  const [viewCounty, setViewCounty] = useState<County | null>(null);
  // The species whose catch spot is on screen (T-068); the minigame starts from there.
  const [goCatch, setGoCatch] = useState<Species | null>(null);
  // Read only while the Impact screen is open, so each visit shows a fresh total (T-081).
  const community = useCommunityImpact(showImpact ? communityImpactSource() : null);
  const [exportJson, setExportJson] = useState<string | null>(null);
  const [consent, setConsentState] = useState<ConsentState>(DEFAULT_CONSENT);
  // Push registration must not act on the all-off default before the stored choice loads: that
  // would withdraw a consenting user's device on every launch (T-201).
  const [consentLoaded, setConsentLoaded] = useState(false);
  // Under-13 (age-gate, T-089) → minimal-data path: behavioural analytics is never offered.
  const [analyticsLocked, setAnalyticsLocked] = useState(false);
  const track = useTracker(consent);
  // Every purchase screen reports the same funnel steps (T-087).
  const purchases = useMemo(() => new TrackingPurchaseGateway(purchaseGateway(), { track }), [track]);
  // The Almanac lists the user's county + anything collected outside it (T-208); Badges count over
  // the same list so the two never disagree.
  const { species: almanacSpecies, loading: speciesLoading } = useAlmanacCatalogue(
    SPECIES_REPO,
    viewCounty?.id ?? hometown?.id ?? null,
    locale,
    new Set(collection.records.map((r) => r.speciesId)),
  );
  // This Week over the user's own county (T-207); null in preview mode → bundled list.
  const thisWeekLive = useThisWeek(
    SPECIES_REPO,
    viewCounty?.id ?? hometown?.id ?? null,
    monthOf(new Date()),
    spottedIds(collection.records),
    locale,
  );
  // Server-side device registration follows notification consent (T-201).
  usePushRegistration({
    ready: onboarded && consentLoaded && localeLoaded,
    wanted: consent.notifications,
    locale,
    homeRegion: hometown?.id ?? null,
  });
  // Travel (T-218): with location consent, notice another county while the app is open.
  const travel = useTravelOffer({
    enabled: onboarded && consentLoaded && consent.location && hometown !== null && hasSupabaseConfig(),
    homeId: hometown?.id ?? null,
    viewingId: viewCounty?.id ?? null,
    getFix: getLocationFixOnce,
    store: TRAVEL_STORE,
    onAccept: (county) => {
      setViewCounty(county);
      setTab('thisWeek');
    },
  });
  const [selected, setSelected] = useState<Species | null>(null);
  const [catching, setCatching] = useState<Species | null>(null);
  const [caughtTip, setCaughtTip] = useState<Species | null>(null);
  const [pledge, setPledge] = useState<{ species: Species; kind: HelpKind } | null>(null);
  const [paywall, setPaywall] = useState(false);

  // Notification taps (T-031): queue the species, then open it once the app can show a card. A
  // cold-start tap arrives before onboarding has finished, so it waits rather than being dropped.
  const [tappedSpeciesId, setTappedSpeciesId] = useState<string | null>(null);
  useEffect(() => {
    showNotificationsInForeground();
    return onNotificationTap(setTappedSpeciesId);
  }, []);
  useEffect(() => {
    if (!onboarded || tappedSpeciesId === null) return;
    const speciesId = tappedSpeciesId;
    track('notification_opened', { speciesId });
    SPECIES_REPO.describeSpecies([speciesId], locale)
      .then(([summary]) => {
        // A species the catalogue no longer has (removed by a refresh) just opens the app.
        if (summary === undefined) return;
        // Opening from a notification marks it Spotted, same as a This Week tap (USER-FLOWS §4).
        collection.spot(speciesId);
        track('species_spotted', { speciesId, source: 'notification' });
        setShowSettings(false);
        setShowBadges(false);
        setShowImpact(false);
        setSelected(summary.species);
      })
      .catch((e: unknown) => console.warn('notification species lookup failed', e))
      // Cleared after the lookup, not before: the queue is what holds a tap across onboarding.
      .finally(() => setTappedSpeciesId(null));
    // collection/track/locale are read at tap time; re-running on their identity would reopen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarded, tappedSpeciesId]);

  // Latest consent for handlers that resume after an OS dialog — the closure's copy may be stale.
  const consentRef = useRef(consent);
  useEffect(() => {
    consentRef.current = consent;
  }, [consent]);

  const applyConsent = (kind: ConsentKind, value: boolean) => {
    // The age gate lives in `applyConsentChange` (T-197) rather than here: it is a T-089 safety
    // rule, and a rule that exists only inside a component handler is one refactor away from
    // vanishing without a test going red. It returns the same object when it refuses, so a
    // blocked change costs no write.
    const current = consentRef.current;
    const next = applyConsentChange(current, kind, value, analyticsLocked);
    if (next === current) return;
    consentRef.current = next;
    // Persist every change so the choice survives a restart (GDPR consent record, T-088).
    setConsentState(next);
    void CONSENT_STORE.save(next);
  };

  const toggleConsent = (kind: ConsentKind, value: boolean) => {
    // Turning notifications on must also get the OS permission (T-213). Recording consent without
    // it registers the device for pushes the phone then silently drops — the user believes they
    // opted in and nothing ever arrives. Already granted returns at once, with no dialog.
    if (kind === 'notifications' && value) {
      void requestNotificationPermission().then((outcome) => {
        if (outcome === 'granted') applyConsent(kind, true);
      });
      return;
    }
    applyConsent(kind, value);
  };

  // Validation-funnel instrumentation (T-035): session start, and This Week opened whenever the
  // user is on that tab (covers both the initial view and switching back to it). `track` is
  // stable across renders (useTracker), so this fires once per mount despite the dependency.
  useEffect(() => {
    track('session_start', {});
  }, [track]);

  // Rehydrate the language choice (T-211). The store never rejects; null means follow the device.
  useEffect(() => {
    let cancelled = false;
    void LOCALE_STORE.load().then((stored) => {
      if (cancelled) return;
      if (stored !== null) setLocaleOverride(stored);
      setLocaleLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Rehydrate onboarding (T-209). The store never rejects; a missing record means first run.
  useEffect(() => {
    let cancelled = false;
    void ONBOARDING_STORE.load().then((record) => {
      if (cancelled) return;
      if (record !== null) {
        setAnalyticsLocked(record.agePath === 'restricted');
        setOnboarded(true);
      }
      setOnboardingLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Rehydrate the locked hometown on launch (T-090). A failed read leaves preview mode.
  useEffect(() => {
    let cancelled = false;
    void HOMETOWN_STORE.load().then((stored) => {
      if (!cancelled && stored !== null) setHometown(stored);
    });
    return () => {
      cancelled = true;
    };
  }, []);

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
      })
      .finally(() => {
        if (!cancelled) setConsentLoaded(true);
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

  const exportMyData = async () => {
    // The server-side sections (T-219). Without a backend there is nothing held there to export.
    const unavailable: ('purchases' | 'household')[] = [];
    let purchases: PurchaseRecord[] = [];
    let household: ExportHousehold | null = null;
    if (hasSupabaseConfig()) {
      const client = getSupabase();
      [purchases, household] = await Promise.all([
        new SupabaseExportSource(client as unknown as ExportClient, ensureAnonymousSession)
          .purchases()
          .catch(() => {
            unavailable.push('purchases');
            return [];
          }),
        new SupabaseFamilyGateway(client)
          .mine()
          .then(householdForExport)
          .catch(() => {
            unavailable.push('household');
            return null;
          }),
      ]);
    }
    const bundle = buildDataExport({
      exportedAt: new Date().toISOString(),
      profile: { homeRegion: hometown?.id ?? null },
      consent,
      collection: collection.records,
      purchases,
      household,
      unavailable,
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
    // Erasure covers what the device holds too: the next person to open the app starts fresh.
    setHometown(null);
    void ONBOARDING_STORE.clear();
    void HOMETOWN_STORE.clear();
    void ENTITLEMENT_STORE.clear();
    void TRAVEL_STORE.clear();
    return true;
  };

  const seasonKey = seasonKeyOf(new Date());
  // Spotting and catching need the home county or an opened one (T-105); a preview is look-only.
  const viewingAccess = viewCounty ? regionAccess(viewCounty.id, hometown?.id ?? null, entitlements) : 'home';
  const canCollect = canCollectIn(viewingAccess);
  // Derived from the persisted collection (T-200), so a restart cannot reset it; the database
  // trigger is the authority and refuses a 4th catch however this is tampered with. Full Game is
  // false until the purchase flow exists (T-074).
  // Unlimited catching follows what the server says the user owns (T-083), incl. Family membership.
  const freeCatch = freeCatchStateFrom(collection.records, seasonKey, entitlements.fullGame);
  const remaining = remainingFreeCatches(freeCatch, seasonKey);

  // Catch entry (T-034): a free user gets 3 catches/season; the 4th attempt shows the gentle
  // sheet instead of the minigame. The counter increments only on a successful catch.
  // Catching means going to a spot that suits the species (T-068). With spots available the card's
  // button opens the catch spot; its Catch button (once in range) runs the free-catch check.
  const catchRegion = viewCounty?.id ?? hometown?.id ?? null;
  const findCatchSpot = (species: Species) => {
    if (catchSpotSource() !== null && catchRegion !== null) setGoCatch(species);
    else attemptCatch(species);
  };

  const attemptCatch = (species: Species) => {
    if (canCatch(freeCatch, seasonKey)) {
      track('catch_attempted', { speciesId: species.id });
      setCatching(species);
    } else {
      track('free_catches_exhausted', {});
      track('paywall_shown', {});
      setPaywall(true);
    }
  };

  if (!onboardingLoaded || !localeLoaded) return null;

  if (!onboarded) {
    return (
      <OnboardingFlow
        locale={locale}
        onFirstSpotted={(speciesId) => {
          collection.spot(speciesId);
          track('species_spotted', { speciesId, source: 'onboarding' });
        }}
        onComplete={({ agePath, notificationOutcome, hometown: home }) => {
          // A locked hometown from an earlier session stands even if location is denied this time.
          if (home !== null) setHometown(home);
          void ONBOARDING_STORE.save({ agePath });
          setAnalyticsLocked(agePath === 'restricted');
          // "Turn on nudges" + an OS grant is the notification opt-in (T-201).
          if (notificationOutcome === 'granted') applyConsent('notifications', true);
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

  if (showCounties) {
    return (
      <>
        <CountiesScreen
          locale={locale}
          homeId={hometown?.id ?? null}
          entitlements={entitlements}
          gateway={purchases}
          onView={(county) => {
            setViewCounty(county.id === hometown?.id ? null : county);
            // Land on that county's This Week, wherever Counties was opened from.
            setShowCounties(false);
            setShowSettings(false);
            setSelected(null);
            setTab('thisWeek');
          }}
          onPurchased={() => {
            for (const ms of AFTER_PURCHASE_REREAD_MS) setTimeout(refreshEntitlements, ms);
          }}
          onDone={() => setShowCounties(false)}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (showStore) {
    return (
      <>
        <StoreScreen
          locale={locale}
          gateway={purchases}
          entitlements={entitlements}
          onPurchased={() => {
            for (const ms of AFTER_PURCHASE_REREAD_MS) setTimeout(refreshEntitlements, ms);
          }}
          onDone={() => setShowStore(false)}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (showFamily) {
    return (
      <>
        <FamilyScreen
          locale={locale}
          gateway={new SupabaseFamilyGateway(getSupabase())}
          ownsFamily={entitlements.family}
          onChanged={refreshEntitlements}
          onDone={() => setShowFamily(false)}
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
          community={community}
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
          onSelectLocale={(loc) => {
            setLocaleOverride(loc);
            void LOCALE_STORE.save(loc);
          }}
          onToggleDualLanguage={(enabled) =>
            updateDualLanguage(setDualEnabled(dualLanguage, enabled))
          }
          onSelectSecondaryLocale={(loc) =>
            updateDualLanguage(setSecondaryLocale(dualLanguage, loc, locale as ContentLocale))
          }
          onExportData={() => void exportMyData()}
          onLinkEmail={() => setShowLinkEmail(true)}
          // Family needs the backend: households live in Supabase (T-102).
          onOpenFamily={hasSupabaseConfig() ? () => setShowFamily(true) : undefined}
          onOpenStore={
            hasSupabaseConfig()
              ? () => {
                  track('store_opened', { source: 'settings' });
                  setShowStore(true);
                }
              : undefined
          }
          onOpenCounties={hasSupabaseConfig() && hometown ? () => setShowCounties(true) : undefined}
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

  if (goCatch && catchRegion !== null && catchSpotSource() !== null && !catching) {
    const target = goCatch;
    return (
      <>
        <CatchSpotRoute
          species={target}
          speciesName={commonNameFor(target, locale)}
          regionId={catchRegion}
          source={catchSpotSource()!}
          store={CATCH_SPOT_STORE}
          getFix={getLocationFixOnce}
          locale={locale}
          onCatch={() => {
            setGoCatch(null);
            attemptCatch(target);
          }}
          onBack={() => setGoCatch(null)}
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
              // The count follows from the collection: recording the catch is what spends one.
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
          onFindNearby={
            canCollect
              ? findCatchSpot
              : () => {
                  track('store_opened', { source: 'catch_spot' });
                  setShowCounties(true);
                }
          }
          onPledge={(species, kind) => {
            // Helped tier: one-tap honor-system pledge (GDD §5) → mark Helped + confirm.
            collection.help(species.id, kind);
            setPledge({ species, kind });
          }}
          nearbyNote={
            !canCollect && viewCounty
              ? tr('counties.locked', { county: viewCounty.name })
              : freeCatch.fullGame
                ? undefined
                : tr('catch.remaining', { count: remaining })
          }
        />
        {paywall ? <FreeCatchSheet
            locale={locale}
            onClose={() => setPaywall(false)}
            onOpenStore={
              hasSupabaseConfig()
                ? () => {
                    setPaywall(false);
                    track('store_opened', { source: 'paywall' });
                    setShowStore(true);
                  }
                : undefined
            }
          /> : null}
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
      {viewCounty ? (
        <View style={styles.previewBanner}>
          <Text style={styles.previewText}>
            {canCollect
              ? viewCounty.name
              : tr('counties.previewBanner', { county: viewCounty.name })}
          </Text>
          <Pressable onPress={() => setViewCounty(null)} accessibilityRole="button">
            <Text style={[styles.previewText, styles.previewLink]}>
              {tr('counties.backHome', { county: hometown?.name ?? '' })}
            </Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.screen}>
        {tab === 'thisWeek' ? (
          <ThisWeekScreen
            locale={locale}
            live={thisWeekLive}
            regionName={viewCounty?.name ?? hometown?.name}
            spottedIds={spottedIds(collection.records)}
            onOpenCounties={hasSupabaseConfig() && hometown ? () => setShowCounties(true) : undefined}
            onIdentify={() => {
              track('identify_opened', {});
              void openIdentifier((url) => Linking.openURL(url));
            }}
            travel={
              travel.offer
                ? { county: travel.offer.name, onLook: travel.accept, onDismiss: travel.dismiss }
                : null
            }
            onSelectSpecies={(species) => {
              // Tapping a This Week entry marks it Spotted and opens its card (same as a
              // notification tap, USER-FLOWS §4). In a county the user has not opened it only
              // opens the card: spotting there is what a county pack buys (T-105).
              if (canCollect) {
                collection.spot(species.id);
                track('species_spotted', { speciesId: species.id, source: 'this_week' });
              }
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
  previewLink: { marginTop: 4, fontWeight: '700', textDecorationLine: 'underline' },
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
