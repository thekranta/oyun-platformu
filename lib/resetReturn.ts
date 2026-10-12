// Şifre sıfırlama bağlantısı "reset-password" sayfasında biter; kurum yöneticisi gibi ayrı bir girişten gelen kullanıcı
// işlem sonunda ana ekrana değil KENDİ girişine dönmelidir. Sıfırlama adresi (Supabase yönlendirme izin listesi)
// DEĞİŞTİRİLMEDEN çalışsın diye dönüş yolu bağlantıya eklenmez; e-postayı isteyen tarayıcıda küçük bir işaret saklanır.

const KEY = 'password-reset-return';
const ALLOWED = ['/', '/kurum', '/teacher-dashboard', '/veli-dashboard', '/admin', '/owner-dashboard'];

export interface MiniStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

function defaultStorage(): MiniStorage | null {
    try {
        if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
    } catch { /* gizli pencere / engelli depolama */ }
    return null;
}

/** Sıfırlama e-postası istenirken çağrılır: işlem bitince hangi girişe dönüleceğini hatırlar. */
export function rememberResetReturn(path: string, storage: MiniStorage | null = defaultStorage()): void {
    if (!storage || !ALLOWED.includes(path)) return;
    try { storage.setItem(KEY, path); } catch { /* sessizce geç */ }
}

/** reset-password sayfası bitince çağrılır: kayıtlı (izin verilen) yolu döndürür ve siler; yoksa '/'. */
export function takeResetReturn(storage: MiniStorage | null = defaultStorage()): string {
    if (!storage) return '/';
    try {
        const v = storage.getItem(KEY);
        storage.removeItem(KEY);
        return v && ALLOWED.includes(v) ? v : '/';
    } catch {
        return '/';
    }
}
