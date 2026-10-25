import { readFileSync } from 'fs';
import { join } from 'path';
import { ALL_NE_ISE_YARAR_KLIPLERI, INTRO_TEXT, PAIRS, PROMPT_TEXT } from './neIseYarar';

// services/speechService.ttsSlug ile AYNI kural (o modül Supabase/expo-av yüklediği için test burada kopyalar).
const ttsSlug = (text: string) =>
  text
    .replace(/ç/g, 'c').replace(/Ç/g, 'c').replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g').replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o').replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

describe('Ne İşe Yarar içeriği', () => {
  it('klipler 110 karakteri aşmaz, rakam içermez, tekrarsızdır', () => {
    ALL_NE_ISE_YARAR_KLIPLERI.forEach((t) => {
      expect(t.length).toBeLessThanOrEqual(110);
      expect(/\d/.test(t)).toBe(false);
    });
    expect(new Set(ALL_NE_ISE_YARAR_KLIPLERI).size).toBe(ALL_NE_ISE_YARAR_KLIPLERI.length);
  });

  it('7 çift var; her çiftin sıradan bağımsız kendi cümlesi ve iki farklı kartı var', () => {
    expect(PAIRS).toHaveLength(7);
    PAIRS.forEach((p) => {
      expect(p.sentence.trim().length).toBeGreaterThan(0);
      expect(p.a.name).not.toBe(p.b.name);
      expect(p.a.emoji).not.toBe(p.b.emoji);
    });
    expect(new Set(PAIRS.map((p) => p.sentence)).size).toBe(PAIRS.length);
  });

  it('REGRESYON (#41): çocuğun anlamadığı "birbirine gider / birbiriyle giden" kalıbı hiçbir metinde yok', () => {
    ALL_NE_ISE_YARAR_KLIPLERI.forEach((t) => {
      expect(/birbirine\s+gider|birbiriyle\s+giden/i.test(t)).toBe(false);
    });
  });

  it('REGRESYON (#41, 2. not): çocuğun anlamadığı "birlikte olan" kalıbı komutlarda yok; komut "birbirine uyan" der', () => {
    ALL_NE_ISE_YARAR_KLIPLERI.forEach((t) => {
      expect(/birlikte\s+olan/i.test(t)).toBe(false);
    });
    expect(PROMPT_TEXT).toMatch(/birbirine uyan/i);
    expect(INTRO_TEXT).toMatch(/birbirine uyan/i);
  });

  it('klip sayısı: 2 komut + 7 cümle', () => {
    expect(ALL_NE_ISE_YARAR_KLIPLERI).toHaveLength(2 + PAIRS.length);
    expect(ALL_NE_ISE_YARAR_KLIPLERI.slice(0, 2)).toEqual([INTRO_TEXT, PROMPT_TEXT]);
  });

  it('seslendirilen her metnin hazır klibi kayıt haritasında var (sessiz oyun yayına çıkmaz)', () => {
    const registry = readFileSync(join(__dirname, '..', 'lib', 'ttsAssets.ts'), 'utf8');
    const keys = new Set([...registry.matchAll(/^\s*'([a-z0-9-]+)'\s*:/gm)].map((m) => m[1]));
    ALL_NE_ISE_YARAR_KLIPLERI.forEach((t) => {
      expect(keys.has(ttsSlug(t))).toBe(true);
    });
  });
});
