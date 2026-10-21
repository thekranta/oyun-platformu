import { buildNumberOptions } from './answerOptions';

// Deterministik sözde-rastgele (mulberry32): istatistik testi kararsız olmasın.
const seeded = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe('buildNumberOptions', () => {
  it('doğru cevabı içerir, tekrarsızdır ve aralıkta kalır', () => {
    const rng = seeded(1);
    for (let correct = 1; correct <= 5; correct++) {
      for (let i = 0; i < 50; i++) {
        const o = buildNumberOptions(correct, { min: 1, max: 5 }, rng);
        expect(o).toHaveLength(3);
        expect(o).toContain(correct);
        expect(new Set(o).size).toBe(3);
        o.forEach((n) => { expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(5); });
      }
    }
  });

  it('çeldiriciler cevaba en yakın sayılardır (zorluk eskisiyle aynı)', () => {
    const rng = seeded(2);
    const sorted = (c: number) => [...buildNumberOptions(c, { min: 1, max: 5 }, rng)].sort((a, b) => a - b);
    for (let i = 0; i < 30; i++) {
      expect(sorted(1)).toEqual([1, 2, 3]);
      expect(sorted(2)).toEqual([1, 2, 3]);
      expect(sorted(3)).toEqual([2, 3, 4]);
      expect(sorted(4)).toEqual([3, 4, 5]);
      expect(sorted(5)).toEqual([3, 4, 5]);
    }
  });

  it('0 asla seçenek olmaz (aralık 1\'den başlar)', () => {
    const rng = seeded(3);
    for (let i = 0; i < 200; i++) {
      expect(buildNumberOptions(1, { min: 1, max: 5 }, rng)).not.toContain(0);
    }
  });

  it('doğru cevap her konuma eşit sıklıkta düşer (ortadaki tuş ezberlenemez)', () => {
    const rng = seeded(4);
    const N = 6000;
    for (const correct of [1, 2, 3, 4]) {
      const pos = [0, 0, 0];
      for (let i = 0; i < N; i++) pos[buildNumberOptions(correct, { min: 1, max: 5 }, rng).indexOf(correct)]++;
      pos.forEach((c) => {
        expect(c / N).toBeGreaterThan(0.3);
        expect(c / N).toBeLessThan(0.37);
      });
    }
  });

  it('aralık çeldirici sayısından darsa elindeki kadar seçenek döner', () => {
    const o = buildNumberOptions(1, { min: 1, max: 2, count: 3 }, seeded(5));
    expect(o.sort()).toEqual([1, 2]);
  });

  it('istenen seçenek sayısına uyar (4 seçenek)', () => {
    const o = buildNumberOptions(5, { min: 1, max: 10, count: 4 }, seeded(6));
    expect(o).toHaveLength(4);
    expect(o).toContain(5);
    // 4 ve 6 (uzaklık 1) kesin; dördüncü seçenek 3 ya da 7 (uzaklık 2).
    expect([[3, 4, 5, 6], [4, 5, 6, 7]]).toContainEqual([...o].sort((a, b) => a - b));
  });
});
