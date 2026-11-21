// Sayalım (en-sayalim) — İngilizce ek etkinlik (Maarif dışı). Saf mantık: tur planı, çeldirici üretimi, sayma kilidi.
// Çocuk nesnelere tek tek dokunur; her yeni dokunuşta sıradaki İngilizce sayı söylenir ("one", "two"...). Hedef sayı hiçbir
// yerde yazılı/etiketli verilmez: yalnız sayarak ortaya çıkar. Sonunda "How many?" sorulur ve üç RAKAM kartından biri seçilir.
// Kelime/cümle verisi TEK KAYNAK: constants/ingilizceKelimeler.ts (burada yalnız okunur).

import { EN_ALKISLAR, EN_HAYVANLAR, EN_MEYVELER, EN_SAYILAR } from '../constants/ingilizceKelimeler';

export type Rng = () => number;

export const TOTAL_ROUNDS = 8;
export const MAX_COUNT = 10;
export const OPTION_COUNT = 3;

/** CountdownOverlay giriş mesajı (Türkçe, kısa, sıcak). TR_YONERGELER ile AYNI metin: sesi ayrıca üretilir. */
export const GIRIS_MESAJI = 'Haydi sayalım! Her nesneye tek tek dokun.';

/** Bu oyunda söylenen TÜM Türkçe konuşma metinleri (klipleri ayrıca üretilecek). */
export const TR_YONERGELER: string[] = [GIRIS_MESAJI];

export const KAZANIM_ODAGI = 'Ek etkinlik (Maarif dışı): İngilizce — nesneleri sayarken İngilizce sayı adlarını (1-10) dinleme';

/** Tur -> [en küçük, en büyük] nesne sayısı: ilk turlar 1-5, son turlar 6-10. */
export const RANGE_BY_ROUND: ReadonlyArray<readonly [number, number]> = [
    [1, 3], [2, 4], [3, 5], [2, 5], [4, 7], [5, 8], [6, 10], [6, 10],
];

export const rangeOf = (round: number): readonly [number, number] =>
    RANGE_BY_ROUND[Math.min(Math.max(Math.floor(round), 1), RANGE_BY_ROUND.length) - 1];

export interface SayalimRound {
    /** Ekrandaki nesne sayısı = doğru rakam. */
    n: number;
    /** Tüm nesneler için ortak emoji. */
    emoji: string;
    /** Üç rakam kartı (doğru dahil, karışık sırada). */
    options: number[];
}

const shuffle = <T,>(arr: readonly T[], rng: Rng): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

/** Hedef + en yakın komşuları (±1, ±2…) 1..MAX_COUNT içinde; üç FARKLI rakam, karışık sırada. */
export function buildOptions(correct: number, rng: Rng = Math.random): number[] {
    const set = new Set<number>([correct]);
    for (let d = 1; d <= MAX_COUNT && set.size < OPTION_COUNT; d++) {
        const lo = correct - d;
        const hi = correct + d;
        // Her iki taraf da mümkünse rastgele sırayla ekle (hep aynı yöne eğilmesin).
        const sides = rng() < 0.5 ? [lo, hi] : [hi, lo];
        for (const v of sides) {
            if (set.size < OPTION_COUNT && v >= 1 && v <= MAX_COUNT) set.add(v);
        }
    }
    return shuffle(Array.from(set), rng);
}

/** Sayma nesneleri için emoji havuzu: hayvan + meyve (tek kaynaktaki emojiler). */
export const NESNE_EMOJILERI: readonly string[] = [...EN_HAYVANLAR, ...EN_MEYVELER]
    .map((k) => k.emoji)
    .filter((e): e is string => typeof e === 'string' && e.length > 0);

function pickCount(round: number, prev: number, used: ReadonlySet<number>, rng: Rng): number {
    const [lo, hi] = rangeOf(round);
    const all: number[] = [];
    for (let v = lo; v <= hi; v++) if (v !== prev) all.push(v);
    // Mümkünse bu oyunda hiç çıkmamış bir sayı.
    const fresh = all.filter((v) => !used.has(v));
    const pool = fresh.length > 0 ? fresh : all;
    return pool[Math.floor(rng() * pool.length)];
}

/** Bütün oyunun planı: art arda aynı sayı ya da aynı emoji gelmez. */
export function buildGame(rng: Rng = Math.random): SayalimRound[] {
    const rounds: SayalimRound[] = [];
    const used = new Set<number>();
    let prevN = 0;
    let prevEmoji = '';
    for (let r = 1; r <= TOTAL_ROUNDS; r++) {
        const n = pickCount(r, prevN, used, rng);
        const emojis = NESNE_EMOJILERI.filter((e) => e !== prevEmoji);
        const emoji = emojis[Math.floor(rng() * emojis.length)];
        rounds.push({ n, emoji, options: buildOptions(n, rng) });
        used.add(n);
        prevN = n;
        prevEmoji = emoji;
    }
    return rounds;
}

/** Rakamın İngilizce adı (EN_SAYILAR'dan): 3 -> "three". Kayıtlı olmayan sayıda null. */
export function sayiSozcugu(n: number): string | null {
    return EN_SAYILAR.find((k) => k.rakam === n)?.en ?? null;
}

/** Olumlu geri bildirim cümlesi (EN_ALKISLAR'dan); bir öncekiyle aynı gelmez. */
export function pickAlkis(prev: string | null, rng: Rng = Math.random): string {
    const pool = EN_ALKISLAR.filter((a) => a !== prev);
    const list = pool.length > 0 ? pool : EN_ALKISLAR;
    return list[Math.floor(rng() * list.length)];
}

export interface TapResult {
    /** Güncel atamalar: assigned[i] = i. nesneye verilen sayı (0 = henüz sayılmadı). */
    assigned: number[];
    /** Bu dokunuşla yeni sayılan nesnenin sayısı; nesne zaten sayılmışsa ya da geçersizse null (sayı ARTMAZ). */
    newNumber: number | null;
    /** Bu dokunuşla tüm nesneler sayıldı mı. */
    completed: boolean;
}

/**
 * Sayma kilidi: bir nesneye ilk dokunuş sıradaki sayıyı verir; aynı nesneye ikinci dokunuş sayıyı artırmaz.
 * Girdi dizisini DEĞİŞTİRMEZ.
 */
export function tapObject(assigned: readonly number[], index: number): TapResult {
    if (!Number.isInteger(index) || index < 0 || index >= assigned.length || assigned[index] > 0) {
        return { assigned: [...assigned], newNumber: null, completed: false };
    }
    const next = assigned.filter((v) => v > 0).length + 1;
    const copy = [...assigned];
    copy[index] = next;
    return { assigned: copy, newNumber: next, completed: next === copy.length };
}
