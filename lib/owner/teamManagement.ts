import { supabase } from '../supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export type TeamRole = 'uzman' | 'sahip';

// signup.tsx'teki hata-mesajı ayrıştırma mantığının aynısı (tutarlı Türkçe mesajlar).
export function parseSignupError(authData: any): string {
    const msg: string = authData?.msg || authData?.error_description || authData?.message || '';
    const lower = msg.toLowerCase();
    if (lower.includes('already registered')) {
        return 'Bu e-posta zaten kayıtlı. Yeni hesap oluşturulamaz.';
    }
    if (lower.includes('invalid')) return 'Geçersiz e-posta formatı.';
    if (lower.includes('password')) return 'Şifre çok zayıf. Lütfen daha güçlü bir şifre seçin.';
    return msg || 'Hesap oluşturulamadı.';
}

export async function createTeamMember(
    role: TeamRole,
    email: string,
    password: string,
    displayName: string
): Promise<{ ok: true } | { ok: false; error: string }> {
    // 1) Yeni auth kullanıcısı -- ham REST çağrısı, owner'ın kendi oturumuna DOKUNMAZ
    //    (signup.tsx'teki desenin aynısı; supabase.auth.signUp() SDK metodu KULLANILMAZ
    //    çünkü paylaşılan client'ın local oturumunu değiştirir).
    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY || '', 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    const authData = await authRes.json();
    if (!authRes.ok) {
        return { ok: false, error: parseSignupError(authData) };
    }
    const userId = authData.id || authData.user?.id;
    if (!userId) return { ok: false, error: 'Kullanıcı ID alınamadı.' };

    // 2) admins/owners tablosuna owner'ın KENDİ oturumuyla ekle (paylaşılan client).
    const table = role === 'uzman' ? 'admins' : 'owners';
    const { error: insertError } = await supabase
        .from(table)
        .insert([{ user_id: userId, display_name: displayName.trim() }]);
    if (insertError) {
        return { ok: false, error: `Hesap oluşturuldu ama ${role} yetkisi eklenemedi: ${insertError.message}` };
    }
    return { ok: true };
}
