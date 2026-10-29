// Supabase Edge Function: revenuecat-webhook (T-217).
//
// RevenueCat calls this for every purchase, refund and transfer. I/O only: the tested planner
// (lib/revenuecatEvents.ts, transpiled into ../_shared/lib) decides what changes, and
// `public.set_entitlement` applies it, newest event first. That is the only way an entitlement
// reaches the database.
//
// AUTH: deployed with verify_jwt OFF, because RevenueCat sends no Supabase JWT. Every request must
// carry `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`, the value the Director sets both here
// (Supabase function secrets) and in the RevenueCat dashboard. With no secret configured the
// function refuses everything.
//
// RESPONSES: 200 for anything handled, including events deliberately ignored, so RevenueCat does
// not retry them; 500 when the database fails, so it does retry (applying twice is harmless).
//
// This file targets the Deno Edge runtime — it is excluded from the app's eslint/tsconfig.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { planEntitlementChanges, secretMatches } from '../_shared/lib/revenuecatEvents.js';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function serviceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
  const first = Object.values(keys)[0];
  if (!first) throw new Error('no service key in the function environment');
  return first;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  if (!secretMatches(req.headers.get('authorization'), Deno.env.get('REVENUECAT_WEBHOOK_SECRET'))) {
    return json({ error: 'forbidden' }, 403);
  }

  const body = await req.json().catch(() => null);
  const plan = planEntitlementChanges(body);
  if (plan.kind === 'ignore') return json({ ignored: plan.reason });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey());
  const outcomes: string[] = [];
  for (const c of plan.changes) {
    const { data, error } = await db.rpc('set_entitlement', {
      p_user: c.userId,
      p_entitlement: c.entitlement,
      p_active: c.active,
      p_at: new Date(c.atMs).toISOString(),
      p_product: c.productId,
      p_event: c.eventId,
    });
    if (error) return json({ error: `set_entitlement failed: ${error.message}` }, 500);
    outcomes.push(`${c.entitlement}:${c.active ? 'on' : 'off'}:${data}`);
  }
  return json({ applied: outcomes });
});
