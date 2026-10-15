// Deney Atölyesi içeriği (Fen / FAB.7: merak ettiği konu hakkında deney yapabilme).
// Tur 1-3: merak sorusu → uygun alet → rafta 6 malzemeden 3'ünü seç → her birini dene → sonucu deftere yaz.
// Tur 4: adil deney (iki AYNI boyda buz: biri güneşte, biri gölgede) → hangisi daha çok erimiş?
// Bilimsel güvenlik: "mıknatıs metal çeker" yanılgısı doğmasın diye yalnız çelik (ataş, cıvata) çeken,
// diğer metallerden (para, folyo, çelik kaşık) kaçınılır; malzemeler günlük, tehlikesiz, tek anlamlı.
// Kurallar constants/deneyAtolyesi.test.ts ile korunur: klip ≤110 karakter, rakam yok, toplam klip ≤45,
// her deneyde 6 benzersiz malzeme (>=2 evet, >=2 hayır), tek heceli sözcük tek başına klip olmaz.

export type EffectKind = 'magnet' | 'light' | 'water';

export interface Tool { emoji: string; label: string; correct?: true }

export interface Material {
  emoji: string;
  /** Klip metni ("Bu bir ataş.") — çocuk rafta dokununca adı söylenir. */
  say: string;
  label: string;
  /** Deneyin sonucu: yapıştı / ışık geçti / suyu emdi → true. */
  yes: boolean;
}

export interface Experiment {
  id: string;
  effect: EffectKind;
  question: string;
  /** İlk deneyde alet hazırdır (yönlendirmeli); sonrakilerde çocuk seçer. */
  tools: [Tool, Tool, Tool];
  yesSay: string;
  noSay: string;
  materials: [Material, Material, Material, Material, Material, Material];
}

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'miknatis',
    effect: 'magnet',
    question: 'Hangi şeyler mıknatısa yapışır? Birlikte deneyelim.',
    tools: [
      { emoji: '🧲', label: 'mıknatıs', correct: true },
      { emoji: '🔦', label: 'fener' },
      { emoji: '💧', label: 'damlalık' },
    ],
    yesSay: 'Yapıştı!',
    noSay: 'Yapışmadı.',
    materials: [
      { emoji: '📎', say: 'Bu bir ataş.', label: 'ataş', yes: true },
      { emoji: '🔩', say: 'Bu bir cıvata.', label: 'cıvata', yes: true },
      { emoji: '📄', say: 'Bu bir kâğıt.', label: 'kâğıt', yes: false },
      { emoji: '🪵', say: 'Bu bir tahta.', label: 'tahta', yes: false },
      { emoji: '🧶', say: 'Bu bir yün yumağı.', label: 'yün yumağı', yes: false },
      { emoji: '🎈', say: 'Bu bir balon.', label: 'balon', yes: false },
    ],
  },
  {
    id: 'isik',
    effect: 'light',
    question: 'Işık hangi şeylerin içinden geçer? Birlikte deneyelim.',
    tools: [
      { emoji: '🧲', label: 'mıknatıs' },
      { emoji: '🔦', label: 'fener', correct: true },
      { emoji: '💧', label: 'damlalık' },
    ],
    yesSay: 'Işık geçti!',
    noSay: 'Işık geçmedi.',
    materials: [
      { emoji: '🫙', say: 'Bu bir kavanoz.', label: 'cam kavanoz', yes: true },
      { emoji: '🪟', say: 'Bu bir pencere.', label: 'pencere camı', yes: true },
      { emoji: '📕', say: 'Bu bir kitap.', label: 'kitap', yes: false },
      { emoji: '🪵', say: 'Bu bir tahta.', label: 'tahta', yes: false },
      { emoji: '📦', say: 'Bu bir karton kutu.', label: 'karton kutu', yes: false },
      { emoji: '🧱', say: 'Bu bir tuğla.', label: 'tuğla', yes: false },
    ],
  },
  {
    id: 'su',
    effect: 'water',
    question: 'Hangi şeyler suyu emer? Birlikte deneyelim.',
    tools: [
      { emoji: '🧲', label: 'mıknatıs' },
      { emoji: '🔦', label: 'fener' },
      { emoji: '💧', label: 'damlalık', correct: true },
    ],
    yesSay: 'Suyu emdi!',
    noSay: 'Suyu emmedi.',
    materials: [
      { emoji: '🧽', say: 'Bu bir sünger.', label: 'sünger', yes: true },
      { emoji: '🧻', say: 'Bu bir kâğıt havlu.', label: 'kâğıt havlu', yes: true },
      { emoji: '🧦', say: 'Bu bir çorap.', label: 'çorap', yes: true },
      { emoji: '🍽️', say: 'Bu bir tabak.', label: 'tabak', yes: false },
      { emoji: '🛍️', say: 'Bu bir poşet.', label: 'poşet', yes: false },
      { emoji: '🎈', say: 'Bu bir balon.', label: 'balon', yes: false },
    ],
  },
];

/** Tur 4: adil deney (buz). İki buz aynı boyda, üçüncüsü farklı; çocuk aynı boydaki ikisini seçer. */
export const ICE_TEST = {
  question: 'Buz güneşte mi, gölgede mi daha çok erir? Adil bir deney yapalım.',
  /** Üç buz: boyut çarpanı (görsel). İki tanesi eşit. */
  sizes: [1, 1, 0.7] as const,
} as const;

/** Masaldan bağımsız, tüm deneylerde tekrar kullanılan genel klipler. */
export const DENEY_KLIPLER = {
  giris: 'Bilim insanı gibi deney yapacağız. Önce merak et, sonra dene!',
  aletSec: 'Soruya uygun aleti seç.',
  aletYanlis: 'Bununla olmaz. Soruya tekrar bak.',
  malzemeSec: 'Üç malzeme seç. Hepsini deneyeceğiz.',
  dene: 'Şimdi her birini dene. Dokun!',
  defter: 'Defterine yaz. Ne oldu?',
  defterDogru: 'Doğru yazdın!',
  defterYanlis: 'Defterine bakalım. Bir daha dene.',
  deneyBitti: 'Deneyini tamamladın. Tam bir bilim insanısın!',
  ice: {
    adil: 'İki buz aynı boyda olmalı. Böylece adil deney yaparız.',
    boyutYanlis: 'Bu ikisi aynı boyda değil. Aynı boyda iki buz seç.',
    yerlestir: 'Birini güneşe koy. Diğeri gölgede kalsın.',
    bekle: 'Biraz bekleyelim.',
    sor: 'Hangisi daha çok erimiş? Dokun.',
    dogru: 'Evet! Güneşteki buz daha çok erimiş.',
    yanlis: 'Buzlara bir daha bak.',
  },
  kapanis: 'Harika bir deney oldu. Aferin!',
} as const;

export const ALL_DENEY_KLIPLERI: string[] = [
  DENEY_KLIPLER.giris, DENEY_KLIPLER.aletSec, DENEY_KLIPLER.aletYanlis, DENEY_KLIPLER.malzemeSec,
  DENEY_KLIPLER.dene, DENEY_KLIPLER.defter, DENEY_KLIPLER.defterDogru, DENEY_KLIPLER.defterYanlis,
  DENEY_KLIPLER.deneyBitti, ...Object.values(DENEY_KLIPLER.ice), ICE_TEST.question, DENEY_KLIPLER.kapanis,
  ...EXPERIMENTS.flatMap((e) => [e.question, e.yesSay, e.noSay, ...e.materials.map((m) => m.say)]),
];
