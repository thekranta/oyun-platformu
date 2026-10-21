import { readFileSync } from 'fs';
import { join } from 'path';
import { ALL_SET_PROMPTS, buildRound, SETS, setIndexFor } from './akilliSiniflandir';

// services/speechService.ttsSlug ile AYNI kural (o modül Supabase/expo-av yüklediği için test burada kopyalar).
const ttsSlug = (text: string) =>
  text
    .replace(/ç/g, 'c').replace(/Ç/g, 'c').replace(/ş/g, 's').replace(/Ş/g, 's')
    .replace(/ğ/g, 'g').replace(/Ğ/g, 'g').replace(/ü/g, 'u').replace(/Ü/g, 'u')
    .replace(/ö/g, 'o').replace(/Ö/g, 'o').replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Deterministik sözde-rastgele (mulberry32).
const seeded = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

describe('Akıllı Sınıflandır', () => {
  it('4 set var; her sette iki grup, grup başına en az 6 nesne, nesneler tekil ve kategorileri geçerli', () => {
    expect(SETS).toHaveLength(4);
    SETS.forEach((set) => {
      expect(set.cats).toHaveLength(2);
      expect(set.cats[0].key).not.toBe(set.cats[1].key);
      const keys = new Set(set.cats.map((c) => c.key));
      set.items.forEach((i) => expect(keys.has(i.cat)).toBe(true));
      set.cats.forEach((c) => expect(set.items.filter((i) => i.cat === c.key).length).toBeGreaterThanOrEqual(6));
      expect(new Set(set.items.map((i) => i.emoji)).size).toBe(set.items.length);
    });
  });

  it('REGRESYON (#58): sepet emblem emojileri nesne havuzunda YOK (çocuk "aynı simgeyi bul" kısayoluyla çözemez)', () => {
    SETS.forEach((set) => {
      const pool = new Set(set.items.map((i) => i.emoji));
      set.cats.forEach((c) => {
        expect(c.emblem.length).toBeGreaterThanOrEqual(1);
        expect(c.emblem.length).toBeLessThanOrEqual(3);
        c.emblem.forEach((e) => expect(pool.has(e)).toBe(false));
      });
    });
  });

  it('iki sepetin zemin ve çerçeve renkleri birbirinden farklı (yazısız ayırt edilebilsin)', () => {
    SETS.forEach((set) => {
      expect(set.cats[0].bg).not.toBe(set.cats[1].bg);
      expect(set.cats[0].border).not.toBe(set.cats[1].border);
    });
  });

  it('meyve/sebze setinde domates, biber ve şeftali yok (elma ile karışıyordu / tuhaf emoji)', () => {
    const emojis = SETS[1].items.map((i) => i.emoji);
    ['🍅', '🫑', '🍑'].forEach((e) => expect(emojis).not.toContain(e));
  });

  it('oyun en kolay gruptan (hayvan/yiyecek) başlar; zorluk 4 ve 5 en soyut sette kalır', () => {
    expect(setIndexFor(1)).toBe(0);
    expect(SETS[setIndexFor(1)].id).toBe('hayvan-yiyecek');
    expect([1, 2, 3, 4, 5].map(setIndexFor)).toEqual([0, 1, 2, 3, 3]);
  });

  it('sesli sorular 110 karakteri aşmaz, rakam içermez, tekildir', () => {
    expect(ALL_SET_PROMPTS).toHaveLength(4);
    ALL_SET_PROMPTS.forEach((t) => { expect(t.length).toBeLessThanOrEqual(110); expect(/\d/.test(t)).toBe(false); });
    expect(new Set(ALL_SET_PROMPTS).size).toBe(4);
  });

  it('her sesli sorunun hazır klibi kayıt haritasında var (klibi olmayan metin yabancı sese düşer)', () => {
    const registry = readFileSync(join(__dirname, '..', 'lib', 'ttsAssets.ts'), 'utf8');
    const keys = new Set([...registry.matchAll(/^\s*'([a-z0-9-]+)'\s*:/gm)].map((m) => m[1]));
    ALL_SET_PROMPTS.forEach((t) => expect(keys.has(ttsSlug(t))).toBe(true));
  });

  it.each([1, 2, 3, 4, 5])('zorluk %i: tur doğru üretilir, aynı nesne art arda gelmez, iki grup eşit sıklıkta', (diff) => {
    const rng = seeded(diff * 17);
    const set = SETS[setIndexFor(diff)];
    let prev: string | undefined;
    const counts: Record<string, number> = { [set.cats[0].key]: 0, [set.cats[1].key]: 0 };
    const N = 2000;
    for (let i = 0; i < N; i++) {
      const r = buildRound(diff, prev, rng);
      const item = set.items.find((it) => it.emoji === r.emoji)!;
      expect(item.cat).toBe(r.answer);
      expect(r.setIndex).toBe(setIndexFor(diff));
      if (prev) expect(r.emoji).not.toBe(prev);
      counts[r.answer]++;
      prev = r.emoji;
    }
    Object.values(counts).forEach((c) => { expect(c / N).toBeGreaterThan(0.45); expect(c / N).toBeLessThan(0.55); });
  });
});
