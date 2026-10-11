import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// supabase_migrations/add_teacher_drawings.sql'in güvenlik sözleşmesi (statik). Davranış testleri PGlite'ta ayrıca koşuldu.
const root = join(__dirname, '..');
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const sql = read('supabase_migrations/add_teacher_drawings.sql');

describe('add_teacher_drawings.sql sözleşmesi', () => {
    it('depo politikası yalnız authenticated, yalnız cizimler kovası ve öğretmen kontrolüne bağlı', () => {
        const p = sql.match(/CREATE POLICY "teacher_read_cizimler"[\s\S]*?;/)![0];
        expect(p).toMatch(/FOR SELECT TO authenticated/);
        expect(p).toMatch(/bucket_id = 'cizimler'/);
        expect(p).toMatch(/private\.teacher_can_read_drawing\(name\)/);
    });

    it('öğretmen okuma kararı: kendi sınıfı + okunabilir kayıt + tek çocuk + sahiplik', () => {
        const fn = sql.match(/FUNCTION private\.teacher_can_read_drawing[\s\S]*?\$\$;/)![0];
        expect(fn).toMatch(/c\.teacher_id = auth\.uid\(\)/);
        expect(fn).toMatch(/private\.class_row_readable/);
        expect(fn).toMatch(/private\.child_count_for_email\(e\.em\) <= 1/);
        expect(fn).toMatch(/private\.drawing_owned_by\(p_name, e\.em\)/);
        expect(fn).toMatch(/s\.child_id = cp\.child_id/);
    });

    it('sahiplik: yükleyen hesap = velinin hesabı; sahipsiz yükleme kapalı kalır', () => {
        const fn = sql.match(/FUNCTION private\.drawing_owned_by[\s\S]*?\$\$;/)![0];
        expect(fn).toMatch(/owner_id/);
        expect(fn).toMatch(/pr\.user_id::text/);
        expect(fn).toMatch(/pr\.user_id IS NOT NULL/);
    });

    it('yol çözümleyici ".." ve aşırı uzun yolları reddeder', () => {
        const fn = sql.match(/FUNCTION private\.drawing_path_of[\s\S]*?\$\$;/)![0];
        expect(fn).toMatch(/position\('\.\.' IN path\) > 0/);
        expect(fn).toMatch(/length\(path\) > 300/);
    });

    it('drawing_owned_by authenticated\'a VERİLMEZ (yol↔e-posta eşleşmesi sızmasın)', () => {
        const grants = [...sql.matchAll(/GRANT EXECUTE ON FUNCTION[\s\S]*?;/g)].map((m) => m[0]);
        const toAuth = grants.filter((g) => /TO authenticated/.test(g));
        expect(toAuth.length).toBeGreaterThan(0);
        for (const g of toAuth) expect(g).not.toMatch(/drawing_owned_by/);
    });

    it('liste RPC\'si yalnız yol/tarih/oyun döndürür (ham veri, base64, e-posta yok) ve anon\'dan geri alınır', () => {
        const head = sql.match(/CREATE FUNCTION public\.teacher_student_drawings[\s\S]*?LANGUAGE/)![0];
        expect(head).toMatch(/RETURNS TABLE \(score_id bigint, created_at timestamptz, oyun_turu text, image_path text\)/);
        expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.teacher_student_drawings\(uuid, integer\) FROM PUBLIC, anon;/);
        expect(sql).toMatch(/LIMIT least\(greatest\(coalesce\(p_limit, 12\), 1\), 40\)/);
    });

    it('geri alma dosyası her şeyi kaldırır', () => {
        const rb = read('supabase_migrations/rollback_teacher_drawings.sql');
        for (const s of ['teacher_read_cizimler', 'teacher_student_drawings', 'teacher_can_read_drawing', 'drawing_owned_by', 'drawing_path_of']) {
            expect(rb).toContain(s);
        }
    });
});

describe('kurum yöneticisi çizim görmez', () => {
    it('kurum paneli kodunda ve SQL\'inde çizim/depo erişimi yok', () => {
        const files = [
            'components/InstitutionDashboard.tsx', 'lib/institutionApi.ts', 'lib/institutionStats.ts', 'lib/institutionDemo.ts', 'app/kurum.tsx',
        ];
        for (const f of files) {
            expect({ f, hit: /cizim_verisi|cizimler|imagePath|drawing|storage\.from/i.test(read(f)) }).toEqual({ f, hit: false });
        }
        const inst = read('supabase_migrations/add_institutions.sql').replace(/--.*$/gm, '');
        expect(/cizim_verisi|storage\.objects/i.test(inst)).toBe(false);
    });
});
