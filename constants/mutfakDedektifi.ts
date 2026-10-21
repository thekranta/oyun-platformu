// Mutfak Dedektifi (Fen/FAB.2 sınıflandırma) — yiyecek havuzu ve seviye üretimi.
//
// Eski sürümde 🍅 domates her tahtaya "çeldirici" olarak konuyordu (botanikte meyve, 3-6 yaş için
// adil olmayan tuzak; elma ile görsel olarak aynı: kırmızı, yuvarlak, yeşil sap) ve karıştırma
// `sort(() => Math.random() - 0.5)` ile yanlıydı: elma/domates tahtaların %33-42'sinde birlikte
// çıkıyordu (Oyun_Test_Listesi #60 "elma ile domates karışıyor"). Artık:
//  - domates, biber ve mantar havuzda YOK (kategorisi çocuk için belirsiz),
//  - aynı tahtada meyve ve sebze AYNI RENK ailesinden olmaz (portakal↔havuç, muz↔mısır ...),
//  - karıştırma Fisher–Yates.

export type FoodCategory = 'meyve' | 'sebze';
export type Look = 'kirmizi' | 'turuncu' | 'sari' | 'yesil' | 'mor' | 'kahve';

export interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  category: FoodCategory;
  /** Baskın görünüm rengi: aynı tahtada meyve ile sebze bu rengi paylaşmaz. */
  look: Look;
}

export const ALL_FOODS: FoodItem[] = [
  // Meyveler (10)
  { id: 'elma', name: 'Elma', emoji: '🍎', category: 'meyve', look: 'kirmizi' },
  { id: 'muz', name: 'Muz', emoji: '🍌', category: 'meyve', look: 'sari' },
  { id: 'cilek', name: 'Çilek', emoji: '🍓', category: 'meyve', look: 'kirmizi' },
  { id: 'portakal', name: 'Portakal', emoji: '🍊', category: 'meyve', look: 'turuncu' },
  { id: 'uzum', name: 'Üzüm', emoji: '🍇', category: 'meyve', look: 'mor' },
  { id: 'karpuz', name: 'Karpuz', emoji: '🍉', category: 'meyve', look: 'yesil' },
  { id: 'armut', name: 'Armut', emoji: '🍐', category: 'meyve', look: 'yesil' },
  { id: 'kiraz', name: 'Kiraz', emoji: '🍒', category: 'meyve', look: 'kirmizi' },
  { id: 'ananas', name: 'Ananas', emoji: '🍍', category: 'meyve', look: 'sari' },
  { id: 'kivi', name: 'Kivi', emoji: '🥝', category: 'meyve', look: 'yesil' },
  // Sebzeler (7)
  { id: 'havuc', name: 'Havuç', emoji: '🥕', category: 'sebze', look: 'turuncu' },
  { id: 'brokoli', name: 'Brokoli', emoji: '🥦', category: 'sebze', look: 'yesil' },
  { id: 'salatalik', name: 'Salatalık', emoji: '🥒', category: 'sebze', look: 'yesil' },
  { id: 'patates', name: 'Patates', emoji: '🥔', category: 'sebze', look: 'kahve' },
  { id: 'sogan', name: 'Soğan', emoji: '🧅', category: 'sebze', look: 'kahve' },
  { id: 'misir', name: 'Mısır', emoji: '🌽', category: 'sebze', look: 'sari' },
  { id: 'patlican', name: 'Patlıcan', emoji: '🍆', category: 'sebze', look: 'mor' },
];

export type Rng = () => number;

/** Fisher–Yates (yeni dizi döndürür). */
export function shuffle<T>(items: T[], rng: Rng = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Seviye başına yiyecek sayısı: 3, 4, 5, 6, 6. */
export const itemCountFor = (level: number) => Math.min(3 + Math.max(1, level) - 1, 6);

/**
 * Bir seviyenin tahtasını üretir: yarısı (aşağı yuvarlanır) meyve, kalanı sebze; tekrar yok;
 * meyve ile sebze aynı renk ailesinden olmaz. Önce sebzeler seçilir, meyveler yalnız o renklerin
 * dışındaki havuzdan alınır (kırmızı meyveler hiçbir sebzeyle çakışmadığı için her zaman en az 3
 * meyve kalır → üretim her zaman başarılı, reddetme döngüsü gerekmez).
 */
export function generateLevel(level: number, rng: Rng = Math.random): FoodItem[] {
  const count = itemCountFor(level);
  const fruitCount = Math.floor(count / 2);
  const vegCount = count - fruitCount;

  const veggies = shuffle(ALL_FOODS.filter((f) => f.category === 'sebze'), rng).slice(0, vegCount);
  const vegLooks = new Set(veggies.map((v) => v.look));
  const fruits = shuffle(
    ALL_FOODS.filter((f) => f.category === 'meyve' && !vegLooks.has(f.look)),
    rng,
  ).slice(0, fruitCount);

  return shuffle([...fruits, ...veggies], rng);
}
