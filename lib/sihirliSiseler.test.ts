import {
  applyPour,
  bottleCount,
  generate,
  hint,
  isBottleComplete,
  isSolved,
  MAX_OPTIMAL_MOVES,
  pourCount,
  solve,
  tierForAge,
  validTargets,
  type Bottle,
} from './sihirliSiseler';

// Deterministik sözde-rastgele (mulberry32).
const seeded = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const AGES = [30, 42, 43, 54, 55, 66, 67, 80];

describe('kademeler', () => {
  it('yaşa göre kademe: ≤42, ≤54, ≤66, >66 ay; hepsinde 2 boş şişe (1 boş şişe çıkmaz üretiyordu)', () => {
    expect(AGES.map((a) => tierForAge(a).level)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
    [1, 2, 3, 4].forEach((l) => {
      const t = tierForAge([36, 48, 60, 72][l - 1]);
      expect(t.empty).toBe(2);
      expect(t.colors).toBeGreaterThanOrEqual(2);
      expect(t.capacity).toBeGreaterThanOrEqual(2);
    });
  });

  it('zorluk yaşla artar: renk × kapasite ve şişe sayısı azalmaz', () => {
    const tiers = [36, 48, 60, 72].map(tierForAge);
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i].colors * tiers[i].capacity).toBeGreaterThanOrEqual(tiers[i - 1].colors * tiers[i - 1].capacity);
      expect(bottleCount(tiers[i])).toBeGreaterThanOrEqual(bottleCount(tiers[i - 1]));
    }
  });
});

describe('dökme kuralları', () => {
  const cap = 4;

  it('aynı renge ya da boş şişeye dökülür; farklı renge, dolu şişeye, kendine ve boş kaynaktan dökülmez', () => {
    const b: Bottle[] = [[0, 1], [1, 1], [0, 0, 0, 0], [], [2, 0]];
    expect(pourCount(b, 0, 1, cap)).toBe(1);   // 1 → üstü 1 olan şişeye
    expect(pourCount(b, 0, 3, cap)).toBe(1);   // boş şişeye
    expect(pourCount(b, 0, 4, cap)).toBe(0);   // üst renk farklı (1 → 0)
    expect(pourCount(b, 4, 2, cap)).toBe(0);   // hedef dolu
    expect(pourCount(b, 0, 0, cap)).toBe(0);   // kendine
    expect(pourCount(b, 3, 0, cap)).toBe(0);   // boş kaynak
  });

  it('üstteki aynı renkli katmanların hepsi (hedefte yer varsa) tek hamlede dökülür; yer yetmezse sığdığı kadar', () => {
    expect(applyPour([[1, 0, 0, 0], []], 0, 1, cap)!.count).toBe(3);
    expect(applyPour([[1, 0, 0, 0], [0, 0, 0]], 0, 1, cap)!.count).toBe(1);
    const r = applyPour([[1, 0, 0, 0], [0, 0]], 0, 1, cap)!;
    expect(r.count).toBe(2);
    expect(r.bottles).toEqual([[1, 0], [0, 0, 0, 0]]);
  });

  it('dökme değişmezdir (girdi dizisi bozulmaz) ve geçersizse null döner', () => {
    const b: Bottle[] = [[0, 1], []];
    const snapshot = JSON.stringify(b);
    applyPour(b, 0, 1, cap);
    expect(JSON.stringify(b)).toBe(snapshot);
    expect(applyPour(b, 1, 0, cap)).toBeNull();
  });

  it('tamamlanmış şişe: tam dolu ve tek renk; çözülmüş: her şişe boş ya da tamamlanmış', () => {
    expect(isBottleComplete([2, 2, 2, 2], 4)).toBe(true);
    expect(isBottleComplete([2, 2, 2], 4)).toBe(false);
    expect(isBottleComplete([2, 2, 1, 2], 4)).toBe(false);
    expect(isSolved([[0, 0], [1, 1], [], []], 2)).toBe(true);
    expect(isSolved([[0, 1], [1, 0], [], []], 2)).toBe(false);
  });

  it('geçerli hedefler: seçili şişeden dökülebilen şişeler', () => {
    const b: Bottle[] = [[0, 1], [1, 1], [0, 0], []];
    expect(validTargets(b, 0, 4)).toEqual([1, 3]);
  });
});

