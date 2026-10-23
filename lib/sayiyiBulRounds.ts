// Sayıyı Bul (sayiyi-bul) tur üretimi: hedef sayı, üç kutudaki nokta sayıları ve 10 noktalı kutu için küçük nokta kuralı.
// Maarif MAB.1: 36-48 ay 1-5, 48-60 ay 1-10 nesne sayma -> ilk dört tur eski 1-5 aralığında kalır, son iki aşama 10'a kadar çıkar.

export type Rng = () => number;

/** Tur -> [en küçük, en büyük] hedef. Çeldiriciler 1..en büyük arasından gelir. */
export const RANGE_BY_ROUND: Array<[number, number]> = [
  [1, 3], [1, 3], [2, 5], [2, 5], [4, 7], [4, 7], [6, 10], [6, 10],
];

export const rangeOf = (round: number): [number, number] =>
  RANGE_BY_ROUND[Math.min(Math.max(round, 1), RANGE_BY_ROUND.length) - 1];

const shuffle = <T,>(arr: T[], rng: Rng): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Hedef + en yakın komşuları (±1, ±2) 1..cap içinde; üç farklı sayı, karışık sırada. */
export const buildCounts = (correct: number, cap: number, rng: Rng = Math.random): number[] => {
  const set = new Set<number>([correct]);
  let d = 1;
  while (set.size < 3) {
    if (correct - d >= 1) set.add(correct - d);
    if (set.size < 3 && correct + d <= cap) set.add(correct + d);
    d++;
    if (d > cap) break;
  }
  return shuffle(Array.from(set), rng);
};

export interface SayiyiBulRound {
  target: number;
  options: number[];
}

/** Bir tur: hedef turun aralığından seçilir, bir önceki hedefle aynı gelmez. */
export function buildRound(round: number, prevTarget: number, rng: Rng = Math.random): SayiyiBulRound {
  const [lo, hi] = rangeOf(round);
  let target = lo + Math.floor(rng() * (hi - lo + 1));
  if (target === prevTarget) target = target === hi ? lo : target + 1;
  return { target, options: buildCounts(target, hi, rng) };
}

/** 10 nokta 26 px'te dört satıra çıkıp kutudan taşar: o turun TÜM kutularında küçük nokta kullanılır (nokta boyu cevabı ele vermesin). */
export const needsCompactDots = (options: number[]): boolean => Math.max(0, ...options) >= 10;
