import { CrashReporter, SENTRY_OPTIONS_BASE, type SentryModule } from './crashReporting';

// T-100 (Director, 2026-10-31): crash reports only with analytics consent, never identity.

function fakeSentry() {
  const calls: string[] = [];
  let options: Record<string, unknown> | null = null;
  const sentry: SentryModule = {
    init: (o) => {
      calls.push('init');
      options = o as unknown as Record<string, unknown>;
    },
    close: async () => {
      calls.push('close');
    },
  };
  return { sentry, calls, options: () => options };
}

describe('CrashReporter', () => {
  it('starts only once analytics consent is given', () => {
    const f = fakeSentry();
    const r = new CrashReporter(f.sentry, 'https://key@o1.ingest.sentry.io/1');
    r.setConsent(false);
    expect(f.calls).toEqual([]);
    r.setConsent(true);
    r.setConsent(true);
    expect(f.calls).toEqual(['init']);
  });

  it('stops when consent is withdrawn, and can start again', () => {
    const f = fakeSentry();
    const r = new CrashReporter(f.sentry, 'https://key@o1.ingest.sentry.io/1');
    r.setConsent(true);
    r.setConsent(false);
    r.setConsent(true);
    expect(f.calls).toEqual(['init', 'close', 'init']);
  });

  it('does nothing without a key or without the native module', () => {
    const f = fakeSentry();
    new CrashReporter(f.sentry, '').setConsent(true);
    new CrashReporter(null, 'https://key@o1.ingest.sentry.io/1').setConsent(true);
    expect(f.calls).toEqual([]);
  });

  it('never sends identity: no default PII, no screenshots, user stripped from events', () => {
    const f = fakeSentry();
    new CrashReporter(f.sentry, 'https://key@o1.ingest.sentry.io/1').setConsent(true);
    const o = f.options() as unknown as typeof SENTRY_OPTIONS_BASE & { dsn: string };
    expect(o.dsn).toBe('https://key@o1.ingest.sentry.io/1');
    expect(o.sendDefaultPii).toBe(false);
    expect(o.attachScreenshot).toBe(false);
    const event = o.beforeSend({ message: 'x', user: { id: 'u1', ip_address: '1.2.3.4' } });
    expect(event).toEqual({ message: 'x' });
  });

  it('drops network and console breadcrumbs, which can carry ids and data', () => {
    const f = fakeSentry();
    new CrashReporter(f.sentry, 'https://key@o1.ingest.sentry.io/1').setConsent(true);
    const o = f.options() as unknown as typeof SENTRY_OPTIONS_BASE;
    for (const category of ['fetch', 'xhr', 'console']) {
      expect(o.beforeBreadcrumb({ category, message: 'GET /rest/v1/collection?user_id=eq.abc' })).toBeNull();
    }
    expect(o.beforeBreadcrumb({ category: 'ui.click', message: 'Catch' })).toEqual({ category: 'ui.click', message: 'Catch' });
  });
});
