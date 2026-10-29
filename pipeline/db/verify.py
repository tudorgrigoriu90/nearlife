"""Live checks of database rules that only the database can prove (T-200).

Unit tests cover the app's half of a rule; a trigger or a column grant can only be shown to work by
running it against Postgres. These checks do that against the real project, as a real
`authenticated` user, inside ONE transaction that is always rolled back — so they write nothing,
whatever happens, and can be re-run after any migration:

    SUPABASE_DB_URL=... python -m db.verify          (CI: db-migrate.yml, mode=verify)

Each step runs in its own savepoint so a refused statement (the point of half the checks) does not
abort the rest. The outcome is compared with EXPECTED; any mismatch exits non-zero.
"""

import json
import os
import sys

# step -> expected outcome: "ok", or a substring of the error the database must raise.
EXPECTED: dict[str, str] = {
    "catch 1": "ok",
    "catch 2": "ok",
    "catch 3": "ok",
    "catch 4 (over the free allowance)": "free_catch_limit",
    "pledge help on a caught species": "ok",
    "user grants themselves the Full Game": "permission denied",
    "user resets their own catch counter": "permission denied",
    "app-style home_region upsert": "ok",
    "season_key 2026-12-15 (December → next year's winter)": "2027-winter",
    "season_key 2026-11-30 23:30Z (already 1 Dec in Sweden)": "2027-winter",
    "season_key 2026-02-28": "2026-winter",
    "season_key 2026-07-01": "2026-summer",
    # T-094 retention job. Throwaway accounts, all inactive by sign-in date for 200 days.
    "setup: session refreshed today": "ok",
    "setup: collection write today": "ok",
    "setup: notification log": "ok",
    "retention job runs": "ok",
    "anonymous, no activity for 200 days": "deleted",
    "anonymous, old sign-in but a session refreshed today": "kept",
    "anonymous, old sign-in but a collection write today": "kept",
    "email-linked, no activity for 200 days": "kept",
    "notification sent 40 days ago": "deleted",
    "notification sent yesterday": "kept",
}

# Outcomes compared exactly, not as substrings of an error.
EXACT = {"ok", "kept", "deleted"}


def evaluate(results: dict[str, str]) -> list[str]:
    """Human-readable failures; empty means every rule held."""
    failures = []
    for step, expected in EXPECTED.items():
        got = results.get(step)
        if got is None:
            failures.append(f"{step}: did not run")
        elif expected in EXACT or "-" in expected:
            if got != expected:
                failures.append(f"{step}: expected {expected!r}, got {got!r}")
        elif expected not in got:
            failures.append(f"{step}: expected an error containing {expected!r}, got {got!r}")
    return failures


def _step(cur, results: dict[str, str], name: str, sql: str, params=()) -> None:
    cur.execute("savepoint step")
    try:
        cur.execute(sql, params)
        row = cur.fetchone() if cur.description else None
        results[name] = str(row[0]) if row else "ok"
        cur.execute("release savepoint step")
    except Exception as exc:  # the refusals are the point of several checks
        cur.execute("rollback to savepoint step")
        results[name] = str(exc).splitlines()[0]


def run_free_catch_checks(cur) -> dict[str, str]:
    results: dict[str, str] = {}
    # A throwaway auth user, created and discarded inside this transaction, so the check never
    # depends on (or touches) a real person's account.
    cur.execute(
        "insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at) "
        "values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', "
        "'authenticated', true, now(), now()) returning id"
    )
    user_id = str(cur.fetchone()[0])
    cur.execute("set local role authenticated")
    cur.execute(
        "select set_config('request.jwt.claims', %s, true)",
        (json.dumps({"sub": user_id, "role": "authenticated"}),),
    )
    for i in range(1, 5):
        name = f"catch {i}" if i < 4 else "catch 4 (over the free allowance)"
        _step(
            cur, results, name,
            "insert into public.collection (user_id, species_id, spotted_at, caught_at) "
            "values (%s, %s, now(), now())",
            (user_id, f"zz-verify-{i}"),
        )
    # A PostgREST upsert resends every column, caught_at included — must not count as a catch.
    _step(
        cur, results, "pledge help on a caught species",
        "update public.collection set helped_at = now(), helped_kind = 'give', caught_at = caught_at "
        "where user_id = %s and species_id = 'zz-verify-1'",
        (user_id,),
    )
    _step(cur, results, "user grants themselves the Full Game",
          "update public.profiles set full_game = true where user_id = %s", (user_id,))
    _step(cur, results, "user resets their own catch counter",
          "update public.profiles set free_catches_used = 0 where user_id = %s", (user_id,))
    _step(
        cur, results, "app-style home_region upsert",
        "insert into public.profiles (user_id, home_region) values (%s, 'SWE.9_1') "
        "on conflict (user_id) do update set user_id = excluded.user_id, home_region = excluded.home_region",
        (user_id,),
    )
    cur.execute("reset role")
    for name, at in [
        ("season_key 2026-12-15 (December → next year's winter)", "2026-12-15 12:00+00"),
        ("season_key 2026-11-30 23:30Z (already 1 Dec in Sweden)", "2026-11-30 23:30+00"),
        ("season_key 2026-02-28", "2026-02-28 12:00+00"),
        ("season_key 2026-07-01", "2026-07-01 12:00+00"),
    ]:
        _step(cur, results, name, "select public.season_key(%s::timestamptz)", (at,))
    return results


