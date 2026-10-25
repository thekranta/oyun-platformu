// Sihirli Şişeler — saf oyun mantığı (render'dan bağımsız, test edilebilir).
//
// Eski sürüm yetişkin "su sıralama" bulmacasının küçültülmüş kopyasıydı (Oyun_Test_Listesi #59 "çok
// zor, bug ve hata çok"): kapasite hep 4, 1 boş şişeli kademelerde başlangıçların %23,5'i ÇÖZÜMSÜZdü
// (3 renk/1 boş), geri alma/ipucu yoktu, bazı bulmacalar zaten çözülmüş başlıyordu. Burada:
//  - her kademede 2 boş şişe (tam sayımla doğrulandı: çözümsüz başlangıç yok),
//  - kapasite (şişedeki katman sayısı) kademeye göre 2-4: küçük çocuk için daha kısa şişe/bulmaca,
//  - zaten tamamlanmış şişeyle başlamaz,
//  - BFS çözücü: ipucu için ilk hamle + testlerde "çözülebilir ve kısa" garantisi.

export type Bottle = number[]; // alttan üste renk indeksleri
export type Move = [from: number, to: number];
export type Rng = () => number;

export interface Tier {
  /** 1 (en kolay) - 4: oyunun kaydettiği zorluk seviyesi. */
  level: number;
  colors: number;
  /** Bir şişenin alabileceği katman sayısı (= her rengin katman sayısı). */
  capacity: number;
  empty: number;
}

/** Kademe tablosu (1 en kolay). Hepsinde 2 boş şişe; kapasite ve renk sayısı kademeyle artar. */
export const TIERS: Tier[] = [
  { level: 1, colors: 2, capacity: 2, empty: 2 },
  { level: 2, colors: 2, capacity: 3, empty: 2 },
  { level: 3, colors: 3, capacity: 3, empty: 2 },
  { level: 4, colors: 3, capacity: 4, empty: 2 },
];

/** Kademe numarasından (1-4) kademe; sınır dışı değerler uca sıkıştırılır. */
export const tierForLevel = (level: number): Tier => TIERS[Math.max(1, Math.min(level, TIERS.length)) - 1];

/** Yaşa (ay) göre kademe. */
export function tierForAge(ageMonths: number): Tier {
  if (ageMonths <= 42) return TIERS[0];
  if (ageMonths <= 54) return TIERS[1];
  if (ageMonths <= 66) return TIERS[2];
  return TIERS[3];
}

/** Oyun 3 sahnedir (kullanıcı notu #59, 2026-10-25: "bunu da 3 sahneli bir oyun yapalım"). */
export const SCENE_COUNT = 3;

/**
 * Sahnelerin kademeleri: ilk sahne yaş kademesinin bir altı (en kolayda aynı) ısınma, sonraki ikisi yaş kademesi.
 * Hiçbir sahne yaş kademesinden ZOR değildir ("çok zor" şikâyeti #59'daydı; her kademe zaten sayımla doğrulandı).
 */
export function sceneTiers(ageMonths: number): Tier[] {
  const base = tierForAge(ageMonths);
  return [tierForLevel(base.level - 1), base, base];
}

/** Kademe başına en çok gereken hamle (testlerde tam/örneklem sayımla doğrulanır). */
export const MAX_OPTIMAL_MOVES: Record<number, number> = { 1: 3, 2: 5, 3: 8, 4: 11 }; // 1500'er örneklemle ölçüldü (min-medyan-maks: 3-3-3, 3-4-5, 4-6-8, 4-8-11)

export const bottleCount = (t: Tier) => t.colors + t.empty;

function shuffled<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const isBottleComplete = (b: Bottle, capacity: number) =>
  b.length === capacity && b.every((c) => c === b[0]);

export const isSolved = (bottles: Bottle[], capacity: number) =>
  bottles.every((b) => b.length === 0 || isBottleComplete(b, capacity));

