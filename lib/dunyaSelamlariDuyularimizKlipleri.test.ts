import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 2026-11-14 Android taraması: Dünya Selamları'nın 24 "selam + ülke" cümlesi ve Duyularımız'ın 8 sorusu hazır klipsizdi
 * (konuşma sessiz geçiliyordu, çocuk yönergeyi duymuyordu). Üretildi (scripts/tts-phrases-wave10.json); bu test yeni bir
 * bayrak/soru eklenip klibi unutulursa kırılır.
 */
const slug = (t: string) =>
    t
        .replace(/ç/g, 'c').replace(/Ç/g, 'c').replace(/ş/g, 's').replace(/Ş/g, 's').replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/Ü/g, 'u').replace(/ö/g, 'o').replace(/Ö/g, 'o').replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const ROOT = join(__dirname, '..');
const oku = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8').split('\r\n').join('\n');
const KLIPLER = new Set([...oku('lib', 'ttsAssets.ts').matchAll(/^\s*'([^']+)':\s*require/gm)].map((m) => m[1]));

describe('Dünya Selamları ve Duyularımız klipleri', () => {
    it('her bayrak için "selam. ülke böyle selam verir, bayrağını bul!" klibi var', () => {
        const bayraklar = [...oku('components', 'WorldFlag.tsx').matchAll(/name:\s*'([^']+)',\s*hello:\s*'([^']+)'/g)].map((m) => ({ ad: m[1], selam: m[2] }));
        expect(bayraklar.length).toBeGreaterThanOrEqual(24);
        const eksik = bayraklar.filter((b) => !KLIPLER.has(slug(`${b.selam}. ${b.ad} böyle selam verir, bayrağını bul!`))).map((b) => b.ad);
        expect(eksik).toEqual([]);
    });

    it('Duyularımız\'ın her sorusunun klibi var', () => {
        const sorular = [...oku('components', 'Duyularimiz.tsx').matchAll(/text:\s*'([^']+)'/g)].map((m) => m[1]);
        expect(sorular.length).toBeGreaterThanOrEqual(8);
        expect(sorular.filter((s) => !KLIPLER.has(slug(s)))).toEqual([]);
    });

    it('wave10 listesi gen-voices.mjs\'e kayıtlı ve her kaydın slug\'ı metninden türer', () => {
        expect(oku('scripts', 'gen-voices.mjs')).toContain('tts-phrases-wave10.json');
        const liste = JSON.parse(oku('scripts', 'tts-phrases-wave10.json')) as { text: string; slug: string }[];
        expect(liste).toHaveLength(32);
        for (const p of liste) expect(p.slug).toBe(slug(p.text));
    });
});
