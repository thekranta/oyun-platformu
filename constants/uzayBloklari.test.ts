import { readFileSync } from 'fs';
import { join } from 'path';
import { ALL_UZAY_BLOKLARI_KLIPLERI, NEW_UZAY_BLOKLARI_KLIPLERI } from './uzayBloklari';

// services/speechService.ttsSlug ile AYNI kural (o modül Supabase/expo-av yüklediği için test burada kopyalar).
const ttsSlug = (text: string) =>
  text
    .replace(/ç/g, 'c').replace(/Ç/g, 'c').replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g').replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o').replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

describe('Uzay Blokları metinleri', () => {
  it('klipler 110 karakteri aşmaz, rakam içermez, tekildir', () => {
    ALL_UZAY_BLOKLARI_KLIPLERI.forEach((t) => {
      expect(t.length).toBeLessThanOrEqual(110);
      expect(/\d/.test(t)).toBe(false);
    });
    expect(new Set(ALL_UZAY_BLOKLARI_KLIPLERI).size).toBe(ALL_UZAY_BLOKLARI_KLIPLERI.length);
  });

  it('yeni klipler bütün metinlerin içinde', () => {
    NEW_UZAY_BLOKLARI_KLIPLERI.forEach((t) => expect(ALL_UZAY_BLOKLARI_KLIPLERI).toContain(t));
  });

  it('seslendirilen her metnin hazır klibi kayıt haritasında var (klibi olmayan metin yabancı/canlı sese düşer)', () => {
    const registry = readFileSync(join(__dirname, '..', 'lib', 'ttsAssets.ts'), 'utf8');
    const keys = new Set([...registry.matchAll(/^\s*'([a-z0-9-]+)'\s*:/gm)].map((m) => m[1]));
    ALL_UZAY_BLOKLARI_KLIPLERI.forEach((t) => expect(keys.has(ttsSlug(t))).toBe(true));
  });
});
