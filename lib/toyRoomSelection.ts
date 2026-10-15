import { GameCatalogItem } from '../constants/gameCatalog';
import { requiredVeliTierForGame, veliTierMeetsMinimum, VeliTier } from './subscriptionTiers';

/** Stable pages: every eligible non-story/non-music game is reachable, without duplicates. */
export function roomGames(catalog: GameCatalogItem[], round: number): GameCatalogItem[] {
  const pool = catalog.filter(g => g.status !== 'story' && g.status !== 'music');
  const opening = ['yapboz', 'yaratici-cizim', 'hafiza-2', 'siralama'];
  const ordered = [...opening.flatMap(id => pool.filter(g => g.id === id)), ...pool.filter(g => !opening.includes(g.id))];
  if (!ordered.length) return [];
  return Array.from({ length: Math.min(4, ordered.length) }, (_, i) => ordered[(Math.max(0, Math.floor(round)) * 4 + i) % ordered.length]);
}

/** Paket bu oyunu açmıyor mu? Paket verilmediyse (tasarım önizlemesi) hiçbir şey kilitli değildir. */
export function isGameLocked(game: GameCatalogItem, tier: VeliTier | undefined): boolean {
  return tier !== undefined && !veliTierMeetsMinimum(tier, requiredVeliTierForGame(game));
}

/** Odadaki iki sabit oyuncağın kilit durumu: Müzik Kutusu ve Değerler Hikâyeleri (hepsi kilitliyse kilitli sayılır). */
export function pinnedLocks(catalog: GameCatalogItem[], tier: VeliTier | undefined): { musicLocked: boolean; storiesLocked: boolean } {
  const music = catalog.find(g => g.id === 'muzik-calar');
  const stories = catalog.filter(g => g.status === 'story');
  return {
    musicLocked: !!music && isGameLocked(music, tier),
    storiesLocked: stories.length > 0 && stories.every(g => isGameLocked(g, tier)),
  };
}
