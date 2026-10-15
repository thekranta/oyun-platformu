import { ACTIVITIES, ALL_SPOR_KLIPLERI, BODY_CARDS, HEARTBEAT, REASON_CARDS, ROUND_PLAN } from './sporGunu';

describe('Spor Günü içeriği', () => {
  const uniq = [...new Set(ALL_SPOR_KLIPLERI)];

  it('klipler 110 karakteri aşmaz, rakam içermez, toplam ~45 sınırının altında', () => {
    uniq.forEach((t) => {
      expect(t.length).toBeLessThanOrEqual(110);
      expect(/\d/.test(t)).toBe(false);
    });
    expect(uniq.length).toBeLessThanOrEqual(45);
  });

  it('her mekânda 3 etkinlik ve her yoğunluk (hafif/orta/hızlı) bir kez', () => {
    (['ic', 'dis'] as const).forEach((place) => {
      const list = ACTIVITIES.filter((a) => a.place === place);
      expect(list.map((a) => a.intensity).sort()).toEqual(['hafif', 'hizli', 'orta']);
    });
    expect(new Set(ACTIVITIES.map((a) => a.id)).size).toBe(ACTIVITIES.length);
  });

  it('hafif hareket yavaş, orta/hızlı hareket hızlı kalp atışı çalar', () => {
    expect(HEARTBEAT).toEqual({ hafif: 'kalp-yavas', orta: 'kalp-hizli', hizli: 'kalp-hizli' });
  });

  it('beden kartları 3 tane (puansız), neden kartlarında tek doğru', () => {
    expect(BODY_CARDS).toHaveLength(3);
    expect(REASON_CARDS.filter((r) => r.correct)).toHaveLength(1);
    expect(REASON_CARDS.find((r) => r.correct)!.id).toBe('hareket');
  });

  it('dört tur: ilk tur iç mekân verilir, neden-sonuç yalnız 3-4. turda (60-72 ay basamağı)', () => {
    expect(ROUND_PLAN).toHaveLength(4);
    expect(ROUND_PLAN.map((r) => r.reason)).toEqual([false, false, true, true]);
    expect(ROUND_PLAN[0].forcedPlace).toBe('ic');
  });

  it('sağlık iddiası yok: tıbbi terim geçmez', () => {
    ['hastalık', 'tedavi', 'ilaç', 'kalp krizi'].forEach((w) => {
      expect(uniq.join(' ').toLowerCase().includes(w)).toBe(false);
    });
  });
});
