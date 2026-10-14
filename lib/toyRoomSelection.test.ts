import { GAME_CATALOG } from '../constants/gameCatalog';
import { roomGames } from './toyRoomSelection';

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
