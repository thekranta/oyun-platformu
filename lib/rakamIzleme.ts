// Rakam Yazma (1-5 ve 6-10): rakam izleme değerlendirmesi (saf mantık, render'dan bağımsız, test edilebilir).
// 1-5 oyununa da aynı kural uygulandı (test listesi 81-K1, 2026-10-29): eski kural 1-5'te hâlâ "sırasız yakınlık"tı.
//
// Eski kabul: "hedef noktaların %85'i çizimin herhangi bir noktasına ≥35 px yakın" (sıra yok, şekil yok) — karalama da rakamı
// kapsıyordu (benzetimde 20/20 karalama ve 14/20 yanlış rakam kabul edildi) ve ekrandaki soluk rakam bir yazı tipi harfiydi,
// kabul edilen yol ise ona hiç bağlı olmayan ideal noktalardı (Oyun_Test_Listesi #81, 2026-10-25: "çizimin kabulü ile ilgili
// sorun var, farklı bir değerlendirme yapmalıyız").
//
// Yeni kabul (rakam kılavuzu = değerlendirilen yolun ta kendisi, ekranda aynı yol çizilir):
//  1. Her rakam 1-3 PARÇADAN oluşur (kapalı halka ya da açık çizgi). Çocuk her parçayı SIRAYLA izlemeli: sıradaki noktalardan
//     birine (en çok `lookahead` ileri) yaklaşınca ilerleme sürer; karalama sırayı tutturamaz.
//  2. Açık çizgiler İKİ yönde, halkalar HER başlangıçtan ve İKİ yönde kabul edilir (çocuk 0'ı saat yönünde ya da tersine,
//     istediği yerden başlayarak çizebilir); parçalar herhangi bir sırayla çizilebilir, parmak kalkabilir.
//  3. Parçanın en az `ratio` kadarı sırayla geçilince parça tamam; tüm parçalar tamam olunca rakam tamam.
//  Ayarlar benzetimle seçildi (lib/rakamIzleme.test.ts; tuval 300 px, yarıçap ≈ %9,3): özenli/özensiz izleme 30/30 ve ~26/30 kabul, karalama 0/25, yanlış rakam 1/20 (8 çizilince 9 kabul: 9'un yolu 8'in içinde).
//  4. İsabet: çizilen noktaların en az `minPrecision` kadarı hedef yola `precisionRadius` içinde olmalı (rakamın dışına
//     taşan zigzag/karalama tutmaz); mürekkep bütçesi: toplam çizilen uzunluk hedef yolun `inkBudget` katını aşarsa deneme başarısız.

export type Pt = { x: number; y: number };

export interface DigitPart { points: Pt[]; closed: boolean }

const ring = (cx: number, cy: number, rx: number, ry: number, n: number): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });

const seg = (x0: number, y0: number, x1: number, y1: number, n: number): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const t = n <= 1 ? 0 : i / (n - 1);
    return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t };
  });

const qbez = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, n: number): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const u = 1 - t;
    return { x: u * u * x0 + 2 * u * t * x1 + t * t * x2, y: u * u * y0 + 2 * u * t * y1 + t * t * y2 };
  });

/** Elips yayı: açılar derece (0° sağ, 90° aşağı, 270° yukarı; artan açı = saat yönü). */
const arc = (cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = ((a0 + ((a1 - a0) * i) / (n - 1)) * Math.PI) / 180;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });

