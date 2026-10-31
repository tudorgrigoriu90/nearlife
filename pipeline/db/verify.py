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
    "anonymous, idle for 200 days but owns a purchase": "kept",
    "notification sent 40 days ago": "deleted",
    "notification sent yesterday": "kept",
    # T-081 community totals: everyone may read the counts, nobody may read the rows behind them.
    "community totals count a pledge made today": "ok",
    "anon can read the community totals": "ok",
    "anon reads no collection rows": "ok",
    # T-217 entitlements: only the server grants them, and the latest event wins.
    "purchase grants the Full Game": "ok",
    "an older event arriving late changes nothing": "ok",
    "with the Full Game a 4th catch is accepted": "ok",
    "refund revokes the Full Game": "ok",
    "Family also grants the Full Game": "ok",
    "a purchase for a deleted account is skipped": "ok",
    "user cannot grant themselves an entitlement": "permission denied",
    "user cannot write the entitlements table": "permission denied",
    "user can read their own entitlements": "ok",
    # T-102 Family households: one Family purchase unlocks the Full Game for up to 5 people.
    "a household needs a Family purchase": "family_required",
    "a Family owner creates a household with an 8-character code": "ok",
    "creating again returns the same code": "ok",
    "joining with the code grants the member the Full Game": "ok",
    "codes are not case-sensitive": "ok",
    "a wrong code is refused": "household_not_found",
    "joining twice is refused": "already_in_household",
    "a 6th person is refused": "household_full",
    "a member sees the household size but not the code": "ok",
    "members cannot read the household tables": "permission denied",
    "only the owner can remove a member": "not_owner",
    "the owner removes a member, who loses the Full Game": "ok",
    "leaving removes the Full Game": "ok",
    "a Family refund removes every member's Full Game": "ok",
    "nobody can join a household whose Family was refunded": "household_inactive",
    # T-048/T-049 catch spots: a flagged spot is never visible to a user.
    "a user sees an unflagged catch spot": "ok",
    "a spot inside a nature reserve is invisible": "ok",
    "a spot near a major road is invisible": "ok",
    "a user cannot add a catch spot": "permission denied",
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
        # A void function (join_household, …) returns one row holding an empty value: success.
        results[name] = str(row[0]) if row and row[0] not in (None, "") else "ok"
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
    customer = user(True)
    cur.execute("select public.set_entitlement(%s, 'full_game', true, now() - interval '200 days', 'p', 'evt')",
                (customer,))
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
    results["anonymous, idle for 200 days but owns a purchase"] = exists(users, (customer,))
    logs = "select 1 from public.notification_log where user_id = %s and species_id = %s"
    results["notification sent 40 days ago"] = exists(logs, (linked, "zz-verify-old"))
    results["notification sent yesterday"] = exists(logs, (linked, "zz-verify-new"))
    return results


def run_community_impact_checks(cur) -> dict[str, str]:
    """T-081: the aggregate counts a real pledge, and exposing it does not expose the rows."""
    results: dict[str, str] = {}
    cur.execute("select pledges from public.community_impact()")
    before = cur.fetchone()[0]
    cur.execute(
        "insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at) "
        "values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', "
        "'authenticated', true, now(), now()) returning id"
    )
    helper = str(cur.fetchone()[0])
    # Two statements on purpose: a data-modifying CTE's insert is invisible to the rest of its own
    # statement, so a one-statement version would never see the new pledge.
    cur.execute(
        "insert into public.collection (user_id, species_id, spotted_at, helped_at, helped_kind) "
        "values (%s, 'zz-verify-help', now(), now(), 'give')",
        (helper,),
    )
    _step(
        cur, results, "community totals count a pledge made today",
        "select case when pledges = %s + 1 then 'ok' else 'counted ' || pledges end "
        "from public.community_impact()",
        (before,),
    )
    cur.execute("set local role anon")
    cur.execute("select set_config('request.jwt.claims', %s, true)", (json.dumps({"role": "anon"}),))
    _step(cur, results, "anon can read the community totals",
          "select case when pledges >= 1 then 'ok' else 'empty' end from public.community_impact()")
    _step(cur, results, "anon reads no collection rows",
          "select case when count(*) = 0 then 'ok' else 'LEAK: ' || count(*) end from public.collection")
    cur.execute("reset role")
    return results


