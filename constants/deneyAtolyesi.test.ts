import { ALL_DENEY_KLIPLERI, EXPERIMENTS, ICE_TEST } from './deneyAtolyesi';

describe('Deney Atölyesi içeriği', () => {
  const uniq = [...new Set(ALL_DENEY_KLIPLERI)];

  it('3 malzeme deneyi + 1 adil buz deneyi tanımlı', () => {
    expect(EXPERIMENTS).toHaveLength(3);
    expect(ICE_TEST.sizes).toHaveLength(3);
  });

  it('klip metinleri 110 karakteri aşmaz, rakam içermez', () => {
    uniq.forEach((t) => {
      expect(t.length).toBeLessThanOrEqual(110);
      expect(/\d/.test(t)).toBe(false);
    });
  });

  it('benzersiz klip sayısı oyun başına ~45 sınırının altında', () => {
    expect(uniq.length).toBeLessThanOrEqual(45);
  });

  it('her deneyde 6 benzersiz malzeme, en az 2 evet ve 2 hayır', () => {
    EXPERIMENTS.forEach((e) => {
      expect(new Set(e.materials.map((m) => m.emoji)).size).toBe(6);
      expect(e.materials.filter((m) => m.yes).length).toBeGreaterThanOrEqual(2);
      expect(e.materials.filter((m) => !m.yes).length).toBeGreaterThanOrEqual(2);
    });
  });

  it('her deneyde tek doğru alet, üç farklı alet', () => {
    EXPERIMENTS.forEach((e) => {
      expect(e.tools.filter((t) => t.correct)).toHaveLength(1);
      expect(new Set(e.tools.map((t) => t.emoji)).size).toBe(3);
    });
  });

  it('aletler deneyle eşleşir: mıknatıs-mıknatıs, ışık-fener, su-damlalık', () => {
    const correct = Object.fromEntries(EXPERIMENTS.map((e) => [e.id, e.tools.find((t) => t.correct)!.label]));
    expect(correct).toEqual({ miknatis: 'mıknatıs', isik: 'fener', su: 'damlalık' });
  });

  it('mıknatıs deneyinde yalnız çelik nesneler (ataş, cıvata) yapışır — "metal çeker" yanılgısı yok', () => {
    const magnet = EXPERIMENTS.find((e) => e.effect === 'magnet')!;
    expect(magnet.materials.filter((m) => m.yes).map((m) => m.label).sort()).toEqual(['ataş', 'cıvata']);
    const hay = magnet.materials.map((m) => m.label).join(' ');
    ['para', 'folyo', 'alüminyum', 'bakır'].forEach((w) => expect(hay.includes(w)).toBe(false));
  });

  it('buz testi: iki eşit boy + bir farklı boy', () => {
    const [a, b, c] = ICE_TEST.sizes;
    expect(a).toBe(b);
    expect(c).not.toBe(a);
  });

  it('malzeme adı klipleri tek heceli sözcük değil (TTS güvenilmez) ve "Bu bir" ile başlar', () => {
    EXPERIMENTS.forEach((e) => e.materials.forEach((m) => {
      expect(m.say.startsWith('Bu bir ')).toBe(true);
    }));
  });
});
