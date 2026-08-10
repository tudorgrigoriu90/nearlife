// Supabase Edge Function: delete-account (T-093 · GDPR right to erasure).
//
// STATUS: reference implementation — NOT yet deployed. The client half (Settings → confirm →
// invoke) is built and tested (lib/accountDeletion.ts, components/DeleteAccountConfirm.tsx). Until
// this is deployed, `functions.invoke('delete-account')` returns an error and the app shows the
// retryable "not deleted" message — by design.
//
// WHAT IT DOES: deletes the *calling* user from Supabase Auth using the service-role admin API. The
// `collection` and `profiles` tables FK to `auth.users` with ON DELETE CASCADE (migrations
// …000001), so deleting the auth user erases all their rows in one step. The caller can only delete
// THEMSELVES: the user id comes from their own verified JWT, never from the request body.
//
// DEPLOY (Director):
//   supabase functions deploy delete-account
//   # SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by the platform for deployed functions.
//   # Keep this function's "verify_jwt" ON (default) so only authenticated users can call it.
//
// This file targets the Deno Edge runtime, not the app bundle — it is excluded from the app's
// eslint/tsconfig (separate runtime + globals). Do not import it from client code.

import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'missing authorization' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // 1) Resolve the caller from THEIR token (never trust an id from the request body).
  const asUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await asUser.auth.getUser();
  if (userErr || !user) {
    return new Response(JSON.stringify({ error: 'not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2) Delete that user with the service-role admin API. The ON DELETE CASCADE wipes their
  //    collection + profile rows. Deletion is irreversible.
  const admin = createClient(supabaseUrl, serviceKey);
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    return new Response(JSON.stringify({ error: delErr.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
