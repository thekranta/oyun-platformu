/**
 * Giriş e-postası büyük/küçük harf: profiles/oyun_skorlari RLS'i `email = auth.email()` ile karşılaştırır ve
 * kayıtlar küçük harfli yazılır (app/signup.tsx). Supabase girişi harf duyarsızdır, bu yüzden 'Ayse@Gmail.com'
 * yazan (ya da klavyenin büyük harfle başlattığı) veli GİRİŞ yapar ama profilini bulamazdı: çocuk odası isimsiz +
 * ücretsiz açılır, sonuçlar RLS'e takılıp yerel kuyrukta kalır, veli panelinde profil görünmezdi.
 *
 * İki koruma: (1) useAuth.girisYap DAVRANIŞ testi (gerçek hook, sahte supabase); (2) her giriş noktasında
 * normalleştirmenin kaynak-metin korunması (düzeltmeyi geri alan kırar).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import React from 'react';
// @ts-expect-error @types/react-test-renderer kurulu değil (hooks/useStoryPreload.test.tsx ile aynı yol); aşağıdaki kullanım yeterli.
import renderer, { act } from 'react-test-renderer';

const mockSignIn = jest.fn();
const mockReset = jest.fn();
const mockEq = jest.fn();
let mockProfile: unknown = null;

jest.mock('./supabase', () => ({
    supabase: {
        auth: {
            signInWithPassword: (a: unknown) => mockSignIn(a),
            resetPasswordForEmail: (...a: unknown[]) => mockReset(...a),
        },
        from: (table: string) => ({
            select: () => ({
                eq: (col: string, val: string) => {
                    mockEq(table, col, val);
                    return { single: () => Promise.resolve({ data: mockProfile, error: null }) };
                },
            }),
        }),
    },
}));
// Gerçek authFlow (hata tanıma, sabitler) kalır; yalnız metadata'dan profil yazma kapatılır.
jest.mock('./authFlow', () => ({
    ...jest.requireActual('./authFlow'),
    ensureProfileFromMetadata: () => Promise.resolve(false),
}));
// menuHelpers oyun kataloğunu + ikon paketini çeker; girişle ilgisi yok.
jest.mock('./menuHelpers', () => ({ calculateAgeInMonths: () => null }));

import { useAuth } from '../hooks/useAuth';

const PROFIL = { child_name: 'Ayşe', child_age_months: 60, subscription_tier: 'filiz', package_expires_at: null };

type AuthApi = ReturnType<typeof useAuth>;

function mountAuth(stateEmail = '') {
    const setEmail = jest.fn();
    const args = {
        email: stateEmail,
        setEmail,
        setAd: jest.fn(),
        setYas: jest.fn(),
        setAsama: jest.fn(),
        setSubscriptionTier: jest.fn(),
        setPackageExpiresAt: jest.fn(),
        showToast: jest.fn(),
        resumeAfterInteraction: jest.fn().mockResolvedValue(undefined),
    };
    let api!: AuthApi;
    function Probe() {
        api = useAuth(args);
        return null;
    }
    act(() => { renderer.create(React.createElement(Probe)); });
    return { get: () => api, args };
}

beforeEach(() => {
    mockSignIn.mockReset();
    mockReset.mockReset().mockResolvedValue({ error: null });
    mockEq.mockReset();
    mockProfile = PROFIL;
});

describe('useAuth.girisYap: e-posta küçük harfe çevrilir', () => {
    it("'  Ayse@Gmail.COM ' → girişe, profil aramasına ve setEmail'e 'ayse@gmail.com' gider", async () => {
        mockSignIn.mockResolvedValue({ data: { user: { id: 'u1', email: 'ayse@gmail.com' } }, error: null });
        const { get, args } = mountAuth();
        await act(async () => { await get().girisYap('  Ayse@Gmail.COM ', 'sifre123'); });

        expect(mockSignIn).toHaveBeenCalledWith({ email: 'ayse@gmail.com', password: 'sifre123' });
        expect(mockEq).toHaveBeenCalledWith('profiles', 'email', 'ayse@gmail.com');
        expect(args.setEmail).toHaveBeenCalledWith('ayse@gmail.com');
        expect(args.setAd).toHaveBeenCalledWith('Ayşe');   // profil bulundu: oda isimli açılır
        expect(args.setAsama).toHaveBeenCalledWith('menu');
    });

    it('sunucu kanonik adres döndürürse profil ONUNLA aranır ve App e-postası ONA ayarlanır (RLS auth.email())', async () => {
        mockSignIn.mockResolvedValue({ data: { user: { id: 'u1', email: 'kanonik@ornek.com' } }, error: null });
        const { get, args } = mountAuth();
        await act(async () => { await get().girisYap('Yazilan@Ornek.com', 'sifre123'); });

        expect(mockSignIn).toHaveBeenCalledWith({ email: 'yazilan@ornek.com', password: 'sifre123' });
        expect(mockEq).toHaveBeenCalledWith('profiles', 'email', 'kanonik@ornek.com');
        expect(args.setEmail).toHaveBeenCalledWith('kanonik@ornek.com');
    });

    it('sunucu e-posta döndürmezse normalleştirilmiş girdiye düşer', async () => {
        mockSignIn.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null });
        const { get, args } = mountAuth();
        await act(async () => { await get().girisYap('AYSE@GMAIL.COM', 'sifre123'); });

        expect(mockEq).toHaveBeenCalledWith('profiles', 'email', 'ayse@gmail.com');
        expect(args.setEmail).toHaveBeenCalledWith('ayse@gmail.com');
    });

    it('arg gelmezse (olay nesnesi) hook state e-postası da küçültülür', async () => {
        mockSignIn.mockResolvedValue({ data: { user: { id: 'u1', email: 'ayse@gmail.com' } }, error: null });
        const { get } = mountAuth('Ayse@Gmail.com');
        await act(async () => { get().setPassword('sifre123'); });
        await act(async () => { await get().girisYap({ nativeEvent: {} }); });

        expect(mockSignIn).toHaveBeenCalledWith({ email: 'ayse@gmail.com', password: 'sifre123' });
    });

    it('şifre OLDUĞU GİBİ gider (küçültülmez, kırpılmaz)', async () => {
        mockSignIn.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@b.com' } }, error: null });
        const { get } = mountAuth();
        await act(async () => { await get().girisYap('A@B.com', 'SifreBüyük123'); });

        expect(mockSignIn).toHaveBeenCalledWith({ email: 'a@b.com', password: 'SifreBüyük123' });
    });
});

describe('useAuth.sifremiUnuttum: e-posta küçük harfe çevrilir', () => {
    it("' Ayse@Gmail.com ' → resetPasswordForEmail('ayse@gmail.com')", async () => {
        const { get } = mountAuth();
        await act(async () => { await get().sifremiUnuttum(' Ayse@Gmail.com '); });

        expect(mockReset).toHaveBeenCalledTimes(1);
        expect(mockReset.mock.calls[0][0]).toBe('ayse@gmail.com');
    });
});

// ---------------------------------------------------------------------------------------------------------
// Kaynak-metin koruması: her giriş noktası e-postayı trim().toLowerCase() ile normalleştirir.
// ---------------------------------------------------------------------------------------------------------
const oku = (yol: string) => readFileSync(join(__dirname, '..', yol), 'utf8');

describe('giriş noktalarında kaynak-metin koruması', () => {
    it('hooks/useAuth.ts: giriş + şifre sıfırlama küçültür; profil araması ve setEmail kanonik adresi kullanır', () => {
        const k = oku('hooks/useAuth.ts');
        expect(k).toContain("const loginEmail = (typeof emailArg === 'string' ? emailArg : email).trim().toLowerCase();");
        expect(k).toContain("const resetEmail = (typeof emailArg === 'string' ? emailArg : email).trim().toLowerCase();");
        expect(k).toContain('const canonicalEmail = data.user.email || loginEmail;');
        expect(k).toContain('setEmail(canonicalEmail);');
        expect(k).toContain(".eq('email', canonicalEmail)");
        // Eski hata: yazılan metinle (büyük harfli) profil arama / setEmail.
        expect(k).not.toContain('setEmail(loginEmail)');
        expect(k).not.toContain(".eq('email', loginEmail)");
    });

    it('components/WelcomeLoginNative.tsx: gönder + şifremi unuttum küçültülmüş e-posta yollar', () => {
        const k = oku('components/WelcomeLoginNative.tsx');
        expect(k).toContain('const normEmail = () => emailRef.current.trim().toLowerCase();');
        expect(k).toContain('p.onLogin(normEmail(), passwordRef.current)');
        expect(k).toContain('p.onForgot(normEmail())');
        // Ham emailRef.current.trim() doğrudan onLogin/onForgot'a verilmemeli.
        expect(k).not.toContain('p.onLogin(emailRef.current.trim()');
        expect(k).not.toContain('p.onForgot(emailRef.current.trim())');
    });

    it('components/WelcomeLogin.tsx: yalnız Native giriş ekranını yeniden dışa aktarır (normalleştirme orada)', () => {
        expect(oku('components/WelcomeLogin.tsx')).toContain("export { default } from './WelcomeLoginNative';");
    });

    it('components/WelcomeLoginNative.tsx: karşılama bölümü sabit height değil minHeight (büyük yazı tipinde kesilmez)', () => {
        const k = oku('components/WelcomeLoginNative.tsx');
        expect(k).toMatch(/hero: \{[^}]*minHeight: 96/);
        expect(k).not.toMatch(/hero: \{[^}]*\bheight: 96/);   // sabit 'height: 96' geri gelmemeli
        expect(k).toMatch(/heroHidden: \{ height: 0, minHeight: 0/);   // klavye açılınca yine 0'a iner
    });

    it('app/veli-dashboard.tsx: giriş + şifre sıfırlama küçültür; profil kanonik adresle aranır', () => {
        const k = oku('app/veli-dashboard.tsx');
        expect(k).toContain('const emailValue = email.trim().toLowerCase();');
        expect(k).toContain('await loadProfile(signIn?.user?.email || emailValue);');
        expect(k).toContain('resetPasswordForEmail(email.trim().toLowerCase(),');
        expect(k).not.toContain('await loadProfile(emailValue)');
        expect(k).not.toContain('resetPasswordForEmail(email.trim(),');
    });

    it('app/teacher-dashboard.tsx: giriş + şifre sıfırlama küçültür; öğretmen satırı HÂLÂ user_id ile okunur', () => {
        const k = oku('app/teacher-dashboard.tsx');
        // Satır sonu (LF/CRLF) ve girinti farkına dayanıklı: signInWithPassword({ email: email.trim().toLowerCase(), ...
        expect(k).toMatch(/signInWithPassword\(\{\s*email: email\.trim\(\)\.toLowerCase\(\),/);
        expect(k).not.toMatch(/signInWithPassword\(\{\s*email: email\.trim\(\),/);
        expect(k).toContain('resetPasswordForEmail(email.trim().toLowerCase(),');
        expect(k).not.toContain('resetPasswordForEmail(email.trim(),');
        // E-postaya ÇEVRİLMEZ: teachers satırları karışık harfli olabilir, RLS user_id ile çalışır.
        expect(k).toContain(".eq('user_id', authData.user.id)");
    });
});
