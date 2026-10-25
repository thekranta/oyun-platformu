// Kaç Oldu? turları. Eskiden her turda iki grup ayrı ayrı rastgele seçiliyordu; toplam 4 bütün çiftlerin %39'u olduğundan
// 8 turun 6'sında 4 sorulabiliyordu (kullanıcı notu 2026-10-25: "8 sahnenin 6'sında 4'ü soruyor").
// Artık 8 turda 2, 3, 4 ve 5 toplamları ikişer kez gelir, art arda aynı toplam sorulmaz, aynı iki grup (a+b) tekrar etmez.

export interface KacOlduRound { a: number; b: number; total: number }

export const KAC_OLDU_TOTALS = [2, 3, 4, 5] as const;
export const ROUNDS_PER_TOTAL = 2;
export const KAC_OLDU_ROUNDS = KAC_OLDU_TOTALS.length * ROUNDS_PER_TOTAL; // 8

// Her toplam için olası (a, b) çiftleri: iki grup da 1-3 nesne, toplam en çok 5.
const COMBOS: Record<number, [number, number][]> = {
  2: [[1, 1]],
  3: [[1, 2], [2, 1]],
  4: [[1, 3], [2, 2], [3, 1]],
  5: [[2, 3], [3, 2]],
};

const shuffle = <T,>(arr: T[], rng: () => number): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

export function buildKacOlduRounds(rng: () => number = Math.random): KacOlduRound[] {
  const pool = KAC_OLDU_TOTALS.flatMap((t) => Array<number>(ROUNDS_PER_TOTAL).fill(t));
  let totals = pool;
  let ok = false;
  for (let tries = 0; tries < 300 && !ok; tries++) {
    totals = shuffle(pool, rng);
    ok = totals.every((t, i) => i === 0 || t !== totals[i - 1]);
  }
  if (!ok) totals = [...KAC_OLDU_TOTALS, ...KAC_OLDU_TOTALS]; // rastgele deneme tutmazsa (pratikte olmaz) 2,3,4,5,2,3,4,5

  const used: Record<number, number[]> = {};
  return totals.map((total) => {
    const all = COMBOS[total];
    const taken = used[total] ?? (used[total] = []);
    const free = all.map((_, i) => i).filter((i) => !taken.includes(i));
    const candidates = free.length ? free : all.map((_, i) => i);
    const pick = candidates[Math.floor(rng() * candidates.length)];
    taken.push(pick);
    const [a, b] = all[pick];
    return { a, b, total };
  });
}
