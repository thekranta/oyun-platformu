import { readFileSync } from 'fs';
import { join } from 'path';
import { RETRY_SPEECH } from './rakamIzleme';

// Rakam Yazma'da karalama temizlenince ekranda "Rakamın izinden git 🙂" çıkar ve aynı cümle sesle söylenir.
// Klibi olmayan cümle canlı (yabancı) sese düşerdi; bu test klibin var olduğunu ve bileşenin onu söylediğini korur.

// services/speechService.ttsSlug ile AYNI kural (o modül Supabase/expo-av yüklediği için burada kopya).
const ttsSlug = (text: string) =>
  text
    .replace(/ç/g, 'c').replace(/Ç/g, 'c').replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g').replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o').replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

describe('Rakam Yazma karalama ipucu sesi', () => {
  const registry = readFileSync(join(__dirname, 'ttsAssets.ts'), 'utf8');
  const keys = new Set([...registry.matchAll(/^\s*'([a-z0-9-]+)'\s*:/gm)].map((m) => m[1]));
  const component = readFileSync(join(__dirname, '..', 'components', 'RakamYazma2.tsx'), 'utf8');

  it('ipucu cümlesinin klibi var', () => {
    expect(keys.has(ttsSlug(RETRY_SPEECH))).toBe(true);
  });

  it('bileşen ekran yazısını söyler: ipucu sesi karalama temizlenince çalar', () => {
    expect(component).toContain('Rakamın izinden git');
    expect(component).toMatch(/setShowRetry\(true\);\s*speak\(RETRY_SPEECH/);
  });
});
