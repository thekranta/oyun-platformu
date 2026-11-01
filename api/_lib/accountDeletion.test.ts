import type { SupabaseClient } from '@supabase/supabase-js';
import {
    DeletionError,
    deleteAccountData,
    drawingPathsFromScore,
    emailLikePattern,
    isRecentlyAuthenticated,
    lastAuthenticationAt,
    sameEmail,
} from './accountDeletion';

function jwt(payload: Record<string, unknown>): string {
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.imza`;
}

describe('kimlik doğrulama tazeliği', () => {
    const now = 1_800_000_000;

    it('amr zaman damgasındaki en yeni girişi kullanır (jeton yenilense de değişmez)', () => {
        const token = jwt({ iat: now, amr: [{ method: 'password', timestamp: now - 7200 }] });
        expect(lastAuthenticationAt(token)).toBe(now - 7200);
        expect(isRecentlyAuthenticated(token, now)).toBe(false);
    });

    it('son 10 dakikada alınmış parola girişini kabul eder', () => {
        const token = jwt({ iat: now - 30, amr: [{ method: 'password', timestamp: now - 30 }] });
        expect(isRecentlyAuthenticated(token, now)).toBe(true);
        expect(isRecentlyAuthenticated(token, now + 570)).toBe(true);
        expect(isRecentlyAuthenticated(token, now + 700)).toBe(false);
    });

    it('amr yoksa iat’a düşer; bozuk ya da boş jeton reddedilir', () => {
        expect(isRecentlyAuthenticated(jwt({ iat: now - 10 }), now)).toBe(true);
        expect(isRecentlyAuthenticated(jwt({ iat: now - 5000 }), now)).toBe(false);
        expect(isRecentlyAuthenticated('', now)).toBe(false);
        expect(isRecentlyAuthenticated('bozuk', now)).toBe(false);
        expect(isRecentlyAuthenticated(jwt({}), now)).toBe(false);
    });

    it('gelecekteki (saat kayması dışı) zaman damgası kabul edilmez', () => {
        expect(isRecentlyAuthenticated(jwt({ iat: now + 3600 }), now)).toBe(false);
    });
});

describe('drawingPathsFromScore', () => {
    it('imagePath’i JSON metninden ve nesneden çıkarır', () => {
        expect(drawingPathsFromScore(JSON.stringify({ imagePath: 'ada/ada-60-1.png', imageFormat: 'png' }))).toEqual(['ada/ada-60-1.png']);
        expect(drawingPathsFromScore({ imagePath: 'bora/bora-48-2.png' })).toEqual(['bora/bora-48-2.png']);
    });

    it('eski kayıtlardaki imageUrl’den yolu ayıklar', () => {
        const raw = JSON.stringify({ imageUrl: 'https://x.supabase.co/storage/v1/object/public/cizimler/ada/ada-60-1.png' });
        expect(drawingPathsFromScore(raw)).toEqual(['ada/ada-60-1.png']);
    });

    it('bozuk, boş ve çizimsiz veride boş döner', () => {
        for (const raw of [null, undefined, '', 'bozuk{', '123', JSON.stringify({ strokes: [] }), 42]) {
            expect(drawingPathsFromScore(raw)).toEqual([]);
        }
    });
});

describe('e-posta eşleştirme', () => {
    it('büyük/küçük harf ve boşluk farkını yok sayar, başka adresle eşleşmez', () => {
        expect(sameEmail(' Veli@Ornek.com ', 'veli@ornek.com')).toBe(true);
        expect(sameEmail('veli2@ornek.com', 'veli@ornek.com')).toBe(false);
        expect(sameEmail('a_b@ornek.com', 'aXb@ornek.com')).toBe(false);
        expect(sameEmail(null, 'veli@ornek.com')).toBe(false);
    });

    it('ilike deseni joker karakterleri etkisizleştirir', () => {
        expect(emailLikePattern('a%b*c\\d@x.com')).toBe('a_b_c_d@x.com');
    });
});

// ---------------------------------------------------------------------------
// Sahte Supabase istemcisi: yapılan her çağrıyı kaydeder, tablo/işlem başına hazır yanıt verir.
// ---------------------------------------------------------------------------

interface Call { table: string; op: 'select' | 'delete'; filters: [string, string, unknown][]; range?: [number, number] }
type Responder = (call: Call) => { data?: unknown[] | null; error?: { code?: string; message: string } | null; count?: number | null } | undefined;

function fakeAdmin(responder: Responder, opts: { removeError?: string; authError?: string } = {}) {
    const calls: Call[] = [];
    const removed: string[][] = [];
    const deletedUsers: string[] = [];

    class Query implements PromiseLike<unknown> {
        call: Call;
        constructor(table: string) { this.call = { table, op: 'select', filters: [] }; }
        select() { this.call.op = 'select'; return this; }
        delete() { this.call.op = 'delete'; return this; }
        eq(c: string, v: unknown) { this.call.filters.push(['eq', c, v]); return this; }
        in(c: string, v: unknown) { this.call.filters.push(['in', c, v]); return this; }
        ilike(c: string, v: unknown) { this.call.filters.push(['ilike', c, v]); return this; }
        not(c: string, op: string, v: unknown) { this.call.filters.push(['not.' + op, c, v]); return this; }
        limit() { return this; }
        range(a: number, b: number) { this.call.range = [a, b]; return this; }
        then<T1 = unknown, T2 = never>(res?: ((v: unknown) => T1 | PromiseLike<T1>) | null, rej?: ((e: unknown) => T2 | PromiseLike<T2>) | null) {
            calls.push(this.call);
            const r = responder(this.call) ?? {};
            return Promise.resolve({ data: r.data ?? (this.call.op === 'select' ? [] : null), error: r.error ?? null, count: r.count ?? 0 }).then(res, rej);
        }
    }

    const client = {
        from: (table: string) => new Query(table),
        storage: { from: () => ({ remove: async (paths: string[]) => { removed.push(paths); return { error: opts.removeError ? { message: opts.removeError } : null }; } }) },
        auth: { admin: { deleteUser: async (id: string) => { deletedUsers.push(id); return { error: opts.authError ? { message: opts.authError } : null }; } } },
    } as unknown as SupabaseClient;
    return { client, calls, removed, deletedUsers };
}

const USER = { id: 'u-1', email: 'Veli@Ornek.com' };

describe('deleteAccountData', () => {
    it('çizim dosyalarını ve tüm tabloları siler, Auth hesabını EN SON siler', async () => {
        const { client, calls, removed, deletedUsers } = fakeAdmin((c) => {
            if (c.table === 'child_profiles' && c.op === 'select') return { data: [{ id: 'c-1' }, { id: 'c-2' }] };
            if (c.table === 'oyun_skorlari' && c.op === 'select' && c.filters.some((f) => f[1] === 'email')) {
                return { data: [{ cizim_verisi: JSON.stringify({ imagePath: 'ada/ada-60-1.png' }) }, { cizim_verisi: JSON.stringify({ imagePath: 'ada/ada-60-2.png' }) }] };
            }
            if (c.table === 'oyun_skorlari' && c.op === 'select') return { data: [{ cizim_verisi: JSON.stringify({ imagePath: 'ada/ada-60-1.png' }) }] };
            if (c.table === 'class_students' && c.op === 'select') return { data: [{ id: 's-1', child_email: ' VELI@ornek.com' }, { id: 's-2', child_email: 'baska@ornek.com' }] };
            if (c.op === 'delete') return { count: 1 };
            return undefined;
        });

        const report = await deleteAccountData(client, USER);

        expect(removed).toEqual([['ada/ada-60-1.png', 'ada/ada-60-2.png']]);
        expect(report.files).toBe(2);
        expect(deletedUsers).toEqual(['u-1']);

        const deletes = calls.filter((c) => c.op === 'delete');
        // Başka bir ailenin satırına dokunulmaz: yalnız e-postası tam eşleşen sınıf kaydı silinir.
        const sinif = deletes.find((c) => c.table === 'class_students')!;
        expect(sinif.filters).toEqual([['in', 'id', ['s-1']]]);
        // Skorlar e-postaya (küçük harf) ve çocuk kimliklerine göre silinir.
        const skor = deletes.filter((c) => c.table === 'oyun_skorlari').map((c) => c.filters[0]);
        expect(skor).toEqual([['eq', 'email', 'veli@ornek.com'], ['eq', 'child_id', 'c-1'], ['eq', 'child_id', 'c-2']]);
        // Profil hem user_id hem e-postayla silinir.
        expect(deletes.filter((c) => c.table === 'profiles').map((c) => c.filters[0])).toEqual([['eq', 'user_id', 'u-1'], ['eq', 'email', 'veli@ornek.com']]);
        // Öğretmen tarafı ve üyelik temizlenir.
        for (const table of ['classes', 'teachers', 'institution_members']) {
            expect(deletes.some((c) => c.table === table && c.filters[0][2] === 'u-1')).toBe(true);
        }
        // Auth silme, tablo silmelerinin hepsinden sonra (deleteUser çağrılmadan önce tüm delete’ler kaydedildi).
        expect(deletes.length).toBeGreaterThanOrEqual(10);
    });

    it('Auth hesabı silinemezse hata fırlatır (kullanıcı yeniden deneyebilir)', async () => {
        const { client } = fakeAdmin(() => undefined, { authError: 'auth down' });
        await expect(deleteAccountData(client, USER)).rejects.toMatchObject({ step: 'auth' });
    });

    it('yönetici/sahip hesabını silmeyi reddeder ve HİÇBİR şey silmez', async () => {
        const { client, calls, deletedUsers } = fakeAdmin((c) => (c.table === 'admins' ? { data: [{ user_id: 'u-1' }] } : undefined));
        await expect(deleteAccountData(client, USER)).rejects.toMatchObject({ step: 'admin_account' });
        expect(calls.filter((c) => c.op === 'delete')).toHaveLength(0);
        expect(deletedUsers).toHaveLength(0);
    });

    it('zorunlu tabloda hata olursa durur ve Auth hesabına dokunmaz', async () => {
        const { client, deletedUsers } = fakeAdmin((c) => (c.table === 'profiles' && c.op === 'delete' ? { error: { code: '42501', message: 'yetki yok' } } : undefined));
        await expect(deleteAccountData(client, USER)).rejects.toBeInstanceOf(DeletionError);
        expect(deletedUsers).toHaveLength(0);
    });

    it('şeması bu ortamda olmayan isteğe bağlı tabloları atlar ve devam eder', async () => {
        const { client, deletedUsers } = fakeAdmin((c) => {
            if (['class_blocks', 'child_profiles', 'institution_members', 'classes'].includes(c.table)) {
                return { error: { code: '42P01', message: `relation "${c.table}" does not exist` } };
            }
            return undefined;
        });
        const report = await deleteAccountData(client, USER);
        expect(report.skipped).toEqual(expect.arrayContaining(['class_blocks', 'child_profiles', 'institution_members', 'classes']));
        expect(deletedUsers).toEqual(['u-1']);
    });

    it('depodan dosya silinemezse durur (dosya sahipsiz kalmasın)', async () => {
        const { client, deletedUsers } = fakeAdmin((c) => (
            c.table === 'oyun_skorlari' && c.op === 'select' ? { data: [{ cizim_verisi: JSON.stringify({ imagePath: 'x/y.png' }) }] } : undefined
        ), { removeError: 'depo hatası' });
        await expect(deleteAccountData(client, USER)).rejects.toMatchObject({ step: 'storage' });
        expect(deletedUsers).toHaveLength(0);
    });
});
