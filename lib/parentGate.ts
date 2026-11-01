/**
 * Ebeveyn kapısı (parental gate) — mağaza kuralı: çocuklara yönelik uygulamada, çocuğun erişebildiği
 * satın alma ekranları ve uygulama dışına çıkan bağlantılar bir yetişkin sorusunun ardına alınır
 * (Apple App Review 1.3 / 5.1.4, Google Play Aile Politikası).
 *
 * Bu dosya SAF mantıktır (soru üretimi, bekleme süresi) ve tek bir "açıcı" kaydı tutar.
 * Arayüz components/ParentGateHost.tsx'tedir (kök yerleşimde bir kez bağlanır); kapıyı isteyen kod
 * (`openExternalLink`, ödeme ekranı, yapay zekâ izni) `requestParentGate()` ile Promise<boolean> bekler.
 *
 * Soru: iki basamağı aşan çarpma (ör. 7 × 8). 3-6 yaş çocuğun çözemeyeceği, yetişkinin birkaç saniyede
 * çözeceği bir soru; çoktan seçmelidir (Android'de metin girişi bu uygulamada sorunlu: bkz. android-ime-tani).
 * Tahminle geçişi zorlaştırmak için 6 seçenek ve art arda yanlışta bekleme süresi vardır.
 */

export interface GateChallenge {
    a: number;
    b: number;
    answer: number;
    /** Karıştırılmış seçenekler (doğru cevap dahil, hepsi farklı ve pozitif). */
    options: number[];
}

export const GATE_OPTION_COUNT = 6;
/** Bu kadar yanlıştan sonra kısa bir bekleme süresi başlar. */
export const GATE_MAX_WRONG = 2;
export const GATE_LOCKOUT_MS = 15_000;

function randomInt(min: number, max: number, random: () => number): number {
    return min + Math.floor(random() * (max - min + 1));
}

/** Fisher-Yates; verilen rastgele işlevle deterministik test edilebilir. */
function shuffle<T>(items: T[], random: () => number): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/** Yeni bir kapı sorusu üretir. `random` 0 ≤ x < 1 döndüren işlev olmalı (testte sabitlenebilir). */
export function createGateChallenge(random: () => number = Math.random): GateChallenge {
    const a = randomInt(6, 9, random);
    const b = randomInt(6, 9, random);
    const answer = a * b;

    // Akla yatkın yanlışlar: bir çarpanı kaydırmak (a±1)×b, a×(b±1) ve yakın sayılar.
    const near = [answer - a, answer + a, answer - b, answer + b, answer - 1, answer + 1, answer - 10, answer + 10, answer - 2, answer + 2, answer + 7, answer - 7];
    const pool = shuffle(Array.from(new Set(near.filter((n) => n > 0 && n !== answer))), random);

    const options = [answer];
    for (const candidate of pool) {
        if (options.length >= GATE_OPTION_COUNT) break;
        options.push(candidate);
    }
    // Havuz bir sebeple yetmezse (olmamalı) kalan yerleri artan sayılarla doldur.
    for (let extra = answer + 11; options.length < GATE_OPTION_COUNT; extra++) {
        if (!options.includes(extra)) options.push(extra);
    }
    return { a, b, answer, options: shuffle(options, random) };
}

export function isGateAnswerCorrect(challenge: GateChallenge, picked: number): boolean {
    return picked === challenge.answer;
}

/** Art arda yanlış sayısı sınırı aştıysa, bekleme süresinden kalan milisaniye (0 = beklemeye gerek yok). */
export function gateLockoutRemaining(wrongCount: number, lockedAtMs: number | null, nowMs: number): number {
    if (wrongCount < GATE_MAX_WRONG || lockedAtMs === null) return 0;
    return Math.max(0, lockedAtMs + GATE_LOCKOUT_MS - nowMs);
}

// ---------------------------------------------------------------------------
// Açıcı kaydı: arayüz bileşeni (ParentGateHost) kendini buraya bağlar.
// ---------------------------------------------------------------------------

export type ParentGateOpener = () => Promise<boolean>;

let opener: ParentGateOpener | null = null;

export function setParentGateOpener(next: ParentGateOpener | null): void {
    opener = next;
}

/**
 * Kapıyı açar ve yetişkin geçerse true, vazgeçerse/kapı yoksa false döner.
 * Kapı arayüzü bağlı değilse (ör. testler, kök yerleşim kurulmadan önce) GEÇİRMEZ: güvenli varsayılan.
 */
export function requestParentGate(): Promise<boolean> {
    return opener ? opener() : Promise.resolve(false);
}
