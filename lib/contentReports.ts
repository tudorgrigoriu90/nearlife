import type { SupabaseClient } from '@supabase/supabase-js';

// "Report a mistake" (T-293 · review I-32). 10,000 species ship in 38 languages without
// per-species review, so a user who sees a wrong name, photo, text or season can say so. Rows go to
// public.content_reports, which users may insert into but never read; the weekly content-reports
// workflow lists them. The server caps an account at 20 reports a day.

export const REPORT_KINDS = ['name', 'photo', 'text', 'season', 'other'] as const;
export type ReportKind = (typeof REPORT_KINDS)[number];

/** The server's check on the comment's length. */
export const MAX_REPORT_COMMENT = 500;

export interface ContentReport {
  speciesId: string;
  /** The language the user was reading. */
  locale: string;
  kind: ReportKind;
  comment: string | null;
}

export interface ReportGateway {
  insert(report: ContentReport): Promise<void>;
}

export type ReportOutcome = 'sent' | 'too-many' | 'failed';

export async function sendContentReport(
  gateway: ReportGateway,
  input: Omit<ContentReport, 'comment'> & { comment?: string | null },
): Promise<ReportOutcome> {
  const comment = (input.comment ?? '').trim().slice(0, MAX_REPORT_COMMENT) || null;
  try {
    await gateway.insert({ speciesId: input.speciesId, locale: input.locale, kind: input.kind, comment });
    return 'sent';
  } catch (e) {
    return e instanceof Error && e.message.includes('too_many_reports') ? 'too-many' : 'failed';
  }
}

export class SupabaseReportGateway implements ReportGateway {
  constructor(private readonly client: SupabaseClient) {}

  async insert(report: ContentReport): Promise<void> {
    // No user id: the column defaults to auth.uid() and users may not set it.
    const { error } = await this.client.from('content_reports').insert({
      species_id: report.speciesId,
      locale: report.locale,
      kind: report.kind,
      comment: report.comment,
    });
    if (error) throw new Error(`content report failed: ${error.message}`);
  }
}
