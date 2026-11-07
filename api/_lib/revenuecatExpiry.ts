/**
 * RevenueCat olaylarından paket bitiş zamanı (saf işlevler; api/revenuecat-webhook.ts kullanır, test edilir).
 *
 * Neden gerekli: otomatik yenilenen aboneliklerde RevenueCat `expiration_at_ms` gönderir. Yenilenmeyen (süreli) satın
 * almalarda (iOS "non-renewing subscription", tek seferlik ürün) bitiş zamanı YOKTUR ve RevenueCat erişimi süresiz sayar.
 * Webhook bu durumda bitişi ürün kimliğindeki süreden hesaplar; süreyi belirleyemezse erişim VERMEZ
 * (aksi halde 1 aylık bir ödeme sınırsız erişime dönüşürdü).
 *
 * ÜRÜN KİMLİĞİ KURALI (bkz. lib/paywall.ts): ..._<paket>_<süre>, süre = monthly | yearly | 1m | 3m | 6m | 12m | lifetime.
 */

export type GrantExpiry =
    | { kind: 'at'; expiresAt: string }
    | { kind: 'lifetime' }
    | { kind: 'unknown' };

const MONTH_WORDS: Record<string, number> = { monthly: 1, quarterly: 3, semiannual: 6, yearly: 12, annual: 12, annually: 12 };

/** Ürün kimliğinden süre (ay): "x_filiz_3m" → 3, "x_orman_yearly" → 12, "x_tohum_monthly" → 1; bilinmiyorsa null. */
export function monthsFromProductId(productId: unknown): number | null {
    if (typeof productId !== 'string') return null;
    const id = productId.toLowerCase();
    const parts = id.split(/[^a-z0-9]+/).filter(Boolean);
    for (const part of parts) {
        if (part in MONTH_WORDS) return MONTH_WORDS[part];
        const m = part.match(/^(\d{1,2})(m|mo|month|months)$/);
        if (m) return parseInt(m[1], 10);
        const y = part.match(/^(\d{1,2})(y|yr|year|years)$/);
        if (y) return parseInt(y[1], 10) * 12;
    }
    return null;
}

export function isLifetimeProduct(productId: unknown): boolean {
    return typeof productId === 'string' && /(^|[^a-z])lifetime([^a-z]|$)/i.test(productId);
}

/** Aynı takvim gününe `months` ay ekler (lib/owner/packageAssignment.ts computeExpiryDate ile aynı mantık, UTC). */
export function addMonths(from: Date, months: number): Date {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, from.getUTCDate(), from.getUTCHours(), from.getUTCMinutes(), from.getUTCSeconds()));
    return d;
}

interface EventLike {
    expiration_at_ms?: number | null;
    purchased_at_ms?: number | null;
    product_id?: string | null;
}

/** Erişim veren bir olay için bitiş zamanı. */
export function resolveGrantExpiry(event: EventLike): GrantExpiry {
    if (typeof event.expiration_at_ms === 'number' && event.expiration_at_ms > 0) {
        return { kind: 'at', expiresAt: new Date(event.expiration_at_ms).toISOString() };
    }
    if (isLifetimeProduct(event.product_id)) return { kind: 'lifetime' };
    const months = monthsFromProductId(event.product_id);
    const purchasedAt = typeof event.purchased_at_ms === 'number' && event.purchased_at_ms > 0 ? new Date(event.purchased_at_ms) : null;
    if (months && purchasedAt) return { kind: 'at', expiresAt: addMonths(purchasedAt, months).toISOString() };
    return { kind: 'unknown' };
}

/** Aynı pakette zaten daha uzun süre varsa (ör. web'den alınmış) kısaltmayan bitiş zamanı. */
export function keepLongerExpiry(existing: string | null | undefined, incoming: string | null): string | null {
    if (incoming === null) return null; // süresiz her zaman en uzun
    if (!existing) return incoming;
    return Date.parse(existing) > Date.parse(incoming) ? existing : incoming;
}

const TIER_RANK: Record<string, number> = { free: 0, tohum: 1, filiz: 2, fidan: 3, orman: 4, cinar: 1, mese: 2 };

/**
 * Gelen (düşük) mağaza paketi, hesapta hâlâ geçerli olan DAHA YÜKSEK bir paketi ezmesin diye.
 * Örn. web'den Fidan almış, ayrıca mağazada Tohum'u yenileyen kullanıcı Fidan'dan Tohum'a düşürülmemeli.
 * Mevcut paket süresiz (bitiş yok) ya da bitişi gelecekte ise ve sırası yeni paketten büyükse true.
 * (Tablo başına çağrılır: veli ve öğretmen paketleri ayrı tablolarda, karıştırılmaz.)
 */
export function wouldDowngradeActivePackage(
    existingTier: unknown,
    existingExpiresAt: unknown,
    newTier: string,
    now: Date = new Date(),
): boolean {
    if (typeof existingTier !== 'string') return false;
    const oldRank = TIER_RANK[existingTier] ?? 0;
    const newRank = TIER_RANK[newTier] ?? 0;
    if (oldRank <= newRank) return false;
    if (existingExpiresAt === null || existingExpiresAt === undefined || existingExpiresAt === '') return true;
    const t = new Date(existingExpiresAt as string).getTime();
    return Number.isFinite(t) && t > now.getTime();
}
