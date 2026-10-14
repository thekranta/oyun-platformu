import { GameCatalogItem } from '../constants/gameCatalog';

/** Stable pages: every eligible non-story/non-music game is reachable, without duplicates. */
export function roomGames(catalog: GameCatalogItem[], round: number): GameCatalogItem[] {
  const pool = catalog.filter(g => g.status !== 'story' && g.status !== 'music');
  const opening = ['yapboz', 'yaratici-cizim', 'hafiza-2', 'siralama'];
  const ordered = [...opening.flatMap(id => pool.filter(g => g.id === id)), ...pool.filter(g => !opening.includes(g.id))];
  if (!ordered.length) return [];
  return Array.from({ length: Math.min(4, ordered.length) }, (_, i) => ordered[(Math.max(0, Math.floor(round)) * 4 + i) % ordered.length]);
}
