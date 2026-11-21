import { EN_HAYVANLAR, type EnKelime } from '../constants/ingilizceKelimeler';

/**
 * KONUŞAN ÇİFTLER (İngilizce ek etkinlik, Maarif dışı) — saf oyun mantığı.
 * Hayvan çiftleri hafıza oyunu: kart çevrilince hayvanın İngilizce adı söylenir (çocuk sesi duyarak resimle bağlar).
 * Çocuğa yazı gösterilmez; yalnız resim (emoji) + dinleme. Sabit zorluk: 6 çift = 12 kart (adaptif DEĞİL).
 */

export const CIFT_SAYISI = 6;

/** Veli raporu için (ekranda görünmez). Maarif kodu YOK. */
export const KAZANIM_ODAGI = 'Ek etkinlik (Maarif dışı): İngilizce — hayvan adlarını dinleyerek resimle eşleştirme (hafıza oyunu)';

export interface KonusanKart {
    /** Kartın kendi kimliği (her çift için iki farklı kart). */
    id: number;
    /** Aynı olan iki kartın ortak kimliği (EnKelime.id). */
    pairId: string;
    emoji: string;
    /** Çevrilince söylenecek İngilizce ad (veri dosyasındaki `en`; yalnız bu metin söylenir). */
    en: string;
}

export type Rng = () => number;

/** Fisher-Yates (yeni dizi döner). */
export function karistir<T>(liste: readonly T[], rng: Rng = Math.random): T[] {
    const a = liste.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.min(i, Math.floor(rng() * (i + 1)));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/** Oyunda kullanılabilir (emojisi olan) hayvanlar. */
export function hayvanHavuzu(): EnKelime[] {
    return EN_HAYVANLAR.filter((h) => !!h.emoji);
}

/** Emoji → İngilizce ad eşlemesi (hayvan havuzunda yoksa null). */
export function emojiAdi(emoji: string): string | null {
    const h = hayvanHavuzu().find((x) => x.emoji === emoji);
    return h ? h.en : null;
}

/** Havuzdan `n` farklı hayvan seçer. */
export function ciftSec(n: number = CIFT_SAYISI, rng: Rng = Math.random): EnKelime[] {
    const havuz = hayvanHavuzu();
    return karistir(havuz, rng).slice(0, Math.min(n, havuz.length));
}

/** Seçilen hayvanlardan karışık kart destesi (her hayvandan iki kart). */
export function kartlariKur(hayvanlar: readonly EnKelime[], rng: Rng = Math.random): KonusanKart[] {
    const kartlar: KonusanKart[] = [];
    hayvanlar.forEach((h, i) => {
        for (const k of [0, 1]) {
            kartlar.push({ id: i * 2 + k, pairId: h.id, emoji: h.emoji as string, en: h.en });
        }
    });
    return karistir(kartlar, rng);
}

export function yeniOyun(rng: Rng = Math.random): KonusanKart[] {
    return kartlariKur(ciftSec(CIFT_SAYISI, rng), rng);
}

/** İki farklı kart aynı çiftin üyeleri mi? */
export function ciftMi(a: KonusanKart, b: KonusanKart): boolean {
    return a.id !== b.id && a.pairId === b.pairId;
}

/**
 * Yanlış eşleşme, çocuğun GÖRMÜŞ olduğu bir kartı içeriyorsa gerçek bellek hatasıdır (ilk kez açılan iki kart tahmindir, sayılmaz).
 * Yalnız veli raporuna gider; çocuğa gösterilmez.
 */
export function bellekHatasiMi(a: KonusanKart, b: KonusanKart, gorulen: ReadonlySet<number>): boolean {
    return gorulen.has(a.id) || gorulen.has(b.id);
}

export interface IzgaraDuzeni {
    cols: number;
    rows: number;
    /** Kart kenarı (dp). */
    size: number;
}

/**
 * `count` kartı `w` x `h` alana en büyük kart boyutuyla yerleştirir (taşma yok: boyut hem genişlikten hem yükseklikten türer).
 * `maxSize` üst sınır (geniş ekranda dev kart olmasın).
 */
export function izgaraDuzeni(w: number, h: number, count: number, gap: number, maxSize = 120, minCols = 2, maxCols = 6): IzgaraDuzeni {
    const n = Math.max(1, Math.floor(count));
    let best: IzgaraDuzeni = { cols: minCols, rows: Math.ceil(n / minCols), size: 0 };
    for (let cols = minCols; cols <= Math.min(maxCols, n); cols++) {
        const rows = Math.ceil(n / cols);
        const bw = (w - gap * (cols - 1)) / cols;
        const bh = (h - gap * (rows - 1)) / rows;
        const size = Math.floor(Math.max(0, Math.min(bw, bh, maxSize)));
        if (size > best.size) best = { cols, rows, size };
    }
    return best;
}

/** Tüm çiftler bulundu mu? */
export function bittiMi(kartlar: readonly KonusanKart[], bulunan: ReadonlySet<string>): boolean {
    return kartlar.length > 0 && kartlar.every((k) => bulunan.has(k.pairId));
}
