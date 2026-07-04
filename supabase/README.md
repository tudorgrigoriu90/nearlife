# supabase/

Database migrations, Edge Functions (notification engine, free-catch enforcement), and seed
data. Schema is defined in [../docs/TSD.md §3](../docs/TSD.md). Migrations are timestamped and
applied via the Supabase CLI (see task T-016).

## Applying migrations
Migrations in `migrations/` are **authored but not yet applied** to the live project
(`subjdoiicfmiimtvlzsg`). To apply, either:

1. **CLI (preferred):** with a Supabase **access token** + the project **DB password**:
   ```sh
   supabase login            # uses the access token
   supabase link --project-ref subjdoiicfmiimtvlzsg
   supabase db push          # applies migrations/*.sql
   ```
2. **Manual:** paste each migration file into the dashboard SQL editor and run it.

After applying, verify: RLS is on for every table, and a signed-in user can read/write only
their own rows. `20260704000001_profiles_and_collection.sql` is the first migration.
