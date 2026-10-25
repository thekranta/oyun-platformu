import { buildKacOlduRounds, KAC_OLDU_ROUNDS, KAC_OLDU_TOTALS, ROUNDS_PER_TOTAL } from './kacOlduRounds';

// Deterministik rastgele sayı üreteci (mulberry32)
const seeded = (seed: number) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe('Kaç Oldu? turları', () => {
  it('8 tur: 2, 3, 4 ve 5 toplamları ikişer kez (hiçbiri 2\'den fazla gelmez)', () => {
    expect(KAC_OLDU_ROUNDS).toBe(8);
    for (let s = 1; s <= 300; s++) {
      const rounds = buildKacOlduRounds(seeded(s));
      expect(rounds).toHaveLength(KAC_OLDU_ROUNDS);
      KAC_OLDU_TOTALS.forEach((t) => {
        expect(rounds.filter((r) => r.total === t)).toHaveLength(ROUNDS_PER_TOTAL);
      });
    }
  });

  it('REGRESYON (#46): 8 turun 6\'sında aynı toplam sorulmaz, art arda aynı toplam gelmez', () => {
    for (let s = 1; s <= 300; s++) {
      const rounds = buildKacOlduRounds(seeded(s));
      const counts = new Map<number, number>();
      rounds.forEach((r) => counts.set(r.total, (counts.get(r.total) ?? 0) + 1));
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
      for (let i = 1; i < rounds.length; i++) expect(rounds[i].total).not.toBe(rounds[i - 1].total);
    }
  });

  it('iki grup 1-3 nesne, toplam a+b ve en çok 5; aynı (a, b) çifti tekrar etmez (toplam 2 hariç)', () => {
    for (let s = 1; s <= 300; s++) {
      const rounds = buildKacOlduRounds(seeded(s));
      rounds.forEach((r) => {
        expect(r.a).toBeGreaterThanOrEqual(1);
        expect(r.b).toBeGreaterThanOrEqual(1);
        expect(r.a).toBeLessThanOrEqual(3);
        expect(r.b).toBeLessThanOrEqual(3);
        expect(r.a + r.b).toBe(r.total);
        expect(r.total).toBeLessThanOrEqual(5);
      });
      const pairs = rounds.filter((r) => r.total !== 2).map((r) => `${r.a}+${r.b}`);
      expect(new Set(pairs).size).toBe(pairs.length);
    }
  });

  it('rastgelelik: farklı tohumlarda farklı sıralar çıkar', () => {
    const orders = new Set<string>();
    for (let s = 1; s <= 50; s++) orders.add(buildKacOlduRounds(seeded(s)).map((r) => r.total).join(''));
    expect(orders.size).toBeGreaterThan(5);
  });
});
