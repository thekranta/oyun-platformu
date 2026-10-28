import { createTracker, numberParts, scaleParts, type DigitPart, type Pt } from './rakamIzleme';

// Deterministik sözde-rastgele (mulberry32) + Gauss
const seeded = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const gauss = (rnd: () => number) => {
  let u = 0, v = 0;
  while (!u) u = rnd();
  while (!v) v = rnd();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const W = 300;
const H = 300;
const RADIUS = 28; // RakamYazma2: max(min(w,h)*0.093, 24)
const parts = (n: number) => scaleParts(numberParts(n), W, H);

// RakamYazma2.addPoint gibi: iki nokta arasını 2 px'te bir doldurur
const densify = (pts: Pt[], step = 2): Pt[] => {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const k = Math.max(1, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let j = 1; j <= k; j++) out.push({ x: a.x + ((b.x - a.x) * j) / k, y: a.y + ((b.y - a.y) * j) / k });
  }
  return out;
};

/** Çocuk gibi izleme: her parçayı (isteğe bağlı ters yönde / halkada başka yerden başlayarak) dalgalı ve kaymalı çizer; parmak parçalar arasında kalkar. */
function honestStrokes(ps: DigitPart[], rnd: () => number, sigma: number, shift: number, variant: 'ileri' | 'ters' | 'karisik'): Pt[][] {
  const sx = (rnd() - 0.5) * 2 * shift, sy = (rnd() - 0.5) * 2 * shift;
  return ps.map((part) => {
    let seq = [...part.points];
    const reverse = variant === 'ters' || (variant === 'karisik' && rnd() < 0.5);
    if (part.closed) {
      const start = variant === 'ileri' ? 0 : Math.floor(rnd() * seq.length);
      seq = seq.map((_, i) => part.points[(start + i) % seq.length]);
      seq.push(seq[0]);                       // halkayı kapat
    }
    if (reverse) seq.reverse();
    let wx = 0, wy = 0;
    const noisy = seq.map((p) => {
      wx = wx * 0.8 + gauss(rnd) * sigma * 0.6;
      wy = wy * 0.8 + gauss(rnd) * sigma * 0.6;
      return { x: p.x + sx + wx, y: p.y + sy + wy };
    });
    return densify(noisy);
  });
}

function run(ps: DigitPart[], strokes: Pt[][]) {
  const tr = createTracker(ps, { radius: RADIUS });
  for (const s of strokes) {
    tr.lift();
    for (const p of s) tr.feed(p);
  }
  return tr;
}

const bbox = (ps: DigitPart[]) => {
  const all = ps.flatMap((p) => p.points);
  const xs = all.map((p) => p.x), ys = all.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};
const zigzag = (ps: DigitPart[], rows: number): Pt[] => {
  const b = bbox(ps);
  const pts: Pt[] = [];
  for (let r = 0; r < rows; r++) {
    const y = b.y0 + ((b.y1 - b.y0) * r) / (rows - 1);
    pts.push({ x: r % 2 ? b.x1 : b.x0, y }, { x: r % 2 ? b.x0 : b.x1, y });
  }
  return densify(pts);
};
const spiral = (ps: DigitPart[]): Pt[] => {
  const b = bbox(ps);
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const R = Math.max(b.x1 - b.x0, b.y1 - b.y0) / 2 + 10;
  return densify(Array.from({ length: 301 }, (_, i) => ({ x: cx + ((R * i) / 300) * Math.cos(i * 0.25), y: cy + ((R * i) / 300) * Math.sin(i * 0.25) })));
};
const randomWalk = (ps: DigitPart[], rnd: () => number, steps: number): Pt[] => {
  const b = bbox(ps);
  let x = (b.x0 + b.x1) / 2, y = (b.y0 + b.y1) / 2;
  const pts: Pt[] = [{ x, y }];
  for (let i = 0; i < steps; i++) {
    x = Math.max(b.x0 - 20, Math.min(b.x1 + 20, x + gauss(rnd) * 14));
    y = Math.max(b.y0 - 20, Math.min(b.y1 + 20, y + gauss(rnd) * 14));
    pts.push({ x, y });
  }
  return densify(pts);
};

const DIGITS = [6, 7, 8, 9, 10];