/** Tek bir basamağın (0-9; 2-5 yalnız tek başına rakam olarak) parçaları — normalize 0-1 koordinat; cx/cy merkez, s ölçek. */
export function digitParts(d: number, cx: number, cy: number, s: number): DigitPart[] {
  switch (d) {
    case 0:
      return [{ closed: true, points: ring(cx, cy, s * 0.55, s * 0.82, 26) }];
    case 1:
      return [
        { closed: false, points: seg(cx, cy - s * 0.85, cx, cy + s * 0.85, 20) },                        // gövde
        { closed: false, points: seg(cx, cy - s * 0.85, cx - s * 0.32, cy - s * 0.52, 4) },              // üst bayrak
      ];
    case 2:
      return [{
        closed: false,
        points: [
          ...arc(cx, cy - s * 0.4, s * 0.48, s * 0.44, 195, 390, 14),                          // üst kavis: soldan yukarı, sağa, aşağı
          ...seg(cx + s * 0.416, cy - s * 0.18, cx - s * 0.5, cy + s * 0.8, 14).slice(1),      // sol alta çapraz iniş
          ...seg(cx - s * 0.5, cy + s * 0.8, cx + s * 0.55, cy + s * 0.8, 12).slice(1),        // taban
        ],
      }];
    case 3:
      return [{
        closed: false,
        points: [
          ...arc(cx, cy - s * 0.42, s * 0.44, s * 0.4, 200, 450, 14),                          // üst kavis: ortaya kadar
          ...arc(cx, cy + s * 0.42, s * 0.5, s * 0.44, 270, 520, 16).slice(1),                 // alt kavis: ortadan sağa, aşağı, sola
        ],
      }];
    case 4:
      return [
        {
          closed: false,
          points: [
            ...seg(cx + s * 0.2, cy - s * 0.85, cx - s * 0.5, cy + s * 0.25, 14),              // üstten sol alta çapraz
            ...seg(cx - s * 0.5, cy + s * 0.25, cx + s * 0.55, cy + s * 0.25, 12).slice(1),    // yatay
          ],
        },
        { closed: false, points: seg(cx + s * 0.2, cy - s * 0.85, cx + s * 0.2, cy + s * 0.85, 20) },   // dikey gövde
      ];
    case 5:
      return [{
        closed: false,
        points: [
          ...seg(cx + s * 0.45, cy - s * 0.8, cx - s * 0.35, cy - s * 0.8, 10),                // üst yatay (sağdan sola)
          ...seg(cx - s * 0.35, cy - s * 0.8, cx - s * 0.38, cy - s * 0.02, 8).slice(1),       // sol dikey iniş
          ...arc(cx - s * 0.02, cy + s * 0.4, s * 0.52, s * 0.48, 235, 510, 16),               // alt karın: sağa, aşağı, sola
        ],
      }];
    case 6:
      return [
        { closed: false, points: qbez(cx + s * 0.38, cy - s * 0.78, cx - s * 0.62, cy - s * 0.35, cx - s * 0.46, cy + s * 0.3, 14) },
        { closed: true, points: ring(cx, cy + s * 0.36, s * 0.48, s * 0.5, 16) },
      ];
    case 7:
      return [{
        closed: false,
        points: [
          ...seg(cx - s * 0.48, cy - s * 0.78, cx + s * 0.5, cy - s * 0.78, 12),
          ...seg(cx + s * 0.5, cy - s * 0.78, cx - s * 0.18, cy + s * 0.82, 16).slice(1),
        ],
      }];
    case 8:
      return [
        { closed: true, points: ring(cx, cy - s * 0.42, s * 0.4, s * 0.42, 14) },
        { closed: true, points: ring(cx, cy + s * 0.4, s * 0.52, s * 0.5, 16) },
      ];
    case 9:
      return [
        { closed: true, points: ring(cx, cy - s * 0.35, s * 0.48, s * 0.5, 16) },
        { closed: false, points: qbez(cx + s * 0.46, cy - s * 0.35, cx + s * 0.5, cy + s * 0.4, cx - s * 0.22, cy + s * 0.82, 12) },
      ];
    default:
      return [];
  }
}

/** Bir sayının (1-10) parçaları; 10 iki basamaklı: "1" solda, "0" sağda. Tek başına 1 tek vuruş: bayraktan başlayıp gövdeye iner. */
export function numberParts(num: number): DigitPart[] {
  if (num >= 10) return [...digitParts(1, 0.34, 0.5, 0.24), ...digitParts(0, 0.66, 0.5, 0.24)];
  if (num === 1) {
    const cx = 0.5, cy = 0.5, s = 0.35;
    return [{ closed: false, points: [...seg(cx - s * 0.32, cy - s * 0.52, cx, cy - s * 0.85, 5), ...seg(cx, cy - s * 0.85, cx, cy + s * 0.85, 20).slice(1)] }];
  }
  return digitParts(num, 0.5, 0.5, 0.35);
}

/** Normalize parçaları tuval ölçüsüne çevirir. */
export const scaleParts = (parts: DigitPart[], width: number, height: number): DigitPart[] =>
  parts.map((p) => ({ closed: p.closed, points: p.points.map((q) => ({ x: q.x * width, y: q.y * height })) }));

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

/** Bir parçayı geçmenin olası sıraları: açık → ileri/geri; halka → her başlangıç × iki yön. */
function variantsOf(part: DigitPart): number[][] {
  const n = part.points.length;
  const fwd = Array.from({ length: n }, (_, i) => i);
  if (!part.closed) return [fwd, [...fwd].reverse()];
  const out: number[][] = [];
  for (let s = 0; s < n; s++) {
    out.push(fwd.map((_, i) => (s + i) % n));
    out.push(fwd.map((_, i) => (s - i + n) % n));
  }
  return out;
}

