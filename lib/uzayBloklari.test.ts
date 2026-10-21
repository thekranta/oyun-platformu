import {
  LEVEL_SPECS,
  SHAPES,
  SNAP_RADIUS,
  boardArea,
  boardFromMask,
  buildOccupancy,
  canPlace,
  cellsKey,
  computeLayout,
  emptyOccupancy,
  generateLevel,
  hint,
  isDeadEnd,
  maxDim,
  normalize,
  orientations,
  rotateBy,
  rotateCW,
  shapeSize,
  snapPlacement,
  solve,
  specFor,
  startDifficultyForAge,
  turnsBetween,
  type Cell,
  type Placement,
} from './uzayBloklari';

// Tekrarlanabilir rastgelelik (mulberry32): bir hata çıkarsa aynı tohumla yeniden üretilebilir.
const seeded = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const SEEDS = 150;

describe('parça yönelimleri', () => {
  it('her şeklin farklı yönelim sayısı doğru', () => {
    const expected: Record<string, number> = { D2: 2, I3: 2, L3: 4, O4: 1, I4: 2, L4: 4, J4: 4, T4: 4, S4: 2, Z4: 2 };
    Object.keys(SHAPES).forEach((id) => {
      expect({ id, n: orientations(SHAPES[id]).length }).toEqual({ id, n: expected[id] });
    });
  });

  it('döndürme hücre sayısını korur, normalize eder ve 4 tur başa döndürür', () => {
    Object.entries(SHAPES).forEach(([id, cells]) => {
      let cur: Cell[] = normalize(cells);
      for (let i = 0; i < 4; i++) {
        cur = rotateCW(cur);
        expect(cur).toHaveLength(cells.length);
        expect(Math.min(...cur.map((c) => c[0]))).toBe(0);
        expect(Math.min(...cur.map((c) => c[1]))).toBe(0);
      }
      expect({ id, same: cellsKey(cur) }).toEqual({ id, same: cellsKey(cells) });
      expect(cellsKey(rotateBy(cells, 4))).toBe(cellsKey(cells));
      expect(cellsKey(rotateBy(cells, -1))).toBe(cellsKey(rotateBy(cells, 3)));
    });
  });

  it('I3 yatay iken bir tur sonra dikey, L3 köşe şeklini korur', () => {
    expect(rotateCW(SHAPES.I3)).toEqual([[0, 0], [1, 0], [2, 0]]);
    expect(cellsKey(rotateCW(SHAPES.L3))).toBe(cellsKey([[0, 0], [0, 1], [1, 0]]));
  });

  it('maxDim: tepsi yuvasının kare kenarı (hücre)', () => {
    expect({ D2: maxDim('D2'), I3: maxDim('I3'), L3: maxDim('L3'), O4: maxDim('O4'), I4: maxDim('I4'), L4: maxDim('L4'), T4: maxDim('T4') })
      .toEqual({ D2: 2, I3: 3, L3: 2, O4: 2, I4: 4, L4: 3, T4: 3 });
  });

  it('turnsBetween: iki yönelim arasındaki çeyrek tur sayısı', () => {
    expect(turnsBetween(SHAPES.I3, rotateBy(SHAPES.I3, 1))).toBe(1);
    expect(turnsBetween(SHAPES.L4, rotateBy(SHAPES.L4, 3))).toBe(3);
    expect(turnsBetween(SHAPES.O4, SHAPES.I4)).toBe(-1);
  });
});

