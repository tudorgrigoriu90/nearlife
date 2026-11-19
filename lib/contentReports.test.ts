import type { SupabaseClient } from '@supabase/supabase-js';
import {
  MAX_REPORT_COMMENT,
  REPORT_KINDS,
  sendContentReport,
  SupabaseReportGateway,
  type ContentReport,
  type ReportGateway,
} from './contentReports';

// T-293 · review I-32: "Report a mistake" on every card.

function gateway(fail?: Error): ReportGateway & { sent: ContentReport[] } {
  const sent: ContentReport[] = [];
  return {
    sent,
    async insert(report) {
      if (fail) throw fail;
      sent.push(report);
    },
  };
}

const BASE = { speciesId: 'gbif:1', locale: 'sv', kind: 'photo' as const };

describe('sendContentReport', () => {
  it('sends the report with a trimmed comment', async () => {
    const gw = gateway();
    expect(await sendContentReport(gw, { ...BASE, comment: '  That is a hare.  ' })).toBe('sent');
    expect(gw.sent).toEqual([{ ...BASE, comment: 'That is a hare.' }]);
  });

  it('a blank comment is sent as none', async () => {
    const gw = gateway();
    await sendContentReport(gw, { ...BASE, comment: '   ' });
    expect(gw.sent[0].comment).toBeNull();
  });

  it('cuts a comment to the server limit instead of failing', async () => {
    const gw = gateway();
    await sendContentReport(gw, { ...BASE, comment: 'x'.repeat(MAX_REPORT_COMMENT + 20) });
    expect(gw.sent[0].comment).toHaveLength(MAX_REPORT_COMMENT);
  });

  it('says so when the daily limit is reached', async () => {
    const gw = gateway(new Error('content report failed: too_many_reports'));
    expect(await sendContentReport(gw, BASE)).toBe('too-many');
  });

  it('any other failure is a failure', async () => {
    expect(await sendContentReport(gateway(new Error('offline')), BASE)).toBe('failed');
  });

  it('offers exactly the kinds the server accepts', () => {
    expect(REPORT_KINDS).toEqual(['name', 'photo', 'text', 'season', 'other']);
  });
});

describe('SupabaseReportGateway', () => {
  function client(error: { message: string } | null) {
    const insert = jest.fn(async () => ({ error }));
    return { insert, client: { from: jest.fn(() => ({ insert })) } as unknown as SupabaseClient };
  }

  it('inserts the report fields only; the account comes from the session', async () => {
    const c = client(null);
    await new SupabaseReportGateway(c.client).insert({ ...BASE, comment: 'x' });
    expect(c.client.from).toHaveBeenCalledWith('content_reports');
    expect(c.insert).toHaveBeenCalledWith({ species_id: 'gbif:1', locale: 'sv', kind: 'photo', comment: 'x' });
  });

  it('a refused insert is an error carrying the reason', async () => {
    const c = client({ message: 'too_many_reports' });
    await expect(new SupabaseReportGateway(c.client).insert({ ...BASE, comment: null })).rejects.toThrow(
      'too_many_reports',
    );
  });
});