export interface TrackerOptions {
  /** Noktaya "değdi" sayılan yarıçap (px). */
  radius: number;
  /** Sıradaki noktadan en çok kaç nokta ileriye atlanabilir (1: çizim 2 px'te bir doldurulduğundan ancak yarıçap dışına taşan tek bir nokta tolere edilir). */
  lookahead?: number;
  /** Bir parçanın tamam sayılması için sırayla geçilmesi gereken oran. */
  ratio?: number;
  /** Çizilen toplam uzunluk ≤ hedef yol uzunluğu × inkBudget olmalı (karalama bütçeyi aşar). */
  inkBudget?: number;
  /** İsabet ölçümünde hedef yola "yakın" sayılan uzaklık (px); varsayılan radius × 1,3. */
  precisionRadius?: number;
  /** Çizilen noktaların hedef yola yakın olması gereken en küçük oran. */
  minPrecision?: number;
  /** Vuruşun yola PARALEL gittiği (yolu kesip geçmediği) örneklerin en küçük oranı: zigzag karalamayı eler. */
  minAlign?: number;
}

export const DEFAULT_LOOKAHEAD = 1;
export const DEFAULT_RATIO = 0.9;
export const DEFAULT_INK_BUDGET = 2;
export const DEFAULT_MIN_PRECISION = 0.8;
export const DEFAULT_MIN_ALIGN = 0.6;
/** Yön ölçümü: son bu kadar noktaya göre (≥ ALIGN_MIN_MOVE px) yön alınır; |cos| ≥ ALIGN_COS ise yola paralel sayılır (±60°). */
const ALIGN_WINDOW = 5;
const ALIGN_MIN_MOVE = 8;
const ALIGN_COS = 0.5;
/** Bu kadar nokta çizilmeden isabet oranına bakılmaz (ilk dokunuşlar yanıltmasın). */
export const PRECISION_MIN_SAMPLES = 150;

export interface Tracker {
  /** Çizim noktası (tuval px). Aralarındaki boşluğu çağıran doldurur. */
  feed(p: Pt): void;
  /** Yeni vuruş başladı: mürekkep uzunluğu önceki noktayla birleştirilmez. */
  lift(): void;
  /** 0-1: tamamlanmaya göre toplam ilerleme (parça başına en iyi sıra). */
  progress(): number;
  complete(): boolean;
  /** Mürekkep bütçesi aşıldı mı (karalama)? Tamamlanmadıysa deneme baştan başlamalı. */
  overBudget(): boolean;
  /** Çizilen toplam uzunluk / hedef yol uzunluğu (1 = rakamın bir kez tam izlenmesi). */
  inkRatio(): number;
  /** Çizilen noktaların hedef yola yakın olanlarının oranı (0-1; hiç nokta yoksa 1). */
  precision(): number;
  /** Yönü ölçülen örneklerin yola paralel olanlarının oranı (0-1; örnek yoksa 1). */
  alignment(): number;
  /** Deneme baştan başlamalı mı: bütçe aşıldı ya da yeterince nokta çizilip isabet çok düşük (karalama). */
  shouldReset(): boolean;
  /** Ekranda yeşil gösterilecek, sırayla geçilmiş noktalar: parça başına en iyi sıranın geçtiği noktalar (parça sırasıyla). */
  visited(): Pt[][];
  reset(): void;
}

