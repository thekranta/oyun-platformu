// Tek doğruluk kaynağı: paket (subscription) tier'ları ve bu tier'ların açtığı
// özellikler. VeliDashboard/TeacherDashboard artık dağınık 'free'/'premium'
// string karşılaştırması yerine buradan okur.

export type VeliTier = 'free' | 'tohum' | 'filiz' | 'fidan' | 'orman';
export type OgretmenTier = 'free' | 'cinar' | 'mese';

export interface VeliFeatureFlags {
    canSeeAiAnalysis: boolean;
    canDownloadDetailedPdf: boolean;
    canShareCard: boolean;
    canSeePastGameAiComment: boolean;
    maxChildProfiles: number;
}

export const VELI_TIER_FLAGS: Record<VeliTier, VeliFeatureFlags> = {
    free: { canSeeAiAnalysis: false, canDownloadDetailedPdf: false, canShareCard: false, canSeePastGameAiComment: false, maxChildProfiles: 1 },
    tohum: { canSeeAiAnalysis: false, canDownloadDetailedPdf: false, canShareCard: false, canSeePastGameAiComment: false, maxChildProfiles: 1 },
    filiz: { canSeeAiAnalysis: true, canDownloadDetailedPdf: true, canShareCard: true, canSeePastGameAiComment: true, maxChildProfiles: 1 },
    fidan: { canSeeAiAnalysis: true, canDownloadDetailedPdf: true, canShareCard: true, canSeePastGameAiComment: true, maxChildProfiles: 2 },
    orman: { canSeeAiAnalysis: true, canDownloadDetailedPdf: true, canShareCard: true, canSeePastGameAiComment: true, maxChildProfiles: Infinity },
};

export interface OgretmenFeatureFlags {
    canSeeAiAnalysis: boolean;
    maxClasses: number;
    maxStudentsPerClass: number;
}

export const OGRETMEN_TIER_FLAGS: Record<OgretmenTier, OgretmenFeatureFlags> = {
    free: { canSeeAiAnalysis: false, maxClasses: 1, maxStudentsPerClass: 10 },
    cinar: { canSeeAiAnalysis: true, maxClasses: Infinity, maxStudentsPerClass: 10 },
    mese: { canSeeAiAnalysis: true, maxClasses: Infinity, maxStudentsPerClass: Infinity },
};

function isExpired(expiresAt: string | null | undefined): boolean {
    return !!expiresAt && new Date(expiresAt).getTime() < Date.now();
}

// package_expires_at NULL ise süresiz kabul edilir (mevcut, elle atanmış
// kullanıcılar hiç kısıtlanmaz). Sadece geçmiş bir tarih varsa 'free'ye düşürülür
// — gerçek bir ödeme/webhook entegrasyonu olmadığı için bu sadece UI seviyesinde
// bir simülasyondur, DB'deki tier değeri değişmez.
export function getEffectiveVeliTier(tier: VeliTier | null | undefined, expiresAt: string | null | undefined): VeliTier {
    if (!tier) return 'free';
    if (tier !== 'free' && isExpired(expiresAt)) return 'free';
    return tier;
}

export function getEffectiveOgretmenTier(tier: OgretmenTier | null | undefined, expiresAt: string | null | undefined): OgretmenTier {
    if (!tier) return 'free';
    if (tier !== 'free' && isExpired(expiresAt)) return 'free';
    return tier;
}

export function getVeliFlags(tier: VeliTier | null | undefined): VeliFeatureFlags {
    return VELI_TIER_FLAGS[tier || 'free'];
}

export function getOgretmenFlags(tier: OgretmenTier | null | undefined): OgretmenFeatureFlags {
    return OGRETMEN_TIER_FLAGS[tier || 'free'];
}