describe('rakam izleme: doğru izleme kabul edilir', () => {
  it('her rakam (6-10) ileri yönde, dalgalı ve kaymalı izlenince tamamlanır', () => {
    DIGITS.forEach((n) => {
      [[5, 5], [9, 10]].forEach(([sigma, shift], k) => {
        for (let s = 1; s <= 6; s++) {
          const ps = parts(n);
          const tr = run(ps, honestStrokes(ps, seeded(n * 100 + k * 10 + s), sigma, shift, 'ileri'));
          expect(tr.complete()).toBe(true);
          expect(tr.progress()).toBeGreaterThanOrEqual(0.999);
        }
      });
    });
  });

  it('ters yönde ve halkada başka noktadan başlanarak çizilen rakam da tamamlanır (çocuk 0\'ı istediği yerden/yönden çizer)', () => {
    DIGITS.forEach((n) => {
      for (let s = 1; s <= 12; s++) {
        const ps = parts(n);
        const tr = run(ps, honestStrokes(ps, seeded(n * 1000 + s), 9, 10, s % 2 ? 'ters' : 'karisik'));
        expect(tr.complete()).toBe(true);
      }
    });
  });

  it('8 tek vuruşla (sekiz çizer gibi: ortadan başlayıp iki halkayı art arda dolaşarak) da tamamlanır', () => {
    const ps = parts(8);
    const [top, bottom] = ps;
    // ortadaki geçiş noktasından (üst halkanın alt, alt halkanın üst ucu) başla: önce üst halkayı, sonra alt halkayı dolaş
    const closestTo = (part: DigitPart, p: Pt) => part.points.reduce((bi, q, i, a) => (Math.hypot(q.x - p.x, q.y - p.y) < Math.hypot(a[bi].x - p.x, a[bi].y - p.y) ? i : bi), 0);
    const mid = { x: W / 2, y: (top.points[Math.floor(top.points.length / 4)].y + bottom.points[Math.floor((bottom.points.length * 3) / 4)].y) / 2 };
    const iT = closestTo(top, mid), iB = closestTo(bottom, mid);
    const loop = (part: DigitPart, i0: number) => [...part.points.slice(i0), ...part.points.slice(0, i0), part.points[i0]];
    const stroke = densify([...loop(top, iT), ...loop(bottom, iB)]);
    const tr = run(ps, [stroke]);
    expect(tr.complete()).toBe(true);
  });
});

describe('rakam izleme: çok özensiz izleme de çoğunlukla kabul edilir', () => {
  it('σ13 px dalga + 16 px kayma (çok özensiz) izlemelerin en az %80 oranı tamamlanır', () => {
    let ok = 0, total = 0;
    DIGITS.forEach((n) => {
      for (let s = 1; s <= 12; s++) {
        const ps = parts(n);
        total++;
        if (run(ps, honestStrokes(ps, seeded(n * 7919 + s), 13, 16, s % 3 === 0 ? 'ileri' : 'karisik')).complete()) ok++;
      }
    });
    expect(ok / total).toBeGreaterThanOrEqual(0.8);
  });
});

describe('rakam izleme: karalama ve yanlış rakam kabul EDİLMEZ (#81)', () => {
  it('zigzag, spiral ve rastgele yürüyüş hiçbir rakamı tamamlamaz', () => {
    DIGITS.forEach((n) => {
      const ps = parts(n);
      const attempts: Pt[][] = [zigzag(ps, 6), zigzag(ps, 10), spiral(ps), randomWalk(ps, seeded(n), 250), randomWalk(ps, seeded(n + 77), 600)];
      attempts.forEach((stroke) => {
        const tr = run(ps, [stroke]);
        expect(tr.complete()).toBe(false);
      });
    });
  });

  it('başka bir rakamın yolunu çizmek hedef rakamı tamamlamaz (6 yerine 9, 7 yerine 10 …)', () => {
    DIGITS.forEach((n) => {
      DIGITS.filter((m) => m !== n).forEach((m) => {
        if (n === 9 && m === 8) return;   // bilinen hoşgörü: 8'in üst halkası + alt eğrisi 9'un yolunu içerir (8 çizilince 9 sayılır)
        const target = parts(n);
        const drawn = parts(m);
        const tr = run(target, honestStrokes(drawn, seeded(n * 10 + m), 5, 5, 'ileri'));
        expect(tr.complete()).toBe(false);
      });
    });
  });

  it('doğru izleme sonrası çok fazla geri-geri çizilirse (mürekkep bütçesi) tamamlanma sayılmaz', () => {
    const ps = parts(7);
    const strokes: Pt[][] = [];
    for (let i = 0; i < 6; i++) strokes.push(...honestStrokes(ps, seeded(500 + i), 5, 5, 'ileri'));
    const tr = run(ps, strokes);
    expect(tr.overBudget()).toBe(true);
    expect(tr.complete()).toBe(false);
  });
});

// Rakam Yazma (1-5) de aynı kuralla değerlendirilir (test listesi 81-K1): eski kural 1-5'te "sırasız yakınlık"tı ve karalama geçiyordu.
const DIGITS_1_5 = [1, 2, 3, 4, 5];

