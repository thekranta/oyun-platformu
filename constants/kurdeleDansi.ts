// Kurdele Dansı içeriği (Müzik / MHB.1 + Hareket ve Sağlık / HSAB.3).
// Tur 1-4: çocuk parmağıyla bir kurdeleyi sürükleyerek çalan müziğe eşlik eder. Her turda aynı
// ezginin iki hâli çalınır (yavaş/hızlı, kısık/yüksek, kalın/ince, çıkan/inen); özellik ekranda
// hiçbir yerde gösterilmez. İki hareket KARŞILAŞTIRILIR (çocuğun kendi hareketi referans) — cihaz
// ve çocuk farkından bağımsız. Tur 5 "Kendi Dansım": 3 hareket kartı sırala, dansçı sergilesin (HSAB.3).
// Parmak hareketi gerçek beden dansı değildir; müzikogram (parmakla ritim çizgisi takibi) düzeyidir.
// Kurallar constants/kurdeleDansi.test.ts ve lib/kurdeleTelemetry.test.ts ile korunur.

export type MotifKey = 'yavas' | 'hizli' | 'kisik' | 'yuksek' | 'kalin' | 'ince' | 'cikan' | 'inen';
export type PairKey = 'tempo' | 'gurluk' | 'kalinlik' | 'yon';

/** Ezgi motifleri (assets/sounds/sfx/motif-*.mp3, scripts/gen-music-sfx.mjs ile sentezlenir). */
export const MOTIFS: Record<MotifKey, { path: string; durMs: number; loops: number }> = {
  yavas: { path: '/sounds/sfx/motif-yavas.wav', durMs: 3120, loops: 1 },
  // Hızlı motif yalnız ~1.2 sn sürer: dans edebilmek için üç kez tekrarlanır.
  hizli: { path: '/sounds/sfx/motif-hizli.wav', durMs: 1245, loops: 3 },
  kisik: { path: '/sounds/sfx/motif-kisik.wav', durMs: 1870, loops: 2 },
  yuksek: { path: '/sounds/sfx/motif-yuksek.wav', durMs: 1870, loops: 2 },
  kalin: { path: '/sounds/sfx/motif-kalin.wav', durMs: 1870, loops: 2 },
  ince: { path: '/sounds/sfx/motif-ince.wav', durMs: 1870, loops: 2 },
  cikan: { path: '/sounds/sfx/motif-cikan.wav', durMs: 1620, loops: 2 },
  inen: { path: '/sounds/sfx/motif-inen.wav', durMs: 1620, loops: 2 },
};

/** Aynı motifin tekrarları arasındaki boşluk (ms). */
export const LOOP_GAP_MS = 200;
/** Son tekrardan sonra çocuğa tanınan kısa süre (ms). */
export const WINDOW_TAIL_MS = 300;

/** Motifin dans penceresi süresi (ms): tekrarlar + boşluklar + kuyruk. */
export const windowMsFor = (key: MotifKey): number => {
  const m = MOTIFS[key];
  return m.loops * (m.durMs + LOOP_GAP_MS) - LOOP_GAP_MS + WINDOW_TAIL_MS;
};

/** motifs[0] = yavaş / kısık / kalın / çıkan, motifs[1] = hızlı / yüksek / ince / inen (karşılaştırma sırası). */
export const PAIRS: { key: PairKey; motifs: [MotifKey, MotifKey]; confirm: string }[] = [
  { key: 'tempo', motifs: ['yavas', 'hizli'], confirm: 'Aferin! Yavaş müzikte yavaş, hızlı müzikte hızlı dans ettin.' },
  { key: 'gurluk', motifs: ['kisik', 'yuksek'], confirm: 'Aferin! Kısık müzikte küçük, yüksek müzikte büyük dans ettin.' },
  { key: 'kalinlik', motifs: ['kalin', 'ince'], confirm: 'Aferin! Kalın seste aşağıda, ince seste yukarıda dans ettin.' },
  { key: 'yon', motifs: ['cikan', 'inen'], confirm: 'Aferin! Çıkan müzikte yukarı, inen müzikte aşağı dans ettin.' },
];

/**
 * Rehberli ("birlikte yapalım") kipte gösterilen soluk kurdelenin hareketi.
 * x = 0.5 + ax·sin(2πft), y = cy − drift/2 + drift·(t/T) + ay·cos(2πft)  (0..1 pad koordinatı, y aşağı artar).
 */
export interface GhostSpec { f: number; ax: number; ay: number; cy: number; drift: number }

export const GHOST: Record<MotifKey, GhostSpec> = {
  yavas: { f: 0.5, ax: 0.28, ay: 0.15, cy: 0.5, drift: 0 },
  hizli: { f: 2.2, ax: 0.28, ay: 0.15, cy: 0.5, drift: 0 },
  kisik: { f: 1, ax: 0.08, ay: 0.06, cy: 0.5, drift: 0 },
  yuksek: { f: 1, ax: 0.3, ay: 0.25, cy: 0.5, drift: 0 },
  kalin: { f: 1, ax: 0.2, ay: 0.1, cy: 0.78, drift: 0 },
  ince: { f: 1, ax: 0.2, ay: 0.1, cy: 0.22, drift: 0 },
  cikan: { f: 1, ax: 0.15, ay: 0.03, cy: 0.5, drift: -0.6 },
  inen: { f: 1, ax: 0.15, ay: 0.03, cy: 0.5, drift: 0.6 },
};

export interface DanceMove { id: 'alkis' | 'zipla' | 'don' | 'salla'; emoji: string; label: string }

/** Tur 5: "Kendi Dansım" hareket kartları (üç tanesi sıralanır). */
export const DANCE_MOVES: [DanceMove, DanceMove, DanceMove, DanceMove] = [
  { id: 'alkis', emoji: '👏', label: 'alkış' },
  { id: 'zipla', emoji: '🦘', label: 'zıpla' },
  { id: 'don', emoji: '🌀', label: 'dön' },
  { id: 'salla', emoji: '🙌', label: 'salla' },
];
export const DANCE_PICK_COUNT = 3;
/** Her hareketin süresi (ms): 3 hareket × 1040 ≈ motif-yavas süresi. */
export const DANCE_MOVE_MS = 1040;

export const KURDELE_KLIPLER = {
  giris: 'Kurdeleni parmağınla sürükle. Müzik nasıl çalıyorsa kurdelen de öyle dans etsin!',
  muzikDinle: 'Müziği dinle, kurdelen onunla dans etsin.',
  birinci: 'Şimdi birinci müzik.',
  ikinci: 'Şimdi ikinci müzik.',
  tekrar: 'Bir daha dinleyelim. Kurdelen müziği taklit etsin.',
  birlikte: 'Olsun, birlikte yapalım. Soluk kurdeleyi takip et.',
  dansKur: 'Kendi dansını kur. Üç hareket seç.',
  dansSerg: 'Şimdi dansçı senin dansını yapıyor!',
  dansBitis: 'Harika bir dans oldu!',
} as const;

export const ALL_KURDELE_KLIPLERI: string[] = [
  ...Object.values(KURDELE_KLIPLER),
  ...PAIRS.map((p) => p.confirm),
];
