import { emitPackageChanged, onPackageChanged, waitForTier, type OwnPackage } from './packageSync';

describe('paket değişti olayı', () => {
    it('dinleyicileri çağırır, abonelik iptali çalışır, bir dinleyicinin hatası ötekini durdurmaz', () => {
        const a = jest.fn(() => { throw new Error('bozuk dinleyici'); });
        const b = jest.fn();
        const offA = onPackageChanged(a);
        const offB = onPackageChanged(b);
        emitPackageChanged();
        expect(a).toHaveBeenCalledTimes(1);
        expect(b).toHaveBeenCalledTimes(1);
        offA();
        emitPackageChanged();
        expect(a).toHaveBeenCalledTimes(1);
        expect(b).toHaveBeenCalledTimes(2);
        offB();
        emitPackageChanged();
        expect(b).toHaveBeenCalledTimes(2);
    });
});

describe('waitForTier', () => {
    const noSleep = async () => { };

    it('paket veritabanına geçince hemen döner', async () => {
        const answers: (OwnPackage | null)[] = [{ tier: 'free', expiresAt: null }, { tier: 'free', expiresAt: null }, { tier: 'filiz', expiresAt: '2026-12-01T00:00:00Z' }];
        let i = 0;
        const fetchPackage = jest.fn(async () => answers[Math.min(i++, answers.length - 1)]);
        const result = await waitForTier('veli', 'a@b.com', 'filiz', { sleep: noSleep, fetchPackage });
        expect(result).toEqual({ tier: 'filiz', expiresAt: '2026-12-01T00:00:00Z' });
        expect(fetchPackage).toHaveBeenCalledTimes(3);
    });

    it('webhook gelmezse deneme sayısı kadar bekler ve son durumu döndürür', async () => {
        const fetchPackage = jest.fn(async () => ({ tier: 'free', expiresAt: null }));
        const sleep = jest.fn(noSleep);
        const result = await waitForTier('ogretmen', 'a@b.com', 'cinar', { tries: 4, delayMs: 10, sleep, fetchPackage });
        expect(result).toEqual({ tier: 'free', expiresAt: null });
        expect(fetchPackage).toHaveBeenCalledTimes(4);
        expect(sleep).toHaveBeenCalledTimes(3);
    });

    it('okuma hep başarısızsa null döner', async () => {
        const fetchPackage = jest.fn(async () => null);
        expect(await waitForTier('veli', 'a@b.com', 'filiz', { tries: 2, sleep: noSleep, fetchPackage })).toBeNull();
    });
});
