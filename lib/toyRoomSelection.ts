import { GameCatalogItem } from '../constants/gameCatalog';
import { requiredVeliTierForGame, veliTierMeetsMinimum, VeliTier } from './subscriptionTiers';

/**
 * Öğeleri gruplara ORANTILI yayar: her grubun i. öğesi (i+0.5)/n anahtarıyla sıralanır, böylece bir grup
 * listenin tamamına eşit dağılır. Grup içi sıra korunur; sonuç tamamen deterministiktir.
 */
export function spreadBy<T>(items: T[], groupOf: (item: T) => string): T[] {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const key = groupOf(it);
    const list = groups.get(key);
    if (list) list.push(it); else groups.set(key, [it]);
  }
  const keyed: { it: T; pos: number; groupIdx: number; itemIdx: number }[] = [];
  let groupIdx = 0;
  for (const list of groups.values()) {
    list.forEach((it, itemIdx) => keyed.push({ it, pos: (itemIdx + 0.5) / list.length, groupIdx, itemIdx }));
    groupIdx++;
  }
  keyed.sort((a, b) => a.pos - b.pos || a.groupIdx - b.groupIdx || a.itemIdx - b.itemIdx);
  return keyed.map(k => k.it);
}

/**
 * Benzer oyunlar art arda sayfalara yığılmasın diye iki katmanlı dağıtım: önce "Akıllı" ve sıradan oyunlar
 * kendi içinde kategoriye (forestCategory) göre, sonra iki liste birbirine orantılı karıştırılır.
 */
export function interleaveByCategory(games: GameCatalogItem[]): GameCatalogItem[] {
  const byCategory = (list: GameCatalogItem[]) => spreadBy(list, g => g.forestCategory || '');
  const merged = [...byCategory(games.filter(g => g.adaptive)), ...byCategory(games.filter(g => !g.adaptive))];
  return spreadBy(merged, g => (g.adaptive ? 'adaptive' : 'regular'));
}

/** Stable pages: every eligible non-story/non-music game is reachable, without duplicates. */
export function roomGames(catalog: GameCatalogItem[], round: number): GameCatalogItem[] {
  const pool = catalog.filter(g => g.status !== 'story' && g.status !== 'music');
  const opening = ['yapboz', 'yaratici-cizim', 'hafiza-2', 'siralama'];
  const ordered = [...opening.flatMap(id => pool.filter(g => g.id === id)), ...interleaveByCategory(pool.filter(g => !opening.includes(g.id)))];
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
