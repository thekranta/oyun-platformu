import { readFileSync } from 'fs';
import { join } from 'path';
import { targetPhrase } from './yildizCercevesiKlipleri';

// Yıldız Çerçevesi her tur başında "<sayı> yıldız koy!" der; hedef 6-10 arasıdır (gameRegistry: targetRange [6, 10]).
// Klibi olmayan hedefte yönerge SESSİZ kalırdı (test listesi 15-K1).
const RANGE: [number, number] = [6, 10];

// services/speechService.ttsSlug ile AYNI kural (o modül Supabase/expo-av yüklediği için burada kopya).
const ttsSlug = (text: string) =>
  text
    .replace(/ç/g, 'c').replace(/Ç/g, 'c').replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g').replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o').replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

describe('Yıldız Çerçevesi hedef sayı klipleri', () => {
  const registry = readFileSync(join(__dirname, 'ttsAssets.ts'), 'utf8');
  const keys = new Set([...registry.matchAll(/^\s*'([a-z0-9-]+)'\s*:/gm)].map((m) => m[1]));
  const registrySource = readFileSync(join(__dirname, '..', 'components', 'gameRegistry.tsx'), 'utf8');

  it('cümle sayıyı sözcükle söyler', () => {
    expect(targetPhrase(6, 'yıldız')).toBe('Altı yıldız koy!');
    expect(targetPhrase(10, 'yıldız')).toBe('On yıldız koy!');
  });

  it.each(Array.from({ length: RANGE[1] - RANGE[0] + 1 }, (_, i) => RANGE[0] + i))('hedef %i için klip var', (n) => {
    expect(keys.has(ttsSlug(targetPhrase(n, 'yıldız')))).toBe(true);
  });

  it('kayıttaki hedef aralığı bu testin aralığıyla aynı', () => {
    expect(registrySource).toMatch(/oyunAdi="onluk-cerceve-2"[\s\S]{0,200}targetRange=\{\[6, 10\]\}/);
    expect(registrySource).toMatch(/oyunAdi="onluk-cerceve-2"[\s\S]{0,300}speakTarget/);
  });
});
