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
    // Çınar = "Sınıf Paketi": childhoodtech.com'da "Tek bir sınıf için, 10 çocuğa
    // kadar profil" olarak satılıyor — yani sınırsız sınıf değil, TEK sınıf + o
    // sınıfta 10 öğrenci sınırı. maxClasses:Infinity bu vaadi bozup sınırsız sayıda
    // 10'luk sınıf açılmasına izin veriyordu.
    cinar: { canSeeAiAnalysis: true, maxClasses: 1, maxStudentsPerClass: 10 },
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

// --- Oyun erişimi: paket sırası ve oyun kataloğundan asgari paket türetme ---
// childhoodtech.com paket karşılaştırması: Tohum = 100+ oyuna tam erişim;
// Filiz = + tüm "Akıllı" (adaptive) oyunlar + tüm etkileşimli değer hikayeleri;
// Fidan = + 40+ özel beste şarkı; Orman = + erken erişim (henüz kod tarafında
// karşılığı yok, bu yüzden burada işlenmiyor).
const VELI_TIER_ORDER: VeliTier[] = ['free', 'tohum', 'filiz', 'fidan', 'orman'];

export function veliTierMeetsMinimum(tier: VeliTier | null | undefined, minimum: VeliTier): boolean {
    const rank = VELI_TIER_ORDER.indexOf(tier || 'free');
    const minRank = VELI_TIER_ORDER.indexOf(minimum);
    return rank >= 0 && rank >= minRank;
}

// Sınıf paketi -> oyun erişimi karşılığı: Çınar "tüm oyun/hikaye kütüphanesi" = Filiz düzeyi
// (Akıllı + değer hikayeleri), Meşe = Fidan düzeyi (+ beste şarkılar). Orman'ın "erken erişim"i
// henüz kodda yok, bu yüzden sınıf paketi Orman'a çıkmaz. Yalnız OYUN kilidini açar; veli paneli
// özellikleri (AI analiz/PDF/paylaşım) velinin kendi paketine bağlı kalır.
const CLASS_TIER_GAME_LEVEL: Record<OgretmenTier, VeliTier> = { free: 'free', cinar: 'filiz', mese: 'fidan' };

/** Çocuğun kendi paketi ile sınıfının paketinden gelen oyun erişimini birleştirir (yüksek olan geçerli). */
export function combineGameTier(own: VeliTier, classTier: OgretmenTier | null | undefined): VeliTier {
    const fromClass = CLASS_TIER_GAME_LEVEL[classTier || 'free'];
    return VELI_TIER_ORDER.indexOf(fromClass) > VELI_TIER_ORDER.indexOf(own) ? fromClass : own;
}

// Ücretsiz hesabın (subscription_tier='free') oynayabildiği başlangıç seti: 10 oyun, farklı alanlardan
// (bulmaca, çizim, bellek, ritim, matematik ×2, harf, duygu, hareket/müzik, örüntü). Geri kalan tüm
// sıradan oyunlar Tohum ister ("100+ oyuna tam erişim"). Çocuk odası ilk açılışta
// TOY_ROOM_FIRST_GAMES'i sabit gösterir ve her oda grubunda en az bir açık oyun olmalı — bu
// kısıtlar lib/freeTier.test.ts ile korunur; seti değiştirirken testi çalıştırın.
export const FREE_GAME_IDS: ReadonlySet<string> = new Set([
    'yapboz', 'yaratici-cizim', 'hafiza-2', 'davul-ustasi', 'siralama',
    'eksik-sayi-bul', 'ilk-harf', 'duygu-yuzleri', 'muzik-durunca-don', 'diziyi-tamamla-3',
]);

/** Bir oyun kaydının (constants/gameCatalog.ts) gerektirdiği asgari veli paketini döndürür. */
export function requiredVeliTierForGame(game: { id: string; adaptive?: boolean; status: string }): VeliTier {
    if (game.status === 'music') return 'fidan';
    if (game.adaptive || game.status === 'story') return 'filiz';
    if (FREE_GAME_IDS.has(game.id)) return 'free';
    return 'tohum';
}
