import { bucketWeekly, countOgretmenTiers, countVeliTiers } from './growthMetrics';

describe('bucketWeekly', () => {
    // Çarşamba, 2026-09-16 -- o haftanın Pazartesi'si 2026-09-14.
    const now = new Date(2026, 8, 16);

    it('boş listelerde tüm haftalar 0 döner', () => {
        const result = bucketWeekly([], [], 4, now);
        expect(result).toHaveLength(4);
        expect(result.every((w) => w.veli === 0 && w.ogretmen === 0)).toBe(true);
    });

    it('son hafta (bugünü içeren) doğru şekilde sayılır ve en sonda yer alır', () => {
        const result = bucketWeekly(['2026-09-15T10:00:00'], [], 4, now);
        expect(result[result.length - 1].veli).toBe(1);
        expect(result[result.length - 1].weekLabel).toBe('14.09');
    });

    it('aynı haftaya düşen birden fazla tarih doğru toplanır', () => {
        const result = bucketWeekly(
            ['2026-09-14T08:00:00', '2026-09-15T09:00:00', '2026-09-20T23:00:00'],
            [],
            4,
            now
        );
        expect(result[result.length - 1].veli).toBe(3);
    });

    it('hafta aralığının dışında kalan (çok eski) tarih sayılmaz', () => {
        const result = bucketWeekly(['2020-01-01T00:00:00'], [], 4, now);
        expect(result.every((w) => w.veli === 0)).toBe(true);
    });

    it('ogretmenDates boşsa tüm ogretmen sayıları 0 kalır, veli etkilenmez', () => {
        const result = bucketWeekly(['2026-09-15T10:00:00'], [], 4, now);
        expect(result.every((w) => w.ogretmen === 0)).toBe(true);
    });

    it('hafta sınırındaki (Pazartesi 00:00) tarih o haftaya sayılır, önceki haftaya değil', () => {
        const result = bucketWeekly([], ['2026-09-14T00:00:00'], 4, now);
        expect(result[result.length - 1].ogretmen).toBe(1);
        expect(result[result.length - 2].ogretmen).toBe(0);
    });
});

describe('countVeliTiers', () => {
    it('her tier için doğru sayar', () => {
        const result = countVeliTiers(['free', 'tohum', 'filiz', 'filiz', 'fidan', 'orman', 'orman', 'orman']);
        expect(result).toEqual({ free: 1, tohum: 1, filiz: 2, fidan: 1, orman: 3 });
    });

    it('null/undefined/geçersiz string değerleri free sayar', () => {
        const result = countVeliTiers([null, undefined, 'bilinmeyen-tier', '']);
        expect(result).toEqual({ free: 4, tohum: 0, filiz: 0, fidan: 0, orman: 0 });
    });

    it('boş listede tüm sayılar 0', () => {
        expect(countVeliTiers([])).toEqual({ free: 0, tohum: 0, filiz: 0, fidan: 0, orman: 0 });
    });
});

describe('countOgretmenTiers', () => {
    it('her tier için doğru sayar', () => {
        const result = countOgretmenTiers(['free', 'free', 'cinar', 'mese']);
        expect(result).toEqual({ free: 2, cinar: 1, mese: 1 });
    });

    it('geçersiz değerleri free sayar', () => {
        const result = countOgretmenTiers([null, 'premium']);
        expect(result).toEqual({ free: 2, cinar: 0, mese: 0 });
    });
});
