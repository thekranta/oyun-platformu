import { buildCounts, buildRound, needsCompactDots, rangeOf, RANGE_BY_ROUND } from './sayiyiBulRounds';

// Küçük tohumlu rastgele (mulberry32): testler tekrarlanabilir olsun.
const seeded = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const ROUNDS = [1, 2, 3, 4, 5, 6, 7, 8];

describe('Sayıyı Bul turları', () => {
  it('sekiz turun aralığı tanımlı ve 1-10 içinde', () => {
    expect(RANGE_BY_ROUND).toHaveLength(8);
    for (const [lo, hi] of RANGE_BY_ROUND) { expect(lo).toBeGreaterThanOrEqual(1); expect(hi).toBeLessThanOrEqual(10); expect(lo).toBeLessThanOrEqual(hi); }
  });

  it('aralık turla birlikte artar (geri dönmez)', () => {
    for (let i = 1; i < RANGE_BY_ROUND.length; i++) {
      expect(RANGE_BY_ROUND[i][0]).toBeGreaterThanOrEqual(RANGE_BY_ROUND[i - 1][0]);
      expect(RANGE_BY_ROUND[i][1]).toBeGreaterThanOrEqual(RANGE_BY_ROUND[i - 1][1]);
    }
  });

  it('hedef turun aralığında; üç farklı seçenek var, hedef içinde, hepsi 1..üst sınır', () => {
    const rng = seeded(7);
    for (const r of ROUNDS) {
      const [lo, hi] = rangeOf(r);
      let prev = 0;
      for (let i = 0; i < 300; i++) {
        const x = buildRound(r, prev, rng);
        expect(x.target).toBeGreaterThanOrEqual(lo); expect(x.target).toBeLessThanOrEqual(hi);
        expect(x.options).toHaveLength(3);
        expect(new Set(x.options).size).toBe(3);
        expect(x.options).toContain(x.target);
        for (const o of x.options) { expect(o).toBeGreaterThanOrEqual(1); expect(o).toBeLessThanOrEqual(hi); }
        prev = x.target;
      }
    }
  });

  it('arka arkaya aynı hedef gelmez', () => {
    const rng = seeded(11);
    for (const r of ROUNDS) {
      let prev = 0;
      for (let i = 0; i < 300; i++) {
        const x = buildRound(r, prev, rng);
        expect(x.target).not.toBe(prev);
        prev = x.target;
      }
    }
  });

  it('ilk dört tur eski 1-5 deneyimini korur; son iki tur 10\'a ulaşır', () => {
    const rng = seeded(13);
    for (const r of [1, 2, 3, 4]) {
      for (let i = 0; i < 300; i++) expect(Math.max(...buildRound(r, 0, rng).options)).toBeLessThanOrEqual(5);
    }
    for (const r of [7, 8]) {
      const gorulen = new Set<number>();
      for (let i = 0; i < 300; i++) buildRound(r, 0, rng).options.forEach((o) => gorulen.add(o));
      expect(gorulen.has(10)).toBe(true);
    }
  });

  it('buildCounts dar aralıkta (üst sınır 3) da üç farklı sayı verir', () => {
    const rng = seeded(3);
    for (let c = 1; c <= 3; c++) {
      const o = buildCounts(c, 3, rng);
      expect(new Set(o)).toEqual(new Set([1, 2, 3]));
    }
  });

  it('küçük nokta yalnız içinde 10 olan turlarda gerekir', () => {
    expect(needsCompactDots([8, 9, 10])).toBe(true);
    expect(needsCompactDots([7, 8, 9])).toBe(false);
    expect(needsCompactDots([1, 2, 3])).toBe(false);
  });
});