describe('rakam izleme (1-5): doğru izleme kabul edilir', () => {
  it('her rakam (1-5) ileri yönde, dalgalı ve kaymalı izlenince tamamlanır', () => {
    DIGITS_1_5.forEach((n) => {
      [[5, 5], [9, 10]].forEach(([sigma, shift], k) => {
        for (let s = 1; s <= 6; s++) {
          const ps = parts(n);
          const tr = run(ps, honestStrokes(ps, seeded(n * 100 + k * 10 + s), sigma, shift, 'ileri'));
          expect(tr.complete()).toBe(true);
          expect(tr.progress()).toBeGreaterThanOrEqual(0.999);
        }
      });
    });
  });

  it('ters yönde ve parmak kalkarak çizilen rakam da tamamlanır (9 px dalga + 10 px kayma: en az %95; ölçülen ~%98-99)', () => {
    let ok = 0, total = 0;
    DIGITS_1_5.forEach((n) => {
      for (let s = 1; s <= 12; s++) {
        const ps = parts(n);
        total++;
        if (run(ps, honestStrokes(ps, seeded(n * 1000 + s), 9, 10, s % 2 ? 'ters' : 'karisik')).complete()) ok++;
      }
    });
    expect(ok / total).toBeGreaterThanOrEqual(0.95);
  });

  it('çok özensiz izleme (σ13 px dalga + 16 px kayma) en az %80 oranında tamamlanır', () => {
    let ok = 0, total = 0;
    DIGITS_1_5.forEach((n) => {
      for (let s = 1; s <= 12; s++) {
        const ps = parts(n);
        total++;
        if (run(ps, honestStrokes(ps, seeded(n * 7919 + s), 13, 16, s % 3 === 0 ? 'ileri' : 'karisik')).complete()) ok++;
      }
    });
    expect(ok / total).toBeGreaterThanOrEqual(0.8);
  });
});

describe('rakam izleme (1-5): karalama ve yanlış rakam kabul EDİLMEZ', () => {
  it('zigzag, spiral ve rastgele yürüyüş hiçbir rakamı tamamlamaz', () => {
    // "1" çok dar (≈34 px): kutusuna oturan zigzag gövdeyi izlemenin kendisi olur; karalama = rakamın etrafına taşan geniş zigzag.
    const wideBox = (ps: DigitPart[]): DigitPart[] => {
      const b = bbox(ps), cx = (b.x0 + b.x1) / 2, w = Math.max(b.x1 - b.x0, 150);
      return [{ closed: false, points: [{ x: cx - w / 2, y: b.y0 }, { x: cx + w / 2, y: b.y1 }] }];
    };
    DIGITS_1_5.forEach((n) => {
      const ps = parts(n);
      const box = wideBox(ps);
      const attempts: Pt[][] = [zigzag(box, 6), zigzag(box, 10), spiral(box), randomWalk(box, seeded(n), 250), randomWalk(box, seeded(n + 77), 600), spiral(ps), randomWalk(ps, seeded(n), 250), randomWalk(ps, seeded(n + 77), 600), zigzag(ps, 10)];
      attempts.forEach((stroke) => {
        expect(run(ps, [stroke]).complete()).toBe(false);
      });
    });
  });

  it('başka bir rakamın yolunu çizmek hedef rakamı tamamlamaz (1-5 arası)', () => {
    DIGITS_1_5.forEach((n) => {
      DIGITS_1_5.filter((m) => m !== n).forEach((m) => {
        const target = parts(n);
        const drawn = parts(m);
        const tr = run(target, honestStrokes(drawn, seeded(n * 10 + m), 5, 5, 'ileri'));
        expect(tr.complete()).toBe(false);
      });
    });
  });

  it('rakam parçaları: 1, 2, 3 ve 5 tek vuruş; 4 iki parça (çapraz+yatay, gövde); hiçbiri halka değil', () => {
    expect(DIGITS_1_5.map((n) => numberParts(n).length)).toEqual([1, 1, 1, 2, 1]);
    expect(DIGITS_1_5.every((n) => numberParts(n).every((p) => !p.closed))).toBe(true);
  });
});

describe('rakam izleme: ilerleme ve sıfırlama', () => {
  it('ilerleme 0\'dan başlar, çizdikçe artar ve sıfırlanınca yine 0 olur', () => {
    const ps = parts(9);
    const tr = createTracker(ps, { radius: RADIUS });
    expect(tr.progress()).toBe(0);
    expect(tr.visited().flat()).toHaveLength(0);
    const strokes = honestStrokes(ps, seeded(9), 5, 5, 'ileri');
    let prev = 0;
    for (const s of strokes) {
      tr.lift();
      for (const p of s) {
        tr.feed(p);
        expect(tr.progress()).toBeGreaterThanOrEqual(prev);
        prev = tr.progress();
      }
    }
    expect(prev).toBeGreaterThanOrEqual(0.999);
    expect(tr.visited().flat().length).toBeGreaterThan(10);
    tr.reset();
    expect(tr.progress()).toBe(0);
    expect(tr.complete()).toBe(false);
  });

  it('rakam parçaları: 6 ve 9 iki, 7 bir, 8 iki halka, 10 üç parça (1: gövde+bayrak, 0: halka)', () => {
    expect([6, 7, 8, 9, 10].map((n) => numberParts(n).length)).toEqual([2, 1, 2, 2, 3]);
    expect(numberParts(8).every((p) => p.closed)).toBe(true);
    expect(numberParts(10).filter((p) => p.closed)).toHaveLength(1);
  });
});
