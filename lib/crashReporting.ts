// Crash reporting (T-100 · Director, 2026-10-31: Sentry, only with consent).
//
// Sentry starts only when this build has its key (EXPO_PUBLIC_SENTRY_DSN), carries the native
// module, and the user has granted analytics consent. It stops again when consent is withdrawn.
// That is the same gate as product analytics (invariant #6), and the privacy policy lists Sentry
// as a processor on those terms.
//
// Reports carry what is needed to fix a crash (stack, app version, phone model) and nothing that
// identifies the person: no default PII (IP address), no screenshots, the user stripped from every
// event, and no network or console breadcrumbs, whose URLs and logs can hold account ids or data.
// The native module is loaded lazily, like RevenueCat (lib/purchases.ts), so older builds and Jest
// keep working without it.

type Event = Record<string, unknown>;
type Breadcrumb = { category?: string } & Record<string, unknown>;

const DROPPED_BREADCRUMBS = new Set(['fetch', 'xhr', 'console']);

export const SENTRY_OPTIONS_BASE = {
  sendDefaultPii: false,
  attachScreenshot: false,
  attachViewHierarchy: false,
  beforeSend(event: Event): Event {
    const rest = { ...event };
    delete rest.user;
    return rest;
  },
  beforeBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
    return crumb.category && DROPPED_BREADCRUMBS.has(crumb.category) ? null : crumb;
  },
};

export interface SentryModule {
  init(options: typeof SENTRY_OPTIONS_BASE & { dsn: string }): void;
  close(): Promise<unknown>;
}

/** The real SDK, or null when this build has no native module for it. */
export function loadSentry(): SentryModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NativeModules, TurboModuleRegistry } = require('react-native') as {
      NativeModules: Record<string, unknown>;
      TurboModuleRegistry: { get(name: string): unknown };
    };
    if (!TurboModuleRegistry.get('RNSentry') && !NativeModules.RNSentry) return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@sentry/react-native') as SentryModule;
  } catch {
    return null;
  }
}

export class CrashReporter {
  private started = false;

  constructor(
    private readonly sentry: SentryModule | null,
    private readonly dsn: string,
  ) {}

  setConsent(analytics: boolean): void {
    if (!this.sentry || !this.dsn) return;
    if (analytics && !this.started) {
      this.sentry.init({ ...SENTRY_OPTIONS_BASE, dsn: this.dsn });
      this.started = true;
    } else if (!analytics && this.started) {
      void this.sentry.close().catch(() => undefined);
      this.started = false;
    }
  }
}
