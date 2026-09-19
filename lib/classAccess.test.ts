import { fetchClassGameTier } from './classAccess';

const mockRpc = jest.fn();
jest.mock('./supabase', () => ({ supabase: { rpc: (...args: unknown[]) => mockRpc(...args) } }));

describe('fetchClassGameTier', () => {
    beforeEach(() => mockRpc.mockReset());

    it('sınıf paketini döndürür', async () => {
        mockRpc.mockResolvedValue({ data: [{ tier: 'mese', expires_at: '2027-01-01T00:00:00Z' }], error: null });
        await expect(fetchClassGameTier()).resolves.toEqual({ tier: 'mese', expiresAt: '2027-01-01T00:00:00Z' });
        expect(mockRpc).toHaveBeenCalledWith('my_class_game_tier');
    });

    it('süresiz (expires_at null) paketi korur', async () => {
        mockRpc.mockResolvedValue({ data: [{ tier: 'cinar', expires_at: null }], error: null });
        await expect(fetchClassGameTier()).resolves.toEqual({ tier: 'cinar', expiresAt: null });
    });

    it('çocuk sınıfta değilse (boş sonuç) null döner', async () => {
        mockRpc.mockResolvedValue({ data: [], error: null });
        await expect(fetchClassGameTier()).resolves.toBeNull();
    });

    it('RPC hata verirse (migration çalıştırılmamış / ağ) undefined döner: çağıran önceki değeri korur, fırlatmaz', async () => {
        mockRpc.mockResolvedValue({ data: null, error: { message: 'function not found' } });
        await expect(fetchClassGameTier()).resolves.toBeUndefined();
        mockRpc.mockRejectedValue(new Error('ağ hatası'));
        await expect(fetchClassGameTier()).resolves.toBeUndefined();
    });

    it('beklenmeyen tier değerini yok sayar', async () => {
        mockRpc.mockResolvedValue({ data: [{ tier: 'orman', expires_at: null }], error: null });
        await expect(fetchClassGameTier()).resolves.toBeNull();
    });
});
