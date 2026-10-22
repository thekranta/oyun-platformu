// Diziyi Tamamla varyantlarının örüntü setleri (components/gameRegistry.tsx'te DiziyiTamamla'ya `patterns` olarak geçilir).
// Her aşama: dizi + sıradaki şeklin cevabı + seçenekler. `kural` yalnız doğrulama içindir (lib/oruntuOyunlari.test.ts):
// dizinin gerçekten bu kuralı en az İKİ tam tekrar boyunca gösterdiğini ve cevabın kuralın DEVAMI olduğunu güvenceye alır.
// Uzun diziler (6'dan fazla kutu, '?' dahil) DiziyiTamamla'da küçük kutularla çizilir (compactSequence).
import type { Pattern } from '../components/DiziyiTamamla';

export type OruntuKurali = 'AB' | 'ABB' | 'ABC';
export type OruntuAsamasi = Pattern & { kural: OruntuKurali };

// İkili Örüntü (diziyi-tamamla-4): YALNIZ AB, 5 aşama. Dizi uzar (4 → 8 şekil), seçenek sayısı 2 → 4'e çıkar.
export const ORUNTU_IKILI: OruntuAsamasi[] = [
    { kural: 'AB', sequence: ['kare', 'daire', 'kare', 'daire'], answer: 'kare', options: ['kare', 'daire'] },
    { kural: 'AB', sequence: ['daire', 'ucgen', 'daire', 'ucgen', 'daire'], answer: 'ucgen', options: ['ucgen', 'daire', 'kare'] },
    { kural: 'AB', sequence: ['yildiz', 'kare', 'yildiz', 'kare', 'yildiz', 'kare'], answer: 'yildiz', options: ['yildiz', 'kare', 'daire'] },
    { kural: 'AB', sequence: ['ucgen', 'yildiz', 'ucgen', 'yildiz', 'ucgen', 'yildiz', 'ucgen'], answer: 'yildiz', options: ['yildiz', 'ucgen', 'kare', 'daire'] },
    { kural: 'AB', sequence: ['kare', 'ucgen', 'kare', 'ucgen', 'kare', 'ucgen', 'kare', 'ucgen'], answer: 'kare', options: ['kare', 'ucgen', 'daire', 'yildiz'] },
];

// Örüntü Basamakları (diziyi-tamamla-5): AB, AB, sonra ABB — kademeli. 1-2. aşama AB; 3-5. aşama ABB
// (3: A'dan sonra B, 4: ilk B'den sonra ikinci B, 5: ikinci B'den sonra yeniden A).
export const ORUNTU_BASAMAKLARI: OruntuAsamasi[] = [
    { kural: 'AB', sequence: ['kare', 'daire', 'kare', 'daire'], answer: 'kare', options: ['kare', 'daire', 'ucgen'] },
    { kural: 'AB', sequence: ['ucgen', 'yildiz', 'ucgen', 'yildiz', 'ucgen'], answer: 'yildiz', options: ['yildiz', 'ucgen', 'kare'] },
    { kural: 'ABB', sequence: ['yildiz', 'kare', 'kare', 'yildiz', 'kare', 'kare', 'yildiz'], answer: 'kare', options: ['kare', 'yildiz', 'daire'] },
    { kural: 'ABB', sequence: ['daire', 'ucgen', 'ucgen', 'daire', 'ucgen', 'ucgen', 'daire', 'ucgen'], answer: 'ucgen', options: ['ucgen', 'daire', 'kare', 'yildiz'] },
    { kural: 'ABB', sequence: ['kare', 'yildiz', 'yildiz', 'kare', 'yildiz', 'yildiz', 'kare', 'yildiz', 'yildiz'], answer: 'kare', options: ['kare', 'yildiz', 'daire', 'ucgen'] },
];

// Üçlü Örüntü (diziyi-tamamla-6): ABC, daha büyük yaş grubu. 3 farklı şekil, 4 seçenek. Sorulan konum kademelidir:
// 1. aşama döngü bittikten sonra A (en kolay), sonra B, C, B, C.
export const ORUNTU_UCLU: OruntuAsamasi[] = [
    { kural: 'ABC', sequence: ['kare', 'daire', 'ucgen', 'kare', 'daire', 'ucgen'], answer: 'kare', options: ['kare', 'daire', 'ucgen', 'yildiz'] },
    { kural: 'ABC', sequence: ['yildiz', 'kare', 'daire', 'yildiz', 'kare', 'daire', 'yildiz'], answer: 'kare', options: ['kare', 'yildiz', 'daire', 'ucgen'] },
    { kural: 'ABC', sequence: ['ucgen', 'yildiz', 'kare', 'ucgen', 'yildiz', 'kare', 'ucgen', 'yildiz'], answer: 'kare', options: ['kare', 'ucgen', 'yildiz', 'daire'] },
    { kural: 'ABC', sequence: ['daire', 'ucgen', 'yildiz', 'daire', 'ucgen', 'yildiz', 'daire'], answer: 'ucgen', options: ['ucgen', 'daire', 'yildiz', 'kare'] },
    { kural: 'ABC', sequence: ['kare', 'ucgen', 'daire', 'kare', 'ucgen', 'daire', 'kare', 'ucgen'], answer: 'daire', options: ['daire', 'kare', 'ucgen', 'yildiz'] },
];
