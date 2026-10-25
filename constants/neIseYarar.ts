// Ne İşe Yarar? (Matematik/MAB.3 ilişki) — oyunun içeriği ve seslendirilen TÜM metinler.
//
// Eşleşme sonrası eskiden dokunulan sıraya göre "Diş ile Diş fırçası birbirine gider!" gibi 14
// ayrı cümle okunuyordu (Oyun_Test_Listesi #41: "birbiriyle giden ne demek? çocuk anlamaz",
// 5 klipte kuyruk). Artık her çiftin sıradan BAĞIMSIZ, çocuğun günlük hayatından tek cümlesi var
// (7 klip). Komut önce "birlikte olan iki resmi bul" yapıldı, ama o da anlaşılmadı (kullanıcı notu 2026-10-25:
// "birlikte olan ne demek? komutta hata var"); okul öncesinde eşleştirme için hep söylenen "birbirine uyan"a çevrildi.
// Klip kuralları: ≤110 karakter, rakam yok (bkz. neIseYarar.test.ts).

export interface Item { emoji: string; name: string }
export interface Pair {
  a: Item;
  b: Item;
  /** Çift eşleşince (hangi karta önce dokunulursa dokunulsun) okunan cümle. */
  sentence: string;
}

export const PAIRS: Pair[] = [
  { a: { emoji: '☂️', name: 'Şemsiye' }, b: { emoji: '🌧️', name: 'Yağmur' }, sentence: 'Yağmur yağınca şemsiye açarız!' },
  { a: { emoji: '🐝', name: 'Arı' }, b: { emoji: '🍯', name: 'Bal' }, sentence: 'Arı bal yapar!' },
  { a: { emoji: '🪥', name: 'Diş fırçası' }, b: { emoji: '🦷', name: 'Diş' }, sentence: 'Dişlerimizi fırçalarız!' },
  { a: { emoji: '🔑', name: 'Anahtar' }, b: { emoji: '🔒', name: 'Kilit' }, sentence: 'Anahtar kilidi açar!' },
  { a: { emoji: '🧦', name: 'Çorap' }, b: { emoji: '👟', name: 'Ayakkabı' }, sentence: 'Önce çorap, sonra ayakkabı giyeriz!' },
  { a: { emoji: '🐄', name: 'İnek' }, b: { emoji: '🥛', name: 'Süt' }, sentence: 'İnek süt verir!' },
  { a: { emoji: '🌱', name: 'Fidan' }, b: { emoji: '💧', name: 'Su' }, sentence: 'Fidan suyla büyür!' },
];

/** Açılış yönergesi (CountdownOverlay mesajı; ekranda da yazar). */
export const INTRO_TEXT = 'Birbirine uyan iki resmi bul! Mesela şemsiye ile yağmur.';
/** Her turun başında, Tekrar Dinle düğmesinde ve ekran başlığında kullanılan komut. */
export const PROMPT_TEXT = 'Birbirine uyan iki resmi bul!';

/** Bu oyunun seslendirdiği bütün metinler (klip üretimi + test için tek kaynak). */
export const ALL_NE_ISE_YARAR_KLIPLERI: string[] = [
  INTRO_TEXT,
  PROMPT_TEXT,
  ...PAIRS.map((p) => p.sentence),
];
