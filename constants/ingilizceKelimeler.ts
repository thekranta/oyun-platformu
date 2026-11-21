/**
 * İNGİLİZCE EK ETKİNLİKLER — ortak kelime/cümle verisi (TEK KAYNAK).
 *
 * Bu veri hem oyunlar (components/English*.tsx) hem de klip üretimi (scripts/gen-en-clips.mjs) tarafından okunur; böylece
 * "oyun şu cümleyi söyler ama klibi üretilmemiş" ya da tersi olamaz (test: lib/ingilizceKlipleri.test.ts).
 *
 * KURALLAR (kullanıcı kararı 2026-11-22, bkz. hafıza ingilizce-oyunlari-plani):
 *  - Bu oyunlar Maarif programı DIŞI ek etkinliktir: Maarif kodu/kazanımı iddia edilmez (constants/maarifMap.ts `ek: true`).
 *  - Çocuğa yazılı İngilizce sözcük GÖSTERİLMEZ (okuma yok); yalnız resim/renk/rakam + dinleme.
 *  - Çocuğun söylemesi puanlanmaz; "doğru telaffuz" iddiası yok.
 *  - Çocuğa puan/hata/zorluk cümlesi gösterilmez (genel çocuk kuralları).
 * Konuşma: speak(metin, { lang: 'en' }) → klip `en-<slug>` (services/speechService.ts enClipSlug). Klip yoksa SESSİZ geçer.
 * Ses: Kokoro af_heart (Amerikan kadın), VoiceBox üzerinden.
 *
 * NOT: Bu dosya bağımlılıksız ve yalnız silinebilir TS sözdizimi içerir (Node doğrudan import eder; enum/namespace YOK).
 */

export interface EnKelime {
    /** Kararlı kimlik (oyun mantığında kullanılır). */
    id: string;
    /** İngilizce hedef sözcük (klibi bu metinle üretilir). */
    en: string;
    /** Türkçe karşılığı (YALNIZ veli/geliştirici içindir; çocuğa gösterilmez/okutulmaz). */
    tr: string;
    /** Resim yerine kullanılan emoji (renkler ve sayılar için yok). Android'de Emoji12+ için EmojiText kullanın. */
    emoji?: string;
    /** Renkler için dolgu rengi (renkler emoji ile gösterilmez: pembe/kahverengi emoji güvenilir değil). */
    hex?: string;
    /** Sayılar için rakam. */
    rakam?: number;
}

export const EN_RENKLER: readonly EnKelime[] = [
    { id: 'red', en: 'red', tr: 'kırmızı', hex: '#E53935' },
    { id: 'blue', en: 'blue', tr: 'mavi', hex: '#1E88E5' },
    { id: 'yellow', en: 'yellow', tr: 'sarı', hex: '#FDD835' },
    { id: 'green', en: 'green', tr: 'yeşil', hex: '#43A047' },
    { id: 'orange', en: 'orange', tr: 'turuncu', hex: '#FB8C00' },
    { id: 'purple', en: 'purple', tr: 'mor', hex: '#8E24AA' },
    { id: 'pink', en: 'pink', tr: 'pembe', hex: '#EC407A' },
    { id: 'brown', en: 'brown', tr: 'kahverengi', hex: '#8D6E63' },
];

export const EN_HAYVANLAR: readonly EnKelime[] = [
    { id: 'cat', en: 'cat', tr: 'kedi', emoji: '🐱' },
    { id: 'dog', en: 'dog', tr: 'köpek', emoji: '🐶' },
    { id: 'bird', en: 'bird', tr: 'kuş', emoji: '🐦' },
    { id: 'fish', en: 'fish', tr: 'balık', emoji: '🐟' },
    { id: 'rabbit', en: 'rabbit', tr: 'tavşan', emoji: '🐰' },
    { id: 'cow', en: 'cow', tr: 'inek', emoji: '🐮' },
    { id: 'horse', en: 'horse', tr: 'at', emoji: '🐴' },
    { id: 'duck', en: 'duck', tr: 'ördek', emoji: '🦆' },
    { id: 'pig', en: 'pig', tr: 'domuz', emoji: '🐷' },
    { id: 'sheep', en: 'sheep', tr: 'koyun', emoji: '🐑' },
];

export const EN_MEYVELER: readonly EnKelime[] = [
    { id: 'apple', en: 'apple', tr: 'elma', emoji: '🍎' },
    { id: 'banana', en: 'banana', tr: 'muz', emoji: '🍌' },
    { id: 'orange-fruit', en: 'orange', tr: 'portakal', emoji: '🍊' },
    { id: 'grapes', en: 'grapes', tr: 'üzüm', emoji: '🍇' },
    { id: 'strawberry', en: 'strawberry', tr: 'çilek', emoji: '🍓' },
    { id: 'watermelon', en: 'watermelon', tr: 'karpuz', emoji: '🍉' },
    { id: 'lemon', en: 'lemon', tr: 'limon', emoji: '🍋' },
    { id: 'pear', en: 'pear', tr: 'armut', emoji: '🍐' },
];

