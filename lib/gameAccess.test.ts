import { GAME_CATALOG } from '../constants/gameCatalog';
import { createDailyGamePlan } from './menuHelpers';
import { isRouteOpenForTier } from './gameAccess';
import { requiredVeliTierForGame, veliTierMeetsMinimum, VeliTier } from './subscriptionTiers';

const TIERS: VeliTier[] = ['free', 'tohum', 'filiz', 'fidan', 'orman'];

describe('isRouteOpenForTier', () => {
    it('katalogdaki her rota için paket kuralıyla birebir aynı sonucu verir', () => {
        for (const tier of TIERS) {
            for (const g of GAME_CATALOG) {
                expect(isRouteOpenForTier(tier, g.routeKey)).toBe(veliTierMeetsMinimum(tier, requiredVeliTierForGame(g)));
            }
        }
    });

    it('katalogda olmayan rotalar (giriş/menü/sonuç ekranları) kısıtlanmaz', () => {
        expect(isRouteOpenForTier('free', 'menu')).toBe(true);
        expect(isRouteOpenForTier('free', 'sonuc')).toBe(true);
    });

    it('ücretsiz çocuk için günlük planın kilitli çekirdek oyunları reddedilir (Sıradaki Günlük Oyun sızıntısı)', () => {
        // createDailyGamePlan yalnız 'core' oyunlardan seçer; bunların çoğu artık Tohum ister.
        const coreRoutes = GAME_CATALOG.filter(g => g.status === 'core').map(g => g.routeKey);
        const openForFree = coreRoutes.filter(r => isRouteOpenForTier('free', r));
        expect(openForFree.sort()).toEqual(['eksik-sayi-bul', 'siralama']);
        for (const route of ['hafiza', 'gruplama', 'mutfak-dedektifi', 'miktar-karsilastirma', 'sayi-komsulari']) {
            expect(isRouteOpenForTier('free', route)).toBe(false);
            expect(isRouteOpenForTier('tohum', route)).toBe(true);
        }
        // Plan her zaman çekirdek oyunlardan gelir; index.tsx onu isRouteOpenForTier ile süzer.
        const plan = createDailyGamePlan(48, '2026-09-19');
        expect(plan.every(r => coreRoutes.includes(r))).toBe(true);
    });
});
