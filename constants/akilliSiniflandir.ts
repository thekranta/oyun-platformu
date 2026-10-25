// Akıllı Sınıflandır (Fen/FAB.2) — grup (sepet) kimliği, nesne havuzu ve tur üretimi.
//
// Eskiden sepetler düz yeşil, YAZILI düğmelerdi ("Meyve", "Sebze") ve grup adı hiçbir yerde sesli
// söylenmiyordu: okuma bilmeyen çocuk iki sepetin ne olduğunu öğrenemiyordu (Oyun_Test_Listesi #58
// "metin odaklı, çocuk okuma bilmiyor"). Artık:
//  - her sepet büyük, renkli bir kart ve 1-3 büyük örnek emoji (EMBLEM) taşır; kartta yazı yok,
//  - sete özel kısa SESLİ soru okunur (ilk turda, set değişince ve Tekrar Dinle'de),
//  - emblem emojileri nesne havuzunda OLMAZ (aksi halde çocuk kategorilemeden "aynı simgeyi bul"
//    kısayoluyla çözerdi — test bunu garanti eder),
//  - oyun en kolay gruptan (hayvan/yiyecek) başlar; havuzda domates (elma ile karışıyordu, #60) yok.
// 2026-10-25 (kullanıcı: "simgeler problemli, yetişkin olarak bile emin olamadım"): soyut simgeler (🐾 🍽️ 🌱 🧱) yerine
// her sepete grubun SOMUT, tanınan 1-2 örneği konur (hayvan: köpek-kedi, yiyecek: elma-hamburger, meyve: elma-muz, sebze: havuç-brokoli,
// karada: ağaç-dağ, denizde: dalga-deniz kabuğu, canlı: lale-kuş, cansız: taş-tuğla); örnekler yine havuzda YOK (yukarıdaki kural).
// Çocuk nesneyi sepete SÜRÜKLER (eskiden sepete dokunuyordu ama "koy" denmesine rağmen nesne hiçbir yere gitmiyordu).

export interface Cat {
  key: string;
  /** Ekranda YAZILMAZ; yalnız erişilebilirlik (ekran okuyucu) etiketi. */
  a11y: string;
  /** Sepetin üstünde görünen büyük örnek emojiler (nesne havuzunda bulunmaz). */
  emblem: string[];
  bg: string;
  border: string;
}

export interface SetItem { emoji: string; cat: string }

export interface CatSet {
  id: string;
  /** Sesli soru: hazır klibi OLMALI (klibi olmayan metin canlı/yabancı sese düşer). */
  prompt: string;
  cats: [Cat, Cat];
  items: SetItem[];
}

const of = (cat: string, emojis: string[]): SetItem[] => emojis.map((emoji) => ({ emoji, cat }));

// Zorluk arttıkça gruplar daha soyut/yakın: hayvan/yiyecek → meyve/sebze → karada/denizde → canlı/cansız.
export const SETS: CatSet[] = [
  {
    id: 'hayvan-yiyecek',
    prompt: 'Hayvan mı, yiyecek mi? Doğru sepete koy!',
    cats: [
      { key: 'hayvan', a11y: 'Hayvan', emblem: ['🐶', '🐱'], bg: '#FFE0B2', border: '#FB8C00' },
      { key: 'yiyecek', a11y: 'Yiyecek', emblem: ['🍎', '🍔'], bg: '#C8E6C9', border: '#43A047' },
    ],
    items: [
      ...of('hayvan', ['🐰', '🐻', '🦊', '🐸', '🐔', '🐴', '🐮', '🐷']),
      ...of('yiyecek', ['🍌', '🍰', '🥕', '🧀', '🍇', '🍕', '🍪', '🍩']),
    ],
  },
  {
    id: 'meyve-sebze',
    prompt: 'Meyve mi, sebze mi? Doğru sepete koy!',
    cats: [
      { key: 'meyve', a11y: 'Meyve', emblem: ['🍎', '🍌'], bg: '#FFCDD2', border: '#E53935' },
      { key: 'sebze', a11y: 'Sebze', emblem: ['🥕', '🥦'], bg: '#DCEDC8', border: '#7CB342' },
    ],
    // Domates, biber ve şeftali çıkarıldı: domates elma ile karışıyordu (#60), 🍑 çocuk uygulaması için tuhaftı.
    items: [
      ...of('meyve', ['🍇', '🍓', '🍊', '🍉', '🍐', '🍒', '🍍', '🍋']),
      ...of('sebze', ['🌽', '🥔', '🧅', '🥒', '🍆', '🥬']),
    ],
  },
  {
    id: 'kara-deniz',
    prompt: 'Bu hayvan nerede yaşar?',
    cats: [
      { key: 'kara', a11y: 'Karada', emblem: ['🌳', '⛰️'], bg: '#DCEDC8', border: '#689F38' },
      { key: 'deniz', a11y: 'Denizde', emblem: ['🌊', '🐚'], bg: '#BBDEFB', border: '#1E88E5' },
    ],
    items: [
      ...of('kara', ['🐶', '🐴', '🐘', '🦁', '🐰', '🦒', '🐷', '🐮']),
      ...of('deniz', ['🐟', '🐙', '🐳', '🦀', '🐠', '🦈', '🐬', '🦑']),
    ],
  },
  {
    id: 'canli-cansiz',
    prompt: 'Bu canlı mı, cansız mı?',
    cats: [
      { key: 'canli', a11y: 'Canlı', emblem: ['🌷', '🐦'], bg: '#C8E6C9', border: '#43A047' },
      { key: 'cansiz', a11y: 'Cansız', emblem: ['🪨', '🧱'], bg: '#D7CCC8', border: '#8D6E63' },
    ],
    items: [
      ...of('canli', ['🐶', '🌳', '🐝', '🐟', '🌻', '🐔', '🧒', '🐰']),
      ...of('cansiz', ['🚗', '🪑', '📱', '⚽', '🥄', '👟', '🔑']),
    ],
  },
];

/** Oyunun seslendirdiği sete özel sorular (klip üretimi + test için tek kaynak). */
export const ALL_SET_PROMPTS: string[] = SETS.map((s) => s.prompt);

export type Rng = () => number;

export interface Round {
  setIndex: number;
  emoji: string;
  cats: [Cat, Cat];
  answer: string;
}

/** Zorluk (1-5) → set sırası; 4 ve 5 aynı (en soyut) setti, öyle kalıyor. */
export const setIndexFor = (diff: number) => Math.max(0, Math.min(diff - 1, SETS.length - 1));

/**
 * Bir tur üretir: önce iki gruptan biri eşit olasılıkla seçilir, sonra o grubun nesnelerinden biri
 * (bir önceki turdaki simge hariç — aynı nesne art arda gelmez).
 */
export function buildRound(diff: number, prevEmoji?: string, rng: Rng = Math.random): Round {
  const setIndex = setIndexFor(diff);
  const set = SETS[setIndex];
  const cat = set.cats[rng() < 0.5 ? 0 : 1];
  const pool = set.items.filter((i) => i.cat === cat.key && i.emoji !== prevEmoji);
  const item = pool[Math.floor(rng() * pool.length)];
  return { setIndex, emoji: item.emoji, cats: set.cats, answer: cat.key };
}
