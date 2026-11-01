import { isRecurring, periodKey, sortPackages, tierFromProductId, type PackageLike } from './paywall';

const pkg = (productId: string, packageType?: string, subscriptionPeriod?: string): PackageLike => ({
    identifier: productId,
    packageType,
    product: { identifier: productId, title: productId, priceString: '₺0', subscriptionPeriod },
});

describe('tierFromProductId', () => {
    it('paket adını ürün kimliğinden bulur', () => {
        expect(tierFromProductId('minizeka_filiz_monthly', 'veli')).toBe('filiz');
        expect(tierFromProductId('MiniZeka.Fidan.Yearly', 'veli')).toBe('fidan');
        expect(tierFromProductId('minizeka_tohum_monthly', 'veli')).toBe('tohum');
        expect(tierFromProductId('minizeka_orman_yearly', 'veli')).toBe('orman');
    });

    it('öğretmen paketlerini Türkçe karakterli yazımla da tanır', () => {
        expect(tierFromProductId('minizeka_cinar_monthly', 'ogretmen')).toBe('cinar');
        expect(tierFromProductId('minizeka_çınar_monthly', 'ogretmen')).toBe('cinar');
        expect(tierFromProductId('minizeka_mese_yearly', 'ogretmen')).toBe('mese');
    });

    it('bilinmeyen kimlikte ve yanlış türde null döner', () => {
        expect(tierFromProductId('premium_monthly', 'veli')).toBeNull();
        expect(tierFromProductId('minizeka_cinar_monthly', 'veli')).toBeNull();
        expect(tierFromProductId('minizeka_filiz_monthly', 'ogretmen')).toBeNull();
    });
});

describe('periodKey', () => {
    it('RevenueCat paket türünü kullanır', () => {
        expect(periodKey(pkg('a', 'MONTHLY'))).toBe('perMonth');
        expect(periodKey(pkg('a', 'ANNUAL'))).toBe('perYear');
        expect(periodKey(pkg('a', 'WEEKLY'))).toBe('perWeek');
        expect(periodKey(pkg('a', 'LIFETIME'))).toBe('lifetime');
        expect(periodKey(pkg('a', 'SIX_MONTH'))).toBe('perSixMonths');
    });

    it('özel pakette ISO süreden çıkarır', () => {
        expect(periodKey(pkg('a', 'CUSTOM', 'P1M'))).toBe('perMonth');
        expect(periodKey(pkg('a', 'CUSTOM', 'P1Y'))).toBe('perYear');
        expect(periodKey(pkg('a', 'CUSTOM', 'P12M'))).toBe('perYear');
        expect(periodKey(pkg('a', 'CUSTOM', 'P1W'))).toBe('perWeek');
        expect(periodKey(pkg('a', 'CUSTOM', 'P7D'))).toBe('perWeek');
        expect(periodKey(pkg('a', 'CUSTOM', 'P3M'))).toBe('perThreeMonths');
    });

    it('süre bilinmiyorsa null', () => {
        expect(periodKey(pkg('a'))).toBeNull();
        expect(periodKey(pkg('a', 'UNKNOWN', 'P2Y'))).toBeNull();
        expect(periodKey(pkg('a', 'CUSTOM', 'bozuk'))).toBeNull();
    });
});

describe('sortPackages', () => {
    it('önce paket düzeyi, sonra süre; bilinmeyen paketler sona', () => {
        const input = [
            pkg('x_fidan_yearly', 'ANNUAL'),
            pkg('x_bilinmeyen', 'MONTHLY'),
            pkg('x_filiz_yearly', 'ANNUAL'),
            pkg('x_tohum_monthly', 'MONTHLY'),
            pkg('x_filiz_monthly', 'MONTHLY'),
        ];
        expect(sortPackages(input, 'veli').map((p) => p.product.identifier)).toEqual([
            'x_tohum_monthly', 'x_filiz_monthly', 'x_filiz_yearly', 'x_fidan_yearly', 'x_bilinmeyen',
        ]);
    });

    it('girdiyi değiştirmez ve eşitlikte özgün sırayı korur', () => {
        const input = [pkg('a_b'), pkg('a_c')];
        const out = sortPackages(input, 'veli');
        expect(out.map((p) => p.product.identifier)).toEqual(['a_b', 'a_c']);
        expect(out).not.toBe(input);
    });
});

describe('isRecurring', () => {
    it('ömür boyu satın alma yinelenen abonelik değildir', () => {
        expect(isRecurring(pkg('a', 'LIFETIME'))).toBe(false);
        expect(isRecurring(pkg('a', 'MONTHLY'))).toBe(true);
        expect(isRecurring(pkg('a'))).toBe(true);
    });
});