def run_retention_checks(cur) -> dict[str, str]:
    """T-094: the daily job deletes exactly what the policy says, and nothing a live user owns."""
    results: dict[str, str] = {}
    old = "now() - interval '200 days'"

    def user(anonymous: bool) -> str:
        cur.execute(
            "insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at, "
            f"last_sign_in_at) values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', "
            f"'authenticated', 'authenticated', %s, {old}, {old}, {old}) returning id",
            (anonymous,),
        )
        return str(cur.fetchone()[0])

    stale = user(True)
    refreshed = user(True)
    collecting = user(True)
    linked = user(False)
    # Session refreshed today: last_sign_in_at does not move on a refresh, which is the trap.
    _step(cur, results, "setup: session refreshed today",
          "insert into auth.sessions (id, user_id, created_at, updated_at, refreshed_at) "
          f"values (gen_random_uuid(), %s, {old}, {old}, now() at time zone 'UTC')", (refreshed,))
    _step(cur, results, "setup: collection write today",
          "insert into public.collection (user_id, species_id, spotted_at) values (%s, 'zz-verify-r', now())",
          (collecting,))
    _step(cur, results, "setup: notification log",
          "insert into public.notification_log (user_id, species_id, sent_at) values "
          "(%s, 'zz-verify-old', now() - interval '40 days'), (%s, 'zz-verify-new', now() - interval '1 day')",
          (linked, linked))

    _step(cur, results, "retention job runs", "select public.apply_retention() is not null")
    if results["retention job runs"] == "True":
        results["retention job runs"] = "ok"

    def exists(sql: str, params) -> str:
        cur.execute(f"select exists({sql})", params)
        return "kept" if cur.fetchone()[0] else "deleted"

    users = "select 1 from auth.users where id = %s"
    results["anonymous, no activity for 200 days"] = exists(users, (stale,))
    results["anonymous, old sign-in but a session refreshed today"] = exists(users, (refreshed,))
    results["anonymous, old sign-in but a collection write today"] = exists(users, (collecting,))
    results["email-linked, no activity for 200 days"] = exists(users, (linked,))
    logs = "select 1 from public.notification_log where user_id = %s and species_id = %s"
    results["notification sent 40 days ago"] = exists(logs, (linked, "zz-verify-old"))
    results["notification sent yesterday"] = exists(logs, (linked, "zz-verify-new"))
    return results


def main() -> None:
    dsn = os.environ.get("SUPABASE_DB_URL")
    if not dsn:
        raise SystemExit("SUPABASE_DB_URL not set.")
    import psycopg

    with psycopg.connect(dsn) as conn:
        try:
            with conn.cursor() as cur:
                results = run_free_catch_checks(cur)
                results.update(run_retention_checks(cur))
        finally:
            conn.rollback()  # always: these checks must never leave a trace

    for step, outcome in results.items():
        print(f"  {step}: {outcome}")
    failures = evaluate(results)
    if failures:
        print("\nFAILED:\n  " + "\n  ".join(failures))
        sys.exit(1)
    print(f"\nall {len(EXPECTED)} checks passed (transaction rolled back)")


if __name__ == "__main__":
    main()
