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

// Yönerge ("3. rakamın üzerini çiz!" / "8 sayısının üzerini çiz!") ekranda yazar ve Tekrar Dinle ile söylenir.
// Klibi olmayan cümle sessiz kalırdı (canlı ses anahtarı yok): her rakamın klibi olmalı. Şablonlar kodda değişirse
// bu test klip üretmeyi hatırlatır (klip adı = ekran metninin slug'ı; söylenen metin rakamsız yazılır, bkz. tts-phrases-dynamic.json).
describe('Rakam Yazma yönerge sesleri (Tekrar Dinle)', () => {
  const registry = readFileSync(join(__dirname, 'ttsAssets.ts'), 'utf8');
  const keys = new Set([...registry.matchAll(/^\s*'([a-z0-9-]+)'\s*:/gm)].map((m) => m[1]));
  const component = readFileSync(join(__dirname, '..', 'components', 'RakamYazma2.tsx'), 'utf8');
  const gameRegistry = readFileSync(join(__dirname, '..', 'components', 'gameRegistry.tsx'), 'utf8');

  it('şablonlar bu testin bildiği cümlelerle aynı (değişirse yeni klip gerekir)', () => {
    expect(gameRegistry).toContain('instruction={(n) => `${n}. rakamın üzerini çiz!`}');
    expect(component).toContain('instruction = (n: number) => `${n} sayısının üzerini çiz!`');
  });

  it("1-5: '<n>. rakamın üzerini çiz!' klipleri var", () => {
    const eksik = [1, 2, 3, 4, 5].map((n) => ttsSlug(`${n}. rakamın üzerini çiz!`)).filter((s) => !keys.has(s));
    expect(eksik).toEqual([]);
  });

  it("6-10: '<n> sayısının üzerini çiz!' klipleri var", () => {
    const eksik = [6, 7, 8, 9, 10].map((n) => ttsSlug(`${n} sayısının üzerini çiz!`)).filter((s) => !keys.has(s));
    expect(eksik).toEqual([]);
  });
});
