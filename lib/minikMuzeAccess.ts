import { VeliTier, veliTierMeetsMinimum } from './subscriptionTiers';

/**
 * Minik Müze'de tablo erişimi. Oyun kartı herkese açıktır (bkz. FREE_SHOWCASE_GAME_IDS); ücretsiz pakette
 * yalnız `free` işaretli vitrin tablosu (Mona Lisa) izlenir, diğer tablolar Tohum ve üstünü ister.
 */
export const PAID_PAINTING_TIER: VeliTier = 'tohum';

export function isPaintingOpenForTier(tier: VeliTier, painting: { free?: boolean }): boolean {
    return !!painting.free || veliTierMeetsMinimum(tier, PAID_PAINTING_TIER);
}
