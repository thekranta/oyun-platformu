import { readFileSync } from 'fs';
import { join } from 'path';

// Akıllı Sayıyı Bul her turda "<n>! <n> tane olanı bul." (açılış) ve "<n> tane olanı bul." (Tekrar Dinle)
// cümlelerini okur; zorluk 5'te hedef sayı 10'a kadar çıkar (RANGE_BY_DIFF[5] = [6, 10]).
// Eskiden 7, 8, 9 ve 10 için bazı klipler yoktu: o turda yönerge SESSİZ kalıyordu (#38).
const MAX_TARGET = 10;

// services/speechService.ttsSlug ile AYNI kural (o modül Supabase/expo-av yüklediği için burada kopya).
const ttsSlug = (text: string) =>
  text
    .replace(/ç/g, 'c').replace(/Ç/g, 'c').replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g').replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o').replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

describe('Akıllı Sayıyı Bul klipleri', () => {
  const registry = readFileSync(join(__dirname, 'ttsAssets.ts'), 'utf8');
  const keys = new Set([...registry.matchAll(/^\s*'([a-z0-9-]+)'\s*:/gm)].map((m) => m[1]));

  it.each(Array.from({ length: MAX_TARGET }, (_, i) => i + 1))('hedef %i için hem açılış hem Tekrar Dinle klibi var', (n) => {
    expect(keys.has(ttsSlug(`${n}! ${n} tane olanı bul.`))).toBe(true);
    expect(keys.has(ttsSlug(`${n} tane olanı bul.`))).toBe(true);
  });
});
