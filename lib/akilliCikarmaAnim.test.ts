import { animasyonSuresiMs, goneIndexes, holdMs } from './akilliCikarmaAnim';

describe('Akıllı Çıkarma animasyonu', () => {
  it('her tur için toplam animasyon süresi makul (1,5-4,5 sn): çocuk beklemekten sıkılmaz, görmeye vakit bulur', () => {
    for (let total = 2; total <= 9; total++) {
      for (let removed = 1; removed < total; removed++) {
        const ms = animasyonSuresiMs(total, removed);
        expect(ms).toBeGreaterThanOrEqual(1500);
        expect(ms).toBeLessThanOrEqual(4500);
      }
    }
  });

  it('önce hepsi görünür: bekleme süresi sayı arttıkça uzar, hiç 0 olmaz', () => {
    expect(holdMs(2)).toBeGreaterThan(0);
    for (let t = 3; t <= 9; t++) expect(holdMs(t)).toBeGreaterThan(holdMs(t - 1));
  });

  it('daha çok kurabiye gidince animasyon biraz uzar', () => {
    expect(animasyonSuresiMs(9, 5)).toBeGreaterThan(animasyonSuresiMs(9, 1));
  });

  it('giden kurabiyeler sağ uçtan, tam removed tane ve dizinin içinde', () => {
    expect(goneIndexes(5, 2)).toEqual([3, 4]);
    expect(goneIndexes(9, 8)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (let total = 2; total <= 9; total++) {
      for (let removed = 1; removed < total; removed++) {
        const g = goneIndexes(total, removed);
        expect(g).toHaveLength(removed);
        expect(Math.min(...g)).toBeGreaterThanOrEqual(1);
        expect(Math.max(...g)).toBe(total - 1);
      }
    }
  });
});
