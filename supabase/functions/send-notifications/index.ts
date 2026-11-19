// Supabase Edge Function: send-notifications (T-201).
//
// Called hourly by pg_cron (migration 20261028000001). I/O only: it loads the rows, asks the
// tested planner (lib/pushDispatch.ts, transpiled into ../_shared/lib) who gets what, posts each
// message to FCM HTTP v1, logs successful sends and deletes tokens FCM reports as dead.
//
// AUTH: deployed with verify_jwt OFF — pg_cron has no user JWT. Every request must instead carry
// `x-cron-secret`, checked against the Vault secret through `push_cron_secret_matches`, so the
// function is not an open "notify everyone" endpoint.
//
// SECRETS: FCM_SERVICE_ACCOUNT (the Firebase service-account JSON, set by the Director).
// SUPABASE_URL + a service key are injected by the platform.
//
// BODY (all optional):
//   {}                                  scheduled run
//   { "dryRun": true }                  plan and report, send nothing
//   { "testUserId": "<uuid>" }          smoke test: that user only, ignoring slot and daily cap
//
// This file targets the Deno Edge runtime — it is excluded from the app's eslint/tsconfig.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import {
  buildFcmMessage,
  isDeadTokenResponse,
  localClock,
  planSends,
  pushCopy,
  pushLocale,
  sendLogged,
} from '../_shared/lib/pushDispatch.js';
import { groupOfRow, parseNotifPrefs } from '../_shared/lib/notifPrefs.js';
import {
  GOOGLE_TOKEN_URL,
  fcmSendUrl,
  parseServiceAccount,
  signJwt,
  tokenRequestBody,
} from '../_shared/lib/fcmAuth.js';
import { KRONOBERG_MEDIA, primaryPhoto } from '../_shared/lib/species/media.js';
import { allowedHours } from '../_shared/lib/sendSlot.js';
import { DEFAULT_CADENCE } from '../_shared/lib/cadence.js';

const PAGE = 1000; // PostgREST's default max rows per request
const IN_CHUNK = 200; // ids per `in.(...)` filter, to keep URLs short

type Row = Record<string, unknown>;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function serviceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  // Projects on the new API keys expose them as a JSON map instead.
  const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
  const first = Object.values(keys)[0];
  if (!first) throw new Error('no service key in the function environment');
  return first;
}

/** Read every row of a query, page by page. */
async function readAll(build: (from: number, to: number) => PromiseLike<{ data: Row[] | null; error: unknown }>) {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(JSON.stringify(error));
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

// Every paged read is ordered on a unique key (T-282 · review B-23): without a total order,
// PostgREST may repeat or skip rows across pages, so a device could be skipped or a collected
// species missed by the dedupe. `order` names the key columns.
async function readIn(
  db: SupabaseClient,
  table: string,
  columns: string,
  column: string,
  ids: string[],
  order: string[],
  extra?: (q: any) => any,
) {
  const rows: Row[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const chunk = ids.slice(i, i + IN_CHUNK);
    rows.push(
      ...(await readAll((from, to) => {
        let q = db.from(table).select(columns).in(column, chunk);
        if (extra) q = extra(q);
        for (const key of order) q = q.order(key);
        return q.range(from, to);
      })),
    );
  }
  return rows;
}

async function fcmAccessToken(account: ReturnType<typeof parseServiceAccount>): Promise<string> {
  const assertion = await signJwt(account, Math.floor(Date.now() / 1000), crypto.subtle);
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenRequestBody(assertion),
  });
  const body = await res.json();
  if (!res.ok || typeof body.access_token !== 'string') {
    throw new Error(`Google token exchange failed (${res.status}): ${JSON.stringify(body)}`);
  }
  return body.access_token;
}

