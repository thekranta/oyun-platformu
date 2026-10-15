import { PUZZLE_LEVELS, gridForLevel, hasNextLevel, isCorrectSlot, pieceCount, pieceRect, showHint, shuffleOrder, trayScale } from './tabloYapbozu';

describe('Tablo Yapbozu mantığı', () => {
    it('zorluk basamakları: 4 parça, sonra 9 parça; sınır dışı seviye kırpılır', () => {
        expect(PUZZLE_LEVELS.map(pieceCount)).toEqual([4, 9]);
        expect(gridForLevel(-3)).toEqual({ cols: 2, rows: 2 });
        expect(gridForLevel(99)).toEqual({ cols: 3, rows: 3 });
        expect(hasNextLevel(0)).toBe(true);
        expect(hasNextLevel(1)).toBe(false);
    });

    it('karıştırma: her parça bir kez, tohumla tekrarlanabilir, parça sayısı>1 ise ASLA sıralı değil', () => {
        for (const count of [2, 4, 9]) {
            for (let seed = 1; seed <= 60; seed++) {
                const order = shuffleOrder(count, seed);
                expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: count }, (_, i) => i));
                expect(order.every((v, i) => v === i)).toBe(false);
                expect(shuffleOrder(count, seed)).toEqual(order);
            }
        }
        expect(shuffleOrder(1, 5)).toEqual([0]);
        expect(shuffleOrder(0, 5)).toEqual([]);
    });

    it('farklı tohumlar farklı dizilim üretir (hep aynı sıra değil)', () => {
        const seen = new Set<string>();
        for (let seed = 1; seed <= 30; seed++) seen.add(shuffleOrder(9, seed).join(','));
        expect(seen.size).toBeGreaterThan(10);
    });

    it('parça konumları tabloyu boşluksuz ve çakışmasız kaplar', () => {
        const g = { cols: 3, rows: 3 };
        const rects = Array.from({ length: 9 }, (_, i) => pieceRect(i, g, 300, 240));
        expect(rects[0]).toMatchObject({ left: 0, top: 0, w: 100, h: 80, row: 0, col: 0 });
        expect(rects[4]).toMatchObject({ left: 100, top: 80, row: 1, col: 1 });
        expect(rects[8]).toMatchObject({ left: 200, top: 160, row: 2, col: 2 });
        const area = rects.reduce((n, r) => n + r.w * r.h, 0);
        expect(area).toBeCloseTo(300 * 240);
    });

    it('doğru yuva yalnız kendi kimliği; ipucu ikinci yanlıştan sonra', () => {
        expect(isCorrectSlot(3, 3)).toBe(true);
        expect(isCorrectSlot(3, 4)).toBe(false);
        expect([0, 1, 2, 3].map(showHint)).toEqual([false, false, true, true]);
    });

    it('tepsi ölçeği: büyük kenar hedefe sığar, küçük parça büyütülmez', () => {
        const g4 = { cols: 2, rows: 2 };
        const g9 = { cols: 3, rows: 3 };
        expect(Math.max(200 * trayScale({ w: 200, h: 150 }, g4), 150 * trayScale({ w: 200, h: 150 }, g4))).toBeLessThanOrEqual(84.0001);
        expect(trayScale({ w: 30, h: 20 }, g9)).toBe(1);
        expect(200 * trayScale({ w: 200, h: 100 }, g9)).toBeCloseTo(60);
        expect(trayScale({ w: 0, h: 0 }, g9)).toBe(1);
    });
});
