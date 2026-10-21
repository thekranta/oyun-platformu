import { ALL_FOODS, generateLevel, itemCountFor, shuffle } from './mutfakDedektifi';

// Deterministik sözde-rastgele (mulberry32).
const seeded = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe('Mutfak Dedektifi', () => {
  it('REGRESYON (#60): domates, biber ve mantar havuzda yok; elma çifti çocuğu yanıltmaz', () => {
    const ids = ALL_FOODS.map((f) => f.id);
    ['domates', 'biber', 'mantar'].forEach((id) => expect(ids).not.toContain(id));
    ['🍅', '🌶️', '🍄'].forEach((e) => expect(ALL_FOODS.map((f) => f.emoji)).not.toContain(e));
  });

  it('havuz: 10 meyve + 7 sebze, kimlikler ve emojiler tekil', () => {
    expect(ALL_FOODS.filter((f) => f.category === 'meyve')).toHaveLength(10);
    expect(ALL_FOODS.filter((f) => f.category === 'sebze')).toHaveLength(7);
    expect(new Set(ALL_FOODS.map((f) => f.id)).size).toBe(ALL_FOODS.length);
    expect(new Set(ALL_FOODS.map((f) => f.emoji)).size).toBe(ALL_FOODS.length);
  });

  it('seviye başına yiyecek sayısı 3, 4, 5, 6, 6', () => {
    expect([1, 2, 3, 4, 5].map(itemCountFor)).toEqual([3, 4, 5, 6, 6]);
  });

  it.each([1, 2, 3, 4, 5])('seviye %i: sayı doğru, tekrar yok, iki kategori de var, meyve-sebze renk çakışması yok', (level) => {
    const rng = seeded(level * 101);
    for (let i = 0; i < 3000; i++) {
      const board = generateLevel(level, rng);
      expect(board).toHaveLength(itemCountFor(level));
      expect(new Set(board.map((f) => f.id)).size).toBe(board.length);
      const fruits = board.filter((f) => f.category === 'meyve');
      const veggies = board.filter((f) => f.category === 'sebze');
      expect(fruits.length).toBeGreaterThanOrEqual(1);
      expect(veggies.length).toBeGreaterThanOrEqual(1);
      const fruitLooks = new Set(fruits.map((f) => f.look));
      veggies.forEach((v) => expect(fruitLooks.has(v.look)).toBe(false));
    }
  });

  it('karıştırma düzgün: 4 elemanlı dizide her eleman her konuma ~eşit düşer (eski sort(random) yanlıydı)', () => {
    const rng = seeded(7);
    const N = 20000;
    const pos = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    for (let i = 0; i < N; i++) shuffle([0, 1, 2, 3], rng).forEach((v, p) => { pos[v][p]++; });
    pos.forEach((row) => row.forEach((c) => {
      expect(c / N).toBeGreaterThan(0.23);
      expect(c / N).toBeLessThan(0.27);
    }));
  });

  it('her seviyede her yiyecek tahtalara çıkabilir (havuz boşa gitmiyor)', () => {
    const rng = seeded(11);
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) generateLevel(4, rng).forEach((f) => seen.add(f.id));
    expect(seen.size).toBe(ALL_FOODS.length);
  });
});