/**
 * Yeni bulmaca: her renk `capacity` katman; renkler karıştırılıp `colors` dolu şişeye dağıtılır,
 * üstüne `empty` boş şişe eklenir. Tamamlanmış (tek renk, dolu) şişeyle BAŞLAMAZ → bulmaca zaten
 * çözülmüş açılmaz, çocuk ilk hamlede bedava ✓ görmez.
 */
export function generate(tier: Tier, rng: Rng = Math.random): Bottle[] {
  let last: Bottle[] = [];
  for (let attempt = 0; attempt < 100; attempt++) {
    const layers: number[] = [];
    for (let c = 0; c < tier.colors; c++) for (let i = 0; i < tier.capacity; i++) layers.push(c);
    const mixed = shuffled(layers, rng);
    const bottles: Bottle[] = [];
    for (let b = 0; b < tier.colors; b++) bottles.push(mixed.slice(b * tier.capacity, (b + 1) * tier.capacity));
    for (let e = 0; e < tier.empty; e++) bottles.push([]);
    last = bottles;
    if (!bottles.some((b) => isBottleComplete(b, tier.capacity))) return bottles;
  }
  return last;
}

/** `from` şişesinden `to` şişesine kaç katman dökülebilir (0 = geçersiz hamle). */
export function pourCount(bottles: Bottle[], from: number, to: number, capacity: number): number {
  if (from === to) return 0;
  const src = bottles[from];
  const dst = bottles[to];
  if (!src || !dst || src.length === 0 || dst.length >= capacity) return 0;
  const top = src[src.length - 1];
  if (dst.length > 0 && dst[dst.length - 1] !== top) return 0;
  let run = 0;
  for (let i = src.length - 1; i >= 0 && src[i] === top; i--) run++;
  return Math.min(run, capacity - dst.length);
}

/** Dökme (değişmez): yeni şişe dizisi + dökülen katman sayısı; geçersizse null. */
export function applyPour(
  bottles: Bottle[],
  from: number,
  to: number,
  capacity: number,
): { bottles: Bottle[]; count: number } | null {
  const count = pourCount(bottles, from, to, capacity);
  if (count === 0) return null;
  const next = bottles.map((b) => [...b]);
  const moved = next[from].splice(next[from].length - count, count);
  next[to].push(...moved);
  return { bottles: next, count };
}

/** Hedef olabilecek (geçerli) şişelerin dizinleri. */
export const validTargets = (bottles: Bottle[], from: number, capacity: number): number[] =>
  bottles.map((_, i) => i).filter((i) => pourCount(bottles, from, i, capacity) > 0);

const keyOf = (bottles: Bottle[]) => bottles.map((b) => b.join(',')).sort().join('|');

/**
 * En kısa çözüm (BFS). Çözülmüşse [] , çözümsüzse (ya da sınır aşılırsa) null döner.
 * Durumlar şişe sırasından bağımsız tekilleştirilir; dönen hamleler verilen sıraya göre geçerlidir.
 */
export function solve(start: Bottle[], capacity: number, maxStates = 300000): Move[] | null {
  if (isSolved(start, capacity)) return [];
  const seen = new Set<string>([keyOf(start)]);
  let frontier: { bottles: Bottle[]; path: Move[] }[] = [{ bottles: start, path: [] }];
  let visited = 1;
  while (frontier.length) {
    const next: typeof frontier = [];
    for (const node of frontier) {
      for (let from = 0; from < node.bottles.length; from++) {
        for (let to = 0; to < node.bottles.length; to++) {
          const res = applyPour(node.bottles, from, to, capacity);
          if (!res) continue;
          const key = keyOf(res.bottles);
          if (seen.has(key)) continue;
          seen.add(key);
          const path: Move[] = [...node.path, [from, to]];
          if (isSolved(res.bottles, capacity)) return path;
          if (++visited > maxStates) return null;
          next.push({ bottles: res.bottles, path });
        }
      }
    }
    frontier = next;
  }
  return null;
}

/** Mevcut durumdan en kısa çözümün ilk hamlesi (ipucu); çözülmüş ya da çözümsüzse null. */
export function hint(bottles: Bottle[], capacity: number): Move | null {
  const path = solve(bottles, capacity);
  return path && path.length > 0 ? path[0] : null;
}
