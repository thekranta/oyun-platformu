import {
  adjustDifficulty,
  difficultyAfterLevel,
  performanceScore,
  RESPONSIVE_ADAPTIVE,
  type AdaptiveOptions,
  type LevelOutcome,
} from './useAdaptiveDifficulty';

const cfgOf = (o: AdaptiveOptions) => ({
  minDifficulty: o.minDifficulty ?? 1,
  maxDifficulty: o.maxDifficulty ?? 5,
  checkpointEvery: o.checkpointEvery ?? 3,
  raiseThreshold: o.raiseThreshold ?? 0.8,
  lowerThreshold: o.lowerThreshold ?? 0.45,
  accuracyWeight: o.accuracyWeight ?? 0.7,
});

// Tek-soruluk seviye (Akıllı oyunların kullandığı biçim); hedef süre 7 sn.
const level = (errors: number, timeMs: number): LevelOutcome => ({ correct: 1, total: 1, errors, timeMs, targetMs: 7000 });

/** Hook'un recordLevel mantığını (difficultyAfterLevel) tur tur işletir. */
function simulate(rounds: number, outcomeFor: (round: number) => LevelOutcome, opts: AdaptiveOptions) {
  const cfg = cfgOf(opts);
  const history: LevelOutcome[] = [];
  const trajectory: number[] = [];
  let diff = opts.startDifficulty ?? opts.minDifficulty ?? 1;
  for (let r = 1; r <= rounds; r++) {
    trajectory.push(diff); // r. tur bu zorlukta oynandı
    history.push(outcomeFor(r));
    diff = difficultyAfterLevel(history, diff, cfg).next;
  }
  return { trajectory, final: diff };
}
const changes = (t: number[]) => t.filter((d, i) => i > 0 && d !== t[i - 1]).length;

describe('performanceScore / adjustDifficulty', () => {
  it('kusursuz ve hızlı seviye 1.0 alır', () => {
    expect(performanceScore([level(0, 3000), level(0, 5000)])).toBe(1);
  });

  it('tek-soruluk seviyede her hata 0 puan değil, kısmi puandır (1 hata = 0.5)', () => {
    // doğruluk (1 + 0.5)/2 = 0.75; hız 1 → 0.75*0.7 + 0.3 = 0.825
    expect(performanceScore([level(0, 4000), level(1, 4000)])).toBeCloseTo(0.825, 3);
  });

  it('eşiklere göre +1 / -1 / aynı', () => {
    const o = { minDifficulty: 1, maxDifficulty: 5, raiseThreshold: 0.8, lowerThreshold: 0.55 };
    expect(adjustDifficulty(3, 0.9, o)).toBe(4);
    expect(adjustDifficulty(3, 0.5, o)).toBe(2);
    expect(adjustDifficulty(3, 0.7, o)).toBe(3);
    expect(adjustDifficulty(5, 0.95, o)).toBe(5);
    expect(adjustDifficulty(1, 0.1, o)).toBe(1);
  });
});

describe('difficultyAfterLevel', () => {
  it('checkpoint dışında zorluk ve skor değişmez (score=null)', () => {
    const cfg = cfgOf(RESPONSIVE_ADAPTIVE);
    expect(difficultyAfterLevel([level(0, 3000)], 2, cfg)).toEqual({ next: 2, score: null });
  });

  it('checkpointte skor hesaplanır ve zorluk ayarlanır', () => {
    const cfg = cfgOf(RESPONSIVE_ADAPTIVE);
    const r = difficultyAfterLevel([level(0, 3000), level(0, 3000)], 2, cfg);
    expect(r.score).toBe(1);
    expect(r.next).toBe(3);
  });
});

describe('RESPONSIVE_ADAPTIVE (Akıllı Sayı Avı / Akıllı Miktar): çocuğun performansına göre gerçekten uyarlanır', () => {
  it('kusursuz ve hızlı çocuk: zorluk her 2 turda bir artar, 7. turda tavana ulaşır', () => {
    const { trajectory, final } = simulate(10, () => level(0, 4000), RESPONSIVE_ADAPTIVE);
    expect(trajectory).toEqual([2, 2, 3, 3, 4, 4, 5, 5, 5, 5]);
    expect(final).toBe(5);
  });

  it('zorlanan çocuk (her turda 2 hata, yavaş): zorluk düşer ve tabanda kalır', () => {
    const { trajectory, final } = simulate(10, () => level(2, 14000), RESPONSIVE_ADAPTIVE);
    expect(trajectory.slice(0, 4)).toEqual([2, 2, 1, 1]);
    expect(final).toBe(1);
    expect(Math.min(...trajectory)).toBe(1);
  });

  it('orta çocuk (her turda 1 hata, 8 sn): zorluk oynak değil, sabit kalır', () => {
    const { trajectory } = simulate(10, () => level(1, 8000), RESPONSIVE_ADAPTIVE);
    expect(changes(trajectory)).toBe(0);
  });

  it('iki turluk pencerede tek hata hızlı çocuğu yine de yükseltir (2 tur: 1 hata + 1 kusursuz)', () => {
    const { trajectory } = simulate(4, (r) => level(r === 1 ? 1 : 0, 5000), RESPONSIVE_ADAPTIVE);
    expect(trajectory).toEqual([2, 2, 3, 3]);
  });

  it('çocuk takılınca düşer, toparlayınca yeniden yükselir (iki yönlü uyarlama)', () => {
    // 1-4. turlar zorlanma, 5-10. turlar kusursuz
    const { trajectory } = simulate(10, (r) => (r <= 4 ? level(2, 14000) : level(0, 4000)), RESPONSIVE_ADAPTIVE);
    expect(trajectory.slice(0, 5)).toEqual([2, 2, 1, 1, 1]);
    expect(trajectory[trajectory.length - 1]).toBeGreaterThanOrEqual(3);
  });

  it('eski ayar (3 turluk pencere, 9 tur) en fazla 2 kez değişirdi; yeni ayar daha duyarlı', () => {
    const legacy = simulate(9, () => level(0, 4000), { minDifficulty: 1, maxDifficulty: 5, checkpointEvery: 3, startDifficulty: 2 });
    const responsive = simulate(10, () => level(0, 4000), RESPONSIVE_ADAPTIVE);
    expect(changes(legacy.trajectory)).toBe(2);
    expect(changes(responsive.trajectory)).toBeGreaterThanOrEqual(3);
  });
});
