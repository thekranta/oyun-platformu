import { readFileSync } from 'fs';
import { join } from 'path';

// İlk Harf "<harf> ile başlayan resmi bul!" komutunu söyler. Tek harf TTS'te ünsüz adıyla okunmaz ('M' → 'em', 'Y' → 'ı', 'K' → 'kiğ',
// 'Ç' → 'çiğ'): klip metni harf ADIYLA ('Me', 'Ye', …) yazılır, dosya adı ekran metninin slug'ı kalır (kayıttaki "slug" alanı).
// Test listesi 84-D1 (2026-10-29): "EM ile başlayan resmi bul diyor, ME demesi lazım". Bu test klip kayıtlarının harf adı biçimini korur
// (yeniden üretimde eski 'M ile …' metni geri gelmesin) ve her harfin klibinin var olduğunu doğrular.

const NAMES: Record<string, string> = { A: 'A', B: 'Be', Ç: 'Çe', E: 'E', G: 'Ge', K: 'Ke', M: 'Me', P: 'Pe', T: 'Te', Y: 'Ye' };
const slugOf = (l: string) => l.replace('Ç', 'c').toLowerCase();

// services/speechService.ttsSlug ile AYNI kural (o modül Supabase/expo-av yüklediği için burada kopya).
const ttsSlug = (text: string) =>
  text
    .replace(/ç/g, 'c').replace(/Ç/g, 'c').replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g').replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o').replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

describe('İlk Harf komut klipleri harf adıyla', () => {
  const phrases: { text: string; game?: string; slug?: string }[] = JSON.parse(
    readFileSync(join(__dirname, '..', 'scripts', 'tts-phrases-dynamic.json'), 'utf8'),
  );
  const registry = readFileSync(join(__dirname, 'ttsAssets.ts'), 'utf8');
  const keys = new Set([...registry.matchAll(/^\s*'([a-z0-9-]+)'\s*:/gm)].map((m) => m[1]));
  const game = readFileSync(join(__dirname, '..', 'components', 'IlkHarf.tsx'), 'utf8');

  it.each(Object.keys(NAMES))('%s harfi: kayıt harf adını söyler ve klip var', (letter) => {
    const slug = `${slugOf(letter)}-ile-baslayan-resmi-bul`;
    // kaydın dosya adı = ekran metninin slug'ı ('<harf>-ile-baslayan-resmi-bul'); söylenen metin harf adıyla başlar
    const records = phrases.filter((p) => p.game === 'IlkHarf' && (p.slug ?? ttsSlug(p.text)) === slug && p.text === `${NAMES[letter]} ile başlayan resmi bul!`);
    expect(records).toHaveLength(1);
    expect(keys.has(slug)).toBe(true);
  });

  it('oyunda kullanılan her harfin adı bu listede', () => {
    const letters = [...game.matchAll(/letter: '([A-ZÇĞİÖŞÜ])'/g)].map((m) => m[1]);
    expect(new Set(letters).size).toBeGreaterThan(0);
    for (const l of new Set(letters)) expect(NAMES[l]).toBeDefined();
  });
});
