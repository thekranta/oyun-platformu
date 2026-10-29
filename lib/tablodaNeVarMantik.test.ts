import { readFileSync } from 'fs';
import { join } from 'path';

// Test listesi 125 notu (Tabloda Ne Var?): "Bu sahnede mantık hatası var."
// 2. turda "Bu tabloda hangi şekil YOK?" seçenekleri Üçgen / Kare / Daire idi; Şehir Penceresi yalnız karelerden oluştuğu için
// Üçgen de tabloda YOKTU: iki doğru cevap vardı, üçgeni seçen çocuk haksız yere uyarı alıyordu.
// "X YOK?" sorularında seçeneklerin yalnız biri tabloda bulunmamalı. Bu test o değişmezleri korur.

const src = readFileSync(join(__dirname, '..', 'components', 'TablodaNeVar.tsx'), 'utf8');
const bolum = (bas: string, bit: string) => {
  const a = src.indexOf(bas);
  const b = src.indexOf(bit, a + 1);
  if (a < 0 || b < 0) throw new Error(`bölüm bulunamadı: ${bas} .. ${bit}`);
  return src.slice(a, b);
};

describe('Tabloda Ne Var? — "YOK?" sorularının tek doğru cevabı', () => {
  it("Şehir Penceresi'nde üçgen ÇİZİLİ (Üçgen seçeneği tabloda var), yuvarlak şekil yok", () => {
    const sehir = bolum('function SehirPenceresi', 'function DairelerBahcesi');
    expect(sehir).toContain('<Polygon');
    expect(sehir).toContain("c.shape === 'ucgen'");
    expect(sehir).not.toMatch(/<Circle|<Ellipse/);
    expect(src).toMatch(/id: 'c6'[^}]*shape: 'ucgen'/);
    // üçgen tek tane ve sarı pencere olarak çizilir (renk sayımı soruları bozulmasın: 5 kırmızı, 2 mavi, 1 sarı, 4 beyaz)
    expect((src.match(/shape: 'ucgen'/g) ?? []).length).toBe(1); // yalnız c6 (tür tanımı 'shape?:' biçiminde)
  });

  it("'hangi şekil YOK?' turu: seçenekler Üçgen/Kare/Daire, tek doğru cevap Daire", () => {
    const tur = bolum("soru: 'Bu tabloda hangi şekil YOK?'", "painting: 'bahce'");
    expect(tur).toContain("id: 'ucgen'");
    expect(tur).toContain("id: 'kare'");
    expect(tur).toContain("id: 'daire'");
    expect(tur).toContain("dogru: 'daire'");
  });

  it("'hangi meyve YOK?' turu: Portakal ve Elma tabloda var, Muz yok", () => {
    const meyveler = bolum('const MEYVELER', '// ---');
    expect(meyveler).toContain("id: 'portakal'");
    expect(meyveler).toMatch(/id: 'elma\d'/);
    expect(meyveler).not.toMatch(/muz/i);
    const tur = bolum("soru: 'Bu tabloda hangi meyve YOK?'", "];\nconst TOTAL_ROUNDS");
    expect(tur).toContain("dogru: 'muz'");
  });
});
