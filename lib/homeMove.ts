import type { Region } from './hometown';
import { resolveHometown } from './hometown';
import type { AppClient } from './supabase';

// Moving home county (T-349 · review F-09): once per 365 days, enforced by the database
// (migration 0048), which keeps the date where no client can reset it. One location fix, as at
// onboarding; the coordinates never outlive the check. The collection is not touched.

type Coordinates = { latitude: number; longitude: number };

export type MoveCheck =
  | { kind: 'move'; region: Region }
  | { kind: 'same'; region: Region }
  | { kind: 'no-fix' }
  | { kind: 'outside-sweden' };

export async function checkMove(current: Region, getFix: () => Promise<Coordinates | null>): Promise<MoveCheck> {
  const fix = await getFix();
  if (fix === null) return { kind: 'no-fix' };
  const region = resolveHometown(fix);
  if (region === null) return { kind: 'outside-sweden' };
  return region.id === current.id ? { kind: 'same', region } : { kind: 'move', region };
}

export type MoveResult = { ok: true } | { ok: false; nextDate: string | null };

export interface HomeMoveGateway {
  move(region: Region): Promise<MoveResult>;
}

export class SupabaseHomeMoveGateway implements HomeMoveGateway {
  constructor(
    private readonly client: AppClient,
    private readonly ensureUser: () => Promise<string>,
  ) {}

  async move(region: Region): Promise<MoveResult> {
    const userId = await this.ensureUser();
    const { error } = await this.client.from('profiles').update({ home_region: region.id }).eq('user_id', userId);
    if (!error) return { ok: true };
    if (error.message.includes('home_move_limit')) {
      const details = (error as { details?: string }).details ?? null;
      return { ok: false, nextDate: details && /^\d{4}-\d{2}-\d{2}$/.test(details) ? details : null };
    }
    throw new Error(`home move failed: ${error.message}`);
  }
}
