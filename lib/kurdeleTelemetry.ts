import type { GhostSpec, PairKey } from '../constants/kurdeleDansi';

// Kurdele Dansı parmak hareketi ölçümü. Tüm değerler pad'e göre normalize edilir (x,y: 0..1; y aşağı artar).
// Kararlar MUTLAK eşiklerle değil, çocuğun kendi iki hareketinin KARŞILAŞTIRMASIyla verilir:
// parmak hızı ve cihaz dokunma hassasiyeti çocuktan çocuğa çok değiştiği için göreli ölçüt güvenilirdir.

export interface Sample { x: number; y: number; t: number }

export interface Summary {
  /** Pencere içindeki örnek sayısı. */
  n: number;
  /** Toplam yol (normalize birim). */
  path: number;
  /** Ortalama hız (normalize birim / sn). */
  speed: number;
  /** Kapladığı alanın köşegeni (hareket "büyüklüğü"). */
  size: number;
  /** Ortalama yükseklik (0 = üst, 1 = alt). */
  meanY: number;
  /** Son üçte birin ortalama y'si − ilk üçte birin ortalama y'si (negatif = yukarı gitti). */
  dy: number;
}

/** Bir motifte çocuğun kat etmesi gereken asgari yol; altındaysa "hiç hareket etmedi" sayılır. */
export const MIN_PATH = 0.6;
/** Hızlı motifteki hız, yavaş motifteki hızın en az bu katı olmalı. */
export const TEMPO_RATIO = 1.25;
/** Yüksek (gür) motifteki hareket büyüklüğü, kısık motifteki büyüklüğün en az bu katı olmalı. */
export const SIZE_RATIO = 1.25;
/** Kalın seste ortalama y, ince seste ortalama y'den en az bu kadar aşağıda olmalı. */
export const HEIGHT_DIFF = 0.08;
/** İnen ezgide dy, çıkan ezgideki dy'den en az bu kadar büyük (daha aşağı) olmalı. */
export const DIR_DIFF = 0.15;
/** Pencerenin başında reaksiyon süresi olarak yok sayılan kısım (ms). */
export const SKIP_MS = 250;

const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const EMPTY: Summary = { n: 0, path: 0, speed: 0, size: 0, meanY: 0.5, dy: 0 };

/** Örnekleri (t: pencere başından itibaren ms) özetler. */
export function summarize(samples: Sample[], windowMs: number, skipMs: number = SKIP_MS): Summary {
  const s = samples.filter((p) => p.t >= skipMs && p.t <= windowMs).sort((a, b) => a.t - b.t);
  if (s.length < 2) return { ...EMPTY, n: s.length };
  let path = 0;
  let minX = s[0].x, maxX = s[0].x, minY = s[0].y, maxY = s[0].y;
  for (let i = 1; i < s.length; i++) {
    path += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
    minX = Math.min(minX, s[i].x); maxX = Math.max(maxX, s[i].x);
    minY = Math.min(minY, s[i].y); maxY = Math.max(maxY, s[i].y);
  }
  const durSec = Math.max((windowMs - skipMs) / 1000, 0.001);
  const third = Math.max(1, Math.floor(s.length / 3));
  const first = s.slice(0, third).map((p) => p.y);
  const last = s.slice(s.length - third).map((p) => p.y);
  return {
    n: s.length,
    path,
    speed: path / durSec,
    size: Math.hypot(maxX - minX, maxY - minY),
    meanY: mean(s.map((p) => p.y)),
    dy: mean(last) - mean(first),
  };
}

export type Verdict = 'ok' | 'fail' | 'nomove';

/**
 * İki hareketi karşılaştırır. a = motifs[0] (yavaş / kısık / kalın / çıkan),
 * b = motifs[1] (hızlı / yüksek / ince / inen) — oynatma sırası fark etmez.
 */
export function judge(pair: PairKey, a: Summary, b: Summary): Verdict {
  if (a.path < MIN_PATH || b.path < MIN_PATH) return 'nomove';
  switch (pair) {
    case 'tempo': return b.speed >= TEMPO_RATIO * a.speed ? 'ok' : 'fail';
    case 'gurluk': return b.size >= SIZE_RATIO * a.size ? 'ok' : 'fail';
    case 'kalinlik': return a.meanY - b.meanY >= HEIGHT_DIFF ? 'ok' : 'fail';
    case 'yon': return b.dy - a.dy >= DIR_DIFF ? 'ok' : 'fail';
  }
}

/** Soluk (rehber) kurdelenin t anındaki konumu (0..1 pad koordinatı). */
export function ghostPoint(spec: GhostSpec, tMs: number, windowMs: number): { x: number; y: number } {
  const t = tMs / 1000;
  const p = windowMs > 0 ? Math.min(Math.max(tMs / windowMs, 0), 1) : 0;
  return {
    x: 0.5 + spec.ax * Math.sin(2 * Math.PI * spec.f * t),
    y: spec.cy - spec.drift / 2 + spec.drift * p + spec.ay * Math.cos(2 * Math.PI * spec.f * t),
  };
}
