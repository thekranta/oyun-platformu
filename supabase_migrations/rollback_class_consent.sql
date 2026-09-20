-- ============================================================================
-- ACİL GERİ ALMA: add_class_consent.sql
-- ============================================================================
-- DİKKAT: Bu dosya sınıf erişimi açığını YENİDEN AÇAR (giriş yapmış herkes sınıf açıp e-posta ekleyerek
-- o hesabın çocuk verisini okuyabilir hâle döner). YALNIZ yeni sürüm canlıda bir şeyi bozduysa ve
-- düzeltme hazırlanırken geçici olarak kullanın.
--
-- ASLA fix_teacher_auth.sql / fix_teacher_profiles_pii_exposure.sql dosyalarını baştan çalıştırarak
-- geri almaya ÇALIŞMAYIN: fix_teacher_auth.sql'in 0. adımı tüm öğretmen, sınıf ve sınıf öğrencisi
-- verisini SİLER.
--
-- NE KALDIRILIR / GERİ GELİR (davranış):
--   * KALKAN: yeni tetikleyiciler (class_students_before_insert, teachers e-posta sabitleme), yeni
--     fonksiyonlar (veli davetleri, öğretmen listesi/skorları, yardımcılar), e-posta biçim kısıtı ve
--     yinelenen-kayıt dizini.
--   * GERİ GELİR: iki eski geniş okuma politikası ve eski arama fonksiyonu. Eski istemci yine çalışır.
--     Politikalar "TO authenticated" olarak kurulur (eskiden herkese açıktı): anon'un class_students
--     izni olmadığından, herkese açık politika anon isteklerinde boş küme yerine HATA verirdi;
--     giriş yapmış kullanıcılar için davranış aynıdır.
--
-- NE KORUNUR (durum): accepted_at / accepted_via / accepted_user_id kolonları ve kısıtları ile
-- class_blocks tablosu SİLİNMEZ; hiçbir sınıf/öğrenci verisi ve hiçbir veli kararı (onay, ret/engel)
-- kaybolmaz. Böylece add_class_consent.sql'i sonradan yeniden çalıştırmak kolonların varlığını görüp
-- geri doldurmayı ATLAR: bekleyen kayıtlar "onaylı" sayılmaz, veli engelleri geçerli kalır. (Kolonlar
-- silinseydi yeniden uygulama her kaydı 'legacy' yapar, bekleyen ve açığın kendisiyle eklenmiş kayıtlara
-- da kalıcı erişim verirdi.) idx_oyun_skorlari_lower_email de KALIR (yalnız performans dizini; kaldırmak
-- yeniden kurulurken tablo yazmalarını bekletirdi).
--   * Tablo izinleri ÇOK DAR kalır (SELECT, DELETE ve INSERT(class_id, child_email)); geniş "ALL" izni
--     geri VERİLMEZ, çünkü kolonlar duruyorken öğretmen kendi kaydını UPDATE ile "onaylı" yapabilirdi.
--     Eski istemci bu üç işlemden fazlasını kullanmaz. (Eski Supabase varsayılanı anon'a da ALL veriyordu;
--     anon hiçbir satır göremediği için geri verilmez.)
--   * Geri alma SÜRESİNCE eklenen kayıtlarda onay kolonları NULL kalır (tetikleyici yok): yeniden
--     uygulandığında bunlar BEKLEYEN olur — ücretli öğretmenin kayıtları dahil (güvenli taraf; veli
--     onaylar ya da öğretmen silip yeniden ekler).
--   * Aynı e-posta aynı sınıfa iki kez eklendiyse (eski istemci bunu engellemez) yeniden uygulama
--     durur ve grupları listeler: her grupta ONAYLI satırı tutun (silerseniz veli onayı kaybolur).
--   * Veli engelleri (class_blocks) geri alma süresince UYGULANMAZ (tetikleyici yok); yeniden
--     uygulanınca geçerli olur.
--   * Öğretmen e-postaları geri alma süresince SABİTLENMEZ (öğretmen kendi teachers.email'ini
--     değiştirebilir); yeniden uygulama sapmış e-postaları oturum e-postasına bir kez eşitler.
--   * add_class_consent.sql'i YENİDEN uyguladıktan sonra, daha önce drop_teacher_direct_reads.sql'i
--     çalıştırdıysanız onu TEKRAR çalıştırın: bu dosya eski geniş okuma politikalarını yeniden yaratır.
--
-- Tek seferde çalıştırın (tek işlem gibi davranır). Tekrar çalıştırılabilir.
-- ============================================================================

