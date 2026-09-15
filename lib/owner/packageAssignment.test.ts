import { computeExpiryDate } from './packageAssignment';

describe('computeExpiryDate', () => {
    // Fonksiyon owner'ın kendi (yerel) takvim gününü baz alır -- test de aynı
    // yerel saat dilimindeki getter'ları kullanmalı (UTC ile karıştırılırsa
    // testi çalıştıran makinenin saat dilimine göre yanlış pozitif/negatif çıkar).
    const now = new Date(2026, 8, 15); // 15 Eylül 2026, yerel saat

    it("'free' tier için her zaman null döner", () => {
        expect(computeExpiryDate('free', 3, now)).toBeNull();
        expect(computeExpiryDate('free', null, now)).toBeNull();
    });

    it('durationMonths null ise (süresiz) null döner', () => {
        expect(computeExpiryDate('filiz', null, now)).toBeNull();
    });

    it('ücretli tier + süre verildiğinde doğru bitiş tarihini hesaplar', () => {
        const result = computeExpiryDate('filiz', 3, now);
        expect(result).not.toBeNull();
        const resultDate = new Date(result!);
        expect(resultDate.getFullYear()).toBe(2026);
        expect(resultDate.getMonth()).toBe(11); // Aralık (0-indexed) = Eylül + 3 ay
        expect(resultDate.getDate()).toBe(15);
    });

    it('12 ay eklenince yıl taşması doğru hesaplanır', () => {
        const result = computeExpiryDate('orman', 12, now);
        const resultDate = new Date(result!);
        expect(resultDate.getFullYear()).toBe(2027);
        expect(resultDate.getMonth()).toBe(8); // Eylül
    });
});