describe('çözücü ve ipucu', () => {
  it('çözülmüş durum için boş yol, çözümsüz/aşırı büyük için null', () => {
    expect(solve([[0, 0], [1, 1], [], []], 2)).toEqual([]);
    // 1 boş şişeli, elle kurulmuş çıkmaz: iki şişe, iki renk, kapasite 2, boş şişe yok
    expect(solve([[0, 1], [1, 0]], 2)).toBeNull();
  });

  it('bilinen küçük bulmacada en kısa çözümü bulur (3 hamle) ve yol gerçekten çözer', () => {
    const start: Bottle[] = [[0, 1], [0, 1], [], []];
    const path = solve(start, 2)!;
    expect(path).toHaveLength(3);
    let state = start;
    for (const [from, to] of path) state = applyPour(state, from, to, 2)!.bottles;
    expect(isSolved(state, 2)).toBe(true);
  });

  it('ipucu geçerli bir hamledir ve o hamleden sonra çözüm bir hamle kısalır', () => {
    const start: Bottle[] = [[0, 1, 0], [1, 0, 1], [], []];
    const full = solve(start, 3)!;
    const h = hint(start, 3)!;
    expect(pourCount(start, h[0], h[1], 3)).toBeGreaterThan(0);
    const after = applyPour(start, h[0], h[1], 3)!.bottles;
    expect(solve(after, 3)!).toHaveLength(full.length - 1);
  });

  it('ipucu: çözülmüş durumda null', () => {
    expect(hint([[0, 0], [1, 1], [], []], 2)).toBeNull();
  });
});

describe('bulmaca üretimi', () => {
  it.each([36, 48, 60, 72])('yaş %i ay: her rengin katman sayısı kapasiteye eşit, 2 boş şişe, tamamlanmış şişeyle başlamaz, ÇÖZÜLEBİLİR ve kısa', (age) => {
    const tier = tierForAge(age);
    const rng = seeded(age);
    for (let i = 0; i < 300; i++) {
      const bottles = generate(tier, rng);
      expect(bottles).toHaveLength(bottleCount(tier));
      expect(bottles.filter((b) => b.length === 0)).toHaveLength(tier.empty);
      const counts = new Map<number, number>();
      bottles.flat().forEach((c) => counts.set(c, (counts.get(c) ?? 0) + 1));
      expect(counts.size).toBe(tier.colors);
      counts.forEach((n) => expect(n).toBe(tier.capacity));
      bottles.forEach((b) => expect(b.length).toBeLessThanOrEqual(tier.capacity));
      // REGRESYON (#59): zaten çözülmüş ya da tamamlanmış şişeli başlangıç yok
      expect(bottles.some((b) => isBottleComplete(b, tier.capacity))).toBe(false);
      expect(isSolved(bottles, tier.capacity)).toBe(false);
      // REGRESYON (#59): eski 1 boşlu kademelerde %23,5'i çözümsüzdü
      const path = solve(bottles, tier.capacity);
      expect(path).not.toBeNull();
      expect(path!.length).toBeLessThanOrEqual(MAX_OPTIMAL_MOVES[tier.level]);
    }
  });

  it('REGRESYON: 1 boş şişeli eski kademe gerçekten çıkmaz üretiyordu (3 renk, kapasite 4, 1 boş)', () => {
    const rng = seeded(99);
    const old = { level: 0, colors: 3, capacity: 4, empty: 1 };
    let unsolvable = 0;
    const N = 300;
    for (let i = 0; i < N; i++) if (solve(generate(old, rng), 4) === null) unsolvable++;
    expect(unsolvable / N).toBeGreaterThan(0.05); // ölçüm: ≈ %23 → yeni tablo 2 boş şişeyle bunu sıfırlar
  });

  it('üretim çeşitli: aynı kademede farklı başlangıçlar çıkar', () => {
    const rng = seeded(5);
    const keys = new Set<string>();
    for (let i = 0; i < 200; i++) keys.add(JSON.stringify(generate(tierForAge(60), rng)));
    expect(keys.size).toBeGreaterThan(20);
  });
});
