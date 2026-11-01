import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Hesap silme: bir kullanıcının TÜM verisini sunucuda (service_role) temizler. Mağaza kuralları
 * (Apple 5.1.1(v), Google Play Hesap Silme Politikası) ve KVKK/GDPR "silme hakkı" için.
 *
 * Sıra önemlidir: önce çocuk verisi ve dosyalar, EN SON Auth kullanıcısı silinir. Bir adım düşerse
 * Auth hesabı yerinde kalır ve kullanıcı yeniden deneyebilir (işlem tekrarlanabilir: boş silme zararsızdır).
 *
 * Neyi SİLMEZ: ai_kullanim_kayitlari (kullanıcı kimliği kopar: ON DELETE SET NULL, yalnız maliyet sayacı),
 * mağaza aboneliği (kullanıcı mağazadan iptal eder), mevzuatın gerektirdiği muhasebe kayıtları.
 */

export const DRAWING_BUCKET = 'cizimler';
const CHUNK = 100;

export interface DeletionReport {
    /** Tablo → silinen satır sayısı (bilinmiyorsa -1). */
    tables: Record<string, number>;
    /** Silinen çizim dosyası sayısı. */
    files: number;
    /** Şeması bu ortamda olmayan (atlanan) isteğe bağlı tablolar. */
    skipped: string[];
}

/** `step` hangi adımda düştüğünü söyler; `admin_account` hesabın kendi kendini silemeyeceğini belirtir. */
export class DeletionError extends Error {
    constructor(public readonly step: string, message: string) {
        super(message);
        this.name = 'DeletionError';
    }
}

type DbError = { code?: string; message?: string } | null;

function isMissingSchemaObject(error: DbError): boolean {
    if (!error) return false;
    return ['42P01', 'PGRST205', '42703', 'PGRST204'].includes(error.code || '')
        || /does not exist|could not find the (table|'[^']+' column)/i.test(error.message || '');
}

// ---------------------------------------------------------------------------
// Saf yardımcılar (test edilir)
// ---------------------------------------------------------------------------

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
    const part = jwt.split('.')[1];
    if (!part) return null;
    try {
        const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
        const parsed = JSON.parse(json);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

/**
 * Kullanıcının EN SON gerçekten kimlik doğruladığı an (Unix saniye). Supabase erişim jetonunda `amr`
 * (kimlik doğrulama yöntemleri + zamanı) bulunur ve jeton yenilense de değişmez; yoksa `iat`'a düşer.
 */
export function lastAuthenticationAt(jwt: string): number | null {
    const payload = decodeJwtPayload(jwt);
    if (!payload) return null;
    const amr = Array.isArray(payload.amr) ? payload.amr : [];
    const stamps = amr
        .map((entry) => (entry && typeof entry === 'object' ? Number((entry as { timestamp?: unknown }).timestamp) : NaN))
        .filter((n) => Number.isFinite(n) && n > 0);
    if (stamps.length) return Math.max(...stamps);
    const iat = Number(payload.iat);
    return Number.isFinite(iat) && iat > 0 ? iat : null;
}

/** Jeton, son `maxAgeSec` saniye içinde alınmış bir girişe mi dayanıyor? (Çalınmış/eski oturumla silmeyi engeller.) */
export function isRecentlyAuthenticated(jwt: string, nowSec: number, maxAgeSec = 600): boolean {
    const at = lastAuthenticationAt(jwt);
    return at !== null && nowSec - at <= maxAgeSec && at - nowSec < 60;
}

/** `cizim_verisi` (JSON metni ya da nesne) içinden depo yollarını çıkarır: imagePath ya da eski imageUrl. */
export function drawingPathsFromScore(raw: unknown): string[] {
    let value: unknown = raw;
    if (typeof value === 'string') {
        try { value = JSON.parse(value); } catch { return []; }
    }
    if (!value || typeof value !== 'object') return [];
    const record = value as Record<string, unknown>;
    const out: string[] = [];
    if (typeof record.imagePath === 'string' && record.imagePath) out.push(record.imagePath);
    if (typeof record.imageUrl === 'string') {
        const m = record.imageUrl.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/cizimler\/([^?]+)/);
        if (m) out.push(decodeURIComponent(m[1]));
    }
    return out;
}

