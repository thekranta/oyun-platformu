import { readFileSync } from 'fs';
import { join } from 'path';
import { BOARD_RESULT_LIMITS } from './boardMode';

// supabase_migrations/add_board_results.sql kaynak değişmezleri (rewardBoard.test.ts deseni). Davranış testleri yerel
// PostgreSQL kopyasında (PGlite) koşuldu; buradakiler dosya yanlışlıkla gevşetilirse yakalar.

const oku = (ad: string) => readFileSync(join(__dirname, '..', 'supabase_migrations', ad), 'utf8');
const sql = oku('add_board_results.sql');
const rollback = oku('rollback_board_results.sql');
const dogrulama = oku('board_results_dogrulama.sql');
const yorumsuz = (s: string) => s.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n');
const blok = (ad: string) => {
    const m = sql.match(new RegExp('FUNCTION public\\.' + ad + '\\([\\s\\S]*?\\$\\$;'));
    if (!m) throw new Error(ad + ' bulunamadı');
    return m[0];
};

describe('tahta sonuç kaydı SQL: kapı ve sınırlar', () => {
    const fn = blok('teacher_save_board_result');

    it('ön koşullar: child_profiles, class_consent ve yazma koruması olmadan çalışmaz', () => {
        expect(sql).toMatch(/private\.class_row_readable\(uuid, timestamptz, text, text, uuid\)/);
        expect(sql).toMatch(/private\.child_count_for_email\(text\)/);
        expect(sql).toMatch(/trg_oyun_skorlari_before_write/);
        expect(sql).toMatch(/teacher_student_scores\(uuid, integer, boolean\)'\) IS NULL/);
    });

    it('kapı Sınıf Bahçesi ile aynı: kendi sınıfı + ücretli paket + görünür kayıt + tek çocuklu hesap; her red tek tip not_found', () => {
        expect(fn).toContain('SECURITY DEFINER');
        expect(fn).toContain('SET search_path = public');
        expect(fn).toContain('IF auth.uid() IS NULL THEN');
        expect(fn).toContain('c.teacher_id = auth.uid()');
        expect(fn).toContain('private.class_owner_is_paid(cs.class_id)');
        expect(fn).toContain('private.class_row_readable(cs.class_id, cs.accepted_at, cs.accepted_via, cs.child_email, cs.accepted_user_id)');
        expect(fn).toContain('private.child_count_for_email(v_email) > 1');
        expect((fn.match(/RAISE EXCEPTION 'not_found'/g) || []).length).toBeGreaterThanOrEqual(4);
    });

    it('çocuğun adı/yaşı/e-postası SUNUCUDAN gelir, istemci parametrelerinde yoktur; kaynak ve kaydeden sunucuda yazılır; çizim yok', () => {
        const imza = fn.slice(0, fn.indexOf('RETURNS bigint'));
        expect(imza).not.toMatch(/p_(email|name|ad|yas|child|kaynak|kaydeden)/);
        expect(fn).toContain("'kaynak', 'tahta'");
        expect(fn).toContain("'kaydeden_ogretmen', auth.uid()");
        expect(fn).toContain("'ogrenci_adi', v_name");
        expect(fn).toContain("'ogrenci_yasi', v_age");
        expect(fn).toContain("'email', v_email");
        expect(fn).not.toMatch(/cizim/);
    });

    it('girdi sınırları istemcideki BOARD_RESULT_LIMITS ile aynı', () => {
        const L = BOARD_RESULT_LIMITS;
        expect(fn).toContain(`char_length(p_oyun_turu) NOT BETWEEN 1 AND ${L.gameName}`);
        expect(fn).toContain(`p_sure NOT BETWEEN 0 AND ${L.sure}`);
        expect(fn).toContain(`p_hamle NOT BETWEEN 0 AND ${L.hamle}`);
        expect(fn).toContain(`p_hata NOT BETWEEN 0 AND ${L.hata}`);
        expect(fn).toContain(`p_correct_answers NOT BETWEEN 0 AND ${L.correct}`);
        expect(fn).toContain(`p_zorluk NOT BETWEEN 0 AND ${L.zorluk}`);
        expect(fn).toContain(`p_deneme NOT BETWEEN 0 AND ${L.deneme}`);
        expect(fn).toContain(`char_length(p_kazanim) > ${L.kazanim}`);
        expect(fn).toContain(`char_length(p_round_history) > ${L.history}`);
        expect(fn).toContain('PERFORM p_round_history::jsonb');
        expect(fn).toContain("RAISE EXCEPTION 'invalid_argument'");
    });

    it('kötüye kullanım: çift dokunuş 20 sn, çocuk başına günde 20 kayıt, kilit', () => {
        expect(fn).toContain("interval '20 seconds'");
        expect(fn).toContain("interval '24 hours'");
        expect(fn).toContain('IF v_count >= 20 THEN');
        expect(fn).toContain("RAISE EXCEPTION 'rate_limited'");
        expect(fn).toContain('pg_advisory_xact_lock');
    });

    it('tetikleyici bayrağı işlem içinde açılır ve hemen kapanır; tetikleyici bayraksız INSERT’te kaynak/kaydedeni sıfırlar, eski korumalar kalır', () => {
        expect(fn).toContain("set_config('app.minizeka_board_write', 'on', true)");
        expect(fn).toContain("set_config('app.minizeka_board_write', '', true)");
        const trg = blok('oyun_skorlari_before_write');
        expect(trg).toContain("current_setting('app.minizeka_board_write', true)");
        expect(trg).toContain('NEW.kaynak := NULL');
        expect(trg).toContain('NEW.kaydeden_ogretmen := NULL');
        expect(trg).toContain('NEW.onay_durumu := NULL');
        expect(trg).toContain("RAISE EXCEPTION 'oyun_skorlari_update_forbidden'");
    });

    it('izinler: yalnız giriş yapmış kullanıcı çağırır (anon/PUBLIC değil); sütun kısıtı; öğrenci geçmişi kaynağı döndürür', () => {
        expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.teacher_save_board_result\([\s\S]*?\) FROM PUBLIC, anon;/);
        expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.teacher_save_board_result\([\s\S]*?\) TO authenticated;/);
        expect(sql).toContain("CHECK (kaynak IS NULL OR kaynak = 'tahta')");
        expect(sql).toContain('kaydeden_ogretmen uuid REFERENCES auth.users(id) ON DELETE SET NULL');
        expect(sql).toContain('DROP FUNCTION IF EXISTS public.teacher_student_scores(uuid, integer, boolean);');
        const hist = blok('teacher_student_scores');
        expect(hist).toContain('cizim_verisi jsonb, ai_akademik text, kaynak text)');
        expect(hist).toContain('s.kaynak::text');
        expect(sql).toContain("NOTIFY pgrst, 'reload schema'");
    });
});

describe('geri alma ve doğrulama dosyaları', () => {
    it('geri alma yalnız fonksiyonu kaldırır; sütun ve satırlara dokunmaz (silme yalnız yorum satırında)', () => {
        expect(rollback).toContain('DROP FUNCTION IF EXISTS public.teacher_save_board_result(');
        expect(yorumsuz(rollback)).not.toMatch(/DROP COLUMN|DELETE FROM|UPDATE public|DROP TABLE/);
    });

    it('doğrulama salt okunurdur ve tahta satır sayısını bildirir', () => {
        expect(yorumsuz(dogrulama)).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE|GRANT|REVOKE)\b/i);
        expect(dogrulama).toContain('tahta_satir_sayisi');
    });
});
