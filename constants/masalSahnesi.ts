// Masal Sahnesi içeriği (Türkçe / TADB.3 çözümleme + TADB.2 anlam oluşturma).
// Her masal 4 kısa cümle; çocuk masalı dinler, sonra sahneyi KİM / NEREDE / NE ZAMAN / NE OLDU
// yuvalarına doğru resmi seçerek kurar. Seçenekler masalda geçmeyen ama masalla çelişmeyen
// çeldiricilerdir. Yanlışta ilgili masal cümlesi yeniden çalınır (ek klip gerekmez).
// Kurallar (constants/masalSahnesi.test.ts ile korunur): cümle ≤110 karakter, rakam yok,
// korku/şiddet yok, her yuvada tek doğru + 2 çeldirici, tahmin seçenekleri puanlanmaz.

export type SlotKind = 'kim' | 'nerede' | 'zaman' | 'olay';

export interface SlotOption { emoji: string; label: string; correct?: true }

export interface SlotDef {
  kind: SlotKind;
  /** Bu bilginin geçtiği masal cümlesi (0-3); yanlışta bu cümle yeniden çalınır. */
  sentenceIdx: number;
  options: [SlotOption, SlotOption, SlotOption];
}

export interface Tale {
  id: string;
  /** Kapak resmi (karakter + mekân ipucu; cevabı vermez). */
  cover: string;
  /** "Sence ne olacak?" — 3 makul tahmin; hiçbiri doğru/yanlış sayılmaz. */
  predictions: [SlotOption, SlotOption, SlotOption];
  sentences: [string, string, string, string];
  /** Zaman yuvası varsa arka plan: gündüz/gece/akşam. */
  mood?: 'gunduz' | 'gece' | 'aksam';
  slots: SlotDef[];
}

