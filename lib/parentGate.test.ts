import {
    createGateChallenge,
    GATE_LOCKOUT_MS,
    GATE_MAX_WRONG,
    GATE_OPTION_COUNT,
    gateLockoutRemaining,
    isGateAnswerCorrect,
    requestParentGate,
    setParentGateOpener,
} from './parentGate';

/** Deterministik, ama farklı değerler üreten küçük rastgele üreteç (mulberry32). */
function seeded(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

describe('createGateChallenge', () => {
    it('1000 farklı tohumda: doğru cevap seçeneklerde, hepsi farklı ve pozitif, seçenek sayısı sabit', () => {
        for (let seed = 1; seed <= 1000; seed++) {
            const c = createGateChallenge(seeded(seed));
            expect(c.answer).toBe(c.a * c.b);
            expect(c.options).toHaveLength(GATE_OPTION_COUNT);
            expect(new Set(c.options).size).toBe(GATE_OPTION_COUNT);
            expect(c.options).toContain(c.answer);
            expect(c.options.every((n) => Number.isInteger(n) && n > 0)).toBe(true);
        }
    });

    it('çarpanlar 3-6 yaş çocuğun çözemeyeceği aralıkta (6-9)', () => {
        for (let seed = 1; seed <= 300; seed++) {
            const c = createGateChallenge(seeded(seed));
            expect(c.a).toBeGreaterThanOrEqual(6);
            expect(c.a).toBeLessThanOrEqual(9);
            expect(c.b).toBeGreaterThanOrEqual(6);
            expect(c.b).toBeLessThanOrEqual(9);
        }
    });

    it('doğru cevap hep aynı sırada değil (konum tahmin edilemez)', () => {
        const konumlar = new Set<number>();
        for (let seed = 1; seed <= 200; seed++) {
            const c = createGateChallenge(seeded(seed));
            konumlar.add(c.options.indexOf(c.answer));
        }
        expect(konumlar.size).toBe(GATE_OPTION_COUNT);
    });

    it('rastgele üreteç sabit 0 ya da neredeyse 1 olsa bile geçerli soru üretir', () => {
        for (const sabit of [0, 0.999999]) {
            const c = createGateChallenge(() => sabit);
            expect(new Set(c.options).size).toBe(GATE_OPTION_COUNT);
            expect(c.options).toContain(c.answer);
        }
    });
});

describe('isGateAnswerCorrect', () => {
    it('yalnız doğru çarpımı kabul eder', () => {
        const c = createGateChallenge(seeded(7));
        expect(isGateAnswerCorrect(c, c.answer)).toBe(true);
        for (const yanlis of c.options.filter((n) => n !== c.answer)) {
            expect(isGateAnswerCorrect(c, yanlis)).toBe(false);
        }
    });
});

describe('gateLockoutRemaining', () => {
    it('sınırın altında yanlışta bekleme yok', () => {
        expect(gateLockoutRemaining(0, null, 1000)).toBe(0);
        expect(gateLockoutRemaining(GATE_MAX_WRONG - 1, 500, 1000)).toBe(0);
    });

    it('sınıra ulaşınca bekleme süresi başlar ve zamanla azalır', () => {
        expect(gateLockoutRemaining(GATE_MAX_WRONG, 1000, 1000)).toBe(GATE_LOCKOUT_MS);
        expect(gateLockoutRemaining(GATE_MAX_WRONG, 1000, 1000 + 5000)).toBe(GATE_LOCKOUT_MS - 5000);
        expect(gateLockoutRemaining(GATE_MAX_WRONG, 1000, 1000 + GATE_LOCKOUT_MS)).toBe(0);
        expect(gateLockoutRemaining(GATE_MAX_WRONG + 3, 1000, 1000 + GATE_LOCKOUT_MS + 999)).toBe(0);
    });
});

describe('requestParentGate', () => {
    afterEach(() => setParentGateOpener(null));

    it('kapı arayüzü bağlı değilse GEÇİRMEZ (güvenli varsayılan)', async () => {
        setParentGateOpener(null);
        await expect(requestParentGate()).resolves.toBe(false);
    });

    it('bağlı açıcının sonucunu döndürür', async () => {
        setParentGateOpener(() => Promise.resolve(true));
        await expect(requestParentGate()).resolves.toBe(true);
        setParentGateOpener(() => Promise.resolve(false));
        await expect(requestParentGate()).resolves.toBe(false);
    });
});
