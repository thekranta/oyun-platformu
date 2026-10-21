// Uzay Blokları — saf oyun mantığı (render'dan bağımsız, test edilebilir).
//
// Eski sürüm tek bir sabit 3×3 bulmacaydı (2×2 + 1×3 + 1×2 dikdörtgenleri): parçalar döndürülemiyordu
// ("Alanı Döndür" yalnız tahtayı çeviriyordu), ilk hamlelerin ~%23'ü çözümsüz çıkmaza düşürüyordu ve
// çıkmaz hiç fark edilmiyordu (Oyun_Test_Listesi #30: "tetris gibi oynanmıyor, yeterince boşluk olmasına
// rağmen yerleştirmiyor"). Burada:
//  - parçalar poliomino kitaplığından (domino, tromino, tetromino) gelir ve 90° döndürülür,
//  - her tahta "karo döşeme" yöntemiyle üretilir → HER ZAMAN çözülebilir (hangi parçaların geldiği her seferinde değişir),
//  - kalan parçalarla tahtanın hâlâ doldurulup doldurulamayacağı çözücüyle denetlenir (çıkmaz algılama + ipucu),
//  - yerleştirme "mıknatıslı": parmak biraz kaysa da en yakın geçerli yere oturur,
//  - ekran düzeni (tahta + parça tepsisi) saf fonksiyonla hesaplanır: tek ekrana sığar, kaydırma yok.

export type Cell = [row: number, col: number];
export type Rng = () => number;

export interface Board {
  rows: number;
  cols: number;
  /** playable[r][c]: oynanabilir hücre ('#'); false = boşluk (siluet deliği). */
  playable: boolean[][];
}
/** Hücrede duran parçanın id'si; boş = null. */
export type Occupancy = (number | null)[][];

export interface Piece {
  id: number;
  shapeId: string;
  /** Tepsiye ilk gelişteki yönelim (normalize). */
  cells: Cell[];
  /** Tepsi sırasına göre renk indeksi. */
  color: number;
}

export interface Placement {
  pieceId: number;
  shapeId: string;
  /** Yerleştirilen yönelim (normalize). */
  cells: Cell[];
  row: number;
  col: number;
}

export interface Level {
  difficulty: number;
  board: Board;
  pieces: Piece[];
  /** Üretimde kullanılan döşeme: testler ve yedek ipucu için. */
  solution: Placement[];
}

// ---------------------------------------------------------------------------
// Parçalar ve yönelimler
// ---------------------------------------------------------------------------

export const SHAPES: Record<string, Cell[]> = {
  D2: [[0, 0], [0, 1]],
  I3: [[0, 0], [0, 1], [0, 2]],
  L3: [[0, 0], [1, 0], [1, 1]],
  O4: [[0, 0], [0, 1], [1, 0], [1, 1]],
  I4: [[0, 0], [0, 1], [0, 2], [0, 3]],
  L4: [[0, 0], [1, 0], [2, 0], [2, 1]],
  J4: [[0, 1], [1, 1], [2, 1], [2, 0]],
  T4: [[0, 0], [0, 1], [0, 2], [1, 1]],
  S4: [[0, 1], [0, 2], [1, 0], [1, 1]],
  Z4: [[0, 0], [0, 1], [1, 1], [1, 2]],
};

const TETROMINOES = ['O4', 'I4', 'L4', 'J4', 'T4', 'S4', 'Z4'];

export function normalize(cells: readonly Cell[]): Cell[] {
  const minR = Math.min(...cells.map((c) => c[0]));
  const minC = Math.min(...cells.map((c) => c[1]));
  return cells
    .map(([r, c]) => [r - minR, c - minC] as Cell)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

/** 90° saat yönünde döndürür (normalize döner). */
export function rotateCW(cells: readonly Cell[]): Cell[] {
  const maxR = Math.max(...cells.map((c) => c[0]));
  return normalize(cells.map(([r, c]) => [c, maxR - r] as Cell));
}

export function rotateBy(cells: readonly Cell[], quarterTurns: number): Cell[] {
  let cur = normalize(cells);
  const n = ((quarterTurns % 4) + 4) % 4;
  for (let i = 0; i < n; i++) cur = rotateCW(cur);
  return cur;
}

export const cellsKey = (cells: readonly Cell[]) => normalize(cells).map(([r, c]) => `${r},${c}`).join(';');

/** Farklı yönelimler (simetrik parçada 4'ten az). */
export function orientations(cells: readonly Cell[]): Cell[][] {
  const out: Cell[][] = [];
  const seen = new Set<string>();
  let cur = normalize(cells);
  for (let i = 0; i < 4; i++) {
    const key = cellsKey(cur);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(cur);
    }
    cur = rotateCW(cur);
  }
  return out;
}

