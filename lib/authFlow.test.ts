import type { User } from '@supabase/supabase-js';
import {
    EMAIL_CONFIRM_REDIRECT, ensureProfileFromMetadata, ensureTeacherFromMetadata, isEmailNotConfirmed, needsEmailConfirmation, resendConfirmation,
} from './authFlow';

// supabase istemcisi sahte: zincirleme sorgu (select→eq→limit) ve insert çağrıları izlenir.
const mockInsert = jest.fn();
const mockResend = jest.fn();
let mockExisting: { data: unknown[] | null; error: unknown } = { data: [], error: null };
const mockFrom = jest.fn((_table: string) => ({
    select: () => ({ eq: () => ({ limit: () => Promise.resolve(mockExisting) }) }),
    insert: (rows: unknown[]) => mockInsert(rows),
}));
jest.mock('./supabase', () => ({
    supabase: {
        from: (t: string) => mockFrom(t),
        auth: { resend: (a: unknown) => mockResend(a) },
    },
}));

const user = (over: Partial<User> & { user_metadata?: Record<string, unknown> } = {}): User =>
    ({ id: 'u1', email: 'Veli@Ornek.com', user_metadata: {}, app_metadata: {}, aud: 'authenticated', created_at: '', ...over }) as User;

beforeEach(() => {
    mockInsert.mockReset().mockResolvedValue({ error: null });
    mockResend.mockReset().mockResolvedValue({ error: null });
    mockFrom.mockClear();
    mockExisting = { data: [], error: null };
});

describe('isEmailNotConfirmed / needsEmailConfirmation', () => {
    it('Supabase "doğrulanmamış" hata biçimlerini tanır', () => {
        expect(isEmailNotConfirmed({ code: 'email_not_confirmed' })).toBe(true);
        expect(isEmailNotConfirmed({ error_code: 'email_not_confirmed' })).toBe(true);
        expect(isEmailNotConfirmed({ message: 'Email not confirmed' })).toBe(true);
        expect(isEmailNotConfirmed({ message: 'Invalid login credentials' })).toBe(false);
        expect(isEmailNotConfirmed(null)).toBe(false);
        expect(isEmailNotConfirmed(undefined)).toBe(false);
    });

    it('kullanıcı var + oturum yok → doğrulama bekleniyor', () => {
        expect(needsEmailConfirmation({ user: { id: 'x' }, session: null })).toBe(true);
        expect(needsEmailConfirmation({ user: { id: 'x' }, session: { access_token: 't' } })).toBe(false);   // doğrulama kapalı: eski akış
        expect(needsEmailConfirmation({ user: null, session: null })).toBe(false);
        expect(needsEmailConfirmation(null)).toBe(false);
    });
});

describe('resendConfirmation', () => {
    it('doğru türde ve yönlendirmeyle ister; başarı/başarısızlık/istisna', async () => {
        expect(await resendConfirmation('  a@b.com ')).toBe(true);
        expect(mockResend).toHaveBeenCalledWith({ type: 'signup', email: 'a@b.com', options: { emailRedirectTo: EMAIL_CONFIRM_REDIRECT } });
        mockResend.mockResolvedValue({ error: { message: 'rate limit' } });
        expect(await resendConfirmation('a@b.com')).toBe(false);
        mockResend.mockRejectedValue(new Error('network'));
        expect(await resendConfirmation('a@b.com')).toBe(false);
    });
});

describe('ensureProfileFromMetadata (ilk girişte profil)', () => {
    const meta = { parent_name: 'Ayşe', child_name: 'Ada', child_age_months: 50, data_consent: true };

    it('profil zaten varsa yazmaz', async () => {
        mockExisting = { data: [{ email: 'veli@ornek.com' }], error: null };
        expect(await ensureProfileFromMetadata(user({ user_metadata: meta }))).toBe(true);
        expect(mockInsert).not.toHaveBeenCalled();
    });

    it('profil yoksa metadata\'dan, küçük harfli e-postayla ve YALNIZ güvenli alanlarla oluşturur', async () => {
        expect(await ensureProfileFromMetadata(user({ user_metadata: meta }))).toBe(true);
        expect(mockInsert).toHaveBeenCalledTimes(1);
        const row = mockInsert.mock.calls[0][0][0];
        expect(row).toEqual({ user_id: 'u1', parent_name: 'Ayşe', email: 'veli@ornek.com', child_name: 'Ada', child_age_months: 50, data_consent: true });
        expect(row).not.toHaveProperty('subscription_tier');   // paket alanı istemciden ASLA gönderilmez
        expect(row).not.toHaveProperty('package_expires_at');
    });

    it('eksik / geçersiz metadata\'da yazmaz', async () => {
        expect(await ensureProfileFromMetadata(user({ user_metadata: {} }))).toBe(false);
        expect(await ensureProfileFromMetadata(user({ user_metadata: { child_name: 'Ada', child_age_months: 5 } }))).toBe(false);
        expect(await ensureProfileFromMetadata(user({ user_metadata: { child_name: '  ', child_age_months: 50 } }))).toBe(false);
        expect(await ensureProfileFromMetadata(user({ user_metadata: { child_name: 'Ada', child_age_months: 50.5 } }))).toBe(false);
        expect(await ensureProfileFromMetadata(null)).toBe(false);
        expect(await ensureProfileFromMetadata(user({ email: undefined }))).toBe(false);
        expect(mockInsert).not.toHaveBeenCalled();
    });

    it('onay verilmemişse data_consent false; uzun metinler kırpılır; insert hatası false döner', async () => {
        await ensureProfileFromMetadata(user({ user_metadata: { ...meta, data_consent: 'evet', child_name: 'A'.repeat(200) } }));
        const row = mockInsert.mock.calls[0][0][0];
        expect(row.data_consent).toBe(false);
        expect(row.child_name).toHaveLength(60);
        mockInsert.mockResolvedValue({ error: { message: 'rls' } });
        expect(await ensureProfileFromMetadata(user({ user_metadata: meta }))).toBe(false);
    });
});

describe('ensureTeacherFromMetadata (ilk girişte öğretmen satırı)', () => {
    const meta = { teacher_signup: true, teacher_name: 'Burcu Öğretmen', school_name: 'Minik Okul' };

    it('satır varsa yazmaz', async () => {
        mockExisting = { data: [{ user_id: 'u1' }], error: null };
        expect(await ensureTeacherFromMetadata(user({ user_metadata: meta }))).toBe(true);
        expect(mockInsert).not.toHaveBeenCalled();
    });

    it('yalnız "öğretmen kaydı" işaretliyse ve ücretsiz pakette oluşturur', async () => {
        expect(await ensureTeacherFromMetadata(user({ user_metadata: meta }))).toBe(true);
        expect(mockInsert.mock.calls[0][0][0]).toEqual({ user_id: 'u1', name: 'Burcu Öğretmen', email: 'Veli@Ornek.com', school_name: 'Minik Okul', subscription_tier: 'free' });
    });

    it('işaret yoksa (örn. bir veli hesabı) öğretmen satırı OLUŞTURMAZ; paket yükseltme denemesi yok', async () => {
        expect(await ensureTeacherFromMetadata(user({ user_metadata: { teacher_name: 'X' } }))).toBe(false);
        expect(await ensureTeacherFromMetadata(user({ user_metadata: { teacher_signup: true, teacher_name: 'X', subscription_tier: 'mese' } }))).toBe(true);
        const row = mockInsert.mock.calls[0][0][0];
        expect(row.subscription_tier).toBe('free');            // metadata'daki "mese" YOK SAYILIR
        expect(await ensureTeacherFromMetadata(null)).toBe(false);
    });
});
