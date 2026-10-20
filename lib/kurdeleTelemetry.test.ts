import { GHOST, MOTIFS, PAIRS, windowMsFor, type GhostSpec, type MotifKey } from '../constants/kurdeleDansi';
import { DIR_DIFF, ghostPoint, judge, MIN_PATH, summarize, type Sample } from './kurdeleTelemetry';

// Sentetik parmak hareketi: ghostPoint ile aynı ailede yörünge, farklı örnekleme sıklıklarıyla.
const trace = (spec: GhostSpec, windowMs: number, hz = 60, scale = 1): Sample[] => {
  const out: Sample[] = [];
  for (let t = 0; t <= windowMs; t += 1000 / hz) {
    const p = ghostPoint(spec, t, windowMs);
    out.push({ x: 0.5 + (p.x - 0.5) * scale, y: 0.5 + (p.y - 0.5) * scale, t });
  }
  return out;
};

const summaryOf = (key: MotifKey, hz = 60, scale = 1) => {
  const w = windowMsFor(key);
  return summarize(trace(GHOST[key], w, hz, scale), w);
};

describe('kurdele telemetrisi', () => {
  it.each(PAIRS.map((p) => [p.key, p.motifs] as const))('%s: rehber kurdele hareketi kararı "ok" verir (eşikler rehberle tutarlı)', (key, motifs) => {
    expect(judge(key, summaryOf(motifs[0]), summaryOf(motifs[1]))).toBe('ok');
  });

  it.each([30, 60, 120])('örnekleme sıklığı %i Hz iken de tüm çiftler "ok"', (hz) => {
    PAIRS.forEach((p) => {
      expect(judge(p.key, summaryOf(p.motifs[0], hz), summaryOf(p.motifs[1], hz))).toBe('ok');
    });
  });

  it('ters sıra (önce hızlı müzik) çocuğun iki hareketi aynı olmadıkça değil, doğru eşlemeyle karar verir', () => {
    // a/b motif indeksine göre verilir: çocuk yavaş müzikte HIZLI, hızlı müzikte YAVAŞ hareket ederse başarısız
    const slowMotif = summaryOf('yavas');
    const fastMotif = summaryOf('hizli');
    expect(judge('tempo', fastMotif, slowMotif)).toBe('fail');
  });

  it('iki müzikte de aynı hareket → "fail" (ayrım yok)', () => {
    const same = summaryOf('yavas');
    PAIRS.forEach((p) => expect(judge(p.key, same, same)).toBe('fail'));
  });

  it('hiç hareket etmeyen çocuk → "nomove"', () => {
    const w = windowMsFor('yavas');
    const still: Sample[] = Array.from({ length: 60 }, (_, i) => ({ x: 0.5, y: 0.5, t: i * 60 }));
    const s = summarize(still, w);
    expect(s.path).toBeLessThan(MIN_PATH);
    expect(judge('tempo', s, summaryOf('hizli'))).toBe('nomove');
    expect(judge('tempo', summaryOf('yavas'), s)).toBe('nomove');
  });

  it('boş örnek listesi güvenli (NaN yok)', () => {
    const s = summarize([], 3000);
    Object.values(s).forEach((v) => expect(Number.isFinite(v)).toBe(true));
  });

  it('pencere dışındaki örnekler ve ilk 250 ms yok sayılır', () => {
    const w = 3000;
    const early: Sample[] = [{ x: 0, y: 0, t: 0 }, { x: 1, y: 1, t: 100 }];
    expect(summarize(early, w).n).toBe(0);
    expect(summarize([{ x: 0.1, y: 0.1, t: 400 }, { x: 0.2, y: 0.1, t: 900 }, { x: 0.9, y: 0.1, t: 4000 }], w).n).toBe(2);
  });

  it('çıkan ezgide dy negatif (yukarı), inen ezgide pozitif; fark eşikten büyük', () => {
    const up = summaryOf('cikan');
    const down = summaryOf('inen');
    expect(up.dy).toBeLessThan(0);
    expect(down.dy).toBeGreaterThan(0);
    expect(down.dy - up.dy).toBeGreaterThan(DIR_DIFF * 2);
  });

  it('küçük (kısık) hareket büyük (yüksek) harekete göre belirgin daha küçük', () => {
    expect(summaryOf('yuksek').size).toBeGreaterThan(summaryOf('kisik').size * 1.5);
  });

  it('her motifin dans penceresi en az 3 saniye (çocuğa yetecek süre)', () => {
    (Object.keys(MOTIFS) as MotifKey[]).forEach((k) => expect(windowMsFor(k)).toBeGreaterThanOrEqual(3000));
  });
});
