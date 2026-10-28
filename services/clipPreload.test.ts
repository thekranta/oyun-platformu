/**
 * Klip önceden yükleme orkestrasyonu: ortak klipler boşta bir kez, oyun klipleri oyun açılırken öne alınarak.
 */
const mockPreloadClips = jest.fn();
let mockPlatform = 'web';

jest.mock('react-native', () => ({
    Platform: {
        get OS() { return mockPlatform; },
    },
}));
jest.mock('./speechService', () => ({ preloadClips: (...a: unknown[]) => mockPreloadClips(...a) }));
const DATA = {
    COMMON_CLIPS: ['aferin', 'harika'],
    CLIPS_BY_GAME: { 'kac-oldu': 'giris-klibi|2-oldu-aferin|3-oldu-aferin' },
};

import {
    COMMON_PRELOAD_DELAY_MS,
    __resetClipPreloadForTests,
    preloadGameClips,
    schedulePreloadCommonClips,
} from './clipPreload';

const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

describe('clipPreload', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        mockPreloadClips.mockClear();
        mockPlatform = 'web';
        __resetClipPreloadForTests(async () => DATA);
    });
    afterEach(() => jest.useRealTimers());

    it('oyun açılırken oyunun klipleri (giriş yönergesi önce) öne alınarak istenir', async () => {
        await preloadGameClips('kac-oldu');
        expect(mockPreloadClips).toHaveBeenCalledWith(['giris-klibi', '2-oldu-aferin', '3-oldu-aferin'], { urgent: true });
    });

    it('tabloda olmayan oyun için bir şey istenmez', async () => {
        await preloadGameClips('tabloda-yok');
        expect(mockPreloadClips).not.toHaveBeenCalled();
    });

    it('native\'de hiçbir şey yapılmaz', async () => {
        mockPlatform = 'ios';
        await preloadGameClips('kac-oldu');
        const cancel = schedulePreloadCommonClips();
        jest.advanceTimersByTime(COMMON_PRELOAD_DELAY_MS + 100);
        await flush();
        cancel();
        expect(mockPreloadClips).not.toHaveBeenCalled();
    });

    it('ortak klipler gecikmeyle ve yalnız bir kez ısıtılır', async () => {
        schedulePreloadCommonClips();
        jest.advanceTimersByTime(COMMON_PRELOAD_DELAY_MS - 10);
        await flush();
        expect(mockPreloadClips).not.toHaveBeenCalled();             // henüz erken
        jest.advanceTimersByTime(20);
        await flush();
        expect(mockPreloadClips).toHaveBeenCalledTimes(1);
        expect(mockPreloadClips).toHaveBeenCalledWith(['aferin', 'harika']);

        schedulePreloadCommonClips();                                // menüye dönüş: tekrar yok
        jest.advanceTimersByTime(COMMON_PRELOAD_DELAY_MS + 100);
        await flush();
        expect(mockPreloadClips).toHaveBeenCalledTimes(1);
    });

    it('plan iptal edilirse (ekrandan çıkıldı) ortak klipler ısıtılmaz', async () => {
        const cancel = schedulePreloadCommonClips();
        cancel();
        jest.advanceTimersByTime(COMMON_PRELOAD_DELAY_MS + 100);
        await flush();
        expect(mockPreloadClips).not.toHaveBeenCalled();
    });
});
