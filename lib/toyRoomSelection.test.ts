import { GAME_CATALOG } from '../constants/gameCatalog';
import { isGameLocked, pinnedLocks, roomGames, spreadBy } from './toyRoomSelection';

test('four rotating slots exclude pinned music and stories and reach all remaining games', () => {
  const seen = new Set<string>();
  for (let round = 0; round < GAME_CATALOG.length; round++) {
    const games = roomGames(GAME_CATALOG, round);
    expect(games).toHaveLength(4);
    expect(new Set(games.map(g => g.id)).size).toBe(4);
    games.forEach(g => { expect(['story', 'music']).not.toContain(g.status); seen.add(g.id); });
  }
  expect([...seen].sort()).toEqual(GAME_CATALOG.filter(g => !['story', 'music'].includes(g.status)).map(g => g.id).sort());
});
test('empty and small eligible pools are safe and stable on return', () => {
  expect(roomGames([], 0)).toEqual([]);
  const pool = GAME_CATALOG.filter(g => g.status !== 'story' && g.status !== 'music').slice(0, 2);
  expect(roomGames(pool, 12)).toHaveLength(2);
  expect(roomGames(GAME_CATALOG, 3)).toEqual(roomGames(GAME_CATALOG, 3));
});

test('pinned toys: lock badge follows the package (music = Fidan, stories = Filiz)', () => {
  const expected: Record<string, { musicLocked: boolean; storiesLocked: boolean }> = {
    free: { musicLocked: true, storiesLocked: true },
    tohum: { musicLocked: true, storiesLocked: true },
    filiz: { musicLocked: true, storiesLocked: false },
    fidan: { musicLocked: false, storiesLocked: false },
    orman: { musicLocked: false, storiesLocked: false },
  };
  for (const [tier, want] of Object.entries(expected)) {
    expect({ tier, ...pinnedLocks(GAME_CATALOG, tier as never) }).toEqual({ tier, ...want });
  }
  // paket verilmediyse (tasarım önizlemesi) kilit yok
  expect(pinnedLocks(GAME_CATALOG, undefined)).toEqual({ musicLocked: false, storiesLocked: false });
  expect(pinnedLocks([], 'free')).toEqual({ musicLocked: false, storiesLocked: false });
  const story = GAME_CATALOG.find(g => g.status === 'story')!;
  expect(isGameLocked(story, 'tohum')).toBe(true);
  expect(isGameLocked(story, 'filiz')).toBe(false);
});

test('pages mix categories: no page piles up similar games (max 2 per category, max 1 adaptive)', () => {
  for (const tier of ['free', 'tohum', 'filiz', 'fidan', 'orman'] as const) {
    const open = GAME_CATALOG.filter(g => !isGameLocked(g, tier) && g.status !== 'story' && g.status !== 'music');
    const pages = Math.ceil(open.length / 4);
    for (let round = 1; round < pages; round++) {   // 0. sayfa sabit açılış oyunlarıdır
      const page = roomGames(open, round);
      const perCategory: Record<string, number> = {};
      page.forEach(g => { perCategory[g.forestCategory] = (perCategory[g.forestCategory] || 0) + 1; });
      expect({ tier, round, kategori: Math.max(...Object.values(perCategory)) <= 2 }).toEqual({ tier, round, kategori: true });
      expect({ tier, round, akilli: page.filter(g => g.adaptive).length <= 1 }).toEqual({ tier, round, akilli: true });
    }
  }
});

test('spreadBy keeps in-group order and spreads groups proportionally and deterministically', () => {
  const items = ['a1', 'a2', 'a3', 'a4', 'b1', 'b2'];
  const out = spreadBy(items, s => s[0]);
  expect([...out].sort()).toEqual([...items].sort());
  expect(out.filter(s => s[0] === 'a')).toEqual(['a1', 'a2', 'a3', 'a4']);
  expect(out.filter(s => s[0] === 'b')).toEqual(['b1', 'b2']);
  expect(out.slice(0, 3).some(s => s[0] === 'b')).toBe(true);   // b'ler sona yığılmaz
  expect(spreadBy(items, s => s[0])).toEqual(out);
  expect(spreadBy([], () => 'x')).toEqual([]);
});
