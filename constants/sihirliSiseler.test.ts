import { readFileSync } from 'fs';
import { join } from 'path';
import { ALL_SIHIRLI_SISELER_KLIPLERI, NEW_SIHIRLI_SISELER_KLIPLERI } from './sihirliSiseler';

// services/speechService.ttsSlug ile AYNI kural (o modül Supabase/expo-av yüklediği için test burada kopyalar).
const ttsSlug = (text: string) =>
  text
    .replace(/ç/g, 'c').replace(/Ç/g, 'c').replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g').replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o').replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

describe('Sihirli Şişeler metinleri', () => {
  it('klipler 110 karakteri aşmaz, rakam içermez, tekildir', () => {
    ALL_SIHIRLI_SISELER_KLIPLERI.forEach((t) => {
      expect(t.length).toBeLessThanOrEqual(110);
      expect(/\d/.test(t)).toBe(false);
    });
    expect(new Set(ALL_SIHIRLI_SISELER_KLIPLERI).size).toBe(ALL_SIHIRLI_SISELER_KLIPLERI.length);
  });

  it('yeni klipler bütün metinlerin içinde', () => {
    NEW_SIHIRLI_SISELER_KLIPLERI.forEach((t) => expect(ALL_SIHIRLI_SISELER_KLIPLERI).toContain(t));
  });

  it('seslendirilen her metnin hazır klibi kayıt haritasında var (klibi olmayan metin yabancı/canlı sese düşer)', () => {
    const registry = readFileSync(join(__dirname, '..', 'lib', 'ttsAssets.ts'), 'utf8');
    const keys = new Set([...registry.matchAll(/^\s*'([a-z0-9-]+)'\s*:/gm)].map((m) => m[1]));
    ALL_SIHIRLI_SISELER_KLIPLERI.forEach((t) => expect(keys.has(ttsSlug(t))).toBe(true));
  });
});
