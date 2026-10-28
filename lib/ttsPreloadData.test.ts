/**
 * Önceden indirme tablosu (scripts/gen-tts-manifest.mjs üretir) var olan kliplere ve oyunlara işaret etmeli.
 * Bozulursa: node scripts/gen-tts-manifest.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_CATALOG } from '../constants/gameCatalog';
import { CLIPS_BY_GAME, COMMON_CLIPS } from './ttsPreloadData';

// lib/ttsAssets.ts'i require etmek 1250+ ses dosyasını yüklerdi: anahtarlar metinden okunur (gen-tts-assets.mjs ile aynı biçim).
const CLIPS = new Set(
  [...readFileSync(join(__dirname, 'ttsAssets.ts'), 'utf8').matchAll(/^\s*'([^']+)':\s*require\(/gm)].map((m) => m[1]),
);
const ROUTES = new Set(GAME_CATALOG.map((g) => g.routeKey));

describe('ttsPreloadData', () => {
  it('klip dosyaları okunabildi', () => {
    expect(CLIPS.size).toBeGreaterThan(1000);
  });

  it('ortak klipler var olan kliplerdir, tekrarsızdır ve küçük kalır (menüde ısıtılır)', () => {
    expect(COMMON_CLIPS.length).toBeGreaterThan(0);
    expect(COMMON_CLIPS.length).toBeLessThanOrEqual(20);
    expect(new Set(COMMON_CLIPS).size).toBe(COMMON_CLIPS.length);
    for (const s of COMMON_CLIPS) expect(CLIPS.has(s)).toBe(true);
    expect(COMMON_CLIPS).toEqual(expect.arrayContaining(['aferin', 'harika', 'tebrikler']));
  });

  it('her oyun anahtarı katalogdaki bir oyundur', () => {
    const unknown = Object.keys(CLIPS_BY_GAME).filter((k) => !ROUTES.has(k));
    expect(unknown).toEqual([]);
  });

  it('oyun listelerindeki her klip var olan bir kliptir; liste tekrarsız ve sınırlıdır', () => {
    const missing: string[] = [];
    for (const [game, joined] of Object.entries(CLIPS_BY_GAME)) {
      const list = joined.split('|');
      expect(list.length).toBeGreaterThan(0);
      expect(list.length).toBeLessThanOrEqual(60);
      expect(new Set(list).size).toBe(list.length);
      for (const s of list) if (!CLIPS.has(s)) missing.push(`${game}:${s}`);
    }
    expect(missing).toEqual([]);
  });

  it('ortak klipler oyun listelerinde yinelenmez', () => {
    const common = new Set(COMMON_CLIPS);
    const dup = Object.entries(CLIPS_BY_GAME).flatMap(([g, j]) => j.split('|').filter((s) => common.has(s)).map((s) => `${g}:${s}`));
    expect(dup).toEqual([]);
  });

  it('tablo büyük çoğunlukla dolu: en az 120 oyunun klip listesi var', () => {
    expect(Object.keys(CLIPS_BY_GAME).length).toBeGreaterThanOrEqual(120);
  });
});
