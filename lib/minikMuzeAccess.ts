import type { PaintingTier } from '../constants/minikMuze';
import { VeliTier, veliTierMeetsMinimum } from './subscriptionTiers';

/**
 * Minik Müze'de tablo erişimi. Oyun kartı herkese açıktır (bkz. FREE_SHOWCASE_GAME_IDS); tabloların asgari
 * paketi constants/minikMuze.ts'te `tier` alanıdır: free = vitrin (Mona Lisa), tohum = ilk 6 tablo, fidan = tümü.
 * Filiz, Tohum'un tablolarını açar; Fidan ve Orman hepsini açar.
 */
export function isPaintingOpenForTier(tier: VeliTier, painting: { tier: PaintingTier }): boolean {
    return veliTierMeetsMinimum(tier, painting.tier);
}

const TIER_NAMES: Record<PaintingTier, string> = { free: 'Ücretsiz', tohum: 'Tohum', fidan: 'Fidan' };

/** Kilit kartında gösterilecek paket adı ("Tohum" / "Fidan"). */
export function paintingTierName(painting: { tier: PaintingTier }): string {
    return TIER_NAMES[painting.tier];
}

const RANK: Record<PaintingTier, number> = { free: 0, tohum: 1, fidan: 2 };

/** Galeri sırası: açık/önce gelen paketler üstte, kendi içinde katalog sırası korunur (kararlı sıralama). */
export function sortPaintingsByTier<T extends { tier: PaintingTier }>(paintings: readonly T[]): T[] {
    return paintings.map((p, i) => ({ p, i })).sort((a, b) => RANK[a.p.tier] - RANK[b.p.tier] || a.i - b.i).map((x) => x.p);
}
