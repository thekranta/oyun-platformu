import { SMALL_SCREEN_MAX_SIDE, currentConnection, shouldUseSmallPaintings } from './paintingQuality';

describe('shouldUseSmallPaintings', () => {
    it('telefon ve küçük tablet (uzun kenar ≤ 1200) küçük sürümü kullanır', () => {
        expect(shouldUseSmallPaintings(390, 844)).toBe(true);        // telefon dikey
        expect(shouldUseSmallPaintings(844, 390)).toBe(true);        // telefon yatay
        expect(shouldUseSmallPaintings(820, 1180)).toBe(true);       // tablet dikey
        expect(shouldUseSmallPaintings(SMALL_SCREEN_MAX_SIDE, 700)).toBe(true);
    });

    it('büyük ekran tam boyu kullanır', () => {
        expect(shouldUseSmallPaintings(1280, 720)).toBe(false);
        expect(shouldUseSmallPaintings(1920, 1080)).toBe(false);
        expect(shouldUseSmallPaintings(SMALL_SCREEN_MAX_SIDE + 1, 600)).toBe(false);
    });

    it('veri tasarrufu ve yavaş bağlantı (2G/3G) ekran büyük olsa da küçük sürümü seçtirir', () => {
        expect(shouldUseSmallPaintings(1920, 1080, { saveData: true })).toBe(true);
        for (const t of ['slow-2g', '2g', '3g']) expect(shouldUseSmallPaintings(1920, 1080, { effectiveType: t })).toBe(true);
    });

    it('hızlı bağlantı (4g) ve bilinmeyen bağlantı ekrana göre karar verir', () => {
        expect(shouldUseSmallPaintings(1920, 1080, { effectiveType: '4g' })).toBe(false);
        expect(shouldUseSmallPaintings(1920, 1080, null)).toBe(false);
        expect(shouldUseSmallPaintings(1920, 1080, undefined)).toBe(false);
        expect(shouldUseSmallPaintings(390, 844, { effectiveType: '4g' })).toBe(true);
    });
});

describe('currentConnection', () => {
    const saved = (global as unknown as { navigator?: unknown }).navigator;
    afterEach(() => {
        Object.defineProperty(global, 'navigator', { value: saved, configurable: true, writable: true });
    });

    it('navigator.connection varsa döner, yoksa undefined', () => {
        Object.defineProperty(global, 'navigator', { value: { connection: { effectiveType: '3g' } }, configurable: true, writable: true });
        expect(currentConnection()).toEqual({ effectiveType: '3g' });
        Object.defineProperty(global, 'navigator', { value: {}, configurable: true, writable: true });
        expect(currentConnection()).toBeUndefined();
        Object.defineProperty(global, 'navigator', { value: undefined, configurable: true, writable: true });
        expect(currentConnection()).toBeUndefined();
    });
});