def run_entitlement_checks(cur) -> dict[str, str]:
    """T-217: purchases reach the database only through set_entitlement, newest event first."""
    results: dict[str, str] = {}
    cur.execute(
        "insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at) "
        "values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', "
        "'authenticated', true, now(), now()) returning id"
    )
    buyer = str(cur.fetchone()[0])

    def grant(name: str, entitlement: str, active: bool, at: str, expect: str, owns: bool) -> None:
        # Call and check are separate statements on purpose. A statement reads one snapshot taken
        # when it starts, so a full_game check inside the same statement as set_entitlement would
        # see the value from before the function wrote it.
        cur.execute("savepoint step")
        try:
            cur.execute(f"select public.set_entitlement(%s, %s, %s, {at}, 'p', 'evt')", (buyer, entitlement, active))
            outcome = cur.fetchone()[0]
            cur.execute("select full_game from public.profiles where user_id = %s", (buyer,))
            now_owns = cur.fetchone()[0]
            results[name] = "ok" if (outcome, now_owns) == (expect, owns) else f"{outcome}, full_game={now_owns}"
            cur.execute("release savepoint step")
        except Exception as exc:
            cur.execute("rollback to savepoint step")
            results[name] = str(exc).splitlines()[0]

    grant("purchase grants the Full Game", "full_game", True, "now()", "applied", True)
    grant("an older event arriving late changes nothing", "full_game", False,
          "now() - interval '1 hour'", "stale", True)
    for i in range(1, 4):
        cur.execute(
            "insert into public.collection (user_id, species_id, spotted_at, caught_at) values (%s, %s, now(), now())",
            (buyer, f"zz-verify-paid-{i}"),
        )
    _step(cur, results, "with the Full Game a 4th catch is accepted",
          "insert into public.collection (user_id, species_id, spotted_at, caught_at) "
          "values (%s, 'zz-verify-paid-4', now(), now())", (buyer,))
    grant("refund revokes the Full Game", "full_game", False,
          "now() + interval '1 second'", "applied", False)
    grant("Family also grants the Full Game", "family", True,
          "now() + interval '2 seconds'", "applied", True)
    _step(cur, results, "a purchase for a deleted account is skipped",
          "select case when public.set_entitlement(gen_random_uuid(), 'full_game', true, now(), 'p', 'evt') "
          "= 'unknown_user' then 'ok' else 'wrong' end")

    cur.execute("set local role authenticated")
    cur.execute("select set_config('request.jwt.claims', %s, true)",
                (json.dumps({"sub": buyer, "role": "authenticated"}),))
    _step(cur, results, "user cannot grant themselves an entitlement",
          "select public.set_entitlement(%s, 'full_game', true, now() + interval '1 day', 'p', 'evt')", (buyer,))
    _step(cur, results, "user cannot write the entitlements table",
          "insert into public.entitlements (user_id, entitlement, active, event_id, changed_at) "
          "values (%s, 'all_regions', true, 'x', now())", (buyer,))
    _step(cur, results, "user can read their own entitlements",
          "select case when count(*) = 2 then 'ok' else 'saw ' || count(*) end from public.entitlements")
    cur.execute("reset role")
    return results


def run_household_checks(cur) -> dict[str, str]:
    """T-102: Family households, end to end, as real authenticated users (rolled back)."""
    results: dict[str, str] = {}

    def new_user() -> str:
        cur.execute(
            "insert into auth.users (id, instance_id, aud, role, is_anonymous, created_at, updated_at) "
            "values (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', "
            "'authenticated', true, now(), now()) returning id"
        )
        return str(cur.fetchone()[0])

    def as_user(user: str | None) -> None:
        if user is None:
            cur.execute("reset role")
            return
        cur.execute("set local role authenticated")
        cur.execute("select set_config('request.jwt.claims', %s, true)",
                    (json.dumps({"sub": user, "role": "authenticated"}),))

    def owns(user: str) -> bool:
        cur.execute("select coalesce((select full_game from public.profiles where user_id = %s), false)", (user,))
        return cur.fetchone()[0]

    owner, m1, m2, m3, m4, m5, stranger = (new_user() for _ in range(7))
    cur.execute("select public.set_entitlement(%s, 'family', true, now(), 'family', 'evt')", (owner,))

    as_user(stranger)
    _step(cur, results, "a household needs a Family purchase", "select public.create_household()")
    as_user(owner)
    cur.execute("select public.create_household()")
    code = cur.fetchone()[0]
    results["a Family owner creates a household with an 8-character code"] = (
        "ok" if isinstance(code, str) and len(code) == 8 else f"got {code!r}"
    )
    cur.execute("select public.create_household()")
    results["creating again returns the same code"] = "ok" if cur.fetchone()[0] == code else "new code"

    as_user(m1)
    _step(cur, results, "joining with the code grants the member the Full Game",
          "select public.join_household(%s)", (code,))
    as_user(None)
    if results["joining with the code grants the member the Full Game"] == "ok" and not owns(m1):
        results["joining with the code grants the member the Full Game"] = "joined, but no Full Game"
    as_user(m2)
    _step(cur, results, "codes are not case-sensitive", "select public.join_household(%s)", (code.lower(),))
    _step(cur, results, "a wrong code is refused", "select public.join_household('ZZZZZZZZ')")
    _step(cur, results, "joining twice is refused", "select public.join_household(%s)", (code,))
    for member in (m3, m4):
        as_user(member)
        cur.execute("select public.join_household(%s)", (code,))
    as_user(m5)
    _step(cur, results, "a 6th person is refused", "select public.join_household(%s)", (code,))

    as_user(m1)
    _step(cur, results, "a member sees the household size but not the code",
          "select case when (h->>'people')::int = 5 and h->>'invite_code' is null and h->>'role' = 'member' "
          "then 'ok' else h::text end from (select public.my_household() as h) x")
    _step(cur, results, "a member sees since when they joined (T-219)",
          "select case when (h->>'since')::timestamptz <= now() then 'ok' else coalesce(h::text, 'no household') end "
          "from (select public.my_household() as h) x")
    _step(cur, results, "members cannot read the household tables", "select count(*) from public.households")
    _step(cur, results, "only the owner can remove a member", "select public.remove_household_member(%s)", (m2,))

    as_user(owner)
    cur.execute("select public.remove_household_member(%s)", (m3,))
    as_user(None)
    results["the owner removes a member, who loses the Full Game"] = "ok" if not owns(m3) else "still unlocked"

    as_user(m4)
    cur.execute("select public.leave_household()")
    as_user(None)
    results["leaving removes the Full Game"] = "ok" if not owns(m4) else "still unlocked"

    cur.execute("select public.set_entitlement(%s, 'family', false, now() + interval '1 second', 'family', 'evt')",
                (owner,))
    results["a Family refund removes every member's Full Game"] = (
        "ok" if not any(owns(u) for u in (owner, m1, m2)) else "a member kept it"
    )
    as_user(m5)
    _step(cur, results, "nobody can join a household whose Family was refunded",
          "select public.join_household(%s)", (code,))
    as_user(None)
    return results


