import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OGRETMEN_TIER_FLAGS, OgretmenTier } from './subscriptionTiers';

// supabase_migrations/add_class_consent.sql "ücretli sınıf paketi" listesini ve sınıf başına öğrenci
// sınırını veritabanında zorlar; aynı kurallar lib/subscriptionTiers.ts OGRETMEN_TIER_FLAGS'te de durur.
// Biri değişip öbürü unutulursa (arayüz "ekle" der, veritabanı reddeder ya da tersi; ya da ücretli olmayan
// bir paket veriyi onaysız görür) bu test kırılır.
const sql = readFileSync(join(__dirname, '../supabase_migrations/add_class_consent.sql'), 'utf8');
const tiers = Object.keys(OGRETMEN_TIER_FLAGS) as OgretmenTier[];

function paidTiersInSql(fnName: string): string[] {
    const m = sql.match(new RegExp(`CREATE OR REPLACE FUNCTION\\s+${fnName}[\\s\\S]*?\\$\\$;`));
    if (!m) throw new Error(`${fnName} bulunamadı`);
    const list = m[0].match(/subscription_tier\s+IN\s*\(([^)]*)\)/);
    if (!list) throw new Error(`${fnName} içinde paket listesi bulunamadı`);
    return [...list[1].matchAll(/'(\w+)'/g)].map(x => x[1]).sort();
}

describe('add_class_consent.sql ↔ lib/subscriptionTiers.ts', () => {
    const expectedPaid = tiers.filter(t => t !== 'free').sort();

    it('class_owner_is_paid: ücretli paketler = "free" dışındaki tüm öğretmen paketleri', () => {
        expect(paidTiersInSql('private\\.class_owner_is_paid')).toEqual(expectedPaid);
    });

    it('user_is_paid_teacher (arama önizlemesi): aynı ücretli paket listesi', () => {
        expect(paidTiersInSql('private\\.user_is_paid_teacher')).toEqual(expectedPaid);
    });

    it('class_student_limit: sınırsız yalnız Meşe, diğerleri arayüzdeki sınırla aynı', () => {
        const m = sql.match(/CREATE OR REPLACE FUNCTION private\.class_student_limit[\s\S]*?\$\$;/);
        expect(m).not.toBeNull();
        const body = m![0];
        expect(body).toMatch(/subscription_tier = 'mese'[\s\S]*THEN NULL ELSE (\d+) END/);
        const capElse = Number(body.match(/THEN NULL ELSE (\d+) END/)![1]);
        for (const tier of tiers) {
            const ui = OGRETMEN_TIER_FLAGS[tier].maxStudentsPerClass;
            const sqlLimit = tier === 'mese' ? null : capElse;
            expect(sqlLimit).toBe(ui === Infinity ? null : ui);
        }
    });

    it('istemcinin eşleyeceği hata kodları SQL içinde tanımlı', () => {
        for (const code of ['class_enroll_blocked', 'class_student_limit', 'invite_not_found', 'invalid_email', 'invalid_argument']) {
            expect(sql).toContain(`'${code}'`);
        }
    });

    it('onay kolonlarını istemciye YAZDIRMAYAN izin satırı yerinde', () => {
        expect(sql).toContain('GRANT INSERT (class_id, child_email) ON public.class_students TO authenticated');
        expect(sql).toMatch(/REVOKE ALL ON public\.class_students FROM PUBLIC, anon, authenticated/);
    });

    it('ai_academic_part: SQL boşluk sınıfı, JavaScript \\s ile tanınan HER karakteri kapsar (veli notu sızmasın)', () => {
        const m = sql.match(/ws constant text := '(\[\[:space:\][^']*\]\+)'/);
        expect(m).not.toBeNull();
        // PostgreSQL [[:space:]] = boşluk, \t, \n, \v, \f, \r; geri kalanı \uXXXX ile aynen JS'e çevrilir
        const sqlWs = new RegExp(m![1].replace('[[:space:]', '[ \\t\\n\\v\\f\\r'));
        const missing: string[] = [];
        for (let cp = 0; cp <= 0xffff; cp++) {
            if (cp >= 0xd800 && cp <= 0xdfff) continue;
            const ch = String.fromCharCode(cp);
            if (/\s/.test(ch) && !sqlWs.test(ch)) missing.push('U+' + cp.toString(16).toUpperCase().padStart(4, '0'));
        }
        expect(missing).toEqual([]);
    });

    it('SQL dosyaları HAM bölünmez/görünmez boşluk karakteri içermez (SQL Editor\'a yapıştırırken bozulabilir)', () => {
        const invisible = new Set([0xa0, 0x1680, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff, ...Array.from({ length: 12 }, (_, i) => 0x2000 + i)]);
        for (const f of ['add_class_consent.sql', 'rollback_class_consent.sql', 'drop_teacher_direct_reads.sql']) {
            const text = readFileSync(join(__dirname, '../supabase_migrations', f), 'utf8');
            const bad = [...text].filter(c => invisible.has(c.codePointAt(0)!));
            expect({ file: f, raw: bad.length }).toEqual({ file: f, raw: 0 });
        }
    });

    it('drop_teacher_direct_reads.sql, bölüm 6\'da yeniden yaratılan öğretmen politikalarının TAMAMINI kaldırır', () => {
        const drop = readFileSync(join(__dirname, '../supabase_migrations/drop_teacher_direct_reads.sql'), 'utf8');
        const created = [...sql.matchAll(/CREATE POLICY "(teacher_reads_[a-z_]+)"/g)].map(x => x[1]).sort();
        const dropped = [...drop.matchAll(/^DROP POLICY IF EXISTS "([^"]+)"/gm)].map(x => x[1]).sort();
        expect(created.length).toBeGreaterThan(0);
        expect(dropped).toEqual(created);
    });
});
