import {
  CrashReporter,
  reportCaughtError,
  SENTRY_OPTIONS_BASE,
  setActiveCrashReporter,
  type SentryModule,
} from './crashReporting';

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

// T-323 · review I-02: render errors caught by the boundary are reported, with consent only.
describe('reporting a caught error', () => {
  function sentry() {
    return { init: jest.fn(), close: jest.fn(async () => undefined), captureException: jest.fn() };
  }

  it('is sent only while analytics consent has started reporting', () => {
    const s = sentry();
    const reporter = new CrashReporter(s, 'dsn');
    reporter.capture(new Error('before'));
    expect(s.captureException).not.toHaveBeenCalled();
    reporter.setConsent(true);
    reporter.capture(new Error('during'));
    expect(s.captureException).toHaveBeenCalledTimes(1);
    reporter.setConsent(false);
    reporter.capture(new Error('after'));
    expect(s.captureException).toHaveBeenCalledTimes(1);
  });

  it('the boundary reaches the app’s reporter, or nothing before it exists', () => {
    expect(() => reportCaughtError(new Error('early'))).not.toThrow();
    const s = sentry();
    const reporter = new CrashReporter(s, 'dsn');
    reporter.setConsent(true);
    setActiveCrashReporter(reporter);
    reportCaughtError(new Error('late'));
    expect(s.captureException).toHaveBeenCalledTimes(1);
    setActiveCrashReporter(null);
  });
});