/** Öğretmenin elle yazdığı e-postalarda büyük/küçük harf ve boşluk farkı olabilir: tam eşleşmeyi JS'te doğrular. */
export function sameEmail(a: unknown, b: string): boolean {
    return typeof a === 'string' && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** PostgREST ilike deseni için: joker olabilecek karakterleri tek karakterlik jokere çevirir (üst küme döner, sonra JS süzer). */
export function emailLikePattern(email: string): string {
    return email.replace(/[%*\\]/g, '_');
}

// ---------------------------------------------------------------------------
// Silme işlemi
// ---------------------------------------------------------------------------

function chunks<T>(items: T[], size = CHUNK): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

export async function deleteAccountData(
    admin: SupabaseClient,
    user: { id: string; email: string },
): Promise<DeletionReport> {
    const email = user.email.trim().toLowerCase();
    const report: DeletionReport = { tables: {}, files: 0, skipped: [] };

    const count = (table: string, n: number | null | undefined) => {
        report.tables[table] = (report.tables[table] ?? 0) + (typeof n === 'number' ? n : -1);
    };

    /** Zorunlu tablo: hata → işlem durur. İsteğe bağlı tablo: şema yoksa atlanır. */
    const failOrSkip = (step: string, error: DbError, optional: boolean): boolean => {
        if (!error) return false;
        if (optional && isMissingSchemaObject(error)) { report.skipped.push(step); return true; }
        throw new DeletionError(step, error.message || 'veritabanı hatası');
    };

    // 0) Platform yöneticisi/sahibi bu yoldan silinemez (destek gerekir).
    for (const table of ['admins', 'owners'] as const) {
        const { data, error } = await admin.from(table).select('user_id').eq('user_id', user.id).limit(1);
        if (failOrSkip(table, error, true)) continue;
        if (data && data.length > 0) throw new DeletionError('admin_account', 'Yönetici hesapları bu yoldan silinemez.');
    }

    // 1) Çocuk profilleri (skorlar child_id ile de bağlı olabilir).
    const childIds: string[] = [];
    {
        const { data, error } = await admin.from('child_profiles').select('id').eq('user_id', user.id);
        if (!failOrSkip('child_profiles', error, true)) {
            for (const row of data ?? []) if (row?.id) childIds.push(String(row.id));
        }
    }

    // 2) Çizim dosyaları: yalnız bu hesabın skor satırlarının başvurduğu yollar (ad-klasörü silinmez:
    //    farklı ailelerin aynı adlı çocukları aynı klasörü paylaşır).
    const paths = new Set<string>();
    const collectPaths = async (column: 'email' | 'child_id', value: string) => {
        const page = 200;
        for (let from = 0; ; from += page) {
            const { data, error } = await admin
                .from('oyun_skorlari')
                .select('cizim_verisi')
                .eq(column, value)
                .not('cizim_verisi', 'is', null)
                .range(from, from + page - 1);
            if (failOrSkip('oyun_skorlari.cizim', error, column === 'child_id')) return;
            for (const row of data ?? []) for (const p of drawingPathsFromScore(row?.cizim_verisi)) paths.add(p);
            if (!data || data.length < page) return;
        }
    };
    await collectPaths('email', email);
    for (const id of childIds) await collectPaths('child_id', id);

    for (const group of chunks([...paths])) {
        const { error } = await admin.storage.from(DRAWING_BUCKET).remove(group);
        if (error) throw new DeletionError('storage', error.message || 'dosya silinemedi');
        report.files += group.length;
    }

    // 3) Sınıf kayıtları: öğretmenlerin sınıf listelerindeki bu e-posta (ödül olayları ON DELETE CASCADE ile gider).
    {
        const { data, error } = await admin.from('class_students').select('id, child_email').ilike('child_email', emailLikePattern(email));
        if (!failOrSkip('class_students', error, true)) {
            const ids = (data ?? []).filter((r) => sameEmail(r?.child_email, email)).map((r) => String(r.id));
            for (const group of chunks(ids)) {
                const res = await admin.from('class_students').delete({ count: 'exact' }).in('id', group);
                failOrSkip('class_students', res.error, false);
                count('class_students', res.count);
            }
        }
    }
    {
        const res = await admin.from('class_blocks').delete({ count: 'exact' }).eq('child_email_lower', email);
        if (!failOrSkip('class_blocks', res.error, true)) count('class_blocks', res.count);
    }

    // 4) Oyun sonuçları.
    {
        const res = await admin.from('oyun_skorlari').delete({ count: 'exact' }).eq('email', email);
        failOrSkip('oyun_skorlari', res.error, false);
        count('oyun_skorlari', res.count);
        for (const id of childIds) {
            const byChild = await admin.from('oyun_skorlari').delete({ count: 'exact' }).eq('child_id', id);
            failOrSkip('oyun_skorlari', byChild.error, false);
            count('oyun_skorlari', byChild.count);
        }
    }

    // 5) Çocuk profilleri ve veli profili.
    {
        const res = await admin.from('child_profiles').delete({ count: 'exact' }).eq('user_id', user.id);
        if (!failOrSkip('child_profiles', res.error, true)) count('child_profiles', res.count);
    }
    {
        const byUser = await admin.from('profiles').delete({ count: 'exact' }).eq('user_id', user.id);
        failOrSkip('profiles', byUser.error, false);
        count('profiles', byUser.count);
        const byEmail = await admin.from('profiles').delete({ count: 'exact' }).eq('email', email);
        failOrSkip('profiles', byEmail.error, false);
        count('profiles', byEmail.count);
    }

    // 6) Öğretmen tarafı: sınıflar (öğrenci kayıtları ve ödül olayları zincirleme gider), engel listesi, öğretmen kaydı.
    {
        const classes = await admin.from('classes').delete({ count: 'exact' }).eq('teacher_id', user.id);
        if (!failOrSkip('classes', classes.error, true)) count('classes', classes.count);
        const blocks = await admin.from('class_blocks').delete({ count: 'exact' }).eq('teacher_id', user.id);
        if (!failOrSkip('class_blocks', blocks.error, true)) count('class_blocks', blocks.count);
        const teacher = await admin.from('teachers').delete({ count: 'exact' }).eq('user_id', user.id);
        if (!failOrSkip('teachers', teacher.error, true)) count('teachers', teacher.count);
        const members = await admin.from('institution_members').delete({ count: 'exact' }).eq('user_id', user.id);
        if (!failOrSkip('institution_members', members.error, true)) count('institution_members', members.count);
    }

    // 7) En son: Auth hesabı.
    const { error: authError } = await admin.auth.admin.deleteUser(user.id);
    if (authError) throw new DeletionError('auth', authError.message || 'hesap silinemedi');

    return report;
}
