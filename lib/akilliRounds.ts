/**
 * Akıllı Sayı Avı ve Akıllı Miktar'ın tur üreticileri (saf, test edilebilir).
 *
 * Zorluk (1-5) çocuğun performansına göre lib/useAdaptiveDifficulty ile ayarlanır; burada
 * her zorluğun ÇOCUĞA NASIL GÖRÜNDÜĞÜ tanımlanır: sayı büyüklüğü, seçenek sayısı ve
 * çeldiricilerin yakınlığı. Komşu iki seviye arasında fark hissedilir olmalıdır.
 *
 * Eski sürümde Akıllı Sayı Avı'nda çeldiriciler `shuffle(pool)` sonucu atıldığı için
 * zorluk 1-3'te hep 1-2-3-4 çıkıyordu (Oyun_Test_Listesi #20 "net bir hata var").
 */

export type Rng = () => number;

const shuffled = <T>(items: T[], rng: Rng): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ───────────────────────── Akıllı Sayı Avı: "Kaç tane var?" ─────────────────────────

export const COUNT_RANGE_BY_DIFF: Record<number, [number, number]> = {
  1: [1, 3],
  2: [2, 5],
  3: [3, 7],
  4: [5, 9],
  5: [6, 10],
};

/** Seçenek sayısı: en kolay seviyede 3, diğerlerinde 4 (4'ten fazlası dar ekranda taşar). */
export const COUNT_OPTION_COUNT_BY_DIFF: Record<number, number> = { 1: 3, 2: 4, 3: 4, 4: 4, 5: 4 };

/** Çeldirici seçimi: düşük seviyede sayıdan UZAK, orta seviyede serbest, yüksek seviyede YAKIN. */
function pickDistractors(count: number, diff: number, k: number, rng: Rng): number[] {
  const pool: number[] = [];
  for (let n = 1; n <= 10; n++) if (n !== count) pool.push(n);
  const dist = (n: number) => Math.abs(n - count);

  if (diff <= 2) {
    const far = shuffled(pool.filter((n) => dist(n) >= 3), rng);
    if (far.length >= k) return far.slice(0, k);
    // Yeterince uzak sayı yoksa en uzaktakilerle tamamla.
    const rest = pool.filter((n) => dist(n) < 3).sort((a, b) => dist(b) - dist(a));
    return [...far, ...rest].slice(0, k);
  }
  if (diff === 3) return shuffled(pool, rng).slice(0, k);

  // diff >= 4: en yakın sayılar (eşit uzaklıkta rastgele).
  return pool
    .map((n) => ({ n, key: dist(n) + rng() * 0.9 }))
    .sort((a, b) => a.key - b.key)
    .slice(0, k)
    .map((x) => x.n);
}

export interface CountRound {
  count: number;
  options: number[];
}

export function buildCountRound(diff: number, prevCount?: number, rng: Rng = Math.random): CountRound {
  const d = COUNT_RANGE_BY_DIFF[diff] ? diff : 2;
  const [lo, hi] = COUNT_RANGE_BY_DIFF[d];
  let count = lo + Math.floor(rng() * (hi - lo + 1));
  if (count === prevCount && hi > lo) count = count === hi ? lo : count + 1; // arka arkaya aynı sayı gelmesin
  const k = COUNT_OPTION_COUNT_BY_DIFF[d] - 1;
  const options = shuffled([count, ...pickDistractors(count, d, k, rng)], rng);
  return { count, options };
}

// ───────────────────────── Akıllı Miktar: "Hangisinde daha çok/az var?" ─────────────────────────

export interface CompareConfig {
  lo: number;
  hi: number;
  minGap: number;
  maxGap: number;
}

/** Zorluk arttıkça sayılar büyür ve iki taraf birbirine YAKLAŞIR (ayırt etmesi zorlaşır). */
export const COMPARE_CFG: Record<number, CompareConfig> = {
  1: { lo: 1, hi: 6, minGap: 3, maxGap: 5 },
  2: { lo: 1, hi: 7, minGap: 2, maxGap: 3 },
  3: { lo: 2, hi: 8, minGap: 2, maxGap: 2 },
  4: { lo: 3, hi: 9, minGap: 1, maxGap: 2 },
  5: { lo: 4, hi: 10, minGap: 1, maxGap: 1 },
};

export interface CompareRound {
  left: number;
  right: number;
  more: boolean;
}

export function buildCompareRound(diff: number, prev?: CompareRound, rng: Rng = Math.random): CompareRound {
  const c = COMPARE_CFG[diff] || COMPARE_CFG[2];
  // Geçerli tüm (sol, sağ) çiftleri say; rastgele birini seç → döngü/yedek-değer gerekmez.
  const pairs: [number, number][] = [];
  for (let l = c.lo; l <= c.hi; l++) {
    for (let r = c.lo; r <= c.hi; r++) {
      const gap = Math.abs(l - r);
      if (gap >= c.minGap && gap <= c.maxGap) pairs.push([l, r]);
    }
  }
  // Önceki turla aynı çift (aynı yerleşimle) gelmesin.
  const fresh = prev ? pairs.filter(([l, r]) => !(l === prev.left && r === prev.right)) : pairs;
  const usable = fresh.length ? fresh : pairs;
  const [left, right] = usable[Math.floor(rng() * usable.length)];
  return { left, right, more: rng() > 0.5 };
}
