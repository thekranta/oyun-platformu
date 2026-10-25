import { LEVELS, buildOruntuRound } from './akilliOruntuRounds';

const seeded = (seed: number) => () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const SEVIYELER = [1, 2, 3, 4, 5];

describe('Akıllı Örüntü seviyeleri', () => {
  it('beş seviyenin hepsi birbirinden farklı ayar verir (kolaylaştırma ve zorlaştırma gerçek)', () => {
    const imza = SEVIYELER.map((d) => JSON.stringify(LEVELS[d]));
    expect(new Set(imza).size).toBe(5);
  });

  it('zorluk arttıkça birim uzunluğu ve seçenek sayısı azalmaz; örüntü tekrarı artmaz', () => {
    for (let d = 2; d <= 5; d++) {
      expect(LEVELS[d].unitLen).toBeGreaterThanOrEqual(LEVELS[d - 1].unitLen);
      expect(LEVELS[d].options).toBeGreaterThanOrEqual(LEVELS[d - 1].options);
      expect(LEVELS[d].reps).toBeLessThanOrEqual(LEVELS[d - 1].reps);
    }
  });

  it.each(SEVIYELER)('seviye %i: cevap örüntünün devamı; seçenekler benzersiz ve cevabı içerir', (d) => {
    const rng = seeded(100 + d);
    const { unitLen, reps, options } = LEVELS[d];
    for (let i = 0; i < 300; i++) {
      const r = buildOruntuRound(d, rng);
      const unit = r.shown.slice(0, unitLen);
      expect(new Set(unit).size).toBe(unitLen);                       // birimdeki renkler farklı
      expect(r.shown.length).toBeGreaterThanOrEqual(reps * unitLen);
      expect(r.shown.length).toBeLessThan((reps + 1) * unitLen);
      r.shown.forEach((c, k) => expect(c).toBe(unit[k % unitLen]));   // dizi birimi tekrar ediyor
      expect(r.answer).toBe(unit[r.shown.length % unitLen]);          // cevap sıradaki
      expect(r.options).toHaveLength(options);
      expect(new Set(r.options).size).toBe(options);
      expect(r.options).toContain(r.answer);
    }
  });

  it('seçenek sayısı yeterliyse çeldiricilerin önce örüntüdeki diğer renklerden gelir (3 ve üstü birimde)', () => {
    const rng = seeded(7);
    for (let i = 0; i < 200; i++) {
      const r = buildOruntuRound(4, rng);                             // birim 3, 4 seçenek: 2 çeldirici örüntüdeki diğer renkler
      const unit = r.shown.slice(0, 3);
      const orguden = r.options.filter((o) => o !== r.answer && unit.includes(o));
      expect(orguden).toHaveLength(2);
    }
  });
});
