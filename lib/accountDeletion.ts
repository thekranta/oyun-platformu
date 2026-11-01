import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiUrl } from './apiBase';
import { supabase } from './supabase';

/**
 * Hesap silme — istemci tarafı. Akış: parolayı yeniden doğrula (taze giriş) → /api/delete-account →
 * cihazdaki kullanıcı verisini temizle → oturumu kapat. Sunucu mantığı: api/_lib/accountDeletion.ts.
 */

export const DELETE_CONFIRM_PHRASE = 'DELETE_MY_ACCOUNT';

/** Silme sonrası cihazda KALACAK anahtarlar (kullanıcıya değil cihaza ait tercihler). */
export const KEEP_STORAGE_KEYS: readonly string[] = ['app-language'];

export type DeleteFailure = 'wrong_password' | 'reauth_required' | 'admin_account' | 'not_configured' | 'network' | 'server';
export type DeleteResult = { ok: true } | { ok: false; reason: DeleteFailure };

interface KeyValueStore {
    getAllKeys(): Promise<readonly string[]>;
    multiRemove(keys: string[]): Promise<void>;
}

/** Cihazdaki kullanıcı verisini (bekleyen oyun sonuçları, izin kaydı, önbellekler) siler; dil tercihi kalır. */
export async function clearLocalUserData(store: KeyValueStore = AsyncStorage, keep: readonly string[] = KEEP_STORAGE_KEYS): Promise<void> {
    try {
        const keys = await store.getAllKeys();
        const doomed = keys.filter((key) => !keep.includes(key));
        if (doomed.length) await store.multiRemove(doomed);
    } catch {
        // Temizlik başarısız olsa bile hesap sunucuda silindi; kalan yerel veri yeni girişte zaten kullanılmaz.
    }
}

/** Sunucu yanıtını kullanıcıya gösterilecek hata nedenine çevirir (saf; test edilir). */
export function failureFromResponse(status: number, body: { error?: string } | null): DeleteFailure {
    const code = body?.error;
    if (status === 403 && code === 'reauth_required') return 'reauth_required';
    if (status === 403 && code === 'admin_account') return 'admin_account';
    if (status === 401) return 'reauth_required';
    if (code === 'not_configured') return 'not_configured';
    return 'server';
}

export async function deleteAccount(email: string, password: string): Promise<DeleteResult> {
    // 1) Parolayı yeniden doğrula: taze bir oturum jetonu al (sunucu "son 10 dk içinde giriş" ister).
    let token: string | undefined;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) {
            return { ok: false, reason: error.status === 400 || /invalid login/i.test(error.message || '') ? 'wrong_password' : 'network' };
        }
        token = data.session?.access_token;
    } catch {
        return { ok: false, reason: 'network' };
    }
    if (!token) return { ok: false, reason: 'server' };

    // 2) Sunucuda sil.
    let response: Response;
    try {
        response = await fetch(apiUrl('/api/delete-account'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ confirm: DELETE_CONFIRM_PHRASE }),
        });
    } catch {
        return { ok: false, reason: 'network' };
    }
    if (!response.ok) {
        const body = await response.json().catch(() => null);
        return { ok: false, reason: failureFromResponse(response.status, body) };
    }

    // 3) Cihazı temizle ve oturumu kapat (hesap artık yok; yalnız yerel oturum silinir).
    await clearLocalUserData();
    try {
        await supabase.auth.signOut({ scope: 'local' });
    } catch {
        // Oturum zaten geçersiz.
    }
    return { ok: true };
}
