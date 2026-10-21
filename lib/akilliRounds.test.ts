import {
  buildCompareRound,
  buildCountRound,
  COMPARE_CFG,
  COUNT_OPTION_COUNT_BY_DIFF,
  COUNT_RANGE_BY_DIFF,
} from './akilliRounds';

// Deterministik sözde-rastgele (mulberry32): istatistik testleri kararsız olmasın.
const seeded = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const DIFFS = [1, 2, 3, 4, 5];

describe('Akıllı Sayı Avı turları', () => {
  it.each(DIFFS)('zorluk %i: doğru sayı seçeneklerde, tekrarsız, 1-10 aralığında, beklenen seçenek sayısında', (diff) => {
    const rng = seeded(diff);
    const [lo, hi] = COUNT_RANGE_BY_DIFF[diff];
    for (let i = 0; i < 300; i++) {
      const r = buildCountRound(diff, undefined, rng);
      expect(r.count).toBeGreaterThanOrEqual(lo);
      expect(r.count).toBeLessThanOrEqual(hi);
      expect(r.options).toContain(r.count);
      expect(new Set(r.options).size).toBe(r.options.length);
      expect(r.options).toHaveLength(COUNT_OPTION_COUNT_BY_DIFF[diff]);
      r.options.forEach((n) => { expect(n).toBeGreaterThanOrEqual(1); expect(n).toBeLessThanOrEqual(10); });
    }
  });

  it('REGRESYON (#20): çeldiriciler hep aynı küçük sayılar (1-2-3-4) değil, 1-10 arasında dağılır', () => {
    // Eski hata: karıştırılan liste atılıyordu → zorluk 1-3'te seçenekler ⊂ {1,2,3,4,count}.
    const rng = seeded(7);
    for (const diff of [2, 3]) {
      const seen = new Set<number>();
      for (let i = 0; i < 400; i++) buildCountRound(diff, undefined, rng).options.forEach((n) => seen.add(n));
      expect(seen.size).toBeGreaterThanOrEqual(9);
    }
  });

  it('zorluk 1-2: çeldiriciler sayıdan en az 3 uzakta (kolay)', () => {
    const rng = seeded(11);
    for (const diff of [1, 2]) {
      for (let i = 0; i < 300; i++) {
        const r = buildCountRound(diff, undefined, rng);
        r.options.filter((n) => n !== r.count).forEach((n) => expect(Math.abs(n - r.count)).toBeGreaterThanOrEqual(3));
      }
    }
  });

  it('zorluk 4-5: çeldiriciler sayıya yakın (en çok 3 fark) ve ±1 komşu hep var (zor)', () => {
    const rng = seeded(13);
    for (const diff of [4, 5]) {
      for (let i = 0; i < 300; i++) {
        const r = buildCountRound(diff, undefined, rng);
        const others = r.options.filter((n) => n !== r.count);
        others.forEach((n) => expect(Math.abs(n - r.count)).toBeLessThanOrEqual(3));
        expect(others.some((n) => Math.abs(n - r.count) === 1)).toBe(true);
      }
    }
  });

  it('arka arkaya aynı sayı gelmez', () => {
    const rng = seeded(17);
    for (const diff of DIFFS) {
      let prev: number | undefined;
      for (let i = 0; i < 200; i++) {
        const r = buildCountRound(diff, prev, rng);
        if (prev !== undefined) expect(r.count).not.toBe(prev);
        prev = r.count;
      }
    }
  });

  it('seviye yükseldikçe sayılar büyür (komşu seviyeler arasında fark hissedilir)', () => {
    const rng = seeded(19);
    const means = DIFFS.map((d) => mean(Array.from({ length: 600 }, () => buildCountRound(d, undefined, rng).count)));
    for (let i = 1; i < means.length; i++) expect(means[i] - means[i - 1]).toBeGreaterThan(0.8);
  });

  it('doğru sayının seçenekteki yeri her konuma eşit dağılır (ortaya basma ezberi yok)', () => {
    const rng = seeded(23);
    const N = 4000;
    const pos = [0, 0, 0, 0];
    for (let i = 0; i < N; i++) {
      const r = buildCountRound(3, undefined, rng);
      pos[r.options.indexOf(r.count)]++;
    }
    pos.forEach((c) => { expect(c / N).toBeGreaterThan(0.21); expect(c / N).toBeLessThan(0.29); });
  });
});

describe('Akıllı Miktar turları', () => {
  it.each(DIFFS)('zorluk %i: iki taraf farklı, fark ve sayılar yapılandırılan aralıkta', (diff) => {
    const c = COMPARE_CFG[diff];
    const rng = seeded(100 + diff);
    for (let i = 0; i < 300; i++) {
      const r = buildCompareRound(diff, undefined, rng);
      const gap = Math.abs(r.left - r.right);
      expect(r.left).not.toBe(r.right);
      expect(gap).toBeGreaterThanOrEqual(c.minGap);
      expect(gap).toBeLessThanOrEqual(c.maxGap);
      [r.left, r.right].forEach((n) => { expect(n).toBeGreaterThanOrEqual(c.lo); expect(n).toBeLessThanOrEqual(c.hi); });
    }
  });

  it('zorluk arttıkça iki taraf birbirine yaklaşır ve sayılar büyür', () => {
    const rng = seeded(31);
    const rounds = DIFFS.map((d) => Array.from({ length: 600 }, () => buildCompareRound(d, undefined, rng)));
    const gaps = rounds.map((rs) => mean(rs.map((r) => Math.abs(r.left - r.right))));
    const sizes = rounds.map((rs) => mean(rs.map((r) => (r.left + r.right) / 2))); // ortalama nesne sayısı
    for (let i = 1; i < DIFFS.length; i++) {
      expect(gaps[i]).toBeLessThan(gaps[i - 1]);
      expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
    }
    // En kolayda fark ~4, en zorda 1 (seviye atlamak gerçekten farklı hissettirir).
    expect(gaps[0]).toBeGreaterThan(3.5);
    expect(gaps[4]).toBe(1);
  });

  it('büyük taraf sol/sağ dengeli, "çok/az" sorusu dengeli', () => {
    const rng = seeded(37);
    for (const diff of DIFFS) {
      const rs = Array.from({ length: 2000 }, () => buildCompareRound(diff, undefined, rng));
      const leftBigger = rs.filter((r) => r.left > r.right).length / rs.length;
      const more = rs.filter((r) => r.more).length / rs.length;
      expect(leftBigger).toBeGreaterThan(0.44); expect(leftBigger).toBeLessThan(0.56);
      expect(more).toBeGreaterThan(0.44); expect(more).toBeLessThan(0.56);
    }
  });

  it('arka arkaya aynı çift (aynı yerleşimle) gelmez', () => {
    const rng = seeded(41);
    for (const diff of DIFFS) {
      let prev = buildCompareRound(diff, undefined, rng);
      for (let i = 0; i < 200; i++) {
        const r = buildCompareRound(diff, prev, rng);
        expect(r.left === prev.left && r.right === prev.right).toBe(false);
        prev = r;
      }
    }
  });
});