describe('tahta üretimi (her zaman çözülebilir)', () => {
  LEVEL_SPECS.forEach((spec) => {
    it(`${spec.difficulty}. kademe: ${SEEDS} tohumda tam döşeme, parça sayısı, tekrar sınırı, çözülebilirlik`, () => {
      for (let seed = 1; seed <= SEEDS; seed++) {
        const level = generateLevel(spec.difficulty, seeded(seed));
        const ctx = { difficulty: spec.difficulty, seed };

        expect({ ...ctx, n: level.pieces.length }).toEqual({ ...ctx, n: spec.pieceCount });
        expect({ ...ctx, n: level.solution.length }).toEqual({ ...ctx, n: spec.pieceCount });

        // Çözüm döşemesi tahtayı örtüşmeden ve boşluksuz kaplar.
        const placed: Record<number, Placement> = {};
        level.solution.forEach((p) => {
          expect({ ...ctx, ok: canPlace(level.board, buildOccupancy(level.board, placed), p.cells, p.row, p.col) }).toEqual({ ...ctx, ok: true });
          placed[p.pieceId] = p;
        });
        const occ = buildOccupancy(level.board, placed);
        const empty = occ.flat().filter((v, i) => v === null && level.board.playable[Math.floor(i / level.board.cols)][i % level.board.cols]).length;
        expect({ ...ctx, empty }).toEqual({ ...ctx, empty: 0 });

        const total = level.pieces.reduce((s, p) => s + shapeSize(p.shapeId), 0);
        expect({ ...ctx, total }).toEqual({ ...ctx, total: boardArea(level.board) });

        // Aynı şekilden en çok 2; en az 2 farklı şekil; renkler tekil.
        const counts = level.pieces.reduce<Record<string, number>>((m, p) => ({ ...m, [p.shapeId]: (m[p.shapeId] ?? 0) + 1 }), {});
        expect({ ...ctx, maxSame: Math.max(...Object.values(counts)) <= 2 }).toEqual({ ...ctx, maxSame: true });
        expect({ ...ctx, kinds: Object.keys(counts).length >= 2 }).toEqual({ ...ctx, kinds: true });
        expect(new Set(level.pieces.map((p) => p.color)).size).toBe(level.pieces.length);

        // Tepsi yönelimi çözüm yönelişinin bir döndürmesi: hep çözülebilir.
        level.pieces.forEach((p) => {
          const sol = level.solution.find((s) => s.pieceId === p.id)!;
          expect({ ...ctx, turns: turnsBetween(sol.cells, p.cells) >= 0 }).toEqual({ ...ctx, turns: true });
        });

        // Çözücü boş tahtadan tam bir döşeme bulur.
        const path = solve(level.board, emptyOccupancy(level.board), level.pieces);
        expect({ ...ctx, solvable: path !== null }).toEqual({ ...ctx, solvable: true });
        expect({ ...ctx, len: path!.length }).toEqual({ ...ctx, len: spec.pieceCount });
      }
    });
  });

  it('tepsiye "döndürülmüş" gelen parça sayısı kademeye göre sınırlı (1. kademede hiç yok)', () => {
    for (let seed = 1; seed <= 60; seed++) {
      [1, 2, 3].forEach((d) => {
        const level = generateLevel(d, seeded(seed * 7 + d));
        const rotated = level.pieces.filter((p) => cellsKey(p.cells) !== cellsKey(level.solution.find((s) => s.pieceId === p.id)!.cells)).length;
        expect({ d, seed, ok: rotated <= specFor(d).rotated }).toEqual({ d, seed, ok: true });
      });
    }
  });

  it('4. ve 5. kademelerde parçaların çoğu çözüm yönelişinden farklı gelir', () => {
    let rotatedTotal = 0;
    let count = 0;
    for (let seed = 1; seed <= 60; seed++) {
      [4, 5].forEach((d) => {
        const level = generateLevel(d, seeded(seed * 13 + d));
        level.pieces.forEach((p) => {
          count++;
          if (cellsKey(p.cells) !== cellsKey(level.solution.find((s) => s.pieceId === p.id)!.cells)) rotatedTotal++;
        });
      });
    }
    expect(rotatedTotal / count).toBeGreaterThan(0.5);
  });

  it('5. kademede iki farklı siluet de üretilir', () => {
    const areas = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const b = generateLevel(5, seeded(seed)).board;
      areas.add(`${b.rows}x${b.cols}`);
    }
    expect([...areas].sort()).toEqual(['5x5', '6x4']);
  });

  it('zorluk sınır dışı verilse de kıstırılır', () => {
    expect(specFor(0).difficulty).toBe(1);
    expect(specFor(9).difficulty).toBe(5);
    expect(generateLevel(99, seeded(1)).difficulty).toBe(5);
  });
});