// Zorluk basamağı: masal sırası = basamak. 1-2: kim + nerede · 3: + ne oldu · 4-5: dört unsur.
export const TALES: Tale[] = [
  {
    id: 'tavsan-yagmur',
    cover: '🐰🏡',
    predictions: [
      { emoji: '☔', label: 'Tavşan şemsiye açar' },
      { emoji: '😴', label: 'Tavşan uyur' },
      { emoji: '🎈', label: 'Tavşan balon uçurur' },
    ],
    sentences: [
      'Küçük tavşan sabah erkenden bahçeye çıkmış.',
      'Bahçede rengârenk çiçekler açmış.',
      'Birden gökten yağmur damlaları düşmeye başlamış.',
      'Tavşan hemen şemsiyesini açmış ve kuru kalmış.',
    ],
    slots: [
      { kind: 'kim', sentenceIdx: 0, options: [{ emoji: '🐰', label: 'tavşan', correct: true }, { emoji: '🐱', label: 'kedi' }, { emoji: '🐻', label: 'ayı' }] },
      { kind: 'nerede', sentenceIdx: 1, options: [{ emoji: '🌷', label: 'bahçe', correct: true }, { emoji: '🏖️', label: 'deniz kıyısı' }, { emoji: '🌲', label: 'orman' }] },
    ],
  },
  {
    id: 'ayi-bal',
    cover: '🐻🌲',
    predictions: [
      { emoji: '🍯', label: 'Ayı bal bulur' },
      { emoji: '😴', label: 'Ayı uyur' },
      { emoji: '🌳', label: 'Ayı ağaca tırmanır' },
    ],
    sentences: [
      'Koca ayı akşam olunca ormanda yürüyüşe çıkmış.',
      'Ağaçların arasında tatlı bir koku duymuş.',
      'Kokunun peşinden gitmiş ve bir kovan bulmuş.',
      'Ayı balı tek başına yememiş, arkadaşlarıyla paylaşmış.',
    ],
    slots: [
      { kind: 'kim', sentenceIdx: 0, options: [{ emoji: '🐻', label: 'ayı', correct: true }, { emoji: '🐘', label: 'fil' }, { emoji: '🦊', label: 'tilki' }] },
      { kind: 'nerede', sentenceIdx: 0, options: [{ emoji: '🌲', label: 'orman', correct: true }, { emoji: '🌊', label: 'deniz' }, { emoji: '🏙️', label: 'şehir' }] },
    ],
  },
  {
    id: 'balik-top',
    cover: '🐟🏞️',
    predictions: [
      { emoji: '⚽', label: 'Balık bir top bulur' },
      { emoji: '🎵', label: 'Balık şarkı söyler' },
      { emoji: '💃', label: 'Balık dans eder' },
    ],
    sentences: [
      'Minik balık gölde yüzüyormuş.',
      'Suyun içinde kırmızı bir top görmüş.',
      'Topu burnuyla itmiş ve kıyıdaki çocuklara ulaştırmış.',
      'Çocuklar çok sevinmiş, minik balığa teşekkür etmişler.',
    ],
    slots: [
      { kind: 'kim', sentenceIdx: 0, options: [{ emoji: '🐟', label: 'balık', correct: true }, { emoji: '🐸', label: 'kurbağa' }, { emoji: '🦆', label: 'ördek' }] },
      { kind: 'nerede', sentenceIdx: 0, options: [{ emoji: '🏞️', label: 'göl', correct: true }, { emoji: '🏜️', label: 'çöl' }, { emoji: '🏔️', label: 'dağ' }] },
      { kind: 'olay', sentenceIdx: 2, options: [{ emoji: '⚽', label: 'topu çocuklara ulaştırdı', correct: true }, { emoji: '🎵', label: 'şarkı söyledi' }, { emoji: '🍽️', label: 'yemek yedi' }] },
    ],
  },
  {
    id: 'kedi-yildiz',
    cover: '🐱🌙',
    mood: 'gece',
    predictions: [
      { emoji: '⭐', label: 'Kedi yıldıza bakar' },
      { emoji: '😴', label: 'Kedi uyur' },
      { emoji: '🥛', label: 'Kedi süt içer' },
    ],
    sentences: [
      'Gece olunca küçük kedi çatıya çıkmış.',
      'Gökyüzünde yıldızlar parıldıyormuş.',
      'Bir yıldız yavaşça kaymış.',
      'Kedi gözlerini kapatıp güzel bir dilek tutmuş.',
    ],
    slots: [
      { kind: 'kim', sentenceIdx: 0, options: [{ emoji: '🐱', label: 'kedi', correct: true }, { emoji: '🐶', label: 'köpek' }, { emoji: '🐭', label: 'fare' }] },
      { kind: 'nerede', sentenceIdx: 0, options: [{ emoji: '🏠', label: 'çatı', correct: true }, { emoji: '🌲', label: 'orman' }, { emoji: '🏖️', label: 'plaj' }] },
      { kind: 'zaman', sentenceIdx: 0, options: [{ emoji: '🌙', label: 'gece', correct: true }, { emoji: '☀️', label: 'gündüz' }, { emoji: '🌅', label: 'sabah' }] },
      { kind: 'olay', sentenceIdx: 2, options: [{ emoji: '🌠', label: 'yıldız kaydı, dilek tuttu', correct: true }, { emoji: '☔', label: 'yağmur yağdı' }, { emoji: '🎈', label: 'balon uçurdu' }] },
    ],
  },
  {
    id: 'kuzu-ucurtma',
    cover: '🐑🌾',
    mood: 'gunduz',
    predictions: [
      { emoji: '🪁', label: 'Kuzu uçurtma uçurur' },
      { emoji: '🏃', label: 'Kuzu koşar' },
      { emoji: '🍃', label: 'Kuzu ot yer' },
    ],
    sentences: [
      'Neşeli kuzu öğle vakti çayırda oynuyormuş.',
      'Rüzgâr esmiş ve bir uçurtmayı getirmiş.',
      'Kuzu uçurtmanın ipini tutmuş.',
      'Uçurtma gökyüzüne yükselmiş, kuzu çok mutlu olmuş.',
    ],
    slots: [
      { kind: 'kim', sentenceIdx: 0, options: [{ emoji: '🐑', label: 'kuzu', correct: true }, { emoji: '🐄', label: 'inek' }, { emoji: '🐔', label: 'tavuk' }] },
      { kind: 'nerede', sentenceIdx: 0, options: [{ emoji: '🌾', label: 'çayır', correct: true }, { emoji: '🏙️', label: 'şehir' }, { emoji: '🏝️', label: 'ada' }] },
      { kind: 'zaman', sentenceIdx: 0, options: [{ emoji: '☀️', label: 'öğle (gündüz)', correct: true }, { emoji: '🌙', label: 'gece' }, { emoji: '🌆', label: 'akşam' }] },
      { kind: 'olay', sentenceIdx: 3, options: [{ emoji: '🪁', label: 'uçurtma uçurdu', correct: true }, { emoji: '🎣', label: 'balık tuttu' }, { emoji: '🍳', label: 'yemek yaptı' }] },
    ],
  },
];

/** Oyun boyunca tekrar kullanılan genel yönerge klipleri (masala özgü olmayanlar). */
export const MASAL_GENEL_KLIPLER = {
  giris: 'Masalı dinle, sonra masalın sahnesini sen kur!',
  tahmin: 'Sence bu masalda ne olacak? Bir resme dokun.',
  dinle: 'Şimdi dinle.',
  sahneKur: 'Şimdi masalın sahnesini sen kur!',
  soru: {
    kim: 'Masalda kim vardı?',
    nerede: 'Masal nerede geçti?',
    zaman: 'Masal ne zaman geçti?',
    olay: 'Masalda ne oldu?',
  },
  dogru: 'Evet, doğru!',
  yanlis: 'Hımm, masalda öyle miydi? Bir daha dinleyelim.',
  tahminKontrol: 'Tahminin tuttu mu? Yoksa masal seni şaşırttı mı?',
  tahminCevap: 'Masallar bazen şaşırtır. Çok güzel dinledin!',
  bitis: 'Sahne hazır! Masalı sen kurdun, aferin!',
} as const;
