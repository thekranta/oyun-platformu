// Spor Günü içeriği (Hareket ve Sağlık / HSAB.7: iç ve dış mekânda fiziksel aktivitelere katılabilme).
// Tur: mekân seç (iç/dış) → hareketi seç → 15 sn hareket et ("Yaptım" düğmesi) → elini KALBİNE koy
// (kalp atışı hareketin yoğunluğuna göre hızlı/yavaş çalar) → bedeninin söylediğini seç.
// 60-72 ay: neden-sonuç — "Kalbin neden hızlı attı?" (çünkü çok hareket ettim).
// Dürüstlük: ekran çocuğun gerçekten hareket ettiğini doğrulayamaz; "Yaptım" öz bildirimdir ve
// kalp adımı çocuğu bedenine yönlendirir. Sağlık bilgisi verilmez, yalnız gözlem dili kullanılır.
// Kurallar constants/sporGunu.test.ts ile korunur.

export type Place = 'ic' | 'dis';
export type Intensity = 'hafif' | 'orta' | 'hizli';

export interface Activity {
  id: string;
  place: Place;
  emoji: string;
  intensity: Intensity;
  /** Hareket yönergesi (klip). */
  say: string;
  label: string;
}

export const ACTIVITIES: Activity[] = [
  { id: 'ic-yuru', place: 'ic', emoji: '🚶', intensity: 'hafif', say: 'Yerinde yürüyelim. Yavaş yavaş, adım adım.', label: 'yerinde yürü' },
  { id: 'ic-zipla', place: 'ic', emoji: '🦘', intensity: 'orta', say: 'Yerinde zıplayalım! Hop hop hop!', label: 'yerinde zıpla' },
  { id: 'ic-kos', place: 'ic', emoji: '🏃', intensity: 'hizli', say: 'Olduğun yerde koş! Hızlı hızlı!', label: 'yerinde koş' },
  { id: 'dis-yuru', place: 'dis', emoji: '🥾', intensity: 'hafif', say: 'Parkta yürüyüşe çıkalım. Yavaş yavaş yürü.', label: 'yürüyüş' },
  { id: 'dis-top', place: 'dis', emoji: '⚽', intensity: 'orta', say: 'Topu at ve tut! At, tut, at, tut!', label: 'top at-tut' },
  { id: 'dis-ip', place: 'dis', emoji: '🪢', intensity: 'hizli', say: 'İp atlayalım! Hop hop hop, hızlı hızlı!', label: 'ip atlama' },
];

/** Hareketin yoğunluğuna göre kalp atışı (sentez ses: kalp-yavas / kalp-hizli). */
export const HEARTBEAT: Record<Intensity, 'kalp-yavas' | 'kalp-hizli'> = {
  hafif: 'kalp-yavas',
  orta: 'kalp-hizli',
  hizli: 'kalp-hizli',
};

export interface BodyCard { id: string; emoji: string; say: string }

/** "Bedenin ne dedi?" — öznel, doğru/yanlış yok (PDF 48-60 ay: yoruldum, kalbim hızlı atıyor, terledim). */
export const BODY_CARDS: [BodyCard, BodyCard, BodyCard] = [
  { id: 'kalp', emoji: '💓', say: 'Kalbim hızlı atıyor.' },
  { id: 'nefes', emoji: '😮‍💨', say: 'Nefesim hızlandı.' },
  { id: 'isindim', emoji: '🥵', say: 'Isındım.' },
];

export interface ReasonCard { id: string; emoji: string; say: string; correct?: true }

/** 60-72 ay neden-sonuç: "Kalbin neden hızlı attı?" */
export const REASON_CARDS: [ReasonCard, ReasonCard, ReasonCard] = [
  { id: 'hareket', emoji: '🏃', say: 'Çünkü çok hareket ettim.', correct: true },
  { id: 'uyudum', emoji: '😴', say: 'Çünkü uyudum.' },
  { id: 'oturdum', emoji: '🪑', say: 'Çünkü sessizce oturdum.' },
];

/** Dört tur: 1-2. tur beden kartı (puansız), 3-4. tur neden-sonuç (puanlı). Tur 1 iç mekân verilir. */
export const ROUND_PLAN = [
  { forcedPlace: 'ic' as Place, reason: false },
  { forcedPlace: null, reason: false },
  { forcedPlace: null, reason: true },
  { forcedPlace: null, reason: true },
] as const;

export const SPOR_KLIPLER = {
  giris: 'Bugün spor günü! Bedenini hareket ettirelim.',
  mekanSor: 'Bugün hava nasıl? İçeride mi, dışarıda mı oynayalım?',
  disGuvenlik: 'Dışarıda güvenli bir yerde oyna. Yanında bir büyüğün olsun.',
  hareketSec: 'Hangi hareketi yapalım? Birini seç.',
  yaptim: 'Bitirince yaptım düğmesine bas.',
  harika: 'Harika hareket ettin!',
  kalpHazir: 'Şimdi elini kalbine koy. Kalbine dokun, nasıl atıyor?',
  bedenSor: 'Bedenin ne dedi? Bir karta dokun.',
  bedenOk: 'Evet, bedenin sana haber veriyor.',
  nedenSor: 'Kalbin neden hızlı attı? Bir karta dokun.',
  nedenOk: 'Evet! Hareket edince kalp hızlanır, nefes de hızlanır.',
  nedenYanlis: 'Hmm, hareket edince kalbimiz hızlanır. Bir daha düşün.',
  bitis: 'Şimdi su iç ve biraz dinlen. Spor günü bitti, aferin!',
} as const;

export const ALL_SPOR_KLIPLERI: string[] = [
  ...Object.values(SPOR_KLIPLER),
  ...ACTIVITIES.map((a) => a.say),
  ...BODY_CARDS.map((b) => b.say),
  ...REASON_CARDS.map((r) => r.say),
];
