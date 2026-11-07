import { addMonths, isLifetimeProduct, keepLongerExpiry, monthsFromProductId, resolveGrantExpiry } from './revenuecatExpiry';

describe('monthsFromProductId', () => {
    it('süreyi ürün kimliğinden okur', () => {
        expect(monthsFromProductId('minizeka_tohum_monthly')).toBe(1);
        expect(monthsFromProductId('minizeka_filiz_3m')).toBe(3);
        expect(monthsFromProductId('minizeka.fidan.6mo')).toBe(6);
        expect(monthsFromProductId('minizeka_orman_yearly')).toBe(12);
        expect(monthsFromProductId('minizeka_orman_annual')).toBe(12);
        expect(monthsFromProductId('minizeka_orman_12month')).toBe(12);
        expect(monthsFromProductId('minizeka_orman_1y')).toBe(12);
    });

    it('süre yoksa ya da anlamsızsa null', () => {
        expect(monthsFromProductId('minizeka_filiz')).toBeNull();
        expect(monthsFromProductId('')).toBeNull();
        expect(monthsFromProductId(undefined)).toBeNull();
        expect(monthsFromProductId(42)).toBeNull();
    });
});

describe('resolveGrantExpiry', () => {
    const now = Date.UTC(2026, 10, 1, 9, 30, 0);

    it('yenilenen abonelikte RevenueCat bitişini kullanır', () => {
        const r = resolveGrantExpiry({ expiration_at_ms: Date.UTC(2026, 11, 1), purchased_at_ms: now, product_id: 'minizeka_filiz_3m' });
        expect(r).toEqual({ kind: 'at', expiresAt: '2026-12-01T00:00:00.000Z' });
    });

    it('yenilenmeyen (bitişsiz) satın almada süreyi ürün kimliğinden hesaplar', () => {
        const r = resolveGrantExpiry({ expiration_at_ms: null, purchased_at_ms: now, product_id: 'minizeka_filiz_3m' });
        expect(r).toEqual({ kind: 'at', expiresAt: '2027-02-01T09:30:00.000Z' });
    });

    it('süre belirlenemezse erişim vermez (süresiz erişime dönüşmez)', () => {
        expect(resolveGrantExpiry({ expiration_at_ms: null, purchased_at_ms: now, product_id: 'minizeka_filiz' })).toEqual({ kind: 'unknown' });
        expect(resolveGrantExpiry({ expiration_at_ms: null, purchased_at_ms: null, product_id: 'minizeka_filiz_3m' })).toEqual({ kind: 'unknown' });
        expect(resolveGrantExpiry({})).toEqual({ kind: 'unknown' });
    });

    it('ömür boyu ürün açıkça süresizdir', () => {
        expect(isLifetimeProduct('minizeka_orman_lifetime')).toBe(true);
        expect(isLifetimeProduct('minizeka_orman_yearly')).toBe(false);
        expect(resolveGrantExpiry({ expiration_at_ms: null, purchased_at_ms: now, product_id: 'minizeka_orman_lifetime' })).toEqual({ kind: 'lifetime' });
    });
});

describe('addMonths', () => {
    it('yıl sonunu aşar ve gün korunur', () => {
        expect(addMonths(new Date(Date.UTC(2026, 10, 15, 0, 0, 0)), 3).toISOString()).toBe('2027-02-15T00:00:00.000Z');
        expect(addMonths(new Date(Date.UTC(2026, 0, 31, 0, 0, 0)), 12).toISOString()).toBe('2027-01-31T00:00:00.000Z');
    });
});

describe('keepLongerExpiry', () => {
    it('daha uzun mevcut süreyi kısaltmaz, süresiz her zaman kazanır', () => {
        expect(keepLongerExpiry('2027-06-01T00:00:00.000Z', '2026-12-01T00:00:00.000Z')).toBe('2027-06-01T00:00:00.000Z');
        expect(keepLongerExpiry('2026-12-01T00:00:00.000Z', '2027-06-01T00:00:00.000Z')).toBe('2027-06-01T00:00:00.000Z');
        expect(keepLongerExpiry(null, '2026-12-01T00:00:00.000Z')).toBe('2026-12-01T00:00:00.000Z');
        expect(keepLongerExpiry('2027-06-01T00:00:00.000Z', null)).toBeNull();
    });
});

import { wouldDowngradeActivePackage } from './revenuecatExpiry';

describe('wouldDowngradeActivePackage', () => {
    const now = new Date('2026-11-08T00:00:00Z');
    it('geçerli yüksek paketi düşük mağaza paketi ezmez', () => {
        expect(wouldDowngradeActivePackage('fidan', '2027-01-01T00:00:00Z', 'tohum', now)).toBe(true);
        expect(wouldDowngradeActivePackage('orman', null, 'filiz', now)).toBe(true);
        expect(wouldDowngradeActivePackage('mese', '2027-01-01T00:00:00Z', 'cinar', now)).toBe(true);
    });
    it('süresi dolmuş yüksek paket ezilebilir', () => {
        expect(wouldDowngradeActivePackage('fidan', '2026-10-01T00:00:00Z', 'tohum', now)).toBe(false);
    });
    it('aynı ya da daha yüksek yeni paket serbest; ücretsiz ve bilinmeyen güvenli', () => {
        expect(wouldDowngradeActivePackage('tohum', '2027-01-01T00:00:00Z', 'tohum', now)).toBe(false);
        expect(wouldDowngradeActivePackage('tohum', '2027-01-01T00:00:00Z', 'fidan', now)).toBe(false);
        expect(wouldDowngradeActivePackage('free', null, 'tohum', now)).toBe(false);
        expect(wouldDowngradeActivePackage(undefined, null, 'tohum', now)).toBe(false);
    });
});
