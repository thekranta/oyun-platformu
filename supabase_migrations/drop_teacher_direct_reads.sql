-- =============================================================================
-- Öğretmenin oyun skorlarını / veli profillerini DOĞRUDAN tablodan okumasını kapatır
-- =============================================================================
-- SON ADIM. add_child_profiles.sql -> add_class_consent.sql -> yeni istemci yayında ->
-- BU DOSYA. Sıra bozulursa öğretmen paneli boş görünür (veri kaybı OLMAZ; yalnız okuma yolu kapanır).
--
-- Neden gerekli: add_class_consent.sql, teacher_reads_student_scores / teacher_reads_own_class_profiles
-- politikalarını onay şartıyla sıkılaştırdı; ama bu politikalar tabloyu HÂLÂ satır düzeyinde açar:
-- oyun_skorlari'nın TÜM kolonlarını (uzman-onay alanları, yapay zekâ yorumunun VELİ NOTU kısmı,
-- kümülatif rapor) ve profiles'ın TÜM kolonlarını (veli adı, paket bilgisi, rıza durumu)
-- öğretmenin tarayıcısına getirir. Yeni istemci bunlara hiç dayanmaz; teacher_class_roster() ve teacher_student_scores()
-- yalnız öğretmenin görmesi gereken kolonları döndürür. Bu dosya eski yolu tamamen kapatır.
--
-- ÖN KOŞULLAR (hepsi doğrulanmadan ÇALIŞTIRMA):
--   1) add_class_consent.sql çalıştırıldı.
--   2) RPC tabanlı TeacherDashboard canlıda (oyun.childhoodtech.com) ve gerçek bir öğretmen hesabıyla
--      sınıf listesi + öğrenci geçmişi açıldığı görüldü.
--   3) Eski istemci kodunu taşıyan MOBİL APK'lar (EAS build) yenilendi. Eski APK'daki öğretmen paneli
--      bu dosyadan sonra boş liste görür (uygulama çökmez).
--
-- Etkilenmeyenler: veli/owner/uzman okumaları (kendi politikaları), classes ve class_students
-- (öğretmenin kendi sınıf listesi), teacher_search_child_by_email (önizleme).
--
-- Güvenle yeniden çalıştırılabilir (IF EXISTS). Yeni fonksiyonlar (teacher_class_roster /
-- teacher_student_scores) yoksa (add_class_consent.sql uygulanmamış ya da rollback edilmiş) çalışmayı
-- REDDEDER: aksi halde öğretmen paneli için hiçbir okuma yolu kalmazdı.
--
-- Not: rollback_class_consent.sql + add_class_consent.sql yolunu izlediyseniz bu dosyayı TEKRAR çalıştırın
-- (rollback iki eski politikayı yeniden yaratır).
--
-- GERİ ALMA (gerekirse; add_class_consent.sql bölüm 6'nın onay şartlı tanımları):
--   CREATE POLICY "teacher_reads_student_scores" ON public.oyun_skorlari
--     FOR SELECT TO authenticated USING (EXISTS (
--       SELECT 1 FROM public.class_students cs JOIN public.classes c ON c.id = cs.class_id
--        WHERE cs.child_email = oyun_skorlari.email AND c.teacher_id = auth.uid()
--          AND private.class_row_readable(cs.class_id, cs.accepted_at, cs.accepted_via, cs.child_email, cs.accepted_user_id)));
--   CREATE POLICY "teacher_reads_own_class_profiles" ON public.profiles
--     FOR SELECT TO authenticated USING (EXISTS (
--       SELECT 1 FROM public.class_students cs JOIN public.classes c ON c.id = cs.class_id
--        WHERE cs.child_email = profiles.email AND c.teacher_id = auth.uid()
--          AND private.class_row_readable(cs.class_id, cs.accepted_at, cs.accepted_via, cs.child_email, cs.accepted_user_id)));
-- =============================================================================

DO $$
BEGIN
  IF to_regprocedure('public.teacher_class_roster(uuid)') IS NULL
     OR to_regprocedure('public.teacher_student_scores(uuid, integer, boolean)') IS NULL THEN
    RAISE EXCEPTION 'Önce add_class_consent.sql uygulanmalı (teacher_class_roster / teacher_student_scores yok); yoksa öğretmen paneli için hiçbir okuma yolu kalmaz';
  END IF;
END $$;

DROP POLICY IF EXISTS "teacher_reads_student_scores"      ON public.oyun_skorlari;
DROP POLICY IF EXISTS "teacher_reads_own_class_profiles"  ON public.profiles;

-- Sonuç özeti: iki politika artık olmamalı (0 satır beklenir).
DO $$
DECLARE
  v_kalan bigint;
BEGIN
  SELECT count(*) INTO v_kalan
    FROM pg_policies
   WHERE schemaname = 'public'
     AND policyname IN ('teacher_reads_student_scores', 'teacher_reads_own_class_profiles');
  IF v_kalan <> 0 THEN
    RAISE EXCEPTION 'drop_teacher_direct_reads: % politika hâlâ duruyor', v_kalan;
  END IF;
  RAISE NOTICE 'Öğretmenin doğrudan okuma politikaları kaldırıldı; erişim yalnız teacher_class_roster() / teacher_student_scores() üzerinden.';
END $$;
