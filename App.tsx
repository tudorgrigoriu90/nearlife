import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AlmanacScreen from './components/AlmanacScreen';
import OnboardingFlow from './components/OnboardingFlow';
import SpeciesCard from './components/SpeciesCard';
import ThisWeekScreen from './components/ThisWeekScreen';
import CatchMinigame from './components/minigame/CatchMinigame';
import ProtectTip from './components/catch/ProtectTip';
import FreeCatchSheet from './components/catch/FreeCatchSheet';
import ReportMistakeSheet from './components/ReportMistakeSheet';
import PledgeConfirm from './components/helped/PledgeConfirm';
import SettingsScreen from './components/SettingsScreen';
import DataExportView from './components/DataExportView';
import DeleteAccountConfirm from './components/DeleteAccountConfirm';
import LinkEmail from './components/LinkEmail';
import AccessCodeScreen from './components/AccessCodeScreen';
import SightingQuizScreen from './components/SightingQuizScreen';
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
import { useNotificationPermissionSync } from './components/useNotificationPermissionSync';
import BannerStack from './components/BannerStack';
import { usePurchaseRereads } from './components/usePurchaseRereads';
import {
  onNotificationTap,
  requestLocationAccess,
  requestNotificationPermission,
  getNotificationPermission,
  showNotificationsInForeground,
  getCatchFix,
  getLocationFixOnce,
} from './lib/permissions';
import { useTracker } from './components/useTracker';
import {
  applyConsentChange,
  DEFAULT_CONSENT,
  hasConsent,
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
import { AsyncStorageEasyModeStore } from './lib/easyModeStore';
import MoveHomeScreen from './components/MoveHomeScreen';
import { checkMove, SupabaseHomeMoveGateway } from './lib/homeMove';
import { useFieldNotes } from './components/useFieldNotes';
import { notesFor } from './lib/fieldNotes';
import { AsyncStorageFieldNotesStore } from './lib/fieldNotesStore';
import NameTrainerScreen from './components/NameTrainerScreen';
import { useNameTrainer } from './components/useNameTrainer';
import { trainerLocale } from './lib/nameTrainer';
import { AsyncStorageNameTrainerStore } from './lib/nameTrainerStore';
import { useNotifPrefs } from './components/useNotifPrefs';
import { SupabaseNotifPrefsGateway } from './lib/notifPrefsGateway';
import { useEasyMode } from './components/useEasyMode';
import { motherTongueOffer, type ContentLocale } from './lib/i18n/contentLocale';
import { deleteAccount, SupabaseDeletionGateway } from './lib/accountDeletion';
import { SupabaseAuthGateway } from './lib/accountLinking';
import { SupabaseAccessCodeGateway } from './lib/reviewerAccess';
import {
  AsyncStorageQuizAttemptStore,
  AsyncStorageRecognitionStore,
  dayKey,
} from './lib/sightingQuiz';
import { ensureAnonymousSession, getSupabase } from './lib/supabase';
import { getSupabaseConfig, hasSupabaseConfig } from './lib/supabaseConfig';
import { eraseDeviceStorage } from './lib/deviceErase';
import { ExpoCacheFiles } from './lib/countyCacheFiles';
import { SupabaseSignInGateway } from './lib/accountSignIn';
import { sendContentReport, SupabaseReportGateway } from './lib/contentReports';
import { badgeStatuses, rememberEarned, type RememberedBadges } from './lib/badges';
import { AsyncStorageBadgeStore } from './lib/badgeStore';
import { caughtThisSeason } from './lib/tierMarks';
import { KRONOBERG_SPECIES } from './lib/species/kronoberg';
import { groupOf } from './lib/species/group';
import {
  SupabaseRecognitionGateway,
  syncRecognitions,
  type RecognitionGateway,
} from './lib/recognitionSync';
import { fixIfConsented } from './lib/locationAccess';
import { pickCountyStarter } from './lib/countyStarter';
import SignIn from './components/SignIn';
import { useSessionStart } from './components/useSessionStart';
import { resetAnalyticsIdentity } from './lib/posthog';
import { supabaseProbe, type ConnectivityProbe } from './lib/connectivity';
import { useConnectivity } from './components/useConnectivity';
import OfflineScreen from './components/OfflineScreen';
import { supabaseSoundSource, type SoundSource } from './lib/birdSound';
import { SupabaseCommunityImpactSource, type CommunityImpactSource } from './lib/communityImpact';
import {
  SupabaseEntitlementSource,
  type EntitlementSource,
} from './lib/entitlement';
import { AsyncStorageEntitlementStore } from './lib/entitlementStore';
import { AsyncStorageTravelStore } from './lib/travelStore';
import {
  SupabaseCatchSpotSource,
  type CatchSpotSource,
} from './lib/catchSpots';
import { AsyncStorageCatchSpotStore } from './lib/catchSpotStore';
import { SupabaseFamilyGateway } from './lib/family';
import { canCollectIn, regionAccess, type County } from './lib/regionAccess';
import {
  RevenueCatPurchaseGateway,
  loadRevenueCat,
  revenueCatKey,
  type PurchaseGateway,
} from './lib/purchases';
import { TrackingPurchaseGateway } from './lib/salesFunnel';
import {
  buildDataExport,
  exportToJson,
  householdForExport,
  SupabaseExportSource,
  type ExportHousehold,
  type PurchaseRecord,
  type ServerExport,
} from './lib/dataExport';
import type { Region } from './lib/hometown';
import { AsyncStorageHometownStore, deriveHometown } from './lib/hometownStore';
import { AsyncStorageOnboardingStore } from './lib/onboardingStore';
import { AsyncStorageLocaleStore } from './lib/localeStore';
import { spottedIds, tierStateFor } from './lib/collection';
import { canCatch, freeCatchStateFrom, remainingFreeCatches } from './lib/freeCatch';
import { isPrimeCatch } from './lib/primeBonus';
import { openIdentifier } from './lib/identify';
import { CrashReporter, loadSentry, setActiveCrashReporter } from './lib/crashReporting';
import { gradeFromScore } from './lib/minigame/grade';
import { monthOf, seasonKeyOf } from './lib/season';
import { catchSeason } from './lib/catchSeason';
import { countyStats } from './lib/countyStats';
import { detectDeviceLocale, deviceLanguageTags } from './lib/i18n/deviceLocale';
import { createTranslator, type Locale, type TranslationKey } from './lib/i18n';
import {
  createPackSource,
  createRepositoryParts,
  FallbackSpeciesRepository,
} from './lib/speciesRepositoryFactory';
import { composeRepository } from './lib/offlineRepository';
import { ExpoPackFiles } from './lib/packFiles';
import { useOfflinePack } from './components/useOfflinePack';
import OfflineSection from './components/OfflineSection';
import type { HelpKind } from './lib/collection';
import type { SpeciesContent } from './lib/species/content';
import type { Species } from './lib/species/types';

// The species catalogue is read through the repository seam (T-057), not the bundled module
// directly, so the source can swap to the seeded Supabase tables without touching the shell. The
// default is the bundled Kronoberg set the app runs on today; the source swaps to a Supabase-backed
// repo once the DB is seeded (T-055 content seed). Module-level so its identity is stable.
// Supabase when configured, bundled data otherwise, with a fallback on failure (T-057).
// Each county's data is kept on the phone and re-read only when the server's version changes
// (T-275); one cached source serves both the plain and the offline-pack compositions.
const COUNTY_CACHE = hasSupabaseConfig() ? new ExpoCacheFiles() : undefined;
const REPO_PARTS = createRepositoryParts(COUNTY_CACHE);
const SPECIES_REPO = REPO_PARTS.online
  ? new FallbackSpeciesRepository(REPO_PARTS.online, REPO_PARTS.bundled)
  : REPO_PARTS.bundled;
// The offline county pack (T-256): Full Game owners keep their county on the phone.
const PACK_SOURCE = createPackSource();
const PACK_FILES = PACK_SOURCE ? new ExpoPackFiles() : null;

// Community totals source (T-081), built on first use so importing App never creates a client
// (tests have no Supabase config). null without a backend: the Impact screen keeps its note.
let communitySource: CommunityImpactSource | null | undefined;
// What the user owns, read from the server (T-083/T-217) and cached on the device. Built on first
// use like the community source.
const ENTITLEMENT_STORE = new AsyncStorageEntitlementStore();
// One-try-a-day record for the "I saw…" quiz (T-242), kept on the device.
const QUIZ_ATTEMPTS = new AsyncStorageQuizAttemptStore();
// Species recognised in the quiz, for the badges (T-243).
const RECOGNIZED_STORE = new AsyncStorageRecognitionStore();
// Earned badges, remembered with their date (T-297 · review B-27).
const BADGE_STORE = new AsyncStorageBadgeStore();
// Which counties the travel banner has offered (T-218). Counties and times only, never positions.
const TRAVEL_STORE = new AsyncStorageTravelStore();
let entitlementSourceInstance: EntitlementSource | null | undefined;
function entitlementSource(): EntitlementSource | null {
  if (entitlementSourceInstance === undefined) {
    entitlementSourceInstance = hasSupabaseConfig()
      ? new SupabaseEntitlementSource(
          getSupabase(),
          ensureAnonymousSession,
        )
      : null;
  }
  return entitlementSourceInstance;
}

// Catch spots (T-068): the county's spots, cached for offline use outdoors. Null without a backend:
// catching then works as before, with no spot to walk to.
const CATCH_SPOT_STORE = new AsyncStorageCatchSpotStore();
let catchSpotSourceInstance: CatchSpotSource | null | undefined;
// Screen gateways, created once (T-308 · review B-35): a new one on every render re-ran the
// screen's load (Family's my_household, Link email's getUser) each time App re-rendered. Only
// reached on screens that exist with a backend.
let signInGatewayInstance: SupabaseSignInGateway | undefined;
const signInGateway = () => (signInGatewayInstance ??= new SupabaseSignInGateway(getSupabase()));
let familyGatewayInstance: SupabaseFamilyGateway | undefined;
const familyGateway = () => (familyGatewayInstance ??= new SupabaseFamilyGateway(getSupabase()));
let authGatewayInstance: SupabaseAuthGateway | undefined;
const authGateway = () => (authGatewayInstance ??= new SupabaseAuthGateway(getSupabase()));
// Notification choices on the profile (T-342); null without a backend.
let notifPrefsGatewayInstance: SupabaseNotifPrefsGateway | undefined;
const notifPrefsGateway = () =>
  hasSupabaseConfig() ? (notifPrefsGatewayInstance ??= new SupabaseNotifPrefsGateway(getSupabase(), ensureAnonymousSession)) : null;
let accessCodeGatewayInstance: SupabaseAccessCodeGateway | undefined;
const accessCodeGateway = () =>
  (accessCodeGatewayInstance ??= new SupabaseAccessCodeGateway(getSupabase()));

/** Recognitions on the account (T-299); null without a backend. */
function recognitionGateway(): RecognitionGateway | null {
  return hasSupabaseConfig() ? new SupabaseRecognitionGateway(getSupabase()) : null;
}

function catchSpotSource(): CatchSpotSource | null {
  if (catchSpotSourceInstance === undefined) {
    catchSpotSourceInstance = hasSupabaseConfig()
      ? new SupabaseCatchSpotSource(getSupabase())
      : null;
  }
  return catchSpotSourceInstance;
}

// Store purchases (T-084), built on first use: the native module exists only in builds made after
// react-native-purchases was added, and without it the Store just hides its buy buttons.
let purchaseGatewayInstance: PurchaseGateway | undefined;
function purchaseGateway(): PurchaseGateway {
  purchaseGatewayInstance ??= new RevenueCatPurchaseGateway(
    loadRevenueCat(),
    revenueCatKey(),
    ensureAnonymousSession,
  );
  return purchaseGatewayInstance;
}

// After a purchase the server learns of it from RevenueCat's webhook, usually within seconds but
// not instantly, so the app re-reads a few times rather than once.
// Every 5 s for 2 minutes after a payment, while the Store says "unlocking" (T-285 · B-34).
const AFTER_PURCHASE_REREAD_MS = Array.from({ length: 25 }, (_, i) => i * 5_000);

// Offline notice (T-252): one request to the server says whether the app can work. Null without a
// backend (tests, a local build without config): never offline then.
let probeInstance: ConnectivityProbe | null | undefined;
function connectivityProbe(): ConnectivityProbe | null {
  if (probeInstance === undefined) {
    probeInstance = hasSupabaseConfig() ? supabaseProbe(getSupabaseConfig()) : null;
  }
  return probeInstance;
}

// Bird song (T-246): read from species_sounds on demand and kept for the session.
let soundSourceInstance: SoundSource | null | undefined;
function soundSource(): SoundSource | null {
  if (soundSourceInstance === undefined) {
    soundSourceInstance = hasSupabaseConfig()
      ? supabaseSoundSource(getSupabase())
      : null;
  }
  return soundSourceInstance;
}

function communityImpactSource(): CommunityImpactSource | null {
  if (communitySource === undefined) {
    communitySource = hasSupabaseConfig()
      ? new SupabaseCommunityImpactSource(getSupabase(), ensureAnonymousSession)
      : null;
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

// Easy catching (T-331) — the person's choice, else the system's reduced-motion setting.
const EASY_MODE_STORE = new AsyncStorageEasyModeStore();

// Field notes on sightings (T-347) — on the phone only, erased with the account.
const FIELD_NOTES_STORE = new AsyncStorageFieldNotesStore();
// The name trainer's schedule (T-351) — on the phone only, erased with the account.
const NAME_TRAINER_STORE = new AsyncStorageNameTrainerStore();

// Moving home county once a year (T-349); null without a backend.
let homeMoveGatewayInstance: SupabaseHomeMoveGateway | undefined;
const homeMoveGateway = () =>
  hasSupabaseConfig() ? (homeMoveGatewayInstance ??= new SupabaseHomeMoveGateway(getSupabase(), ensureAnonymousSession)) : null;

// Prototype app shell (E2). Onboarding (T-022+) runs first; once complete, a minimal tab
// switcher between the "This week" pull surface (T-117) and the Almanac grid (T-025); tapping a
// species opens its card (T-026). No navigation library yet — local state is enough for the
// throwaway prototype. Collection is empty until persistence lands (T-027, Supabase-gated);
// tap-to-collect is T-029.

type Tab = 'thisWeek' | 'almanac';

/** Run a close action and report the back press as handled. */
function closed(close: () => void): true {
  close();
  return true;
}

export default function App() {
  const { easy: easyCatching, setEasy: setEasyCatching } = useEasyMode(EASY_MODE_STORE);
  // Device locale by default; a user override from Settings takes precedence (T-123).
  const [localeOverride, setLocaleOverride] = useState<Locale | null>(null);
  // Held back with onboarding (below) so a Swedish user never sees an English first frame.
  const [localeLoaded, setLocaleLoaded] = useState(false);
  const locale = localeOverride ?? detectDeviceLocale();
  const tr = createTranslator(locale);
  const collection = useCollection();
  const connectivity = useConnectivity(connectivityProbe());
  // Almanac catalogue, loaded async through the repository seam (T-057). Defaults to the bundled
  // set (no behaviour change) until a DB-backed repo is injected. Names re-localize in the grid.
  // Selected species' card content, loaded through the repository (T-059). Keyed by species id so a
  // stale result from a previously-open card is never shown against the newly-selected species.
  const [cardContent, setCardContent] = useState<{
    speciesId: string;
    content: SpeciesContent | null;
    /** The read failed (T-283): the card says so and offers a retry. */
    failed?: boolean;
  } | null>(null);
  const [contentAttempt, setContentAttempt] = useState(0);
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
  const [showSignIn, setShowSignIn] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [showSighting, setShowSighting] = useState(false);
  const [recognized, setRecognized] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    void RECOGNIZED_STORE.load().then((ids) => {
      if (!cancelled) setRecognized(ids);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  // The account keeps them too (T-299 · review B-31): merged with the phone's copy once onboarded,
  // and again after a sign-in (`recognitionRound`), so a reinstall gets them back.
  const [recognitionRound, setRecognitionRound] = useState(0);
  const [showBadges, setShowBadges] = useState(false);
  const [rememberedBadges, setRememberedBadges] = useState<RememberedBadges>({});
  const [badgesLoaded, setBadgesLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void BADGE_STORE.load().then((badges) => {
      if (cancelled) return;
      setRememberedBadges(badges);
      setBadgesLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const [showImpact, setShowImpact] = useState(false);
  const {
    entitlements,
    refresh: refreshEntitlements,
    reset: resetEntitlements,
  } = useEntitlements({
    source: entitlementSource(),
    store: ENTITLEMENT_STORE,
  });
  // Is a second language actually being shown? Re-derived every render because it depends on the
  // primary locale, which the user can change at any time (isDualActive, T-148).
  const dualActive = isDualActive(dualLanguage, locale as ContentLocale);
  const secondaryLocale = dualActive ? dualLanguage.secondaryLocale : null;
  // The offline county pack (T-256) and, with one saved, play from it (T-257). Full Game only.
  const homeId = hometown?.id ?? null;
  const packTarget = useMemo(
    () => (homeId ? { regionId: homeId, locale, secondaryLocale } : null),
    [homeId, locale, secondaryLocale],
  );
  const offlinePack = useOfflinePack({
    enabled: entitlements.fullGame,
    target: packTarget,
    source: PACK_SOURCE,
    files: PACK_FILES,
    online: !connectivity.offline,
  });
  const usablePack = entitlements.fullGame ? offlinePack.pack : null;
  // A new object when the mode changes, so every screen reloads from the right source.
  const speciesRepo = useMemo(
    () =>
      usablePack && REPO_PARTS.online && PACK_FILES
        ? composeRepository({
            online: REPO_PARTS.online,
            bundled: REPO_PARTS.bundled,
            pack: usablePack,
            thumbUri: (id) => PACK_FILES.thumbUri(id),
            readContent: (locale) => PACK_FILES.readContent(locale),
            offline: connectivity.offline,
          })
        : SPECIES_REPO,
    [usablePack, connectivity.offline],
  );
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
  // The phone's other language, offered at onboarding (T-343 · review F-05).
  const motherTongue = useMemo(() => motherTongueOffer(deviceLanguageTags()), []);
  const notifChoices = useNotifPrefs(notifPrefsGateway(), consent.notifications);
  const fieldNotes = useFieldNotes(FIELD_NOTES_STORE);
  const nameTrainer = useNameTrainer(NAME_TRAINER_STORE);
  const [showTrainer, setShowTrainer] = useState(false);
  const [showMoveHome, setShowMoveHome] = useState(false);
  // Under-13 (age-gate, T-089) → minimal-data path: behavioural analytics is never offered.
  const [analyticsLocked, setAnalyticsLocked] = useState(false);
  const track = useTracker(consent);
  // Crash reports follow the analytics consent, on and off (T-100).
  const crashReporter = useMemo(
    () => new CrashReporter(loadSentry(), process.env.EXPO_PUBLIC_SENTRY_DSN ?? ''),
    [],
  );
  useEffect(() => {
    if (consentLoaded) crashReporter.setConsent(hasConsent(consent, 'analytics'));
  }, [crashReporter, consent, consentLoaded]);
  // The error boundary in AppRoot reports through this reporter (T-323).
  useEffect(() => {
    setActiveCrashReporter(crashReporter);
    return () => setActiveCrashReporter(null);
  }, [crashReporter]);
  // Every purchase screen reports the same funnel steps (T-087).
  // Cancelled when the unlock arrives or the app goes away (T-302 · review B-47).
  const startPurchaseRereads = usePurchaseRereads(
    refreshEntitlements,
    JSON.stringify(entitlements),
    AFTER_PURCHASE_REREAD_MS,
  );
  const purchases = useMemo(
    () => new TrackingPurchaseGateway(purchaseGateway(), { track }),
    [track],
  );
  // The Almanac lists the user's county + anything collected outside it (T-208); Badges count over
  // the same list so the two never disagree.
  const {
    species: almanacSpecies,
    loading: speciesLoading,
    error: almanacError,
    retry: retryAlmanac,
  } = useAlmanacCatalogue(
    speciesRepo,
    viewCounty?.id ?? hometown?.id ?? null,
    locale,
    new Set(collection.records.map((r) => r.speciesId)),
  );
  // Badges are a record of what the user did, so they count over the home county (plus anything
  // collected elsewhere) whichever county is on screen (T-297 · review B-27). The home list is read
  // separately only while another county is viewed; at home it is the Almanac's own list.
  const homeCatalogue = useAlmanacCatalogue(
    speciesRepo,
    hometown?.id ?? null,
    locale,
    new Set(collection.records.map((r) => r.speciesId)),
    viewCounty !== null,
  );
  const badgeSpecies = viewCounty !== null ? homeCatalogue.species : almanacSpecies;
  const badgeListReady = viewCounty !== null ? !homeCatalogue.loading : !speciesLoading;
  // Newly earned badges are remembered once the stored ones have loaded (so an older date is never
  // overwritten), and saved; the first date stays.
  useEffect(() => {
    if (!badgesLoaded || !badgeListReady) return;
    const statuses = badgeStatuses(collection.records, badgeSpecies, new Date(), recognized);
    const next = rememberEarned(statuses, rememberedBadges, new Date().toISOString());
    if (next === null) return;
    void BADGE_STORE.save(next).then(() => setRememberedBadges(next));
  }, [badgesLoaded, badgeListReady, collection.records, badgeSpecies, recognized, rememberedBadges]);
  // This Week over the user's own county (T-207); null in preview mode → bundled list.
  const thisWeekLive = useThisWeek(
    speciesRepo,
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
    enabled:
      onboarded && consentLoaded && consent.location && hometown !== null && hasSupabaseConfig(),
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
  // The open card's species in the county list (T-262): a card opened from This Week carries no
  // county numbers itself, so it is looked up in the county catalogue the almanac already holds.
  const countyName = viewCounty?.name ?? hometown?.name ?? null;
  const cardCounty = useMemo(() => {
    if (!selected || !countyName) return null;
    const own = almanacSpecies.find((s) => s.id === selected.id) ?? selected;
    const stats = countyStats(own, almanacSpecies);
    return stats ? { name: countyName, stats } : null;
  }, [selected, countyName, almanacSpecies]);
  const cardSpecies = selected ? (almanacSpecies.find((s) => s.id === selected.id) ?? selected) : null;
  const cardThreat = cardSpecies?.iucn;
  const cardThreatSe = cardSpecies?.redlistSe;
  const cardLegalStatus = cardSpecies?.legalStatus;
  // The season gate (T-268 · review B-26), on the species' active months in the viewed county.
  const seasonOf = (species: Species) =>
    catchSeason(
      (almanacSpecies.find((s) => s.id === species.id) ?? species).activeMonths,
      monthOf(new Date()),
    );
  const cardSeason = selected ? seasonOf(selected) : null;
  const [catching, setCatching] = useState<Species | null>(null);
  // The content the card loaded, for the screens that follow it (catch tip, pledge; T-273): a
  // catalogue species has no bundled content to fall back on.
  const loadedContentFor = (species: Species) =>
    cardContent?.speciesId === species.id ? cardContent.content : null;
  const [caughtTip, setCaughtTip] = useState<{ species: Species; prime: boolean } | null>(null);
  const [pledge, setPledge] = useState<{ species: Species; kind: HelpKind } | null>(null);
  const [paywall, setPaywall] = useState(false);
  // "Report a mistake" on the open card (T-293 · review I-32).
  // Keyed by species, so a report left open never reappears on the next card.
  const [reportingFor, setReportingFor] = useState<string | null>(null);
  const goBackRef = useRef<() => boolean>(() => false);
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => goBackRef.current());
    return () => sub.remove();
  }, []);

  // Notification taps (T-031): queue the species, then open it once the app can show a card. A
  // cold-start tap arrives before onboarding has finished, so it waits rather than being dropped.
  const [tappedSpeciesId, setTappedSpeciesId] = useState<string | null>(null);
  useEffect(() => {
    showNotificationsInForeground();
    return onNotificationTap(setTappedSpeciesId, () => {
      // The weekly recap (T-350) opens This Week.
      setSelected(null);
      setTab('thisWeek');
    });
  }, []);
  useEffect(() => {
    const gateway = recognitionGateway();
    if (!onboarded || gateway === null) return;
    let cancelled = false;
    void ensureAnonymousSession()
      .then(() => RECOGNIZED_STORE.load())
      .then((local) => syncRecognitions(local, gateway))
      .then(async (all) => {
        if (cancelled) return;
        await RECOGNIZED_STORE.save(all);
        setRecognized(all);
      })
      .catch((e: unknown) => console.warn('recognitions sync failed', e));
    return () => {
      cancelled = true;
    };
  }, [onboarded, recognitionRound]);

  // A tap waits while something must finish first (T-296 · review B-24): a minigame in progress,
  // the catch tip right after it (a delight moment), a sign-in, and the delete confirmation. When
  // that closes, this effect runs again and the card opens.
  const tapMustWait = catching !== null || caughtTip !== null || showSignIn || showDelete;
  useEffect(() => {
    if (!onboarded || tappedSpeciesId === null || tapMustWait) return;
    const speciesId = tappedSpeciesId;
    track('notification_opened', { speciesId });
    speciesRepo.describeSpecies([speciesId], locale)
      .then(([summary]) => {
        // A species the catalogue no longer has (removed by a refresh) just opens the app.
        if (summary === undefined) return;
        // Opening from a notification marks it Spotted, same as a This Week tap (USER-FLOWS §4).
        collection.spot(speciesId);
        track('species_spotted', { speciesId, source: 'notification' });
        // Everything that would render in front of the card closes (USER-FLOWS §5); so do the
        // sheets that belonged to the previous card (B-39).
        setExportJson(null);
        setShowCounties(false);
        setShowStore(false);
        setShowFamily(false);
        setShowLinkEmail(false);
        setShowAccessCode(false);
        setShowSighting(false);
        setShowBadges(false);
        setShowImpact(false);
        setShowSettings(false);
        setPledge(null);
        setGoCatch(null);
        setPaywall(false);
        setReportingFor(null);
        setSelected(summary.species);
      })
      .catch((e: unknown) => console.warn('notification species lookup failed', e))
      // Cleared after the lookup, not before: the queue is what holds a tap across onboarding.
      .finally(() => setTappedSpeciesId(null));
    // collection/track/locale are read at tap time; re-running on their identity would reopen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboarded, tappedSpeciesId, tapMustWait]);

  // A catch the server refused is explained once, away from the catch screens (T-274 · review
  // B-13): the success moment stays clean (invariant #4), and the notice comes on the next screen.
  const [refusedNotice, setRefusedNotice] = useState<{ id: string; name: string } | null>(null);
  const refusedTracked = useRef(new Set<string>());
  const nextRefused = collection.refusedCatches[0];
  useEffect(() => {
    if (!nextRefused || refusedNotice) return;
    if (!refusedTracked.current.has(nextRefused)) {
      refusedTracked.current.add(nextRefused);
      track('catch_refused', { speciesId: nextRefused });
    }
    let cancelled = false;
    speciesRepo
      .describeSpecies([nextRefused], locale)
      .then(([summary]) => summary?.species)
      .catch(() => undefined)
      .then((species) => {
        if (cancelled) return;
        const name = species ? commonNameFor(species, locale) : nextRefused;
        setRefusedNotice({ id: nextRefused, name });
      });
    return () => {
      cancelled = true;
    };
    // speciesRepo/locale/track are read when a refusal arrives; it is shown once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextRefused, refusedNotice]);
  const closeRefused = () => {
    if (refusedNotice) collection.clearRefusedCatch(refusedNotice.id);
    setRefusedNotice(null);
  };
  const refusedSheet =
    refusedNotice && !paywall ? (
      <FreeCatchSheet
        locale={locale}
        refusedName={refusedNotice.name}
        onClose={closeRefused}
        onOpenStore={
          hasSupabaseConfig()
            ? () => {
                closeRefused();
                track('store_opened', { source: 'paywall' });
                setShowStore(true);
              }
            : undefined
        }
      />
    ) : null;

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

  // Notifications switched off in system settings switch the app's consent off too (T-300 ·
  // review B-33), which unregisters the device.
  useNotificationPermissionSync({
    enabled: onboarded && consentLoaded,
    consentOn: consent.notifications,
    check: getNotificationPermission,
    onRevoked: () => applyConsent('notifications', false),
  });

  // Location follows the switch (T-272 · review B-08): every read goes through this.
  const consentedFix = useCallback(
    () => fixIfConsented(() => consentRef.current.location, getCatchFix)(),
    [],
  );

  // Ask the OS for location; a "no" only the system settings can lift opens them (B-09).
  const allowLocation = async (): Promise<boolean> => {
    const outcome = await requestLocationAccess();
    if (outcome === 'granted') {
      applyConsent('location', true);
      return true;
    }
    if (outcome === 'blocked') void Linking.openSettings().catch(() => undefined);
    return false;
  };

  // From preview mode to a home county (T-272 · review B-09): the permission, one fix, the county
  // locked in, as onboarding does. Says why when it cannot.
  const [homeLookupNote, setHomeLookupNote] = useState<TranslationKey | null>(null);
  const setHomeCounty = async () => {
    if (!(await allowLocation())) {
      setHomeLookupNote('preview.denied');
      return;
    }
    const lookup = await deriveHometown(getLocationFixOnce, HOMETOWN_STORE).catch(
      () => ({ region: null, reason: 'no-fix' }) as const,
    );
    if (lookup.region) {
      setHometown(lookup.region);
      setHomeLookupNote(null);
    } else {
      setHomeLookupNote(lookup.reason === 'outside-sweden' ? 'onboarding.outside.body' : 'preview.noFix');
    }
  };

  const toggleConsent = (kind: ConsentKind, value: boolean) => {
    // Turning location on asks the OS, and finds the home county if there is none yet (T-272).
    if (kind === 'location' && value) {
      void allowLocation().then((granted) => {
        if (granted && hometown === null) void setHomeCounty();
      });
      return;
    }
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

  // Validation-funnel instrumentation (T-035): session start once stored consent is known (T-270),
  // and This Week opened whenever the user is on that tab.
  useSessionStart(track, consent, consentLoaded);

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
    // Held until stored consent has loaded (T-270): before that the gate would drop it.
    if (consentLoaded && onboarded && tab === 'thisWeek' && !showSettings && exportJson === null) {
      track('this_week_opened', {});
    }
  }, [consentLoaded, onboarded, tab, showSettings, exportJson, track]);

  // Load the selected species' Tier-1 content through the repository (T-059). Fires when a card
  // opens or the locale changes; the id-keyed result guards against showing a stale species' card.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    const speciesId = selected.id;
    speciesRepo.getContent(speciesId, locale)
      .then((content) => {
        if (!cancelled) setCardContent({ speciesId, content });
      })
      .catch(() => {
        if (!cancelled) setCardContent({ speciesId, content: null, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [selected, locale, speciesRepo, contentAttempt]);

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
    speciesRepo.getContentInLocale(speciesId, secondaryLocale)
      .then((content) => {
        if (!cancelled) setSecondaryCardContent({ speciesId, locale: secondaryLocale, content });
      })
      .catch(() => {
        // A failed secondary read degrades to the single-language card, never a blank half.
        if (!cancelled)
          setSecondaryCardContent({ speciesId, locale: secondaryLocale, content: null });
      });
    return () => {
      cancelled = true;
    };
  }, [selected, secondaryLocale, speciesRepo]);

  const exportMyData = async () => {
    // The server-side sections (T-219). Without a backend there is nothing held there to export.
    const unavailable: ('purchases' | 'household' | 'server')[] = [];
    let purchases: PurchaseRecord[] = [];
    let household: ExportHousehold | null = null;
    let server: ServerExport | null = null;
    if (hasSupabaseConfig()) {
      const client = getSupabase();
      const source = new SupabaseExportSource(client, ensureAnonymousSession);
      [purchases, household, server] = await Promise.all([
        source.purchases().catch(() => {
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
        source.server().catch(() => {
          unavailable.push('server');
          return null;
        }),
      ]);
    }
    // What the phone keeps besides the collection and consent (T-280 · review B-18).
    const [quizAttempts, recognizedIds, travelLog, onboardingRecord] = await Promise.all([
      QUIZ_ATTEMPTS.load().catch(() => null),
      RECOGNIZED_STORE.load().catch(() => new Set<string>()),
      TRAVEL_STORE.load().catch(() => null),
      ONBOARDING_STORE.load().catch(() => null),
    ]);
    const device = {
      quizAttempts,
      recognized: [...recognizedIds].sort(),
      travel: travelLog,
      languages: {
        app: localeOverride,
        secondLanguage: dualLanguage.secondaryLocale ?? null,
        secondLanguageOn: dualLanguage.enabled,
      },
      agePath: onboardingRecord?.agePath ?? null,
      badges: rememberedBadges,
      // Field notes, as text (T-347); no place is ever attached.
      notes: fieldNotes.notes,
      nameTrainer: nameTrainer.state,
    };
    const bundle = buildDataExport({
      exportedAt: new Date().toISOString(),
      profile: { homeRegion: hometown?.id ?? null },
      consent,
      collection: collection.records,
      purchases,
      household,
      server,
      device,
      unavailable,
    });
    setExportJson(exportToJson(bundle));
  };

  // GDPR erasure (T-093): invoke the server-side delete, then erase the device and return to a
  // fresh first run. Returns whether it succeeded so the confirm screen can show a retryable error.
  // With no server account (no backend configured, or never signed in) there is nothing to erase
  // remotely, and the device is still wiped (T-269 · review B-05).
  const confirmDeleteAccount = async (): Promise<boolean> => {
    if (hasSupabaseConfig()) {
      try {
        const result = await deleteAccount(new SupabaseDeletionGateway(getSupabase()));
        if (!result.ok && result.reason !== 'not-signed-in') return false;
      } catch {
        return false;
      }
    }
    await eraseDevice();
    return true;
  };

  // The onboarding first sighting from the confirmed county (T-275 · review B-16).
  const countyStarterFor = useCallback(
    async (regionId: string) =>
      pickCountyStarter(
        await speciesRepo.regionPresence(regionId),
        monthOf(new Date()),
        (ids) => speciesRepo.describeSpecies(ids, locale),
        (id) => speciesRepo.getContent(id, locale),
      ),
    [speciesRepo, locale],
  );

  // Signed in to an account with a linked email (T-271 · review B-07): the session is now that
  // account's, so the phone drops the collection it had and pulls the account's, and re-reads what
  // the account owns. RevenueCat follows the new id at the next purchase or restore (B-21).
  const onSignedIn = async () => {
    setShowSignIn(false);
    setShowSettings(false);
    await collection.reset();
    collection.resync();
    refreshEntitlements();
    // The previous account's recognitions are not this one's: start from the server's set.
    await RECOGNIZED_STORE.clear();
    setRecognized(new Set());
    setRecognitionRound((n) => n + 1);
  };

  // Everything the phone holds, on disk and in memory (T-269 · review B-05, B-12, B-52): the next
  // person to open the app starts exactly as on a new install.
  const eraseDevice = async () => {
    await collection.reset();
    await resetEntitlements();
    resetAnalyticsIdentity();
    PACK_FILES?.clear(); // the offline pack holds no personal data, but a fresh start is empty
    void COUNTY_CACHE?.clear().catch(() => undefined);
    await eraseDeviceStorage(AsyncStorage);
    setShowDelete(false);
    setShowSettings(false);
    setSelected(null);
    setViewCounty(null);
    setTab('thisWeek');
    setConsentState(DEFAULT_CONSENT);
    setAnalyticsLocked(false);
    setLocaleOverride(null);
    setDualLanguage(DEFAULT_DUAL_LANGUAGE);
    setHometown(null);
    setRecognized(new Set());
    setRememberedBadges({});
    fieldNotes.reset();
    nameTrainer.reset();
    setOnboarded(false);
  };

  const seasonKey = seasonKeyOf(new Date());
  // Spotting and catching need the home county or an opened one (T-105); a preview is look-only.
  const viewingAccess = viewCounty
    ? regionAccess(viewCounty.id, hometown?.id ?? null, entitlements)
    : 'home';
  // Preview mode (no home county, no opened county) is look-only (T-272 · review B-19).
  const canCollect = (hometown !== null || viewCounty !== null) && canCollectIn(viewingAccess);
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
    // The card offers no catch out of season; this also stops a catch-spot route left open.
    if (!seasonOf(species).open) return;
    if (canCatch(freeCatch, seasonKey)) {
      track('catch_attempted', { speciesId: species.id });
      setCatching(species);
    } else {
      track('free_catches_exhausted', {});
      track('paywall_shown', {});
      setPaywall(true);
    }
  };

  // Android's system back (T-232). Screens here are state, not a navigation stack, so without this
  // the back gesture had nothing to pop and left the app from any screen. It closes the topmost
  // open layer, checked in the same order the render below picks the screen, so back always undoes
  // what is on screen, and returns false only on the home tab, where leaving the app is right.
  // Onboarding keeps the default: there is no earlier in-app screen to return to.
  // Kept in a ref (refreshed after every render) so the one listener always sees current state.
  const goBack = (): boolean => {
    if (showSignIn) return closed(() => setShowSignIn(false));
    if (!onboarded) return false;
    if (exportJson !== null) return closed(() => setExportJson(null));
    if (showDelete) return closed(() => setShowDelete(false));
    if (showMoveHome) return closed(() => setShowMoveHome(false));
    if (showCounties) return closed(() => setShowCounties(false));
    if (showStore) return closed(() => setShowStore(false));
    if (showFamily) return closed(() => setShowFamily(false));
    if (showLinkEmail) return closed(() => setShowLinkEmail(false));
    if (showAccessCode) return closed(() => setShowAccessCode(false));
    if (showSighting) return closed(() => setShowSighting(false));
    if (showTrainer) return closed(() => setShowTrainer(false));
    if (showBadges) return closed(() => setShowBadges(false));
    if (showImpact) return closed(() => setShowImpact(false));
    if (showSettings) return closed(() => setShowSettings(false));
    if (caughtTip) return closed(() => setCaughtTip(null));
    if (pledge) return closed(() => setPledge(null));
    if (goCatch && catchRegion !== null && catchSpotSource() !== null && !catching) {
      return closed(() => setGoCatch(null));
    }
    if (catching) return closed(() => setCatching(null));
    if (selected) {
      return closed(() =>
        reportingFor === selected.id ? setReportingFor(null) : paywall ? setPaywall(false) : setSelected(null),
      );
    }
    if (viewCounty) return closed(() => setViewCounty(null));
    if (tab !== 'thisWeek') return closed(() => setTab('thisWeek'));
    return false;
  };
  useEffect(() => {
    goBackRef.current = goBack;
  });

  if (!onboardingLoaded || !localeLoaded) return null;

  // Offline, the lists load but every card is empty (T-252): say so first, before anything else.
  // A Full Game owner with a saved county plays on from it instead (T-257).
  if (connectivity.offline && !connectivity.dismissed && !usablePack) {
    return (
      <OfflineScreen
        locale={locale}
        checking={connectivity.checking}
        onRetry={connectivity.recheck}
        onContinue={connectivity.dismiss}
      />
    );
  }

  // Reachable from the welcome screen too, so it sits before onboarding (T-271).
  if (showSignIn) {
    return (
      <>
        <SignIn
          locale={locale}
          gateway={signInGateway()}
          onSignedIn={() => void onSignedIn()}
          onCancel={() => setShowSignIn(false)}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (!onboarded) {
    return (
      <OnboardingFlow
        locale={locale}
        onSignIn={hasSupabaseConfig() ? () => setShowSignIn(true) : undefined}
        starterFor={hasSupabaseConfig() ? countyStarterFor : undefined}
        motherTongue={
          motherTongue
            ? {
                locale: motherTongue,
                onAccept: () =>
                  updateDualLanguage(setSecondaryLocale(setDualEnabled(dualLanguage, true), motherTongue, locale as ContentLocale)),
              }
            : null
        }
        onFirstSpotted={(speciesId) => {
          collection.spot(speciesId);
          track('species_spotted', { speciesId, source: 'onboarding' });
        }}
        onComplete={({ agePath, notificationOutcome, locationOutcome, hometown: home }) => {
          // A locked hometown from an earlier session stands even if location is denied this time.
          if (home !== null) setHometown(home);
          void ONBOARDING_STORE.save({ agePath });
          setAnalyticsLocked(agePath === 'restricted');
          // "Turn on nudges" + an OS grant is the notification opt-in (T-201).
          if (notificationOutcome === 'granted') applyConsent('notifications', true);
          // Allowing location in onboarding is the location opt-in (T-272 · review B-08).
          if (locationOutcome === 'granted') applyConsent('location', true);
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
            startPurchaseRereads();
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
            startPurchaseRereads();
          }}
          onDone={() => setShowStore(false)}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  const moveGateway = homeMoveGateway();
  if (showMoveHome && hometown && moveGateway) {
    const from = hometown;
    return (
      <>
        <MoveHomeScreen
          locale={locale}
          current={from}
          check={() => checkMove(from, getLocationFixOnce)}
          onConfirm={async (region) => {
            const result = await moveGateway.move(region);
            if (result.ok) {
              // The collection stays; This Week and the Almanac follow the new county.
              await HOMETOWN_STORE.replace(region);
              setHometown(region);
              setViewCounty(null);
            }
            return result;
          }}
          onDone={() => setShowMoveHome(false)}
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
          gateway={familyGateway()}
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
          gateway={authGateway()}
          onDone={() => setShowLinkEmail(false)}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (showSighting) {
    return (
      <>
        <SightingQuizScreen
          locale={locale}
          pool={almanacSpecies}
          records={collection.records}
          month={monthOf(new Date())}
          today={dayKey(new Date())}
          attemptStore={QUIZ_ATTEMPTS}
          soundSource={soundSource() ?? undefined}
          fullGame={freeCatch.fullGame}
          onSpotted={(speciesId) => {
            collection.spot(speciesId);
            track('species_spotted', { speciesId, source: 'quiz' });
          }}
          onRecognized={(speciesId) => {
            setRecognized((current) => {
              const next = new Set(current).add(speciesId);
              void RECOGNIZED_STORE.save(next);
              return next;
            });
            // Offline, the next launch's merge uploads it (T-299).
            void recognitionGateway()
              ?.add([speciesId])
              .catch(() => undefined);
          }}
          onOpenSpecies={(species) => {
            setShowSighting(false);
            setSelected(species);
          }}
          onDone={() => setShowSighting(false)}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (showTrainer) {
    // Oldest sighting first, so the first species the user met are the first names they learn.
    const spottedIds = collection.records
      .filter((r) => r.spottedAt !== null)
      .sort((a, b) => (a.spottedAt as string).localeCompare(b.spottedAt as string))
      .map((r) => r.speciesId);
    const byId = new Map([...KRONOBERG_SPECIES, ...almanacSpecies].map((s) => [s.id, s]));
    return (
      <>
        <NameTrainerScreen
          locale={locale}
          spotted={spottedIds.flatMap((id) => byId.get(id) ?? [])}
          state={nameTrainer.state}
          other={trainerLocale(locale as ContentLocale, secondaryLocale)}
          today={dayKey(new Date())}
          onAnswer={nameTrainer.record}
          onDone={() => setShowTrainer(false)}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (showAccessCode) {
    return (
      <>
        <AccessCodeScreen
          locale={locale}
          gateway={accessCodeGateway()}
          onUnlocked={refreshEntitlements}
          onDone={() => setShowAccessCode(false)}
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
          species={badgeSpecies}
          records={collection.records}
          recognized={recognized}
          remembered={rememberedBadges}
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
          groupOf={(id) => {
            const sp = almanacSpecies.find((s) => s.id === id) ?? KRONOBERG_SPECIES.find((s) => s.id === id);
            return sp ? groupOf(sp) : null;
          }}
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
          easyCatching={easyCatching}
          onToggleEasyCatching={setEasyCatching}
          notifPrefs={notifChoices.prefs}
          onChangeNotifPrefs={notifChoices.change}
          onMoveHome={homeMoveGateway() && hometown ? () => setShowMoveHome(true) : undefined}
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
          onSignIn={hasSupabaseConfig() ? () => setShowSignIn(true) : undefined}
          onSetHomeCounty={hometown === null ? () => void setHomeCounty() : undefined}
          onOpenAccessCode={hasSupabaseConfig() ? () => setShowAccessCode(true) : undefined}
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
          offlineSection={
            PACK_FILES ? (
              <OfflineSection
                locale={locale}
                fullGame={entitlements.fullGame}
                pack={offlinePack.pack}
                sizeBytes={offlinePack.sizeBytes}
                progress={offlinePack.progress}
                failed={offlinePack.failed}
                onDownload={offlinePack.download}
                onRemove={offlinePack.remove}
              />
            ) : undefined
          }
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
        <ProtectTip
          species={caughtTip.species}
          content={loadedContentFor(caughtTip.species)}
          prime={caughtTip.prime}
          locale={locale}
          onDone={() => setCaughtTip(null)}
        />
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
          content={loadedContentFor(pledge.species)}
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
          getFix={consentedFix}
          allowLocation={allowLocation}
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
          species={target}
          locale={locale}
          easy={easyCatching}
          onCancel={() => setCatching(null)}
          onComplete={({ success, score }) => {
            setCatching(null);
            if (success) {
              // The count follows from the collection: recording the catch is what spends one.
              // Prime bonus when caught within the species' active window (GDD §6, T-074).
              const prime = isPrimeCatch(target, new Date());
              collection.markCaught(target.id, prime);
              track('catch_succeeded', {
                speciesId: target.id,
                // Derive the analytics grade from the unified 0–1 score (success ⇒ perfect|good).
                grade: gradeFromScore(true, score) === 'perfect' ? 'perfect' : 'good',
              });
              setCaughtTip({ species: target, prime });
            }
          }}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (selected) {
    const selectedRecord = collection.records.find((r) => r.speciesId === selected.id) ?? null;
    return (
      <View style={styles.root}>
        <SpeciesCard
          species={selected}
          content={cardContent?.speciesId === selected.id ? cardContent.content : null}
          contentState={
            cardContent?.speciesId !== selected.id
              ? 'loading'
              : cardContent.failed
                ? 'error'
                : cardContent.content
                  ? 'ready'
                  : 'missing'
          }
          onRetryContent={() => setContentAttempt((n) => n + 1)}
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
          record={selectedRecord}
          caughtThisSeason={caughtThisSeason(selectedRecord, new Date())}
          fullGame={freeCatch.fullGame}
          soundSource={soundSource() ?? undefined}
          county={cardCounty}
          threat={cardThreat}
          threatSe={cardThreatSe}
          legalStatus={cardLegalStatus}
          month={monthOf(new Date())}
          backAround={cardSeason && !cardSeason.open ? cardSeason.backAround : null}
          onBack={() => setSelected(null)}
          onReportMistake={hasSupabaseConfig() ? () => setReportingFor(selected.id) : undefined}
          findNearbyLabel={previewMode && !viewCounty ? tr('preview.setHomeToPlay') : undefined}
          onFindNearby={
            canCollect
              ? findCatchSpot
              : previewMode && !viewCounty
                ? () => void setHomeCounty()
                : () => {
                  track('store_opened', { source: 'catch_spot' });
                  setShowCounties(true);
                }
          }
          onMarkDone={(species) => collection.markHelpedDone(species.id)}
          notes={notesFor(fieldNotes.notes, selected.id)}
          onAddNote={(date, text) => fieldNotes.add(selected.id, date, text)}
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
        {paywall ? (
          <FreeCatchSheet
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
          />
        ) : null}
        {reportingFor === selected.id ? (
          <ReportMistakeSheet
            speciesName={selected.commonName || selected.scientificName}
            locale={locale}
            onClose={() => setReportingFor(null)}
            onSend={(kind, comment) =>
              sendContentReport(new SupabaseReportGateway(getSupabase()), {
                speciesId: selected.id,
                locale,
                kind,
                comment,
              })
            }
          />
        ) : null}
        {refusedSheet}
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <BannerStack>
        {connectivity.offline && usablePack ? (
          <View style={styles.previewBanner} accessibilityLiveRegion="polite">
            <Text style={styles.previewText}>
              📡 {tr('offline.banner', { date: usablePack.savedAt.slice(0, 10) })}
            </Text>
          </View>
        ) : null}
        {previewMode ? (
          <Pressable
            style={styles.previewBanner}
            onPress={() => void setHomeCounty()}
            accessibilityRole="button"
          >
            <Text style={styles.previewText}>{tr('preview.banner')}</Text>
            <Text style={[styles.previewText, styles.previewAction]}>{tr('preview.setHome')} →</Text>
            {homeLookupNote ? <Text style={styles.previewText}>{tr(homeLookupNote)}</Text> : null}
          </Pressable>
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
      </BannerStack>
      <View style={styles.screen}>
        {tab === 'thisWeek' ? (
          <ThisWeekScreen
            locale={locale}
            live={thisWeekLive.live}
            status={thisWeekLive.status}
            onRetry={thisWeekLive.retry}
            regionId={viewCounty?.id ?? hometown?.id}
            regionName={viewCounty?.name ?? hometown?.name}
            spottedIds={spottedIds(collection.records)}
            onOpenCounties={
              hasSupabaseConfig() && hometown ? () => setShowCounties(true) : undefined
            }
            onOpenSighting={canCollect ? () => setShowSighting(true) : undefined}
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
            error={almanacError}
            onRetry={retryAlmanac}
            records={collection.records}
            locale={locale}
            onSelectSpecies={setSelected}
            onOpenBadges={() => setShowBadges(true)}
            onOpenImpact={() => setShowImpact(true)}
            onOpenSighting={canCollect ? () => setShowSighting(true) : undefined}
            onOpenTrainer={() => setShowTrainer(true)}
          />
        )}
      </View>
      <View style={styles.tabBar}>
        <TabButton
          label={tr('thisWeek.title')}
          active={tab === 'thisWeek'}
          onPress={() => setTab('thisWeek')}
        />
        <TabButton
          label={tr('almanac.title')}
          active={tab === 'almanac'}
          onPress={() => setTab('almanac')}
        />
        <TabButton
          label={`⚙ ${tr('nav.settings')}`}
          active={false}
          onPress={() => setShowSettings(true)}
        />
      </View>
      {refusedSheet}
      <StatusBar style="auto" />
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.tab}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f4f8f2' },
  screen: { flex: 1 },
  // The status-bar gap is the stack's (BannerStack), once for all banners (T-318).
  previewBanner: {
    backgroundColor: '#fbe9c6',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  previewText: { fontSize: 12, color: '#7a5a1f', textAlign: 'center' },
  previewAction: { marginTop: 4, fontWeight: '700', textDecorationLine: 'underline' },
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
  tabText: { fontSize: 14, color: '#566658', fontWeight: '600' },
  tabTextActive: { color: '#2f5d34' },
});
