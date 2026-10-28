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
  planSends,
  pushCopy,
  pushLocale,
} from '../_shared/lib/pushDispatch.js';
import {
  GOOGLE_TOKEN_URL,
  fcmSendUrl,
  parseServiceAccount,
  signJwt,
  tokenRequestBody,
} from '../_shared/lib/fcmAuth.js';
import { KRONOBERG_MEDIA, primaryPhoto } from '../_shared/lib/species/media.js';

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

async function readIn(db: SupabaseClient, table: string, columns: string, column: string, ids: string[], extra?: (q: any) => any) {
  const rows: Row[] = [];
  for (let i = 0; i < ids.length; i += IN_CHUNK) {
    const chunk = ids.slice(i, i + IN_CHUNK);
    rows.push(
      ...(await readAll((from, to) => {
        let q = db.from(table).select(columns).in(column, chunk);
        if (extra) q = extra(q);
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
    // 1) Devices → the users worth looking at. No device means no consent, so nothing else loads.
    const deviceRows = await readAll((from, to) => {
      let q = db.from('push_devices').select('user_id, token, platform, locale, updated_at');
      if (opts.testUserId) q = q.eq('user_id', opts.testUserId);
      return q.range(from, to);
    });
    const userIds = [...new Set(deviceRows.map((r) => r.user_id as string))];
    if (userIds.length === 0) return json({ users: 0, sent: 0, skipped: {} });

    const profiles = await readIn(db, 'profiles', 'user_id, home_region', 'user_id', userIds);
    const collected = await readIn(db, 'collection', 'user_id, species_id', 'user_id', userIds);
    // Two days covers both cadence caps (≥20 h interval, one per local day).
    const since = new Date(nowMs - 48 * 3_600_000).toISOString();
    const log = opts.testUserId
      ? []
      : await readIn(db, 'notification_log', 'user_id, sent_at', 'user_id', userIds, (q) => q.gte('sent_at', since));

    const regionOf = new Map(profiles.map((p) => [p.user_id as string, (p.home_region as string | null) ?? null]));
    const users = userIds.map((userId) => ({
      userId,
      homeRegion: regionOf.get(userId) ?? null,
      devices: deviceRows
        .filter((r) => r.user_id === userId)
        .map((r) => ({
          token: r.token as string,
          platform: r.platform as string,
          locale: (r.locale as string | null) ?? null,
          updatedAtMs: Date.parse(r.updated_at as string),
        })),
      collectedIds: collected.filter((r) => r.user_id === userId).map((r) => r.species_id as string),
      sentAtMs: log.filter((r) => r.user_id === userId).map((r) => Date.parse(r.sent_at as string)),
    }));

    // 2) Presence, once per region in play.
    const presenceByRegion = new Map();
    for (const region of new Set(users.map((u) => u.homeRegion).filter((r): r is string => r !== null))) {
      const rows = await readAll((from, to) =>
        db.from('species_presence').select('species_id, active_months, occurrences').eq('region_id', region).range(from, to),
      );
      presenceByRegion.set(
        region,
        rows.map((r) => ({
          speciesId: r.species_id as string,
          activeMonths: r.active_months as number[],
          occurrences: r.occurrences as number,
        })),
      );
    }

    const plan = planSends(users, presenceByRegion, nowMs, opts.testUserId ? { ignoreSlot: true } : {});
    if (opts.dryRun || plan.sends.length === 0) {
      return json({ users: users.length, planned: plan.sends.length, sent: 0, skipped: plan.skipped, dryRun: !!opts.dryRun });
    }

    // 3) Names for the chosen species, in each device's language.
    const speciesIds = [...new Set(plan.sends.map((s) => s.speciesId))];
    const species = await readIn(db, 'species', 'id, common_name, scientific_name', 'id', speciesIds);
    const localized = await readIn(db, 'species_content', 'species_id, locale, common_name', 'species_id', speciesIds);
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
      let delivered = false;
      const imageUrl = primaryPhoto(KRONOBERG_MEDIA, send.speciesId)?.url ?? null;
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
      if (delivered) {
        sent += 1;
        // The smoke test is not a real send — logging it would eat the user's daily notification.
        if (!opts.testUserId) {
          await db.from('notification_log').insert({ user_id: send.userId, species_id: send.speciesId });
        }
      }
    }

    return json({ users: users.length, planned: plan.sends.length, sent, failed, deadTokens, skipped: plan.skipped, errors });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
