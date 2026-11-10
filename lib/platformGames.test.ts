import { isRouteDisabledOnPlatform, MOBILE_DISABLED_ROUTES } from './platformGames';

describe('mağaza sürümlerinde kapalı oyunlar', () => {
    it('Bunu Söyle! (çocuk sesi → üçüncü taraf yapay zekâ) mobilde kapalı, web’de açık', () => {
        expect(isRouteDisabledOnPlatform('bunu-soyle', 'android')).toBe(true);
        expect(isRouteDisabledOnPlatform('bunu-soyle', 'ios')).toBe(true);
        expect(isRouteDisabledOnPlatform('bunu-soyle', 'web')).toBe(false);
    });

    it('diğer oyunlar her platformda açık', () => {
        expect(isRouteDisabledOnPlatform('hafiza', 'android')).toBe(false);
        expect(isRouteDisabledOnPlatform('akilli-sayi-avi', 'ios')).toBe(false);
    });

    it('kapalı küme yalnız ses oyununu içerir (başka bir oyun yanlışlıkla kapanmasın)', () => {
        expect([...MOBILE_DISABLED_ROUTES]).toEqual(['bunu-soyle']);
    });
});
