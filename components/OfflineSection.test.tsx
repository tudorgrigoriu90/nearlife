import { act, fireEvent, render, renderHook, screen } from '@testing-library/react-native';
import OfflineSection, { formatMegabytes } from './OfflineSection';
import { packIsStale, REFRESH_AFTER_MS, useOfflinePack } from './useOfflinePack';
import { createTranslator } from '../lib/i18n';
import type { OfflinePack, PackFiles, PackSource } from '../lib/offlinePack';

const tr = createTranslator('sv');
const pack: OfflinePack = {
  version: 1,
  regionId: 'SWE.9_1',
  locale: 'sv',
  secondaryLocale: null,
  savedAt: '2026-11-10T12:00:00.000Z',
  catalogue: [{ id: 'a' }, { id: 'b' }] as OfflinePack['catalogue'],
  presence: [],
  content: [],
  thumbs: {},
};
const target = { regionId: 'SWE.9_1', locale: 'sv' as const, secondaryLocale: null };
const flush = () => act(async () => undefined);

function section(over: Partial<Parameters<typeof OfflineSection>[0]> = {}) {
  const props = {
    locale: 'sv' as const,
    fullGame: true,
    pack: null,
    sizeBytes: 0,
    progress: null,
    failed: false,
    onDownload: jest.fn(),
    onRemove: jest.fn(),
    ...over,
  };
  return props;
}

// T-256: Settings → Offline.
describe('OfflineSection', () => {
  it('without the Full Game: a disabled row saying it is part of the Full Game', async () => {
    const props = section({ fullGame: false });
    await render(<OfflineSection {...props} />);
    await fireEvent.press(screen.getByText(`🔒 ${tr('offline.save')}`));
    expect(props.onDownload).not.toHaveBeenCalled();
    expect(screen.getByText(tr('song.fullGameOnly'))).toBeTruthy();
  });

  it('with the Full Game and nothing saved: save, with its size', async () => {
    const props = section();
    await render(<OfflineSection {...props} />);
    expect(screen.getByText(tr('offline.saveHint'))).toBeTruthy();
    await fireEvent.press(screen.getByText(`⬇️ ${tr('offline.save')}`));
    expect(props.onDownload).toHaveBeenCalled();
  });

  it('shows progress while saving', async () => {
    await render(<OfflineSection {...section({ progress: { step: 'photos', done: 12, total: 400 } })} />);
    expect(screen.getByText(tr('offline.savingPhotos', { done: 12, total: 400 }))).toBeTruthy();
  });

  it('when saved: what, when and how big, with update and remove', async () => {
    const props = section({ pack, sizeBytes: 14.6 * 1024 * 1024, failed: true });
    await render(<OfflineSection {...props} />);
    expect(screen.getByText(tr('offline.saved', { date: '2026-11-10', count: 2, mb: '15' }))).toBeTruthy();
    expect(screen.getByText(tr('offline.failed'))).toBeTruthy();
    await fireEvent.press(screen.getByText(tr('offline.update')));
    await fireEvent.press(screen.getByText(tr('offline.remove')));
    expect(props.onDownload).toHaveBeenCalled();
    expect(props.onRemove).toHaveBeenCalled();
  });

  it('formats sizes', () => {
    expect(formatMegabytes(3.2 * 1024 * 1024)).toBe('3.2');
    expect(formatMegabytes(14.6 * 1024 * 1024)).toBe('15');
  });
});

describe('packIsStale', () => {
  const now = new Date('2026-11-10T12:00:00Z');
  it('is stale after a week, or for another county or language', () => {
    expect(packIsStale(pack, target, now)).toBe(false);
    expect(packIsStale(pack, target, new Date(now.getTime() + REFRESH_AFTER_MS))).toBe(true);
    expect(packIsStale(pack, { ...target, regionId: 'SWE.1_1' }, now)).toBe(true);
    expect(packIsStale(pack, { ...target, locale: 'en' }, now)).toBe(true);
    expect(packIsStale(pack, { ...target, secondaryLocale: 'ro' }, now)).toBe(true);
  });
});

describe('useOfflinePack', () => {
  function fakes(saved: OfflinePack | null) {
    let stored = saved ? JSON.stringify(saved) : null;
    const files: PackFiles = {
      readPack: async () => stored,
      writePack: async (json) => {
        stored = json;
      },
      hasThumb: () => false,
      downloadThumb: async () => undefined,
      deleteThumb: () => undefined,
      listThumbs: () => [],
      thumbUri: (id) => id,
      clear: jest.fn(() => {
        stored = null;
      }),
      sizeBytes: () => 1234,
    };
    const source: PackSource = {
      fetchRegionCatalogue: jest.fn(async () => [{ id: 'a' }] as OfflinePack['catalogue']),
      fetchPresence: jest.fn(async () => []),
      fetchFullContent: jest.fn(async () => []),
      fetchThumbs: jest.fn(async () => []),
    };
    return { files, source };
  }

  afterEach(() => jest.useRealTimers());

  it('loads what is saved, downloads on request, and removes', async () => {
    const { files, source } = fakes(null);
    const { result } = await renderHook(() =>
      useOfflinePack({ enabled: true, target, source, files, online: true }),
    );
    await flush();
    expect(result.current.pack).toBeNull();
    await act(async () => result.current.download());
    await flush();
    expect(result.current.pack?.catalogue).toHaveLength(1);
    expect(result.current.sizeBytes).toBe(1234);
    await act(async () => result.current.remove());
    expect(result.current.pack).toBeNull();
    expect(files.clear).toHaveBeenCalled();
  });

  it('does nothing without the Full Game', async () => {
    const { files, source } = fakes(null);
    const { result } = await renderHook(() =>
      useOfflinePack({ enabled: false, target, source, files, online: true }),
    );
    await act(async () => result.current.download());
    expect(source.fetchRegionCatalogue).not.toHaveBeenCalled();
  });

  it('refreshes a week-old pack by itself when online, once', async () => {
    jest.useFakeTimers({ now: new Date('2026-11-20T12:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
    const { files, source } = fakes(pack);
    source.fetchPresence = jest.fn(async () => {
      throw new Error('flaky');
    });
    const { result, rerender } = await renderHook(
      (online: boolean) => useOfflinePack({ enabled: true, target, source, files, online }),
      { initialProps: false },
    );
    await flush();
    expect(source.fetchRegionCatalogue).not.toHaveBeenCalled(); // offline: no refresh
    await rerender(true);
    await flush();
    expect(source.fetchRegionCatalogue).toHaveBeenCalledTimes(1);
    expect(result.current.failed).toBe(true);
    await rerender(true);
    await flush();
    expect(source.fetchRegionCatalogue).toHaveBeenCalledTimes(1); // no retry loop
  });
});