def run_catalogue_checks(cur) -> dict[str, str]:
    """T-225: users can read presence only for species the noise filter ships."""
    results: dict[str, str] = {}
    cur.execute("set local role anon")
    cur.execute("select set_config('request.jwt.claims', %s, true)", (json.dumps({"role": "anon"}),))
    _step(cur, results, "presence of a species outside the catalogue is not readable",
          "select case when count(*) = 0 then 'ok' else 'LEAK: ' || count(*) end "
          "from public.species_presence p join public.species s on s.id = p.species_id where not s.in_catalogue")
    _step(cur, results, "presence of catalogue species is readable",
          "select case when count(*) > 0 then 'ok' else 'nothing readable' end from public.species_presence")
    _step(cur, results, "region_catalogue serves only catalogue species",
          "select case when count(*) = 0 then 'ok' else 'LEAK: ' || count(*) end "
          "from public.region_catalogue('SWE.9_1', 'en') c join public.species s on s.id = c.id where not s.in_catalogue")
    cur.execute("reset role")
    return results


def run_catch_spot_checks(cur) -> dict[str, str]:
    """T-049: the read policy, not the app, is what keeps a flagged spot from ever being shown."""
    results: dict[str, str] = {}
    cur.execute(
        "insert into public.catch_spots (id, region_id, kind, habitat, lat, lon, flags) values "
        "('zz-verify-ok', 'SWE.9_1', 'viewpoint', 'land', 56.9, 14.8, '{}'), "
        "('zz-verify-reserve', 'SWE.9_1', 'bird_hide', 'freshwater', 56.9, 14.8, '{reserve}'), "
        "('zz-verify-road', 'SWE.9_1', 'picnic_site', 'land', 56.9, 14.8, '{major_road}')"
    )
    cur.execute("set local role anon")
    cur.execute("select set_config('request.jwt.claims', %s, true)", (json.dumps({"role": "anon"}),))
    for name, sid, want in (
        ("a user sees an unflagged catch spot", "zz-verify-ok", 1),
        ("a spot inside a nature reserve is invisible", "zz-verify-reserve", 0),
        ("a spot near a major road is invisible", "zz-verify-road", 0),
    ):
        _step(cur, results, name,
              "select case when count(*) = %s then 'ok' else 'saw ' || count(*) end "
              "from public.catch_spots where id = %s", (want, sid))
    _step(cur, results, "a user cannot add a catch spot",
          "insert into public.catch_spots (id, region_id, kind, habitat, lat, lon) "
          "values ('zz-verify-mine', 'SWE.9_1', 'viewpoint', 'land', 56.9, 14.8)")
    cur.execute("reset role")
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
                results.update(run_community_impact_checks(cur))
                results.update(run_entitlement_checks(cur))
                results.update(run_household_checks(cur))
                results.update(run_catch_spot_checks(cur))
                results.update(run_catalogue_checks(cur))
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
