import { MASAL_GENEL_KLIPLER, TALES } from './masalSahnesi';

describe('Masal Sahnesi içeriği', () => {
  const sentences = TALES.flatMap((t) => t.sentences);
  const generic = [
    MASAL_GENEL_KLIPLER.giris, MASAL_GENEL_KLIPLER.tahmin, MASAL_GENEL_KLIPLER.dinle, MASAL_GENEL_KLIPLER.sahneKur,
    ...Object.values(MASAL_GENEL_KLIPLER.soru), MASAL_GENEL_KLIPLER.dogru, MASAL_GENEL_KLIPLER.yanlis,
    MASAL_GENEL_KLIPLER.tahminKontrol, MASAL_GENEL_KLIPLER.tahminCevap, MASAL_GENEL_KLIPLER.bitis,
  ];

  it('5 masal var ve her biri 4 cümle', () => {
    expect(TALES).toHaveLength(5);
    TALES.forEach((t) => expect(t.sentences).toHaveLength(4));
  });

  it('tüm klip metinleri 110 karakteri aşmaz ve rakam içermez (çocuk okuyamaz, klip kısa olmalı)', () => {
    [...sentences, ...generic].forEach((s) => {
      expect(s.length).toBeLessThanOrEqual(110);
      expect(/\d/.test(s)).toBe(false);
    });
  });

  it('toplam klip sayısı oyun başına ~45 sınırının altında', () => {
    expect(new Set([...sentences, ...generic]).size).toBeLessThanOrEqual(45);
  });

  it('her yuvada tam bir doğru + iki çeldirici, resimler farklı', () => {
    TALES.forEach((t) => t.slots.forEach((s) => {
      expect(s.options.filter((o) => o.correct)).toHaveLength(1);
      expect(new Set(s.options.map((o) => o.emoji)).size).toBe(3);
      expect(s.sentenceIdx).toBeGreaterThanOrEqual(0);
      expect(s.sentenceIdx).toBeLessThan(4);
    }));
  });

  it('zorluk basamağı: 1-2. masal kim+nerede, 3. + olay, 4-5. dört unsur', () => {
    const kinds = TALES.map((t) => t.slots.map((s) => s.kind).join(','));
    expect(kinds).toEqual([
      'kim,nerede', 'kim,nerede', 'kim,nerede,olay',
      'kim,nerede,zaman,olay', 'kim,nerede,zaman,olay',
    ]);
  });

  it('zaman yuvası olan masalın ortamı (mood) tanımlı', () => {
    TALES.filter((t) => t.slots.some((s) => s.kind === 'zaman')).forEach((t) => expect(t.mood).toBeDefined());
  });

  it('tahmin seçenekleri 3 tane ve hiçbiri doğru/yanlış işaretli değil', () => {
    TALES.forEach((t) => {
      expect(t.predictions).toHaveLength(3);
      t.predictions.forEach((p) => expect(p.correct).toBeUndefined());
    });
  });

  it('doğru cevap, masalın ilgili cümlesinden bağımsız çeldiricilerde geçmez (etiket sözcüğü cümlede yok)', () => {
    TALES.forEach((t) => t.slots.forEach((s) => {
      const text = t.sentences.join(' ').toLocaleLowerCase('tr-TR');
      s.options.filter((o) => !o.correct && s.kind !== 'zaman').forEach((o) => {
        const first = o.label.split(' ')[0].toLocaleLowerCase('tr-TR');
        expect(text.includes(first)).toBe(false);
      });
    }));
  });
});
