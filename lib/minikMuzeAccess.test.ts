import { PAINTINGS } from '../constants/minikMuze';
import { isPaintingOpenForTier, paintingTierName, sortPaintingsByTier } from './minikMuzeAccess';
import { VeliTier } from './subscriptionTiers';

const openIds = (tier: VeliTier) => PAINTINGS.filter((p) => isPaintingOpenForTier(tier, p)).map((p) => p.id);

describe('Minik Müze tablo erişimi', () => {
    it('ücretsiz pakette yalnız vitrin tablosu (Mona Lisa) açık', () => {
        expect(openIds('free')).toEqual(['mona-lisa']);
    });

    it('Tohum ve Filiz tam 6 tablo açar (Mona Lisa dahil)', () => {
        expect(openIds('tohum')).toHaveLength(6);
        expect(openIds('filiz')).toEqual(openIds('tohum'));
        expect(openIds('tohum')).toContain('mona-lisa');
    });

    it('Fidan ve Orman tüm tabloları açar', () => {
        for (const tier of ['fidan', 'orman'] as VeliTier[]) {
            expect(openIds(tier)).toHaveLength(PAINTINGS.length);
        }
    });

    it('paket yükseldikçe açık tablo sayısı azalmaz', () => {
        const tiers: VeliTier[] = ['free', 'tohum', 'filiz', 'fidan', 'orman'];
        const counts = tiers.map((t) => openIds(t).length);
        for (let i = 1; i < counts.length; i++) expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    });

    it('paket adı kilit kartında gerçek paket adıdır', () => {
        expect(paintingTierName({ tier: 'tohum' })).toBe('Tohum');
        expect(paintingTierName({ tier: 'fidan' })).toBe('Fidan');
    });

    it('galeri sırası: ücretsiz, Tohum, Fidan; kendi içinde katalog sırası korunur', () => {
        const sorted = sortPaintingsByTier(PAINTINGS);
        expect(sorted).toHaveLength(PAINTINGS.length);
        expect(sorted[0].id).toBe('mona-lisa');
        const ranks = sorted.map((p) => ({ free: 0, tohum: 1, fidan: 2 })[p.tier]);
        expect([...ranks].sort((a, b) => a - b)).toEqual(ranks);
        const tohumInCatalog = PAINTINGS.filter((p) => p.tier === 'tohum').map((p) => p.id);
        expect(sorted.filter((p) => p.tier === 'tohum').map((p) => p.id)).toEqual(tohumInCatalog);
    });
});
