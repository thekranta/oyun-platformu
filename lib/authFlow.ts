import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

// ============================================
// E-POSTA DOĞRULAMASI (Supabase Auth "Confirm email") için ortak yardımcılar.
//
// NEDEN: Doğrulama KAPALIYKEN biri başkasının e-postasıyla hesap açıp auth.email() üzerinden o e-postaya bağlı
// çocuk verisini (profiles/oyun_skorlari/sınıf kayıtları) okuyabilir. Doğrulama AÇIKKEN kayıt, e-postadaki
// bağlantıya tıklanana kadar oturum DÖNDÜRMEZ.
//
// SONUÇ: kayıt anında oturum yoksa profil/öğretmen satırı o an yazılamaz (RLS auth.uid()/auth.email() ister).
// Bu yüzden kayıt verisi user_metadata'da bekler ve kullanıcı İLK GİRİŞ yaptığında (ensure*FromMetadata) yazılır.
// Ayar kapalıyken bu dosyanın hiçbir yolu davranışı değiştirmez (oturum döner, kayıt eskisi gibi anında yazılır).
// ============================================

/** Doğrulama bağlantısı tıklanınca dönülecek adres (Supabase > Authentication > URL Configuration ile eşleşmeli). */
export const EMAIL_CONFIRM_REDIRECT = 'https://oyun.childhoodtech.com';

/**
 * Şifre sıfırlama bağlantısının döneceği adres (Supabase > Authentication > URL Configuration izin listesinde olmalı).
 * Marka alanına (oyun.childhoodtech.com/reset-password) geçmek için önce o adresi izin listesine ekleyin, sonra BURADAN değiştirin:
 * tek yer burasıdır (tüm girişler bunu kullanır).
 */
export const PASSWORD_RESET_REDIRECT = 'https://oyun-platformu.vercel.app/reset-password';

export const AUTH_MESSAGES = {
    notConfirmed: 'E-posta adresinizi doğrulamanız gerekiyor. Gelen kutunuzdaki (ya da spam klasöründeki) bağlantıya dokunup tekrar giriş yapın.',
    confirmSent: 'Doğrulama bağlantısını e-postanıza gönderdik. Bağlantıya dokunduktan sonra giriş yapabilirsiniz.',
    resendOk: 'Doğrulama e-postası tekrar gönderildi.',
    resendFail: 'E-posta gönderilemedi. Lütfen birkaç dakika sonra tekrar deneyin.',
} as const;

type AuthErrorLike = { message?: string; code?: string; error_code?: string } | null | undefined;

/** Giriş hatası "e-posta doğrulanmamış" mı? (Supabase: code=email_not_confirmed, message="Email not confirmed") */
export function isEmailNotConfirmed(err: AuthErrorLike): boolean {
    if (!err) return false;
    return err.code === 'email_not_confirmed' || err.error_code === 'email_not_confirmed' || /email not confirmed/i.test(err.message || '');
}

/** signUp yanıtı: kullanıcı oluştu ama oturum YOK → e-posta doğrulaması bekleniyor. */
export function needsEmailConfirmation(data: { user?: unknown; session?: unknown } | null | undefined): boolean {
    return !!data && !!data.user && !data.session;
}

/** Doğrulama e-postasını yeniden gönder. true = istek kabul edildi. */
export async function resendConfirmation(email: string): Promise<boolean> {
    try {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email.trim(),
            options: { emailRedirectTo: EMAIL_CONFIRM_REDIRECT },
        });
        return !error;
    } catch {
        return false;
    }
}

const str = (v: unknown, max: number): string | null => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/**
 * İlk girişte: profil satırı yoksa kayıt sırasında user_metadata'ya konan bilgilerden oluştur.
 * Yalnız OTURUMLU kullanıcının KENDİ e-postası için yazar (RLS: email = auth.email()). Paket alanları gönderilmez
 * (sunucu zaten 'free'ye zorlar). true = profil artık var.
 */
export async function ensureProfileFromMetadata(user: User | null | undefined): Promise<boolean> {
    try {
        const email = str(user?.email, 200)?.toLowerCase();
        if (!user || !email) return false;
        const existing = await supabase.from('profiles').select('email').eq('email', email).limit(1);
        if (!existing.error && existing.data && existing.data.length > 0) return true;

        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        const childName = str(meta.child_name, 60);
        const age = Number(meta.child_age_months);
        if (!childName || !Number.isInteger(age) || age < 24 || age > 75) return false;   // eksik/geçersiz meta: yazma

        const { error } = await supabase.from('profiles').insert([{
            user_id: user.id,
            parent_name: str(meta.parent_name, 80) ?? '',
            email,
            child_name: childName,
            child_age_months: age,
            data_consent: meta.data_consent === true,
        }]);
        return !error;
    } catch {
        return false;
    }
}

/** İlk girişte: öğretmen satırı yoksa ve kayıt "öğretmen kaydı" olarak işaretlendiyse oluştur (ücretsiz paket). */
export async function ensureTeacherFromMetadata(user: User | null | undefined): Promise<boolean> {
    try {
        if (!user) return false;
        const existing = await supabase.from('teachers').select('user_id').eq('user_id', user.id).limit(1);
        if (!existing.error && existing.data && existing.data.length > 0) return true;

        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        if (meta.teacher_signup !== true) return false;
        const name = str(meta.teacher_name, 80);
        const email = str(user.email, 200);
        if (!name || !email) return false;

        const { error } = await supabase.from('teachers').insert([{
            user_id: user.id,
            name,
            email,
            school_name: str(meta.school_name, 120),
            subscription_tier: 'free',
        }]);
        return !error;
    } catch {
        return false;
    }
}
