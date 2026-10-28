/**
 * Hikâye sahne önceden indirme: görseller Image.prefetch, sesler bellek önbelleği; ses kaynağı hazırsa blob'a döner.
 */
const mockPrefetch = jest.fn(() => Promise.resolve(true));
const mockPreloadUris = jest.fn();
const mockReady = jest.fn();
let mockPlatform = 'web';
let mockUnresolved: number[] = [];

jest.mock('react-native', () => ({
    Platform: { get OS() { return mockPlatform; } },
    Image: { prefetch: (...a: unknown[]) => (mockPrefetch as (...x: unknown[]) => Promise<boolean>)(...a) },
}));
// Gerçek assetUri gibi: metin adres olduğu gibi; sayı (native kimliği) çözülür ya da (mockUnresolved) çözülemez.
jest.mock('../lib/assetUri', () => ({
    assetUri: (n: unknown) => {
        if (typeof n === 'string') return n;
        if (n && typeof n === 'object') return (n as { uri?: string }).uri;
        return mockUnresolved.includes(n as number) ? undefined : `http://app/asset-${n}`;
    },
}));
jest.mock('./webClipCache', () => ({
    preloadClipUris: (...a: unknown[]) => mockPreloadUris(...a),
    readyClipUrl: (u: string) => mockReady(u),
}));

function load() {
    let svc!: typeof import('./storyPreload');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    jest.isolateModules(() => { svc = require('./storyPreload'); });
    return svc;
}

describe('storyPreload', () => {
    beforeEach(() => {
        mockPrefetch.mockClear();
        mockPreloadUris.mockClear();
        mockReady.mockReset();
        mockPlatform = 'web';
        mockUnresolved = [];
    });

    it('web: görseller Image.prefetch ile, sesler bellek önbelleğiyle önceden indirilir', () => {
        load().preloadStoryAssets({ images: [1, 2], audio: [3, 4] });
        expect(mockPrefetch.mock.calls.map((c) => (c as unknown[])[0])).toEqual(['http://app/asset-1', 'http://app/asset-2']);
        expect(mockPreloadUris).toHaveBeenCalledTimes(1);
        expect(mockPreloadUris).toHaveBeenCalledWith(['http://app/asset-3', 'http://app/asset-4']);
    });

    it('web biçimleri: görsel { uri } nesnesi, ses metin adres olarak doğrudan indirilir', () => {
        load().preloadStoryAssets({ images: [{ uri: '/assets/a.webp', width: 1, height: 1 }], audio: ['/assets/b.mp3'] });
        expect(mockPrefetch).toHaveBeenCalledWith('/assets/a.webp');
        expect(mockPreloadUris).toHaveBeenCalledWith(['/assets/b.mp3']);
    });

    it('adresi çözülemeyen varlık atlanır; ses yoksa önbelleğe hiç gidilmez', () => {
        mockUnresolved = [2, 3];
        load().preloadStoryAssets({ images: [1, 2], audio: [3] });
        expect(mockPrefetch).toHaveBeenCalledTimes(1);
        expect(mockPreloadUris).not.toHaveBeenCalled();
    });

    it('prefetch hatası (ağ) sessizce yutulur', async () => {
        mockPrefetch.mockImplementationOnce(() => Promise.reject(new Error('ağ yok')));
        expect(() => load().preloadStoryAssets({ images: [1], audio: [] })).not.toThrow();
        await Promise.resolve();
    });

    it('native: hiçbir şey yapılmaz', () => {
        mockPlatform = 'ios';
        load().preloadStoryAssets({ images: [1], audio: [2] });
        expect(mockPrefetch).not.toHaveBeenCalled();
        expect(mockPreloadUris).not.toHaveBeenCalled();
    });

    it('playableAudioSource: önceden inmişse blob adresi, değilse modül; modül olmayanlar değişmez', () => {
        const { playableAudioSource } = load();
        mockReady.mockImplementation((u: string) => (u === 'http://app/asset-7' ? 'blob:hazir' : undefined));
        expect(playableAudioSource(7)).toEqual({ uri: 'blob:hazir' });
        expect(playableAudioSource(8)).toBe(8);                      // inmemiş: eskisi gibi
        expect(playableAudioSource(null)).toBeNull();
        const src = { uri: 'http://x/y.mp3' };
        expect(playableAudioSource(src)).toBe(src);
        mockReady.mockImplementation((u: string) => (u === '/assets/narr.mp3' ? 'blob:metin' : undefined));
        expect(playableAudioSource('/assets/narr.mp3')).toEqual({ uri: 'blob:metin' });     // web: ses metin adrestir
        expect(playableAudioSource('/assets/baska.mp3')).toBe('/assets/baska.mp3');          // inmemiş: olduğu gibi
        mockUnresolved = [9];
        expect(playableAudioSource(9)).toBe(9);                      // adres çözülemedi
    });

    it('native: playableAudioSource modülü olduğu gibi verir', () => {
        mockPlatform = 'android';
        mockReady.mockReturnValue('blob:asla');
        expect(load().playableAudioSource(7)).toBe(7);
    });
});
