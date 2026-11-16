"""A throwaway Postgres for testing database rules against the repository's own migrations (I-14).

Set NEARBY_PG_TEST_URL to a superuser connection on a database that may be wiped (CI starts a
Postgres service for it). Without it the tests that need a database are skipped, so a laptop
without Postgres still runs the rest of the suite; CI always sets it.

Only the Supabase parts the applied migrations reference are stubbed: the `auth` schema with
`auth.users` and `auth.uid()` (read from `request.jwt.claims`, as Supabase does), and the
`anon` / `authenticated` / `service_role` roles with Supabase's default table grants.
"""

import json
import os
from contextlib import contextmanager
from pathlib import Path

import pytest

MIGRATIONS = Path(__file__).resolve().parents[2] / "supabase" / "migrations"
URL = os.environ.get("NEARBY_PG_TEST_URL")

needs_pg = pytest.mark.skipif(not URL, reason="NEARBY_PG_TEST_URL not set (CI sets it)")

_STUB = """
drop schema if exists public cascade;
drop schema if exists auth cascade;
create schema public;
create schema auth;
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role; end if;
end $$;
grant usage on schema public, auth to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
create table auth.users (id uuid primary key default gen_random_uuid(), is_anonymous boolean default true);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid
$$;
"""


def connect():
    import psycopg

    return psycopg.connect(URL, autocommit=True)


def fresh(conn, migrations: list[str]) -> None:
    """Wipe the database and apply the stub, then the named migrations in order."""
    conn.execute(_STUB)
    for name in migrations:
        conn.execute((MIGRATIONS / name).read_text(encoding="utf-8"))


def new_user(conn) -> str:
    return str(conn.execute("insert into auth.users default values returning id").fetchone()[0])


@contextmanager
def as_user(conn, user_id: str):
    """Run statements as the signed-in user, under RLS, the way PostgREST does."""
    conn.execute("set role authenticated")
    conn.execute(
        "select set_config('request.jwt.claims', %s, false)",
        (json.dumps({"sub": user_id, "role": "authenticated"}),),
    )
    try:
        yield conn
    finally:
        conn.execute("reset role")
