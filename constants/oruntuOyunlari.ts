// Diziyi Tamamla varyantlarının örüntü setleri (components/gameRegistry.tsx'te DiziyiTamamla'ya `patterns` olarak geçilir).
// Her aşama: dizi + sıradaki şeklin cevabı + seçenekler. `kural` yalnız doğrulama içindir (lib/oruntuOyunlari.test.ts):
// dizinin gerçekten bu kuralı en az İKİ tam tekrar boyunca gösterdiğini ve cevabın kuralın DEVAMI olduğunu güvenceye alır.
// Uzun diziler (6'dan fazla kutu, '?' dahil) DiziyiTamamla'da küçük kutularla çizilir (compactSequence).
// Şekil havuzu geometri kuralıyla aynıdır: kare, daire, üçgen, dikdörtgen (yıldız yok; dizi, cevap ve seçenekleri lib/geometriKurali.test.ts denetler).
import type { Pattern } from '../components/DiziyiTamamla';

export type OruntuKurali = 'AB' | 'ABB' | 'ABC';
export type OruntuAsamasi = Pattern & { kural: OruntuKurali };

// İkili Örüntü (diziyi-tamamla-4): YALNIZ AB, 5 aşama. Dizi uzar (4 → 8 şekil), seçenek sayısı 2 → 4'e çıkar.
export const ORUNTU_IKILI: OruntuAsamasi[] = [
    { kural: 'AB', sequence: ['kare', 'daire', 'kare', 'daire'], answer: 'kare', options: ['kare', 'daire'] },
    { kural: 'AB', sequence: ['daire', 'ucgen', 'daire', 'ucgen', 'daire'], answer: 'ucgen', options: ['ucgen', 'daire', 'kare'] },
    { kural: 'AB', sequence: ['dikdortgen', 'kare', 'dikdortgen', 'kare', 'dikdortgen', 'kare'], answer: 'dikdortgen', options: ['dikdortgen', 'kare', 'daire'] },
    { kural: 'AB', sequence: ['ucgen', 'dikdortgen', 'ucgen', 'dikdortgen', 'ucgen', 'dikdortgen', 'ucgen'], answer: 'dikdortgen', options: ['dikdortgen', 'ucgen', 'kare', 'daire'] },
    { kural: 'AB', sequence: ['kare', 'ucgen', 'kare', 'ucgen', 'kare', 'ucgen', 'kare', 'ucgen'], answer: 'kare', options: ['kare', 'ucgen', 'daire', 'dikdortgen'] },
];

// Örüntü Basamakları (diziyi-tamamla-5): AB, AB, sonra ABB — kademeli. 1-2. aşama AB; 3-5. aşama ABB
// (3: A'dan sonra B, 4: ilk B'den sonra ikinci B, 5: ikinci B'den sonra yeniden A).
export const ORUNTU_BASAMAKLARI: OruntuAsamasi[] = [
    { kural: 'AB', sequence: ['kare', 'daire', 'kare', 'daire'], answer: 'kare', options: ['kare', 'daire', 'ucgen'] },
    { kural: 'AB', sequence: ['ucgen', 'dikdortgen', 'ucgen', 'dikdortgen', 'ucgen'], answer: 'dikdortgen', options: ['dikdortgen', 'ucgen', 'kare'] },
    { kural: 'ABB', sequence: ['dikdortgen', 'kare', 'kare', 'dikdortgen', 'kare', 'kare', 'dikdortgen'], answer: 'kare', options: ['kare', 'dikdortgen', 'daire'] },
    { kural: 'ABB', sequence: ['daire', 'ucgen', 'ucgen', 'daire', 'ucgen', 'ucgen', 'daire', 'ucgen'], answer: 'ucgen', options: ['ucgen', 'daire', 'kare', 'dikdortgen'] },
    { kural: 'ABB', sequence: ['kare', 'dikdortgen', 'dikdortgen', 'kare', 'dikdortgen', 'dikdortgen', 'kare', 'dikdortgen', 'dikdortgen'], answer: 'kare', options: ['kare', 'dikdortgen', 'daire', 'ucgen'] },
];

// Üçlü Örüntü (diziyi-tamamla-6): ABC, daha büyük yaş grubu. 3 farklı şekil, 4 seçenek. Sorulan konum kademelidir:
// 1. aşama döngü bittikten sonra A (en kolay), sonra B, C, B, C.
export const ORUNTU_UCLU: OruntuAsamasi[] = [
    { kural: 'ABC', sequence: ['kare', 'daire', 'ucgen', 'kare', 'daire', 'ucgen'], answer: 'kare', options: ['kare', 'daire', 'ucgen', 'dikdortgen'] },
    { kural: 'ABC', sequence: ['dikdortgen', 'kare', 'daire', 'dikdortgen', 'kare', 'daire', 'dikdortgen'], answer: 'kare', options: ['kare', 'dikdortgen', 'daire', 'ucgen'] },
    { kural: 'ABC', sequence: ['ucgen', 'dikdortgen', 'kare', 'ucgen', 'dikdortgen', 'kare', 'ucgen', 'dikdortgen'], answer: 'kare', options: ['kare', 'ucgen', 'dikdortgen', 'daire'] },
    { kural: 'ABC', sequence: ['daire', 'ucgen', 'dikdortgen', 'daire', 'ucgen', 'dikdortgen', 'daire'], answer: 'ucgen', options: ['ucgen', 'daire', 'dikdortgen', 'kare'] },
    { kural: 'ABC', sequence: ['kare', 'ucgen', 'daire', 'kare', 'ucgen', 'daire', 'kare', 'ucgen'], answer: 'daire', options: ['daire', 'kare', 'ucgen', 'dikdortgen'] },
];
