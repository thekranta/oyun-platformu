import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

// Kullanıcı kararı (2026-10-24): Akıllı oyunların girişinde çocuğa "Sen başardıkça zorlaşır" (ve "oyun akıllanır", "gruplar zorlaşır") denmez.
// Bu test cümlenin ekran yazısına, seslendirme metinlerine ve klip listesine geri dönmesini engeller; ayrıca
// `const INSTRUCTION_TEXT = '...'` sabitleriyle okunan giriş cümlelerinin klibinin olduğunu doğrular (lib/girisKlipleri.test.ts bu sabitleri görmez).

const ROOT = join(__dirname, '..');
const oku = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8');

// services/speechService.ttsSlug ile AYNI kural.
const ttsSlug = (text: string) =>
  text
    .replace(/ç/g, 'c').replace(/Ç/g, 'c').replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g').replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o').replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const bilesenler = readdirSync(join(ROOT, 'components')).filter((f) => f.endsWith('.tsx'));
const YASAK = /başardıkça|basardikca|oyun akıllanır|gruplar zorlaşır/i;

describe('giriş cümlesi kuralı', () => {
  it('hiçbir bileşenin kodunda (yorum satırları hariç) yasak cümle yok', () => {
    const bulunan: string[] = [];
    for (const f of [...bilesenler.map((b) => join('components', b))]) {
      oku(f).split('\n').forEach((satir, i) => {
        if (satir.trim().startsWith('//')) return;
        if (YASAK.test(satir)) bulunan.push(`${f}:${i + 1}`);
      });
    }
    expect(bulunan).toEqual([]);
  });

  it('seslendirme metin dosyalarında yasak cümle yok', () => {
    const bulunan = readdirSync(join(ROOT, 'scripts'))
      .filter((f) => /^tts-phrases.*\.json$/.test(f))
      .filter((f) => YASAK.test(oku('scripts', f)));
    expect(bulunan).toEqual([]);
  });

  it('klip listesinde yasak cümleli klip yok', () => {
    expect(/basardikca|oyun-akillanir|gruplar-zorlasir/.test(oku('lib', 'ttsAssets.ts'))).toBe(false);
  });

  it('INSTRUCTION_TEXT sabiti olan her Akıllı oyunun giriş cümlesinin klibi var', () => {
    const keys = new Set([...oku('lib', 'ttsAssets.ts').matchAll(/^\s*'([a-z0-9-]+)'\s*:/gm)].map((m) => m[1]));
    const eksik: string[] = [];
    let sayi = 0;
    for (const f of bilesenler) {
      const m = oku('components', f).match(/const INSTRUCTION_TEXT = '([^']*)'/);
      if (!m) continue;
      sayi++;
      if (!keys.has(ttsSlug(m[1]))) eksik.push(`${f}: ${m[1]}`);
    }
    expect(sayi).toBeGreaterThanOrEqual(8);
    expect(eksik).toEqual([]);
  });
});