export const EN_SAYILAR: readonly EnKelime[] = [
    { id: 'one', en: 'one', tr: 'bir', rakam: 1 },
    { id: 'two', en: 'two', tr: 'iki', rakam: 2 },
    { id: 'three', en: 'three', tr: 'üç', rakam: 3 },
    { id: 'four', en: 'four', tr: 'dört', rakam: 4 },
    { id: 'five', en: 'five', tr: 'beş', rakam: 5 },
    { id: 'six', en: 'six', tr: 'altı', rakam: 6 },
    { id: 'seven', en: 'seven', tr: 'yedi', rakam: 7 },
    { id: 'eight', en: 'eight', tr: 'sekiz', rakam: 8 },
    { id: 'nine', en: 'nine', tr: 'dokuz', rakam: 9 },
    { id: 'ten', en: 'ten', tr: 'on', rakam: 10 },
];

/** Hareket yönergeleri (Öğretmen Der Ki). */
export const EN_EYLEMLER: readonly EnKelime[] = [
    { id: 'clap', en: 'clap', tr: 'alkışla', emoji: '👏' },
    { id: 'wave', en: 'wave', tr: 'el salla', emoji: '👋' },
    { id: 'jump', en: 'jump', tr: 'zıpla', emoji: '🤸' },
    { id: 'run', en: 'run', tr: 'koş', emoji: '🏃' },
    { id: 'dance', en: 'dance', tr: 'dans et', emoji: '💃' },
    { id: 'sleep', en: 'sleep', tr: 'uyu', emoji: '😴' },
];

/** Boya oyunu: boyanacak nesne + o nesne için seçilebilecek (doğru dahil) renkler. */
export interface EnBoyaNesnesi {
    id: string;
    en: string;
    tr: string;
    emoji: string;
    /** Bu nesne için görev olarak sorulabilecek renk kimlikleri (EN_RENKLER id). */
    renkler: readonly string[];
}
export const EN_BOYA_NESNELERI: readonly EnBoyaNesnesi[] = [
    { id: 'apple', en: 'apple', tr: 'elma', emoji: '🍎', renkler: ['red', 'green', 'yellow'] },
    { id: 'ball', en: 'ball', tr: 'top', emoji: '⚽', renkler: ['red', 'blue', 'yellow'] },
    { id: 'sun', en: 'sun', tr: 'güneş', emoji: '☀️', renkler: ['yellow', 'orange', 'red'] },
    { id: 'flower', en: 'flower', tr: 'çiçek', emoji: '🌸', renkler: ['pink', 'purple', 'yellow'] },
    { id: 'leaf', en: 'leaf', tr: 'yaprak', emoji: '🍃', renkler: ['green', 'yellow', 'brown'] },
    { id: 'fish', en: 'fish', tr: 'balık', emoji: '🐟', renkler: ['blue', 'orange', 'yellow'] },
];

/** Boya görev cümlesi: "Paint the apple red." */
export function boyaGorevi(nesne: EnBoyaNesnesi, renk: EnKelime): string {
    return `Paint the ${nesne.en} ${renk.en}.`;
}

/** Öğretmen Der Ki yönergesi: "Teacher says, clap!" */
export function ogretmenDerKi(eylem: EnKelime): string {
    return `Teacher says, ${eylem.en}!`;
}

/** Eylemin tek başına (tekrar dinleme/etiket) söylenişi: "Clap!" */
export function eylemSoyle(eylem: EnKelime): string {
    return eylem.en.charAt(0).toUpperCase() + eylem.en.slice(1) + '!';
}

export const EN_SAYALIM_SORU = 'How many?';

/** Olumlu geri bildirim (puan/hata dili yok; yalnız cesaretlendirme). */
export const EN_ALKISLAR: readonly string[] = ['Good job!', 'Great!', 'Well done!', 'Yes!', 'Wow!'];

export const EN_SELAM: readonly string[] = ['Hello!', 'Goodbye!'];

/** Dinle ve Dokun / Konuşan Çiftler kategorileri. */
export type EnTema = 'renkler' | 'hayvanlar' | 'meyveler';
export const EN_TEMALAR: Record<EnTema, readonly EnKelime[]> = {
    renkler: EN_RENKLER,
    hayvanlar: EN_HAYVANLAR,
    meyveler: EN_MEYVELER,
};

/** Klip adı kuralı (services/speechService.ts enClipSlug ile AYNI; test eşitliği korur). */
export function enSlug(text: string): string {
    const s = (text || '')
        .replace(/ç/g, 'c').replace(/Ç/g, 'c')
        .replace(/ş/g, 's').replace(/Ş/g, 's')
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/Ü/g, 'u')
        .replace(/ö/g, 'o').replace(/Ö/g, 'o')
        .replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return 'eng-' + s;
}

/** Üretilmesi gereken TÜM İngilizce klip metinleri (tekilleştirilmiş, sıralı). */
export function enKlipMetinleri(): string[] {
    const out: string[] = [];
    const add = (t: string) => { if (!out.includes(t)) out.push(t); };
    for (const list of [EN_RENKLER, EN_HAYVANLAR, EN_MEYVELER, EN_SAYILAR]) for (const k of list) add(k.en);
    for (const e of EN_EYLEMLER) { add(ogretmenDerKi(e)); add(eylemSoyle(e)); }
    for (const n of EN_BOYA_NESNELERI) {
        add(n.en);
        for (const rid of n.renkler) {
            const r = EN_RENKLER.find((x) => x.id === rid);
            if (!r) throw new Error('Boya nesnesinde bilinmeyen renk: ' + n.id + '/' + rid);
            add(boyaGorevi(n, r));
        }
    }
    add(EN_SAYALIM_SORU);
    for (const a of EN_ALKISLAR) add(a);
    for (const s of EN_SELAM) add(s);
    return out;
}
