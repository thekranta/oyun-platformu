import { ALL_KURDELE_KLIPLERI, DANCE_MOVES, DANCE_MOVE_MS, DANCE_PICK_COUNT, GHOST, MOTIFS, PAIRS } from './kurdeleDansi';

describe('Kurdele Dansı içeriği', () => {
  const uniq = [...new Set(ALL_KURDELE_KLIPLERI)];

  it('klipler 110 karakteri aşmaz, rakam içermez, toplam ~45 sınırının altında', () => {
    uniq.forEach((t) => {
      expect(t.length).toBeLessThanOrEqual(110);
      expect(/\d/.test(t)).toBe(false);
    });
    expect(uniq.length).toBeLessThanOrEqual(45);
  });

  it('4 çift: tempo, gürlük, kalınlık, yön — her biri iki farklı motif', () => {
    expect(PAIRS.map((p) => p.key)).toEqual(['tempo', 'gurluk', 'kalinlik', 'yon']);
    PAIRS.forEach((p) => expect(p.motifs[0]).not.toBe(p.motifs[1]));
  });

  it('her motifin dosyası ve rehber hareketi tanımlı', () => {
    PAIRS.flatMap((p) => p.motifs).forEach((m) => {
      expect(MOTIFS[m].path).toMatch(/^\/sounds\/sfx\/motif-.*\.wav$/);
      expect(GHOST[m]).toBeDefined();
    });
  });

  it('onay cümleleri özelliği doğru adlandırır (ezgi özelliği ekranda değil, yalnız onayda söylenir)', () => {
    const c = Object.fromEntries(PAIRS.map((p) => [p.key, p.confirm]));
    expect(c.tempo).toMatch(/Yavaş.*hızlı/);
    expect(c.gurluk).toMatch(/Kısık.*yüksek/);
    expect(c.kalinlik).toMatch(/Kalın.*ince/);
    expect(c.yon).toMatch(/Çıkan.*inen/);
  });

  it('kendi dansım: 4 hareket kartı, 3 seçilir, 3 hareket ≈ motif-yavas süresi', () => {
    expect(DANCE_MOVES).toHaveLength(4);
    expect(new Set(DANCE_MOVES.map((m) => m.id)).size).toBe(4);
    expect(DANCE_PICK_COUNT).toBe(3);
    expect(Math.abs(DANCE_PICK_COUNT * DANCE_MOVE_MS - MOTIFS.yavas.durMs)).toBeLessThan(100);
  });
});