export function createTracker(parts: DigitPart[], opts: TrackerOptions): Tracker {
  const lookahead = opts.lookahead ?? DEFAULT_LOOKAHEAD;
  const ratio = opts.ratio ?? DEFAULT_RATIO;
  const inkBudget = opts.inkBudget ?? DEFAULT_INK_BUDGET;
  const minPrecision = opts.minPrecision ?? DEFAULT_MIN_PRECISION;
  const minAlign = opts.minAlign ?? DEFAULT_MIN_ALIGN;
  const r = opts.radius;
  const pr = opts.precisionRadius ?? r * 1.3;

  const variants = parts.map(variantsOf);
  // next[p][v]: parça p, sıra v için sıradaki beklenen indeks (0 = hiç ilerlenmedi)
  const next: number[][] = variants.map((vs) => vs.map(() => 0));
  const need = parts.map((p) => Math.max(1, Math.ceil(p.points.length * ratio)));
  const targetLength = parts.reduce((sum, p) => {
    let len = 0;
    for (let i = 1; i < p.points.length; i++) len += dist(p.points[i - 1], p.points[i]);
    if (p.closed && p.points.length > 1) len += dist(p.points[p.points.length - 1], p.points[0]);
    return sum + len;
  }, 0);
  let ink = 0;
  let last: Pt | null = null;
  let fed = 0;
  let near = 0;
  let dirSamples = 0;
  let aligned = 0;
  const recent: Pt[] = [];

  /** Noktanın hedef yola (parçaların çizgileri; halkalar kapalı) en kısa uzaklığı ve o noktadaki yol yönü (birim). */
  const distToPath = (p: Pt): { d: number; tx: number; ty: number } => {
    let best = Infinity;
    let btx = 1;
    let bty = 0;
    for (const part of parts) {
      const pts = part.points;
      const n = pts.length;
      const segs = part.closed ? n : n - 1;
      for (let i = 0; i < segs; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % n];
        const dx = b.x - a.x, dy = b.y - a.y;
        const l2 = dx * dx + dy * dy || 1;
        const u = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
        const d = Math.hypot(p.x - (a.x + u * dx), p.y - (a.y + u * dy));
        if (d < best) { best = d; const l = Math.sqrt(l2); btx = dx / l; bty = dy / l; }
      }
    }
    return { d: best, tx: btx, ty: bty };
  };

  const bestOf = (pi: number) => {
    let bv = 0;
    for (let v = 1; v < next[pi].length; v++) if (next[pi][v] > next[pi][bv]) bv = v;
    return bv;
  };

  const tracker: Tracker = {
    feed(p) {
      if (last) ink += dist(last, p);
      last = p;
      fed += 1;
      const hit = distToPath(p);
      if (hit.d < pr) near += 1;
      // Yön: son birkaç noktadan hareket vektörü; yola paralel (±60°) ve yola yakınsa "paralel" sayılır
      recent.push(p);
      if (recent.length > ALIGN_WINDOW + 1) recent.shift();
      if (recent.length === ALIGN_WINDOW + 1) {
        const o = recent[0];
        const mx = p.x - o.x, my = p.y - o.y;
        const ml = Math.hypot(mx, my);
        if (ml >= ALIGN_MIN_MOVE) {
          dirSamples += 1;
          if (hit.d < pr && Math.abs(mx * hit.tx + my * hit.ty) / ml >= ALIGN_COS) aligned += 1;
        }
      }
      for (let pi = 0; pi < parts.length; pi++) {
        const pts = parts[pi].points;
        const vs = variants[pi];
        for (let v = 0; v < vs.length; v++) {
          const seq = vs[v];
          const from = next[pi][v];
          if (from >= seq.length) continue;
          const to = Math.min(from + lookahead, seq.length - 1);
          for (let j = to; j >= from; j--) {              // en ileri eşleşmeyi al
            if (dist(pts[seq[j]], p) < r) { next[pi][v] = j + 1; break; }
          }
        }
      }
    },
    lift() { last = null; recent.length = 0; },
    progress() {
      let done = 0;
      let total = 0;
      for (let pi = 0; pi < parts.length; pi++) {
        total += need[pi];
        done += Math.min(need[pi], next[pi][bestOf(pi)]);
      }
      return total === 0 ? 0 : done / total;
    },
    complete() {
      return parts.length > 0 && parts.every((_, pi) => next[pi][bestOf(pi)] >= need[pi])
        && ink <= targetLength * inkBudget && tracker.precision() >= minPrecision && tracker.alignment() >= minAlign;
    },
    overBudget() { return ink > targetLength * inkBudget; },
    inkRatio() { return targetLength === 0 ? 0 : ink / targetLength; },
    precision() { return fed === 0 ? 1 : near / fed; },
    alignment() { return dirSamples < 20 ? 1 : aligned / dirSamples; },
    shouldReset() {
      return ink > targetLength * inkBudget
        || (fed >= PRECISION_MIN_SAMPLES && (tracker.precision() < minPrecision * 0.65 || tracker.alignment() < minAlign * 0.6));
    },
    visited() {
      return parts.map((part, pi) => {
        const bv = bestOf(pi);
        const seq = variants[pi][bv];
        const out: Pt[] = [];
        for (let j = 0; j < Math.min(next[pi][bv], seq.length); j++) out.push(part.points[seq[j]]);
        return out;
      });
    },
    reset() {
      next.forEach((row) => row.fill(0));
      ink = 0;
      last = null;
      fed = 0;
      near = 0;
      dirSamples = 0;
      aligned = 0;
      recent.length = 0;
    },
  };
  return tracker;
}