describe('çıkmaz algılama ve ipucu', () => {
  const board = boardFromMask(['###', '###', '###']);
  const pieces = [
    { id: 0, shapeId: 'O4' },
    { id: 1, shapeId: 'I3' },
    { id: 2, shapeId: 'D2' },
  ];
  const place = (id: number, shapeId: string, cells: Cell[], row: number, col: number): Placement => ({ pieceId: id, shapeId, cells: normalize(cells), row, col });

  it('2×2 sığmayacak şekilde konan domino çıkmaz doğurur', () => {
    const d2 = place(2, 'D2', SHAPES.D2, 1, 0); // 2. satırın sol iki hücresi
    const occ = buildOccupancy(board, { 2: d2 });
    expect(isDeadEnd(board, occ, pieces.filter((p) => p.id !== 2))).toBe(true);
  });

  it('2×2 köşeye konunca çözüm sürer (çıkmaz değil)', () => {
    const o4 = place(0, 'O4', SHAPES.O4, 0, 0);
    const occ = buildOccupancy(board, { 0: o4 });
    expect(isDeadEnd(board, occ, pieces.filter((p) => p.id !== 0))).toBe(false);
  });

  it('parça kalmadıysa ve tahta doluysa çıkmaz değildir; boş tahtada çözüm vardır', () => {
    expect(isDeadEnd(board, emptyOccupancy(board), [])).toBe(false);
    expect(solve(board, emptyOccupancy(board), pieces)).not.toBeNull();
  });

  it('alan parça toplamına eşit değilse çözüm yok', () => {
    expect(solve(board, emptyOccupancy(board), pieces.slice(0, 2))).toBeNull();
  });

  it('ipucu geçerli bir yerleştirmedir ve tekrarlanınca bulmacayı çözer', () => {
    const level = generateLevel(3, seeded(11));
    let placed: Record<number, Placement> = {};
    for (let step = 0; step < level.pieces.length; step++) {
      const occ = buildOccupancy(level.board, placed);
      const remaining = level.pieces.filter((p) => !placed[p.id]);
      const h = hint(level.board, occ, remaining);
      expect(h).not.toBeNull();
      expect(canPlace(level.board, occ, h!.cells, h!.row, h!.col)).toBe(true);
      placed = { ...placed, [h!.pieceId]: h! };
      expect(isDeadEnd(level.board, buildOccupancy(level.board, placed), level.pieces.filter((p) => !placed[p.id]))).toBe(false);
    }
    expect(Object.keys(placed)).toHaveLength(level.pieces.length);
    expect(hint(level.board, buildOccupancy(level.board, placed), [])).toBeNull();
  });

  it('çıkmazda ipucu yoktur', () => {
    const d2 = place(2, 'D2', SHAPES.D2, 1, 0);
    expect(hint(board, buildOccupancy(board, { 2: d2 }), pieces.filter((p) => p.id !== 2))).toBeNull();
  });

  it('eski sürümün çıkmaz oranı: rastgele ilk hamlelerin bir kısmı çıkmazdır, algılayıcı hepsini yakalar', () => {
    let total = 0;
    let dead = 0;
    pieces.forEach((p) => {
      orientations(SHAPES[p.shapeId]).forEach((o) => {
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            if (!canPlace(board, emptyOccupancy(board), o, row, col)) continue;
            total++;
            const placed = { [p.id]: place(p.id, p.shapeId, o, row, col) };
            const left = pieces.filter((q) => q.id !== p.id);
            if (isDeadEnd(board, buildOccupancy(board, placed), left)) dead++;
          }
        }
      });
    });
    expect(total).toBeGreaterThan(0);
    expect(dead).toBeGreaterThan(0);
    expect(dead).toBeLessThan(total);
  });
});

describe('mıknatıslı yerleştirme', () => {
  const board = boardFromMask(['###', '###', '###']);
  const empty = emptyOccupancy(board);

  it('yuvarlanan hücre geçerliyse oraya oturur', () => {
    expect(snapPlacement(board, empty, SHAPES.D2, 0.4, 0.4)).toEqual({ row: 0, col: 0, valid: true });
  });

  it('taşan konumda yarıçap içindeki en yakın geçerli komşuya oturur', () => {
    // D2 (1×2) sütun 2'ye yuvarlanırsa taşar; sütun 1 (0,6 hücre uzakta) geçerli.
    expect(snapPlacement(board, empty, SHAPES.D2, 1.6, 0)).toEqual({ row: 0, col: 1, valid: true });
  });

  it('yarıçap dışında geçerli yer yoksa geçersiz döner', () => {
    expect(snapPlacement(board, empty, SHAPES.D2, 3.5, 0).valid).toBe(false);
    expect(SNAP_RADIUS).toBeLessThan(1);
  });

  it('dolu hücreye oturmaz; en yakın uygun yer yarıçap içindeyse oraya kayar, dışındaysa geçersiz kalır', () => {
    const occ = buildOccupancy(board, { 9: { pieceId: 9, shapeId: 'D2', cells: normalize(SHAPES.D2), row: 0, col: 0 } });
    expect(snapPlacement(board, occ, SHAPES.D2, 0, 0).valid).toBe(false); // en yakın boş yer 1 hücre uzakta
    expect(snapPlacement(board, occ, SHAPES.D2, 0, 0.5)).toEqual({ row: 1, col: 0, valid: true });
  });
});