const ORIENTATIONS: Record<string, Cell[][]> = Object.fromEntries(
  Object.entries(SHAPES).map(([id, cells]) => [id, orientations(cells)]),
);

export const shapeSize = (shapeId: string) => SHAPES[shapeId].length;

/** Parçanın hangi yönelimde olursa olsun sığdığı kare kutunun kenarı (hücre): tepsi yuvası bu boyda sabit kalır. */
export const maxDim = (shapeId: string) =>
  Math.max(...ORIENTATIONS[shapeId].map((o) => Math.max(Math.max(...o.map((c) => c[0])) + 1, Math.max(...o.map((c) => c[1])) + 1)));

export const bounds = (cells: readonly Cell[]) => ({
  rows: Math.max(...cells.map((c) => c[0])) + 1,
  cols: Math.max(...cells.map((c) => c[1])) + 1,
});

/** `from` yöneliminden `to` yönelimine kaç çeyrek tur (saat yönü) gerektiğini bulur; yoksa -1. */
export function turnsBetween(from: readonly Cell[], to: readonly Cell[]): number {
  const target = cellsKey(to);
  let cur = normalize(from);
  for (let i = 0; i < 4; i++) {
    if (cellsKey(cur) === target) return i;
    cur = rotateCW(cur);
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Tahta
// ---------------------------------------------------------------------------

export function boardFromMask(mask: readonly string[]): Board {
  const playable = mask.map((row) => [...row].map((ch) => ch === '#'));
  return { rows: mask.length, cols: Math.max(...mask.map((r) => r.length)), playable };
}

export const boardArea = (b: Board) => b.playable.reduce((s, row) => s + row.filter(Boolean).length, 0);

export const emptyOccupancy = (b: Board): Occupancy => b.playable.map((row) => row.map(() => null));

export function canPlace(board: Board, occ: Occupancy, cells: readonly Cell[], row: number, col: number): boolean {
  for (const [r, c] of cells) {
    const rr = row + r;
    const cc = col + c;
    if (rr < 0 || cc < 0 || rr >= board.rows || cc >= board.cols) return false;
    if (!board.playable[rr]?.[cc] || occ[rr][cc] !== null) return false;
  }
  return true;
}

/** Yerleştirilmiş parçalardan doluluk tablosu. */
export function buildOccupancy(board: Board, placed: Record<number, Placement>): Occupancy {
  const occ = emptyOccupancy(board);
  for (const p of Object.values(placed)) {
    for (const [r, c] of p.cells) occ[p.row + r][p.col + c] = p.pieceId;
  }
  return occ;
}

const firstEmpty = (board: Board, occ: Occupancy): Cell | null => {
  for (let r = 0; r < board.rows; r++) {
    for (let c = 0; c < board.cols; c++) {
      if (board.playable[r][c] && occ[r][c] === null) return [r, c];
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// Kademeler ve üretim
// ---------------------------------------------------------------------------

export interface LevelSpec {
  /** 1 (en kolay) - 5. */
  difficulty: number;
  /** Tahta siluetleri ('#' oynanır, '.' boşluk); her üretimde biri seçilir. */
  masks: string[][];
  pool: string[];
  pieceCount: number;
  /** Tepsiye çözüm yönelişinden DÖNDÜRÜLMÜŞ gelen parça sayısı (-1 = hepsi). */
  rotated: number;
}

export const MAX_DIFFICULTY = 5;
/** Bir tahtada aynı şekilden en çok kaç parça olabilir (hepsi aynı olursa bulmaca sıkıcı ve ayırt edilemez). */
const MAX_SAME_SHAPE = 2;

export const LEVEL_SPECS: LevelSpec[] = [
  // 1: küçük çocuk için 3×3, 3 parça, hiçbiri döndürülmüş gelmez.
  { difficulty: 1, masks: [['###', '###', '###']], pool: ['D2', 'I3', 'L3', 'O4'], pieceCount: 3, rotated: 0 },
  // 2: 3×4, 4 parça, biri döndürülmüş.
  { difficulty: 2, masks: [['###', '###', '###', '###']], pool: ['D2', 'I3', 'L3', 'O4'], pieceCount: 4, rotated: 1 },
  // 3: 4×4, gerçek tetris parçaları (4 tane), ikisi döndürülmüş.
  { difficulty: 3, masks: [['####', '####', '####', '####']], pool: TETROMINOES, pieceCount: 4, rotated: 2 },
  // 4: 4×5, 5 tetromino, hepsi karışık yönelimli.
  { difficulty: 4, masks: [['####', '####', '####', '####', '####']], pool: TETROMINOES, pieceCount: 5, rotated: -1 },
  // 5: 4×6 ya da ortasında "kara delik" olan 5×5, 6 tetromino.
  {
    difficulty: 5,
    masks: [
      ['####', '####', '####', '####', '####', '####'],
      ['#####', '#####', '##.##', '#####', '#####'],
    ],
    pool: TETROMINOES,
    pieceCount: 6,
    rotated: -1,
  },
];

export const specFor = (difficulty: number): LevelSpec =>
  LEVEL_SPECS[Math.max(1, Math.min(MAX_DIFFICULTY, Math.round(difficulty))) - 1];

/** Yaşa (ay) göre ilk tahtanın zorluğu; sonrası performansa göre ayarlanır (useAdaptiveDifficulty). */
export function startDifficultyForAge(ageMonths: number): number {
  if (ageMonths <= 48) return 1;
  if (ageMonths <= 60) return 2;
  return 3;
}

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Rastgele döşeme: ilk boş hücreyi kaplayan bir parça seçilir, geri izlemeyle tahta tam doldurulur.
 * Parça sayısı ve alan uyuşmazsa (ya da bütçe aşılırsa) null döner.
 */
function tileBoard(board: Board, spec: LevelSpec, rng: Rng, nodeBudget: number): Placement[] | null {
  const occ = emptyOccupancy(board);
  const placements: Placement[] = [];
  const counts: Record<string, number> = {};
  const area = boardArea(board);
  const sizes = spec.pool.map(shapeSize);
  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);
  let used = 0;
  let nodes = 0;

  const dfs = (): boolean => {
    const cell = firstEmpty(board, occ);
    if (!cell) return placements.length === spec.pieceCount;
    const remainingPieces = spec.pieceCount - placements.length;
    const remainingCells = area - used;
    if (remainingPieces <= 0) return false;
    if (remainingCells < remainingPieces * minSize || remainingCells > remainingPieces * maxSize) return false;
    if (++nodes > nodeBudget) return false;

    const options: { shapeId: string; cells: Cell[] }[] = [];
    for (const id of spec.pool) {
      if ((counts[id] ?? 0) >= MAX_SAME_SHAPE) continue;
      for (const o of ORIENTATIONS[id]) options.push({ shapeId: id, cells: o });
    }
    for (const opt of shuffled(options, rng)) {
      // Alınan ilk boş hücre satır-sütun sırasında en küçük olduğundan, onu kaplayan parçanın
      // satır-sütun sırasındaki ilk hücresi (cells[0]) tam bu hücreye oturur.
      const row = cell[0] - opt.cells[0][0];
      const col = cell[1] - opt.cells[0][1];
      if (!canPlace(board, occ, opt.cells, row, col)) continue;
      const pieceId = placements.length;
      for (const [r, c] of opt.cells) occ[row + r][col + c] = pieceId;
      placements.push({ pieceId, shapeId: opt.shapeId, cells: opt.cells, row, col });
      counts[opt.shapeId] = (counts[opt.shapeId] ?? 0) + 1;
      used += opt.cells.length;
      if (dfs()) return true;
      used -= opt.cells.length;
      counts[opt.shapeId] -= 1;
      placements.pop();
      for (const [r, c] of opt.cells) occ[row + r][col + c] = null;
    }
    return false;
  };

  return dfs() ? placements : null;
}

/** Tepsi yönelimi: kademeye göre bazı (ya da tüm) parçalar çözüm yönelişinden döndürülür. */
function trayTurns(count: number, rotated: number, rng: Rng): number[] {
  const turns = new Array<number>(count).fill(0);
  const indices = shuffled(Array.from({ length: count }, (_, i) => i), rng);
  for (const i of rotated < 0 ? indices : indices.slice(0, rotated)) turns[i] = 1 + Math.floor(rng() * 3);
  return turns;
}

export function generateLevel(difficulty: number, rng: Rng = Math.random): Level {
  const spec = specFor(difficulty);
  const mask = spec.masks[Math.floor(rng() * spec.masks.length)];
  const board = boardFromMask(mask);

  let tiling: Placement[] | null = null;
  for (let attempt = 0; attempt < 80 && !tiling; attempt++) tiling = tileBoard(board, spec, rng, 4000);
  // Rastgele denemeler tükenirse sabit sırayla tam arama: tahta döşenebiliyorsa mutlaka bulur.
  if (!tiling) tiling = tileBoard(board, spec, () => 0, Number.MAX_SAFE_INTEGER);
  if (!tiling) throw new Error(`Uzay Blokları: ${spec.difficulty}. kademe tahtası döşenemedi`);

  const order = shuffled(tiling, rng);
  const turns = trayTurns(order.length, spec.rotated, rng);
  const pieces: Piece[] = order.map((p, i) => ({
    id: p.pieceId,
    shapeId: p.shapeId,
    cells: rotateBy(p.cells, turns[i]),
    color: i,
  }));
  return { difficulty: spec.difficulty, board, pieces, solution: tiling };
}

// ---------------------------------------------------------------------------
// Çözücü: çıkmaz algılama + ipucu
// ---------------------------------------------------------------------------

export interface RemainingPiece {
  id: number;
  shapeId: string;
}

/**
 * Kalan parçalarla boş hücreleri TAM doldurmanın bir yolu (parçalar serbestçe döndürülebilir).
 * Yoksa null: oyuncu bir çıkmaza girmiştir. Hiç boş hücre/parça kalmadıysa [] döner.
 */
export function solve(board: Board, occ: Occupancy, remaining: readonly RemainingPiece[]): Placement[] | null {
  const work = occ.map((row) => [...row]);
  const free = work.reduce((s, row, r) => s + row.filter((v, c) => v === null && board.playable[r][c]).length, 0);
  const need = remaining.reduce((s, p) => s + shapeSize(p.shapeId), 0);
  if (free !== need) return null;

  const pool = remaining.map((p) => ({ ...p, used: false }));
  const out: Placement[] = [];

  const dfs = (): boolean => {
    const cell = firstEmpty(board, work);
    if (!cell) return pool.every((p) => p.used);
    const triedShapes = new Set<string>();
    for (const p of pool) {
      if (p.used || triedShapes.has(p.shapeId)) continue; // aynı şekilli parçalar birbirinin yerine geçer
      triedShapes.add(p.shapeId);
      for (const o of ORIENTATIONS[p.shapeId]) {
        const row = cell[0] - o[0][0];
        const col = cell[1] - o[0][1];
        if (!canPlace(board, work, o, row, col)) continue;
        for (const [r, c] of o) work[row + r][col + c] = p.id;
        p.used = true;
        out.push({ pieceId: p.id, shapeId: p.shapeId, cells: o, row, col });
        if (dfs()) return true;
        out.pop();
        p.used = false;
        for (const [r, c] of o) work[row + r][col + c] = null;
      }
    }
    return false;
  };

  return dfs() ? out : null;
}

/** Parça kaldığı hâlde tahta artık doldurulamıyorsa true. */
export const isDeadEnd = (board: Board, occ: Occupancy, remaining: readonly RemainingPiece[]): boolean =>
  remaining.length > 0 && solve(board, occ, remaining) === null;

/** Şu anki duruma uyan bir sonraki yerleştirme (ipucu); çıkmazda ya da bitmişse null. */
export function hint(board: Board, occ: Occupancy, remaining: readonly RemainingPiece[]): Placement | null {
  const path = solve(board, occ, remaining);
  return path && path.length > 0 ? path[0] : null;
}

// ---------------------------------------------------------------------------
// Mıknatıslı yerleştirme
// ---------------------------------------------------------------------------

/** Parçanın sürüklenirken bırakıldığı yer ile en yakın geçerli hücre arasındaki en çok mesafe (hücre cinsinden). */
export const SNAP_RADIUS = 0.9;

/**
 * (gx, gy): parçanın SOL-ÜST köşesinin tahta içindeki sürekli konumu (hücre cinsinden).
 * Yuvarlanan hücre geçerliyse oraya oturur; değilse yarıçap içindeki en yakın geçerli komşuya;
 * hiçbiri yoksa yuvarlanan konum (valid=false) döner. Eski sürümde parmak merkezi doğrudan
 * yuvarlandığı için "yeterince boşluk var ama yerleştirmiyor" oluyordu.
 */
export function snapPlacement(
  board: Board,
  occ: Occupancy,
  cells: readonly Cell[],
  gx: number,
  gy: number,
): { row: number; col: number; valid: boolean } {
  const r0 = Math.round(gy);
  const c0 = Math.round(gx);
  let best: { row: number; col: number; d: number } | null = null;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const row = r0 + dr;
      const col = c0 + dc;
      if (!canPlace(board, occ, cells, row, col)) continue;
      const d = Math.hypot(row - gy, col - gx);
      if (d <= SNAP_RADIUS && (!best || d < best.d)) best = { row, col, d };
    }
  }
  return best ? { row: best.row, col: best.col, valid: true } : { row: r0, col: c0, valid: false };
}

// ---------------------------------------------------------------------------
// Ekran düzeni (tahta + tepsi), tek ekrana sığar
// ---------------------------------------------------------------------------

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  /** Tahta hücresi (px). */
  cell: number;
  board: Rect;
  /** Tepsideki parça hücresi (px). */
  trayCell: number;
  /** Parça (tepsi sırasıyla) başına kare yuva. */
  slots: Rect[];
  wide: boolean;
}

const PAD = 12;
const SLOT_PAD = 6;
const SLOT_GAP = 8;
const MIN_TRAY_CELL = 14;

/** Yuvaları satır satır yerleştirir; toplam yükseklik ve (x, y) konumlarını döner. */
function flowSlots(sizes: number[], maxW: number): { slots: Rect[]; height: number } {
  const rows: { items: { i: number; s: number }[]; w: number; h: number }[] = [];
  let cur = { items: [] as { i: number; s: number }[], w: 0, h: 0 };
  sizes.forEach((s, i) => {
    const nextW = cur.items.length === 0 ? s : cur.w + SLOT_GAP + s;
    if (cur.items.length > 0 && nextW > maxW) {
      rows.push(cur);
      cur = { items: [], w: 0, h: 0 };
    }
    cur.w = cur.items.length === 0 ? s : cur.w + SLOT_GAP + s;
    cur.h = Math.max(cur.h, s);
    cur.items.push({ i, s });
  });
  if (cur.items.length) rows.push(cur);

  const slots: Rect[] = new Array(sizes.length);
  let y = 0;
  for (const row of rows) {
    let x = (maxW - row.w) / 2;
    for (const it of row.items) {
      slots[it.i] = { x, y: y + (row.h - it.s) / 2, w: it.s, h: it.s };
      x += it.s + SLOT_GAP;
    }
    y += row.h + SLOT_GAP;
  }
  return { slots, height: Math.max(0, y - SLOT_GAP) };
}

/**
 * width×height: oyun alanı (başlık ve düğme çubuğu hariç). Dar/dikey ekranda tahta üstte, tepsi altta;
 * geniş ekranda (tablet, web) tahta solda, tepsi sağda. `slotDims`: parçaların maxDim değerleri.
 */
export function computeLayout(width: number, height: number, board: Board, slotDims: number[], maxCell = 100): Layout {
  const wide = width >= height * 1.15;
  const boardRegion: Rect = wide
    ? { x: 0, y: 0, w: Math.floor(width * 0.52), h: height }
    : { x: 0, y: 0, w: width, h: Math.floor(height * 0.58) };
  const trayRegion: Rect = wide
    ? { x: boardRegion.w, y: 0, w: width - boardRegion.w, h: height }
    : { x: 0, y: boardRegion.h, w: width, h: height - boardRegion.h };

  const cell = Math.max(
    20,
    Math.floor(Math.min((boardRegion.w - 2 * PAD) / board.cols, (boardRegion.h - 2 * PAD) / board.rows, maxCell)),
  );
  const bw = cell * board.cols;
  const bh = cell * board.rows;
  const boardRect: Rect = {
    x: boardRegion.x + (boardRegion.w - bw) / 2,
    y: boardRegion.y + (boardRegion.h - bh) / 2,
    w: bw,
    h: bh,
  };

  const availW = trayRegion.w - 2 * PAD;
  const availH = trayRegion.h - 2 * PAD;
  let trayCell = MIN_TRAY_CELL;
  let flow = flowSlots(slotDims.map((d) => d * MIN_TRAY_CELL + 2 * SLOT_PAD), availW);
  for (let tc = Math.min(Math.floor(cell * 0.8), 56); tc >= MIN_TRAY_CELL; tc--) {
    const f = flowSlots(slotDims.map((d) => d * tc + 2 * SLOT_PAD), availW);
    if (f.height <= availH) {
      trayCell = tc;
      flow = f;
      break;
    }
  }
  const offsetY = trayRegion.y + PAD + Math.max(0, (availH - flow.height) / 2);
  const slots = flow.slots.map((s) => ({ x: trayRegion.x + PAD + s.x, y: offsetY + s.y, w: s.w, h: s.h }));
  return { cell, board: boardRect, trayCell, slots, wide };
}
