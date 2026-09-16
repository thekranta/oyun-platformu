import { bucketWeeklyCost, sumByService } from './aiCostMetrics';

describe('bucketWeeklyCost', () => {
    // Çarşamba, 2026-09-16 -- o haftanın Pazartesi'si 2026-09-14.
    const now = new Date(2026, 8, 16);

    it('boş listede tüm haftalar 0 döner', () => {
        const result = bucketWeeklyCost([], 4, now);
        expect(result).toHaveLength(4);
        expect(result.every((w) => w.totalUsd === 0)).toBe(true);
    });

    it('son hafta (bugünü içeren) doğru toplanır ve en sonda yer alır', () => {
        const result = bucketWeeklyCost(
            [{ created_at: '2026-09-15T10:00:00', servis: 'gemini', tahmini_maliyet_usd: 0.02 }],
            4,
            now
        );
        expect(result[result.length - 1].totalUsd).toBeCloseTo(0.02);
        expect(result[result.length - 1].weekLabel).toBe('14.09');
    });

    it('aynı haftaya düşen birden fazla satır toplanır', () => {
        const result = bucketWeeklyCost(
            [
                { created_at: '2026-09-14T08:00:00', servis: 'gemini', tahmini_maliyet_usd: 0.01 },
                { created_at: '2026-09-15T09:00:00', servis: 'openai_tts', tahmini_maliyet_usd: 0.005 },
                { created_at: '2026-09-20T23:00:00', servis: 'openai_whisper', tahmini_maliyet_usd: 0.001 },
            ],
            4,
            now
        );
        expect(result[result.length - 1].totalUsd).toBeCloseTo(0.016);
    });

    it('hafta aralığının dışında kalan (çok eski) tarih sayılmaz', () => {
        const result = bucketWeeklyCost(
            [{ created_at: '2020-01-01T00:00:00', servis: 'gemini', tahmini_maliyet_usd: 5 }],
            4,
            now
        );
        expect(result.every((w) => w.totalUsd === 0)).toBe(true);
    });

    it('hafta sınırındaki (Pazartesi 00:00) tarih o haftaya sayılır, önceki haftaya değil', () => {
        const result = bucketWeeklyCost(
            [{ created_at: '2026-09-14T00:00:00', servis: 'gemini', tahmini_maliyet_usd: 0.03 }],
            4,
            now
        );
        expect(result[result.length - 1].totalUsd).toBeCloseTo(0.03);
        expect(result[result.length - 2].totalUsd).toBe(0);
    });
});

describe('sumByService', () => {
    it('3 bilinen servisi veri olmasa da 0 ile listeler', () => {
        const result = sumByService([]);
        expect(result).toEqual([
            { servis: 'gemini', count: 0, totalUsd: 0 },
            { servis: 'openai_tts', count: 0, totalUsd: 0 },
            { servis: 'openai_whisper', count: 0, totalUsd: 0 },
        ]);
    });

    it('karışık servis listesinde her biri doğru toplanır', () => {
        const result = sumByService([
            { servis: 'gemini', tahmini_maliyet_usd: 0.01 },
            { servis: 'gemini', tahmini_maliyet_usd: 0.02 },
            { servis: 'openai_tts', tahmini_maliyet_usd: 0.005 },
        ]);
        const bySlug = Object.fromEntries(result.map((r) => [r.servis, r]));
        expect(bySlug.gemini.count).toBe(2);
        expect(bySlug.gemini.totalUsd).toBeCloseTo(0.03);
        expect(bySlug.openai_tts.count).toBe(1);
        expect(bySlug.openai_whisper.count).toBe(0);
    });

    it('tanınmayan bir servis adı listenin sonuna eklenir, kaybolmaz', () => {
        const result = sumByService([{ servis: 'yeni_saglayici', tahmini_maliyet_usd: 1 }]);
        const unknown = result.find((r) => r.servis === 'yeni_saglayici');
        expect(unknown).toEqual({ servis: 'yeni_saglayici', count: 1, totalUsd: 1 });
    });
});
