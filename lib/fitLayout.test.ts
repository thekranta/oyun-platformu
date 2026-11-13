import { FIT_MIN_SCALE, fitRow, nextFitScale } from './fitLayout';

describe('nextFitScale', () => {
    it('sığıyorsa ölçek değişmez', () => {
        expect(nextFitScale(1, 700, 600)).toBe(1);
        expect(nextFitScale(1, 700, 700.5)).toBe(1);
        expect(nextFitScale(0.8, 700, 690)).toBe(0.8);
    });

    it('taşıyorsa oranla küçülür ve her turda en az biraz azalır', () => {
        expect(nextFitScale(1, 500, 800)).toBeCloseTo(0.625, 3);
        expect(nextFitScale(1, 790, 800)).toBeCloseTo(0.98, 3);          // çok az taşma: en az 0,02 azalma
    });

    it('alt sınırın altına inmez; ölçü yoksa dokunmaz', () => {
        expect(nextFitScale(1, 100, 800)).toBe(FIT_MIN_SCALE);
        expect(nextFitScale(FIT_MIN_SCALE, 100, 800)).toBe(FIT_MIN_SCALE);
        expect(nextFitScale(1, 0, 800)).toBe(1);
        expect(nextFitScale(1, 700, 0)).toBe(1);
    });

    it('birkaç turda yakınsar (içerik yüksekliği ölçekle doğrusal)', () => {
        let s = 1;
        const natural = 760, avail = 560;
        for (let i = 0; i < 6; i++) s = nextFitScale(s, avail, natural * s);
        expect(natural * s).toBeLessThanOrEqual(avail + 1);
    });
});

describe('fitRow', () => {
    it('5 öğe dar ekranda (360 dp) tek satıra sığar ve dokunma boyutu ≥ 48', () => {
        const inner = 360 - 32 - 2 * 18 - 4;              // Eksik Sayıyı Bul seçenek alanı iç genişliği
        const r = fitRow(inner, 5, 8, 68);
        expect(r.rows).toBe(1);
        expect(r.perRow).toBe(5);
        expect(r.size).toBeGreaterThanOrEqual(48);
        expect(r.size * 5 + 8 * 4).toBeLessThanOrEqual(inner);
    });

    it('geniş ekranda (tablet) öğe boyutu taban değeri aşmaz', () => {
        const r = fitRow(900, 5, 8, 90);
        expect(r.size).toBe(90);
        expect(r.rows).toBe(1);
    });

    it('10 öğe dengeli 2 satıra bölünür (5 + 5)', () => {
        const r = fitRow(339, 10, 8, 68);
        expect(r.rows).toBe(2);
        expect(r.perRow).toBe(5);
        expect(r.size).toBeGreaterThanOrEqual(48);
    });

    it('satırdaki öğe sayısı sığan sayıdan fazla olmaz (satır kırılması beklenen yerde olur)', () => {
        for (const w of [260, 300, 339, 400, 500]) {
            for (const n of [3, 5, 6, 8, 10]) {
                const r = fitRow(w, n, 8, 68);
                expect(r.size * r.perRow + 8 * (r.perRow - 1)).toBeLessThanOrEqual(w + (r.size === 48 ? 48 : 0));
                expect(r.rows * r.perRow).toBeGreaterThanOrEqual(n);
            }
        }
    });

    it('çok dar alanda dokunma boyutunu (≥ 48) koruyarak satıra böler', () => {
        const r = fitRow(120, 5, 8, 68);
        expect(r.size).toBe(56);          // 3 satır × 2 öğe (≥ 48)
        expect(r.perRow).toBe(2);
        expect(r.rows).toBe(3);
    });
});
