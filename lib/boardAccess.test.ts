import { loadBoardAccess } from './boardAccess';

function fakeClient(opts: { session?: { user: { id: string } } | null; row?: Record<string, unknown> | null; error?: boolean; throws?: boolean }) {
    const calls: [string, string, unknown][] = [];
    const query = {
        select: () => query,
        eq: (c: string, v: unknown) => { calls.push(['eq', c, v]); return query; },
        maybeSingle: async () => ({ data: opts.row ?? null, error: opts.error ? { message: 'hata' } : null }),
    };
    return {
        calls,
        client: {
            auth: { getSession: async () => { if (opts.throws) throw new Error('ağ'); return { data: { session: opts.session ?? null } }; } },
            from: (table: string) => { calls.push(['from', table, null]); return query; },
        },
    };
}

describe('loadBoardAccess', () => {
    it('oturum yoksa öğretmen yok', async () => {
        const { client } = fakeClient({ session: null });
        expect(await loadBoardAccess(client)).toEqual({ phase: 'no-teacher' });
    });

    it('oturum var ama teachers satırı yoksa (veli hesabı) öğretmen yok', async () => {
        const { client } = fakeClient({ session: { user: { id: 'u1' } }, row: null });
        expect(await loadBoardAccess(client)).toEqual({ phase: 'no-teacher' });
    });

    it('öğretmen satırını KENDİ kullanıcı kimliğiyle okur ve paketten oyun düzeyini çıkarır', async () => {
        const { client, calls } = fakeClient({ session: { user: { id: 'u1' } }, row: { name: 'Ayşe', subscription_tier: 'cinar', package_expires_at: null } });
        expect(await loadBoardAccess(client)).toEqual({ phase: 'ready', name: 'Ayşe', teacherTier: 'cinar', tier: 'filiz', userId: 'u1', students: true });
        expect(calls).toContainEqual(['from', 'teachers', null]);
        expect(calls).toContainEqual(['eq', 'user_id', 'u1']);
    });

    it('Meşe → Fidan düzeyi; süresi dolmuş paket ücretsiz; paket alanı boşsa ücretsiz', async () => {
        const mese = fakeClient({ session: { user: { id: 'u1' } }, row: { name: 'A', subscription_tier: 'mese', package_expires_at: null } });
        expect(await loadBoardAccess(mese.client)).toMatchObject({ phase: 'ready', tier: 'fidan' });
        const dolmus = fakeClient({ session: { user: { id: 'u1' } }, row: { name: 'A', subscription_tier: 'mese', package_expires_at: '2000-01-01T00:00:00Z' } });
        expect(await loadBoardAccess(dolmus.client)).toMatchObject({ phase: 'ready', tier: 'free' });
        const bos = fakeClient({ session: { user: { id: 'u1' } }, row: { name: 'A', subscription_tier: null, package_expires_at: null } });
        expect(await loadBoardAccess(bos.client)).toMatchObject({ phase: 'ready', teacherTier: 'free', tier: 'free' });
    });

    it('çocuk seçimi ("Sıra kimde?") yalnız geçerli sınıf paketinde açık; ücretsiz ve süresi dolmuş pakette kapalı', async () => {
        const kimlik = { user: { id: 'u1' } };
        const ac = async (tier: string | null, expires: string | null) =>
            loadBoardAccess(fakeClient({ session: kimlik, row: { name: 'A', subscription_tier: tier, package_expires_at: expires } }).client);
        expect(await ac('cinar', null)).toMatchObject({ students: true });
        expect(await ac('mese', '2999-01-01T00:00:00Z')).toMatchObject({ students: true });
        expect(await ac('free', null)).toMatchObject({ students: false });
        expect(await ac(null, null)).toMatchObject({ students: false });
        expect(await ac('cinar', '2000-01-01T00:00:00Z')).toMatchObject({ students: false });
    });

    it('veritabanı hatası ya da ağ hatasında error (öğretmen yok DEĞİL: yeniden denenebilir)', async () => {
        expect(await loadBoardAccess(fakeClient({ session: { user: { id: 'u1' } }, error: true }).client)).toEqual({ phase: 'error' });
        expect(await loadBoardAccess(fakeClient({ throws: true }).client)).toEqual({ phase: 'error' });
    });
});