-- 1) Yeni tetikleyiciler
DROP TRIGGER IF EXISTS trg_teachers_pin_identity ON public.teachers;
DROP TRIGGER IF EXISTS trg_class_students_before_insert ON public.class_students;

-- 2) Eski okuma politikaları (fix_teacher_auth.sql / fix_teacher_profiles_pii_exposure.sql'deki
--    tanımlar; tek fark TO authenticated — bkz. yukarıdaki not)
DROP POLICY IF EXISTS "teacher_reads_student_scores" ON public.oyun_skorlari;
CREATE POLICY "teacher_reads_student_scores" ON public.oyun_skorlari
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM class_students cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.child_email = oyun_skorlari.email
        AND c.teacher_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "teacher_reads_own_class_profiles" ON public.profiles;
CREATE POLICY "teacher_reads_own_class_profiles" ON public.profiles
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM class_students cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.child_email = profiles.email
        AND c.teacher_id = auth.uid()
    )
  );

-- 3) Eski arama fonksiyonu (fix_teacher_profiles_pii_exposure.sql)
CREATE OR REPLACE FUNCTION public.teacher_search_child_by_email(p_email text)
RETURNS TABLE (child_name text, child_age_months int, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.child_name, p.child_age_months, p.email
  FROM profiles p
  WHERE p.email = p_email
    AND EXISTS (SELECT 1 FROM teachers t WHERE t.user_id = auth.uid())
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.teacher_search_child_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_search_child_by_email(text) TO authenticated;

-- 4) Tablo izinleri: bilerek DEĞİŞTİRİLMEZ (yukarıdaki "NE KORUNUR" notuna bakın).

-- 5) Yeni fonksiyonlar (politikalar eskisine döndüğü için artık bağımlılık yok)
DROP FUNCTION IF EXISTS public.my_class_invites();
DROP FUNCTION IF EXISTS public.respond_class_invite(uuid, boolean);
DROP FUNCTION IF EXISTS public.teacher_class_roster(uuid);
DROP FUNCTION IF EXISTS public.teacher_student_scores(uuid, integer, boolean);
DROP FUNCTION IF EXISTS public.teacher_student_scores(uuid, integer);
DROP FUNCTION IF EXISTS public.class_students_before_insert();
DROP FUNCTION IF EXISTS public.teachers_pin_identity();
DROP FUNCTION IF EXISTS private.class_row_readable(uuid, timestamptz, text, text, uuid);
DROP FUNCTION IF EXISTS private.class_owner_is_paid(uuid);
DROP FUNCTION IF EXISTS private.user_is_paid_teacher(uuid);
DROP FUNCTION IF EXISTS private.class_student_limit(uuid);
DROP FUNCTION IF EXISTS private.ai_academic_part(text);

-- 6) Yalnız davranışı etkileyen dizin/kısıt (durum kolonları, class_blocks ve performans dizini KORUNUR)
DROP INDEX IF EXISTS public.uq_class_students_class_email;
ALTER TABLE public.class_students DROP CONSTRAINT IF EXISTS class_students_email_format;

DO $$
BEGIN
  RAISE NOTICE 'Geri alma tamam. add_class_consent.sql yeniden uygulanırsa: (1) drop_teacher_direct_reads.sql daha önce çalıştırıldıysa onu TEKRAR çalıştırın; (2) yinelenen sınıf kaydı hatası çıkarsa listelenen gruplarda ONAYLI satırı tutun.';
END $$;

NOTIFY pgrst, 'reload schema';
