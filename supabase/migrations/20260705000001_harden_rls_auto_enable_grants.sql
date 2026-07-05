-- 0003 — harden rls_auto_enable() grants (security advisor, T-018).
--
-- public.rls_auto_enable() is a pre-existing SECURITY DEFINER event-trigger function that
-- auto-enables RLS on new public tables (protective). The security advisor flagged that EXECUTE
-- was granted to anon/authenticated, exposing it via /rest/v1/rpc. It can't actually be abused
-- (pg_event_trigger_ddl_commands() errors outside an event-trigger context), but least-privilege
-- says revoke it. Event triggers fire as the function owner regardless of these grants, so the
-- auto-RLS behaviour is unaffected.

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
