# supabase/

Database migrations, Edge Functions (notification engine, free-catch enforcement), and seed
data. Schema is defined in [../docs/TSD.md §3](../docs/TSD.md). Migrations are timestamped and
applied via the Supabase CLI (see task T-016).

## Applying migrations

> **Environment note:** Claude's sandboxed build environment **cannot reach `*.supabase.co`**
> (the network policy denies outbound to the project — verified: proxy returns 403 on CONNECT).
> So migrations can't be applied or verified from a Claude session regardless of which key/token
> is supplied. This is a Director-side step, unless the environment is recreated with an egress
> policy that allows `*.supabase.co` + `api.supabase.com`.

Migrations in `migrations/`, applied **in order**:
1. `20260704000001_profiles_and_collection.sql` — profiles + collection tables, RLS to owner (T-056).
2. `20260704000002_extensions.sql` — PostGIS + pg_cron (T-017).

To apply, either:

1. **CLI (preferred):** with a Supabase **access token** (`sbp_…`, Account → Access Tokens) + the
   project **DB password** — note these are *not* the `sb_publishable_…` / `sb_secret_…` API keys:
   ```sh
   supabase login            # uses the access token
   supabase link --project-ref subjdoiicfmiimtvlzsg
   supabase db push          # applies migrations/*.sql in order
   ```
2. **Manual:** paste each migration file into the dashboard SQL editor, in order, and run it.

After applying, verify: both extensions exist (`select extname from pg_extension …`), RLS is on
for every table, and a signed-in user can read/write only their own rows.
