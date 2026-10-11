import { PAINTINGS } from '../constants/minikMuze';
import { isPaintingOpenForTier } from './minikMuzeAccess';
import { VeliTier } from './subscriptionTiers';

const TIERS: VeliTier[] = ['free', 'tohum', 'filiz', 'fidan', 'orman'];

describe('Minik Müze tablo erişimi', () => {
    it('ücretsiz pakette yalnız vitrin tablosu (Mona Lisa) açık', () => {
        const open = PAINTINGS.filter((p) => isPaintingOpenForTier('free', p)).map((p) => p.id);
        expect(open).toEqual(['mona-lisa']);
    });

    it('Tohum ve üstünde tüm tablolar açık', () => {
        for (const tier of TIERS.filter((t) => t !== 'free')) {
            expect(PAINTINGS.every((p) => isPaintingOpenForTier(tier, p))).toBe(true);
        }
    });

    it('vitrin tablosu her pakette açık; tek bir vitrin tablosu var', () => {
        const free = PAINTINGS.filter((p) => p.free);
        expect(free).toHaveLength(1);
        for (const tier of TIERS) expect(isPaintingOpenForTier(tier, free[0])).toBe(true);
    });
});
