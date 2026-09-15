import {
    getEffectiveOgretmenTier,
    getEffectiveVeliTier,
    getOgretmenFlags,
    getVeliFlags,
    OGRETMEN_TIER_FLAGS,
    VELI_TIER_FLAGS,
} from './subscriptionTiers';

describe('getEffectiveVeliTier', () => {
    it('tier yoksa free döner', () => {
        expect(getEffectiveVeliTier(null, null)).toBe('free');
        expect(getEffectiveVeliTier(undefined, undefined)).toBe('free');
    });

    it('package_expires_at boşsa süresiz kabul edilir', () => {
        expect(getEffectiveVeliTier('orman', null)).toBe('orman');
    });

    it('süre henüz dolmadıysa tier korunur', () => {
        const future = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
        expect(getEffectiveVeliTier('filiz', future)).toBe('filiz');
    });

    it('süre dolduysa free\'ye düşer', () => {
        const past = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString();
        expect(getEffectiveVeliTier('fidan', past)).toBe('free');
    });

    it('free tier için expires_at kontrolü hiç yapılmaz', () => {
        const past = new Date(Date.now() - 1000).toISOString();
        expect(getEffectiveVeliTier('free', past)).toBe('free');
    });
});

describe('getEffectiveOgretmenTier', () => {
    it('tier yoksa free döner', () => {
        expect(getEffectiveOgretmenTier(null, null)).toBe('free');
    });

    it('süre dolduysa free\'ye düşer', () => {
        const past = new Date(Date.now() - 1000).toISOString();
        expect(getEffectiveOgretmenTier('mese', past)).toBe('free');
    });

    it('süre dolmadıysa tier korunur', () => {
        const future = new Date(Date.now() + 1000).toISOString();
        expect(getEffectiveOgretmenTier('cinar', future)).toBe('cinar');
    });
});

describe('getVeliFlags', () => {
    it('free ve tohum hiçbir AI/PDF/paylaşım özelliğini açmaz (kritik bug fix)', () => {
        expect(getVeliFlags('free').canSeeAiAnalysis).toBe(false);
        expect(getVeliFlags('tohum').canSeeAiAnalysis).toBe(false);
        expect(getVeliFlags('tohum').canDownloadDetailedPdf).toBe(false);
        expect(getVeliFlags('tohum').canShareCard).toBe(false);
    });

    it('filiz ve üzeri tüm rapor özelliklerini açar', () => {
        for (const tier of ['filiz', 'fidan', 'orman'] as const) {
            expect(getVeliFlags(tier).canSeeAiAnalysis).toBe(true);
            expect(getVeliFlags(tier).canDownloadDetailedPdf).toBe(true);
            expect(getVeliFlags(tier).canShareCard).toBe(true);
            expect(getVeliFlags(tier).canSeePastGameAiComment).toBe(true);
        }
    });

    it('çocuk profili limiti tier arttıkça artar', () => {
        expect(getVeliFlags('tohum').maxChildProfiles).toBe(1);
        expect(getVeliFlags('fidan').maxChildProfiles).toBe(2);
        expect(getVeliFlags('orman').maxChildProfiles).toBe(Infinity);
    });

    it('bilinmeyen/eksik tier free\'ye düşer', () => {
        expect(getVeliFlags(null)).toEqual(VELI_TIER_FLAGS.free);
        expect(getVeliFlags(undefined)).toEqual(VELI_TIER_FLAGS.free);
    });
});

describe('getOgretmenFlags', () => {
    it('free tek sınıfla ve sınıf başı 10 öğrenciyle sınırlı', () => {
        expect(getOgretmenFlags('free').maxClasses).toBe(1);
        expect(getOgretmenFlags('free').maxStudentsPerClass).toBe(10);
        expect(getOgretmenFlags('free').canSeeAiAnalysis).toBe(false);
    });

    it('çınar sınırsız sınıf ama sınıf başı 10 öğrenci sınırını korur', () => {
        expect(getOgretmenFlags('cinar').maxClasses).toBe(Infinity);
        expect(getOgretmenFlags('cinar').maxStudentsPerClass).toBe(10);
        expect(getOgretmenFlags('cinar').canSeeAiAnalysis).toBe(true);
    });

    it('meşe her yönden sınırsız', () => {
        expect(getOgretmenFlags('mese').maxClasses).toBe(Infinity);
        expect(getOgretmenFlags('mese').maxStudentsPerClass).toBe(Infinity);
    });

    it('bilinmeyen/eksik tier free\'ye düşer', () => {
        expect(getOgretmenFlags(null)).toEqual(OGRETMEN_TIER_FLAGS.free);
    });
});
