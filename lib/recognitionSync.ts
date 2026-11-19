import type { AppClient } from './supabase';

// Species recognised in the "I saw…" quiz, kept with the account (T-299 · review B-31). They earn
// the "recognised" badges and lived only on the phone, so a reinstall lost them. The phone keeps
// its copy (the quiz works offline); at launch and after sign-in the two are merged, and anything
// only the phone has is uploaded. A failed upload is retried by the next merge.

export interface RecognitionGateway {
  /** The signed-in user's recognised species (RLS: own rows only). */
  list(): Promise<string[]>;
  /** Add species; ones already there are kept as they are. */
  add(speciesIds: string[]): Promise<void>;
}

export async function syncRecognitions(
  local: ReadonlySet<string>,
  gateway: RecognitionGateway,
): Promise<Set<string>> {
  const server = new Set(await gateway.list());
  const missing = [...local].filter((id) => !server.has(id));
  if (missing.length > 0) {
    await gateway.add(missing).catch((e: unknown) => console.warn('recognitions upload failed', e));
  }
  return new Set([...server, ...local]);
}

export class SupabaseRecognitionGateway implements RecognitionGateway {
  constructor(private readonly client: AppClient) {}

  async list(): Promise<string[]> {
    const { data, error } = await this.client.from('recognitions').select('species_id');
    if (error) throw new Error(`recognitions read failed: ${error.message}`);
    return ((data ?? []) as { species_id: string }[]).map((r) => r.species_id);
  }

  async add(speciesIds: string[]): Promise<void> {
    // No user id: it comes from the session; the first recognition of a species is kept.
    const { error } = await this.client
      .from('recognitions')
      .upsert(
        speciesIds.map((id) => ({ species_id: id })),
        { onConflict: 'user_id,species_id', ignoreDuplicates: true },
      );
    if (error) throw new Error(`recognitions write failed: ${error.message}`);
  }
}
