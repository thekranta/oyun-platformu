import { GAME_CATALOG } from '../constants/gameCatalog';
import { requiredVeliTierForGame, veliTierMeetsMinimum, VeliTier } from './subscriptionTiers';

/**
 * Bir oyun rotası (routeKey) bu paketle açık mı?
 * Katalogda olmayan rotalar (giriş/menü/sonuç ekranları) kısıtlanmaz. Kilit yalnız çocuk odasında
 * uygulanırsa "Sıradaki Günlük Oyun" gibi odayı atlayan yollar kilitli oyunu açabilir; oyunu
 * başlatan her yer bu fonksiyonla kontrol etmeli.
 */
export function isRouteOpenForTier(tier: VeliTier, routeKey: string): boolean {
    const game = GAME_CATALOG.find(g => g.routeKey === routeKey);
    return !game || veliTierMeetsMinimum(tier, requiredVeliTierForGame(game));
}
