/**
 * ÖĞRETMEN DER Kİ (İngilizce ek etkinlik, hareket) — saf mantık (ekran/ses yok; test: lib/enOgretmenDerKi.test.ts).
 *
 * Her tur: öğretmen bir eylemi söyler ("Teacher says, clap!"), ekrandaki karakter eylemi canlandırır, çocuk karakterle BİRLİKTE
 * eylemi gerçek hayatta yapar ve büyük "tamam" düğmesine basar. Kamera/ses tanıma/doğrulama YOK; skor ve hata YOK.
 * Bir oyun = 6 tur: her eylem (EN_EYLEMLER) tam bir kez, karışık sırada.
 */
import { EN_ALKISLAR, EN_EYLEMLER, type EnKelime } from '../constants/ingilizceKelimeler';

/** Rastgelelik kaynağı (testte sabit tohumla). 0 <= r < 1. */
export type Rng = () => number;

/** Bir oyundaki tur sayısı = eylem sayısı (her eylem bir kez). */
export const TOTAL_ROUNDS = EN_EYLEMLER.length;

/** Çocuğa söylenen Türkçe giriş yönergesi (ses klibi `ttsSlug` ile aranır; scripts bunu TR_YONERGELER'den okur). */
export const GIRIS_MESAJI = 'Öğretmen bir şey söyleyecek. Sen de karakterle birlikte yap!';

/** Bu oyunun söylediği TÜM Türkçe metinler (klip üretimi için). */
export const TR_YONERGELER: string[] = [GIRIS_MESAJI];

/** `onGameEnd` kazanım alanı: Maarif DIŞI ek etkinlik (kod yok). */
export const KAZANIM_ODAGI = 'Ek etkinlik (Maarif dışı): İngilizce — dinleyip yönergeye uygun hareket etme (Teacher says)';

/** Fisher-Yates karıştırma (girdiyi değiştirmez). */
export function shuffle<T>(items: readonly T[], rng: Rng = Math.random): T[] {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.min(i, Math.floor(rng() * (i + 1)));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/** Tur sırası: her eylem tam bir kez, karışık. */
export function buildSequence(rng: Rng = Math.random): EnKelime[] {
    return shuffle(EN_EYLEMLER, rng);
}

/**
 * "Tamam" düğmesinin kilidinin açıldığı süre (ms, tur başından). Karakter animasyonu bu sürede biter; çocuk hemen ileri basıp
 * geçmesin diye düğme o zamana kadar kilitlidir. Hareketi azalt açıksa animasyon sadeleşir, süre kısalır.
 */
const UNLOCK_MS: Record<string, number> = {
    clap: 3600,
    wave: 3600,
    jump: 3600,
    run: 4000,
    dance: 4000,
    sleep: 4200,
};
const UNLOCK_REDUCED_MS = 2600;
const UNLOCK_DEFAULT_MS = 3600;

export function unlockDelayMs(id: string, reduceMotion: boolean): number {
    if (reduceMotion) return UNLOCK_REDUCED_MS;
    return UNLOCK_MS[id] ?? UNLOCK_DEFAULT_MS;
}

/** Olumlu geri bildirim cümlesi; mümkünse bir öncekinden farklı. */
export function pickApplause(rng: Rng = Math.random, prev?: string): string {
    const pool = EN_ALKISLAR.length > 1 ? EN_ALKISLAR.filter((a) => a !== prev) : EN_ALKISLAR;
    return pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
}

/** Bitişte veli raporuna gidecek ölçümler (çocuğa gösterilmez). Hata yoktur: finalHata her zaman 0. */
export function buildResult(completed: number): { finalHata: number; correct_answers: number; kazanimOdagi: string } {
    return { finalHata: 0, correct_answers: Math.max(0, Math.min(TOTAL_ROUNDS, Math.floor(completed))), kazanimOdagi: KAZANIM_ODAGI };
}
