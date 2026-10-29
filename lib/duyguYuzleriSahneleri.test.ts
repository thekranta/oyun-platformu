import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Test listesi notu (Duygu Yüzleri, 2026-10-29): "Hayalet ne alaka? Korkutucu unsur bu." -> hayalet sahnesi kaldırıldı.
// Korku sahneleri çocuğun günlük yaşantısından olmalı (arı, gök gürültüsü); hayalet/canavar gibi korkutucu kurgu eklenmez.
// Ayrıca her durum cümlesinin ("<durum> Sence nasıl hissediyor?") klibi bulunmalı.

const KOK = join(__dirname, '..');
const kaynak = readFileSync(join(KOK, 'components', 'DuyguYuzleri.tsx'), 'utf8');

// services/speechService.ttsSlug ile AYNI kural.
const ttsSlug = (text: string) =>
  text
    .replace(/ç/g, 'c').replace(/Ç/g, 'c').replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g').replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o').replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const durumlar = [...kaynak.matchAll(/\{ scene: '([^']+)', text: '([^']+)', emotion: '(\w+)' \}/g)].map((m) => ({ sahne: m[1], metin: m[2], duygu: m[3] }));

describe('Duygu Yüzleri sahneleri', () => {
  it('durum listesi okunabiliyor', () => {
    expect(durumlar.length).toBeGreaterThanOrEqual(10);
  });

  it('korkutucu kurgu (hayalet) yok; sahne, ses ve kayıt listesinde de', () => {
    expect(kaynak).not.toMatch(/hayalet|👻/i);
    expect(existsSync(join(KOK, 'assets', 'sounds', 'tts', 'karanlikta-bir-hayalet-gordu-sence-nasil-hissediyor.mp3'))).toBe(false);
    expect(readFileSync(join(KOK, 'scripts', 'tts-phrases-dynamic.json'), 'utf8')).not.toMatch(/hayalet/i);
    expect(readFileSync(join(KOK, 'lib', 'ttsAssets.ts'), 'utf8')).not.toMatch(/hayalet/i);
  });

  it('her durum cümlesinin klibi var', () => {
    const eksik = durumlar
      .map((d) => ttsSlug(`${d.metin} Sence nasıl hissediyor?`))
      .filter((slug) => !existsSync(join(KOK, 'assets', 'sounds', 'tts', `${slug}.mp3`)));
    expect(eksik).toEqual([]);
  });

  it('her duygunun en az bir sahnesi var (seçenek olarak çıkan duygu hedef olabilsin)', () => {
    const duygular = new Set(durumlar.map((d) => d.duygu));
    for (const d of ['mutlu', 'uzgun', 'kizgin', 'korkmus', 'saskin', 'sevgi', 'uykulu']) expect(duygular.has(d)).toBe(true);
  });
});
