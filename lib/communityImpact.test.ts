import {
  COMMUNITY_MIN_HELPERS,
  SupabaseCommunityImpactSource,
  communityToShow,
  parseCommunityImpact,
} from './communityImpact';

const row = { season: '2026-autumn', helpers: 12, pledges: 30, give: 18, protect: 12 };

describe('parseCommunityImpact', () => {
  it('reads the aggregate row', () => {
    expect(parseCommunityImpact(row)).toEqual(row);
  });

  it('rejects a malformed row rather than showing a wrong number', () => {
    expect(parseCommunityImpact(null)).toBeNull();
    expect(parseCommunityImpact({ ...row, helpers: '12' })).toBeNull();
    expect(parseCommunityImpact({ ...row, pledges: -1 })).toBeNull();
    expect(parseCommunityImpact({ ...row, give: 1.5 })).toBeNull();
    expect(parseCommunityImpact({ ...row, season: undefined })).toBeNull();
  });
});

describe('communityToShow', () => {
  it('shows totals once enough people are helping', () => {
    expect(communityToShow({ ...row, helpers: COMMUNITY_MIN_HELPERS })).not.toBeNull();
  });

  it('hides a tiny total, which would mostly be the reader themselves', () => {
    expect(communityToShow({ ...row, helpers: COMMUNITY_MIN_HELPERS - 1 })).toBeNull();
    expect(communityToShow(null)).toBeNull();
  });
});

describe('SupabaseCommunityImpactSource', () => {
  it('calls community_impact and parses its single row', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [row], error: null });
    const source = new SupabaseCommunityImpactSource({ rpc });
    await expect(source.fetch()).resolves.toEqual(row);
    expect(rpc).toHaveBeenCalledWith('community_impact');
  });

  it('throws on a database error, so the caller keeps the honest note', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(new SupabaseCommunityImpactSource({ rpc }).fetch()).rejects.toThrow('boom');
  });

  it('returns null for an empty or malformed result', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: [], error: null });
    await expect(new SupabaseCommunityImpactSource({ rpc }).fetch()).resolves.toBeNull();
  });
});
