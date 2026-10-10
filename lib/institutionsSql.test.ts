import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// supabase_migrations/add_institutions.sql'in güvenlik sözleşmesini statik olarak korur (canlı veritabanı gerekmez).
// Davranış testleri PGlite düzeneğinde ayrıca koşuldu; bu dosya sözleşmeyi kazara bozan düzenlemeleri yakalar.
const sql = readFileSync(join(__dirname, '../supabase_migrations/add_institutions.sql'), 'utf8');
const rollback = readFileSync(join(__dirname, '../supabase_migrations/rollback_institutions.sql'), 'utf8');

const PUBLIC_FNS = [
    'my_admin_institutions', 'institution_overview', 'institution_activity_daily',
    'institution_games_by_type', 'institution_classes', 'institution_class_children', 'my_class_institutions',
];

// RETURNS TABLE (...) gövdesini döndürür (parantez dengesiyle).
function returnsTable(fn: string): string {
    const i = sql.indexOf(`FUNCTION public.${fn}(`);
    if (i < 0) throw new Error(`${fn} bulunamadı`);
    const r = sql.indexOf('RETURNS TABLE (', i);
    let depth = 0, start = r + 'RETURNS TABLE '.length;
    for (let k = start; k < sql.length; k++) {
        if (sql[k] === '(') depth++;
        else if (sql[k] === ')') { depth--; if (depth === 0) return sql.slice(start, k + 1); }
    }
    throw new Error(`${fn} RETURNS TABLE kapanmıyor`);
}

describe('add_institutions.sql güvenlik sözleşmesi', () => {
    it.each(PUBLIC_FNS)('%s: SECURITY DEFINER + sabit search_path', (fn) => {
        const i = sql.indexOf(`FUNCTION public.${fn}(`);
        const head = sql.slice(i, sql.indexOf('AS $$', i));
        expect(head).toMatch(/SECURITY DEFINER/);
        expect(head).toMatch(/SET search_path = public, pg_temp/);
    });

    it('her herkese açık fonksiyon anon/PUBLIC\'ten geri alınır, yalnız authenticated çağırır', () => {
        for (const fn of PUBLIC_FNS) {
            expect(sql).toMatch(new RegExp(`REVOKE ALL ON FUNCTION[\\s\\S]*?public\\.${fn}\\([\\s\\S]*?FROM PUBLIC, anon;`));
            expect(sql).toMatch(new RegExp(`GRANT EXECUTE ON FUNCTION[\\s\\S]*?public\\.${fn}\\([\\s\\S]*?TO authenticated;`));
        }
    });

    it('private yardımcılar authenticated\'tan geri alınır (yalnız service_role)', () => {
        expect(sql).toMatch(/REVOKE ALL ON FUNCTION private\.institution_active[\s\S]*?FROM PUBLIC, anon, authenticated;/);
        const grant = sql.match(/GRANT EXECUTE ON FUNCTION private\.institution_active[\s\S]*?;/);
        expect(grant).not.toBeNull();
        expect(grant![0]).toMatch(/TO service_role;/);
        expect(grant![0]).not.toMatch(/authenticated/);
    });

    it('tablolar istemciye kapalı: RLS açık, politika yok, authenticated yetkisi geri alınır', () => {
        expect(sql).toMatch(/ALTER TABLE public\.institutions\s+ENABLE ROW LEVEL SECURITY/);
        expect(sql).toMatch(/ALTER TABLE public\.institution_members ENABLE ROW LEVEL SECURITY/);
        expect(sql).toMatch(/REVOKE ALL ON public\.institutions, public\.institution_members FROM PUBLIC, anon, authenticated;/);
        expect(sql).not.toMatch(/CREATE POLICY/);
        expect(sql).not.toMatch(/GRANT[^;]*\bON\s+public\.institution(s|_members)\b[^;]*TO[^;]*authenticated/);
    });

    it('yönetici fonksiyonları yönetici değilse boş döner (her biri kapıyı kontrol eder)', () => {
        for (const fn of ['institution_overview', 'institution_activity_daily', 'institution_games_by_type', 'institution_classes', 'institution_class_children']) {
            const i = sql.indexOf(`FUNCTION public.${fn}(`);
            const body = sql.slice(i, sql.indexOf('$$;', sql.indexOf('AS $$', i) + 5));
            expect(body).toMatch(/private\.is_institution_admin\(p_institution\)/);
            expect(body).toMatch(/RETURN;/);
        }
    });

    it('dönen kolonlarda e-posta / çizim / AI / veli / paket bilgisi YOK', () => {
        const bad = /email|cizim|yapay|ai_|parent|veli|paket|tier|consent|riza/i;
        for (const fn of PUBLIC_FNS) {
            const cols = returnsTable(fn);
            expect({ fn, cols: cols.match(bad)?.[0] ?? null }).toEqual({ fn, cols: null });
        }
    });

    it('skorlar sınırlanır: gelecek tarih sayılmaz, süre/doğru/yanlış kırpılır', () => {
        expect(sql).toMatch(/o\.created_at <= now\(\)/);
        expect(sql).toMatch(/least\(greatest\(coalesce\(o\.sure, 0\), 0\), 86400\)/);
        expect(sql).toMatch(/least\(greatest\(coalesce\(o\.correct_answers, 0\), 0\), 1000\)/);
    });

    it('geri alma dosyası her fonksiyonu kaldırır', () => {
        for (const fn of PUBLIC_FNS) expect(rollback).toContain(`public.${fn}(`);
        expect(rollback).toContain('private.institution_students(uuid, uuid)');
    });
});
