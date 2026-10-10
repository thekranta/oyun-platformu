import { InstitutionApiError, createInstitutionSource, fetchAdminInstitutions, fetchMyClassInstitutions } from './institutionApi';

// Gerçek veri yolu (RPC) sahte supabase ile sınanır: doğru fonksiyon adı + parametre adları, tip dönüşümü,
// SQL kurulu değilken ve ağ hatasında davranış.
const mockRpc = jest.fn();
jest.mock('./supabase', () => ({ supabase: { rpc: (...a: unknown[]) => mockRpc(...a) } }));

beforeEach(() => mockRpc.mockReset());

describe('fetchAdminInstitutions', () => {
    it('yönetici olunan kurumları ayrıştırır (bigint string → sayı)', async () => {
        mockRpc.mockResolvedValue({ data: [{ institution_id: 'i1', name: 'Minik', expires_at: null, teacher_count: '3', class_count: '5' }], error: null });
        const r = await fetchAdminInstitutions();
        expect(mockRpc).toHaveBeenCalledWith('my_admin_institutions', undefined);
        expect(r).toEqual([{ id: 'i1', name: 'Minik', expiresAt: null, teacherCount: 3, classCount: 5 }]);
    });

    it('yönetici değilse boş liste (panel gösterilmez)', async () => {
        mockRpc.mockResolvedValue({ data: [], error: null });
        expect(await fetchAdminInstitutions()).toEqual([]);
    });

    it('SQL kurulu değilken / ağ hatasında undefined (öğretmen paneli etkilenmez)', async () => {
        mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } });
        expect(await fetchAdminInstitutions()).toBeUndefined();
        mockRpc.mockRejectedValue(new Error('network'));
        expect(await fetchAdminInstitutions()).toBeUndefined();
    });
});

describe('createInstitutionSource', () => {
    it('her çağrı doğru fonksiyonu ve parametre adlarını kullanır', async () => {
        mockRpc.mockResolvedValue({ data: [], error: null });
        const s = createInstitutionSource('inst-1');
        expect(s.isDemo).toBe(false);
        await s.overview(30);
        await s.daily(7);
        await s.gamesByType(7);
        await s.classes(30);
        await s.classChildren('class-9', 7);
        expect(mockRpc.mock.calls).toEqual([
            ['institution_overview', { p_institution: 'inst-1', p_days: 30 }],
            ['institution_activity_daily', { p_institution: 'inst-1', p_days: 7 }],
            ['institution_games_by_type', { p_institution: 'inst-1', p_days: 7 }],
            ['institution_classes', { p_institution: 'inst-1', p_days: 30 }],
            ['institution_class_children', { p_institution: 'inst-1', p_days: 7, p_class_id: 'class-9' }],
        ]);
    });

    it('özet boş dönerse null; satırlar tipe çevrilir', async () => {
        const s = createInstitutionSource('i');
        mockRpc.mockResolvedValue({ data: [], error: null });
        expect(await s.overview(7)).toBeNull();
        mockRpc.mockResolvedValue({ data: [{ student_id: 'a', child_name: 'Ada K.', child_age_months: 50, hidden: false, game_count: '4', correct_total: '10', error_total: '2', last_played_at: '2026-10-09T10:00:00Z' }], error: null });
        const kids = await s.classChildren('c', 7);
        expect(kids[0]).toMatchObject({ id: 'a', name: 'Ada K.', ageMonths: 50, hidden: false, gameCount: 4, correctTotal: 10, errorTotal: 2 });
    });

    it('SQL kurulu değilse not_installed, başka hatada failed fırlatır', async () => {
        const s = createInstitutionSource('i');
        mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'x' } });
        await expect(s.classes(7)).rejects.toMatchObject({ code: 'not_installed' });
        mockRpc.mockResolvedValue({ data: null, error: { code: '500', message: 'boom' } });
        await expect(s.classes(7)).rejects.toBeInstanceOf(InstitutionApiError);
        mockRpc.mockResolvedValue({ data: null, error: { code: '500', message: 'boom' } });
        await expect(s.classes(7)).rejects.toMatchObject({ code: 'failed' });
        mockRpc.mockRejectedValue(new Error('network'));
        await expect(s.daily(7)).rejects.toMatchObject({ code: 'failed' });
    });
});

describe('fetchMyClassInstitutions (veli bildirimi)', () => {
    it('davet id → kurum adı sözlüğü', async () => {
        mockRpc.mockResolvedValue({ data: [{ invite_id: 'a', institution_name: 'Minik Adımlar' }], error: null });
        expect(await fetchMyClassInstitutions()).toEqual({ a: 'Minik Adımlar' });
    });

    it('hata/kurulu değil → boş nesne (davet kartı bozulmaz)', async () => {
        mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'x' } });
        expect(await fetchMyClassInstitutions()).toEqual({});
        mockRpc.mockRejectedValue(new Error('network'));
        expect(await fetchMyClassInstitutions()).toEqual({});
    });
});