Deno.serve(async (req: Request) => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey());

  const secret = req.headers.get('x-cron-secret') ?? '';
  const { data: authorised, error: authErr } = await db.rpc('push_cron_secret_matches', { candidate: secret });
  if (authErr) return json({ error: `secret check failed: ${authErr.message}` }, 500);
  if (authorised !== true) return json({ error: 'forbidden' }, 403);

  const opts = (await req.json().catch(() => ({}))) as { dryRun?: boolean; testUserId?: string };
  const nowMs = Date.now();

  try {
    // 1) Only the users due this run (T-316 · review B-51): the database picks them, by the same
    // slot and caps as lib/cadence.ts and lib/sendSlot.ts and each user's window and frequency
    // (T-341), and returns each with their devices, collected species, last seven days of sends
    // and their choices. Work grows with the users due, not with
    // everyone opted in. The smoke test asks for its one user, ignoring slot and caps.
    const dueRows = await readAll((from, to) =>
      db
        .rpc('push_due_users', {
          at: new Date(nowMs).toISOString(),
          allowed_hours: allowedHours(DEFAULT_CADENCE),
          min_interval_hours: DEFAULT_CADENCE.minIntervalHours,
          only_user: opts.testUserId ?? null,
          ignore_slot: !!opts.testUserId,
        })
        .order('user_id')
        .range(from, to),
    );
    if (dueRows.length === 0) return json({ users: 0, sent: 0, skipped: {} });

    const users = dueRows.map((r) => ({
      userId: r.user_id as string,
      homeRegion: (r.home_region as string | null) ?? null,
      devices: ((r.devices as Row[] | null) ?? []).map((d) => ({
        token: d.token as string,
        platform: d.platform as string,
        locale: (d.locale as string | null) ?? null,
        updatedAtMs: Date.parse(d.updated_at as string),
      })),
      collectedIds: (r.collected as string[] | null) ?? [],
      sentAtMs: ((r.sent_at as string[] | null) ?? []).map((t) => Date.parse(t)),
      // Frequency, window and groups (T-341); the database already applied window and frequency.
      prefs: parseNotifPrefs(r.prefs),
    }));

    // 2) Presence, once per region in play.
    const presenceByRegion = new Map();
    for (const region of new Set(users.map((u) => u.homeRegion).filter((r): r is string => r !== null))) {
      const rows = await readAll((from, to) =>
        // Service role bypasses RLS, so the catalogue rule (T-225) is applied here explicitly:
        // a species the noise filter rejects is never sent as "active in your region".
        db
          .from('species_presence')
          .select('species_id, active_months, occurrences, month_counts, species!inner(in_catalogue, category, taxon_group)')
          .eq('region_id', region)
          .eq('species.in_catalogue', true)
          .order('species_id')
          .range(from, to),
      );
      presenceByRegion.set(
        region,
        rows.map((r) => ({
          speciesId: r.species_id as string,
          activeMonths: r.active_months as number[],
          occurrences: r.occurrences as number,
          monthCounts: (r.month_counts as number[] | null) ?? null,
          // For the user's chosen groups (T-341).
          group: groupOfRow(
            ((r.species as Row | null)?.category as string | null) ?? null,
            ((r.species as Row | null)?.taxon_group as string | null) ?? null,
          ),
        })),
      );
    }

    // Presentable species (T-306 · review B-55): a name in the language the notification is written
    // in, and a photo. Read only for species in season this month and the languages in use, so the
    // hourly run does not read every name of every species.
    const month = localClock(nowMs).month;
    const inSeason = [
      ...new Set(
        [...presenceByRegion.values()]
          .flat()
          .filter((p: { activeMonths: number[] }) => p.activeMonths.includes(month))
          .map((p: { speciesId: string }) => p.speciesId),
      ),
    ];
    const localesInPlay = [...new Set(users.flatMap((u) => u.devices.map((d) => pushLocale(d.locale))))];
    const photographed = new Set(
      (
        await readIn(db, 'species_media', 'species_id', 'species_id', inSeason, ['species_id'], (q) =>
          q.not('url', 'is', null),
        )
      ).map((r) => r.species_id as string),
    );
    const named = new Set(
      (
        await readIn(db, 'species_content', 'species_id, locale', 'species_id', inSeason, ['species_id', 'locale'], (q) =>
          q.in('locale', localesInPlay).not('common_name', 'is', null),
        )
      ).map((r) => `${r.species_id}|${r.locale}`),
    );
    const presentable = (speciesId: string, locale: string) =>
      named.has(`${speciesId}|${locale}`) &&
      (photographed.has(speciesId) || primaryPhoto(KRONOBERG_MEDIA, speciesId) !== null);

    const plan = planSends(users, presenceByRegion, nowMs, {
      ...(opts.testUserId ? { ignoreSlot: true } : {}),
      presentable,
    });
    if (opts.dryRun || plan.sends.length === 0) {
      return json({ users: users.length, planned: plan.sends.length, sent: 0, skipped: plan.skipped, dryRun: !!opts.dryRun });
    }

    // 3) Names for the chosen species, in each device's language.
    const speciesIds = [...new Set(plan.sends.map((s) => s.speciesId))];
    const species = await readIn(db, 'species', 'id, common_name, scientific_name', 'id', speciesIds, ['id']);
    const localized = await readIn(db, 'species_content', 'species_id, locale, common_name', 'species_id', speciesIds, [
      'species_id',
      'locale',
    ]);
    // Catalogue photos (T-215): the bundled 54 keep their hand-checked photo; everyone else gets
    // the one species_media holds, if any. A missing photo just sends a text notification.
    const media = await readIn(db, 'species_media', 'species_id, url', 'species_id', speciesIds, ['species_id'], (q) =>
      q.not('url', 'is', null),
    );
    const photoUrlFor = (speciesId: string) =>
      primaryPhoto(KRONOBERG_MEDIA, speciesId)?.url ??
      ((media.find((m) => m.species_id === speciesId)?.url as string | undefined) ?? null);
    const nameFor = (speciesId: string, locale: string) => {
      const own = localized.find((r) => r.species_id === speciesId && r.locale === locale)?.common_name;
      const english = localized.find((r) => r.species_id === speciesId && r.locale === 'en')?.common_name;
      const base = species.find((r) => r.id === speciesId);
      return (own ?? english ?? base?.common_name ?? base?.scientific_name ?? speciesId) as string;
    };

    // 4) Send.
    const account = parseServiceAccount(Deno.env.get('FCM_SERVICE_ACCOUNT'));
    const accessToken = await fcmAccessToken(account);
    let sent = 0;
    let failed = 0;
    let deadTokens = 0;
    const errors: string[] = [];
    for (const send of plan.sends) {
      const imageUrl = photoUrlFor(send.speciesId);
      const deliverAll = async (): Promise<boolean> => {
      let delivered = false;
      for (const device of send.devices) {
        const locale = pushLocale(device.locale);
        const res = await fetch(fcmSendUrl(account.project_id), {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(
            buildFcmMessage({
              token: device.token,
              copy: pushCopy(locale, nameFor(send.speciesId, locale)),
              speciesId: send.speciesId,
              imageUrl,
            }),
          ),
        });
        if (res.ok) {
          delivered = true;
          continue;
        }
        const body = await res.text();
        if (isDeadTokenResponse(res.status, body)) {
          deadTokens += 1;
          await db.from('push_devices').delete().eq('user_id', send.userId).eq('token', device.token);
        } else {
          failed += 1;
          if (errors.length < 5) errors.push(`${res.status}: ${body.slice(0, 300)}`);
        }
      }
      return delivered;
      };
      // The smoke test is not a real send — logging it would eat the user's daily notification.
      if (opts.testUserId) {
        if (await deliverAll()) sent += 1;
        continue;
      }
      // The log row first (T-282 · review B-22): a failed insert stops the run (500) before any
      // send, so the cadence caps can never miss a delivered notification.
      const outcome = await sendLogged({
        reserve: async () => {
          const { data, error } = await db
            .from('notification_log')
            .insert({ user_id: send.userId, species_id: send.speciesId })
            .select('id')
            .single();
          if (error || !data) throw new Error(`notification_log insert failed: ${error?.message ?? 'no row'}`);
          return data.id as number;
        },
        release: async (id) => {
          await db.from('notification_log').delete().eq('id', id);
        },
        deliver: deliverAll,
      });
      if (outcome === 'sent') sent += 1;
    }

    return json({ users: users.length, planned: plan.sends.length, sent, failed, deadTokens, skipped: plan.skipped, errors });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