describe('ekran düzeni', () => {
  const sizes: [number, number][] = [[390, 600], [360, 520], [320, 440], [768, 840], [1024, 640], [1280, 700]];

  it('her kademede ve her ekranda tahta ve tüm yuvalar oyun alanına sığar, yuvalar çakışmaz', () => {
    sizes.forEach(([w, h]) => {
      for (let d = 1; d <= 5; d++) {
        const level = generateLevel(d, seeded(d * 31 + w));
        const layout = computeLayout(w, h, level.board, level.pieces.map((p) => maxDim(p.shapeId)));
        const ctx = { w, h, d };
        const b = layout.board;
        expect({ ...ctx, inBoard: b.x >= 0 && b.y >= 0 && b.x + b.w <= w && b.y + b.h <= h }).toEqual({ ...ctx, inBoard: true });
        expect(layout.slots).toHaveLength(level.pieces.length);
        layout.slots.forEach((s, i) => {
          expect({ ...ctx, i, inside: s.x >= 0 && s.y >= 0 && s.x + s.w <= w + 0.5 && s.y + s.h <= h + 0.5 }).toEqual({ ...ctx, i, inside: true });
          expect(s.w).toBeGreaterThanOrEqual(maxDim(level.pieces[i].shapeId) * layout.trayCell);
        });
        for (let i = 0; i < layout.slots.length; i++) {
          for (let j = i + 1; j < layout.slots.length; j++) {
            const a = layout.slots[i];
            const c = layout.slots[j];
            const overlap = a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h;
            expect({ ...ctx, i, j, overlap }).toEqual({ ...ctx, i, j, overlap: false });
          }
        }
        // Tepsi tahtayla çakışmaz.
        layout.slots.forEach((s) => {
          const overlapsBoard = s.x < b.x + b.w && b.x < s.x + s.w && s.y < b.y + b.h && b.y < s.y + s.h;
          expect({ ...ctx, overlapsBoard }).toEqual({ ...ctx, overlapsBoard: false });
        });
      }
    });
  });

  it('kısa oyun alanında (bölünmüş ekran, büyük yazı boyutu, küçük telefon) tahta küçülür ama tepsi taşmaz', () => {
    // Eskiden 360 px'in altındaki yüksekliklerde 4-5. kademede parçalar alttaki düğme çubuğunun altına taşıp dokunulamaz kalıyordu.
    const shortSizes: [number, number][] = [[320, 300], [320, 340], [360, 320], [390, 340], [300, 360]];
    shortSizes.forEach(([w, h]) => {
      for (let d = 1; d <= 5; d++) {
        for (let seed = 1; seed <= 12; seed++) {
          const level = generateLevel(d, seeded(seed * 17 + d));
          const layout = computeLayout(w, h, level.board, level.pieces.map((p) => maxDim(p.shapeId)));
          const b = layout.board;
          layout.slots.forEach((s, i) => {
            const ctx = { w, h, d, seed, i };
            expect({ ...ctx, inside: s.x >= -0.5 && s.y >= -0.5 && s.x + s.w <= w + 0.5 && s.y + s.h <= h + 0.5 }).toEqual({ ...ctx, inside: true });
            expect({ ...ctx, overlapsBoard: s.x < b.x + b.w && b.x < s.x + s.w && s.y < b.y + b.h && b.y < s.y + s.h }).toEqual({ ...ctx, overlapsBoard: false });
          });
        }
      }
    });
  });

  it('dikey telefonda hücre ve tepsi hücresi dokunmaya yetecek kadar büyük', () => {
    for (let d = 1; d <= 5; d++) {
      const level = generateLevel(d, seeded(d));
      const layout = computeLayout(390, 600, level.board, level.pieces.map((p) => maxDim(p.shapeId)));
      expect({ d, cell: layout.cell >= 40 }).toEqual({ d, cell: true });
      expect({ d, tray: layout.trayCell >= 18 }).toEqual({ d, tray: true });
    }
  });

  it('geniş ekranda tahta solda, tepsi sağda; dar ekranda tahta üstte, tepsi altta', () => {
    const level = generateLevel(3, seeded(5));
    const dims = level.pieces.map((p) => maxDim(p.shapeId));
    const wide = computeLayout(1280, 700, level.board, dims);
    expect(wide.wide).toBe(true);
    wide.slots.forEach((s) => expect(s.x).toBeGreaterThanOrEqual(wide.board.x + wide.board.w));
    const tall = computeLayout(390, 600, level.board, dims);
    expect(tall.wide).toBe(false);
    tall.slots.forEach((s) => expect(s.y).toBeGreaterThanOrEqual(tall.board.y + tall.board.h));
  });
});

describe('başlangıç zorluğu', () => {
  it('yaşa (ay) göre 1-3', () => {
    expect([36, 48, 49, 60, 61, 72].map(startDifficultyForAge)).toEqual([1, 1, 2, 2, 3, 3]);
  });
});
