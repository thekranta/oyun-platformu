import type { OgretmenTier, VeliTier } from './subscriptionTiers';

/**
 * Ödeme ekranı yardımcıları (saf, test edilir). RevenueCat paketlerini bizim paket adlarımıza
 * (Tohum/Filiz/Fidan/Orman, Çınar) eşler ve süre etiketini çıkarır. Fiyat METNİ her zaman mağazadan gelir
 * (`product.priceString`: ülke para birimiyle yerelleştirilmiş), kodda fiyat tutulmaz (bkz. PRICING.md).
 *
 * ÜRÜN KİMLİĞİ KURALI (App Store Connect / Play Console): ürün kimliği paketin adını içermeli, ör.
 *   minizeka_filiz_monthly, minizeka_fidan_yearly, minizeka_cinar_monthly
 * Ekran bu adı kimlikte arar; bulamazsa mağazadaki ürün başlığını gösterir.
 */

export type PaywallKind = 'veli' | 'ogretmen';
export type PaywallTier = Exclude<VeliTier, 'free'> | Exclude<OgretmenTier, 'free'>;

/** Ekranın ihtiyaç duyduğu en küçük paket şekli (RevenueCat PurchasesPackage ile uyumlu). */
export interface PackageLike {
    identifier: string;
    packageType?: string | null;
    product: {
        identifier: string;
        title: string;
        description?: string | null;
        priceString: string;
        subscriptionPeriod?: string | null;
    };
}

const VELI_ORDER: PaywallTier[] = ['tohum', 'filiz', 'fidan', 'orman'];
const OGRETMEN_ORDER: PaywallTier[] = ['cinar', 'mese'];

export function tierOrder(kind: PaywallKind): PaywallTier[] {
    return kind === 'ogretmen' ? OGRETMEN_ORDER : VELI_ORDER;
}

/** Ürün kimliğinden paket adını bulur; Türkçe karakterli yazım da (çınar, meşe) tanınır. */
export function tierFromProductId(productId: string, kind: PaywallKind): PaywallTier | null {
    const id = productId.toLowerCase().replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ı/g, 'i');
    for (const tier of [...tierOrder(kind)].reverse()) {
        if (id.includes(tier)) return tier;
    }
    return null;
}

export type PeriodKey = 'perWeek' | 'perMonth' | 'perTwoMonths' | 'perThreeMonths' | 'perSixMonths' | 'perYear' | 'lifetime';

const PACKAGE_TYPE_PERIOD: Record<string, PeriodKey> = {
    WEEKLY: 'perWeek',
    MONTHLY: 'perMonth',
    TWO_MONTH: 'perTwoMonths',
    THREE_MONTH: 'perThreeMonths',
    SIX_MONTH: 'perSixMonths',
    ANNUAL: 'perYear',
    LIFETIME: 'lifetime',
};

/** ISO 8601 süre ("P1M", "P1Y", "P1W", "P3M") → etiket anahtarı. */
function periodFromIso(iso: string): PeriodKey | null {
    const m = iso.match(/^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?$/);
    if (!m) return null;
    const [years, months, weeks, days] = [m[1], m[2], m[3], m[4]].map((v) => (v ? parseInt(v, 10) : 0));
    if (years === 1 && !months && !weeks && !days) return 'perYear';
    if (!years && !weeks && !days) {
        if (months === 1) return 'perMonth';
        if (months === 2) return 'perTwoMonths';
        if (months === 3) return 'perThreeMonths';
        if (months === 6) return 'perSixMonths';
        if (months === 12) return 'perYear';
    }
    if (!years && !months && !days && weeks === 1) return 'perWeek';
    if (!years && !months && !weeks && days === 7) return 'perWeek';
    return null;
}

export function periodKey(pkg: PackageLike): PeriodKey | null {
    const fromType = pkg.packageType ? PACKAGE_TYPE_PERIOD[pkg.packageType] : undefined;
    if (fromType) return fromType;
    return pkg.product.subscriptionPeriod ? periodFromIso(pkg.product.subscriptionPeriod) : null;
}

const PERIOD_RANK: Record<PeriodKey, number> = { perWeek: 1, perMonth: 2, perTwoMonths: 3, perThreeMonths: 4, perSixMonths: 5, perYear: 6, lifetime: 7 };

/** Paketleri önce paket düzeyine (Tohum → Orman), sonra süreye (kısadan uzuna) göre sıralar; bilinmeyenler sona gider. */
export function sortPackages<T extends PackageLike>(packages: readonly T[], kind: PaywallKind): T[] {
    const order = tierOrder(kind);
    const rank = (p: T) => {
        const tier = tierFromProductId(p.product.identifier, kind);
        const t = tier ? order.indexOf(tier) : order.length;
        const per = periodKey(p);
        return t * 100 + (per ? PERIOD_RANK[per] : 99);
    };
    return packages.map((p, i) => ({ p, i })).sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i).map((x) => x.p);
}

/** Yinelenen abonelik mi (ömür boyu satın alma değil)? Düğme metni ve yasal not buna göre seçilir. */
export function isRecurring(pkg: PackageLike): boolean {
    return periodKey(pkg) !== 'lifetime';
}
