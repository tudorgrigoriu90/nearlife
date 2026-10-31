// Supabase Edge Function: delete-account (T-093 · GDPR right to erasure · invariant #6).
//
// Deletes the *calling* user. The id comes from their own verified JWT, never from the request
// body, so nobody can delete anyone else. Deployed by .github/workflows/deploy-functions.yml with
// JWT verification ON: the gateway rejects requests without a valid session before this runs.
//
// Everything the user owns references auth.users with ON DELETE CASCADE, so deleting the auth user
// erases it in one step: collection, profile, push devices, notification log, purchase records,
// and a household they own (members then lose the shared Full Game) or their membership of one.
// The store purchase itself stays with Google Play and RevenueCat and can be restored into a new
// account (privacy policy, "How long we keep it").
//
// Targets the Deno Edge runtime, not the app bundle; excluded from the app's eslint/tsconfig.

import { createClient } from 'jsr:@supabase/supabase-js@2';

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function serviceKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  // Projects on the new API keys expose them as a JSON map instead (same as send-notifications).
  const keys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>;
  const first = Object.values(keys)[0];
  if (!first) throw new Error('no service key in the function environment');
  return first;
}

Deno.serve(async (req: Request) => {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'missing authorization' }, 401);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey());

  // 1) Who is asking: resolved from THEIR token by the Auth server, never from the body.
  const { data, error: userErr } = await admin.auth.getUser(token);
  const user = data?.user;
  if (userErr || !user) return json({ error: 'not authenticated' }, 401);

  // 2) Delete exactly that user. Irreversible; the cascades erase their rows.
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return json({ error: delErr.message }, 500);

  return json({ ok: true }, 200);
});
