# lib/

Non-UI logic: the Supabase client, data-access functions, and domain helpers (seasons,
free-catch accounting, notification weighting, etc.). This is where the testable core lives —
every module here should have a colocated `*.test.ts`.
