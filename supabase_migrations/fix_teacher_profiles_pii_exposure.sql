-- Guvenlik duzeltmesi: "teacher_reads_profiles" politikasi (fix_teacher_auth.sql)
-- sinif/ogrenci iliskisi kontrolu YAPMADAN, kendi kendine kayit olan HERHANGI BIR
-- ogretmenin `profiles` tablosundaki TUM cocuklarin (ad, yas, veli adi, e-posta)
-- kaydini okumasina izin veriyordu. Bu SQL'i Supabase SQL Editor'da calistirin.
--
-- Onceki durum: USING (EXISTS (SELECT 1 FROM teachers t WHERE t.user_id = auth.uid()))
-- -- satirin kendisine hic bakmiyor, herhangi bir ogretmen icin TUM satirlar gecer.
--
-- Yeni durum: iki ayri, dar kapsamli mekanizma:
--   1) Ogretmen SADECE KENDI SINIFINDAKI (class_students uzerinden) ogrencilerin
--      profilini normal REST/RLS ile okuyabilir (TeacherDashboard.tsx satir ~183'teki
--      "sinif listesini goster" akisi icin -- teacher_reads_student_scores ile ayni desen).
--   2) Ogrenci EKLEMEDEN ONCE e-posta ile arama yapabilmek icin (henuz class_students'ta
--      kaydi yok), dar kapsamli bir SECURITY DEFINER fonksiyon: tek bir e-postaya tek
--      satir + yalnizca gerekli 3 alan (child_name, child_age_months, email) doner.
--      Fonksiyon RLS'i atlar (SECURITY DEFINER) ama kendi icinde caginin gercekten bir
--      ogretmen oldugunu tekrar kontrol eder.

-- 1. Eski, asiri genis politikayi kaldir.
DROP POLICY IF EXISTS "teacher_reads_profiles" ON profiles;

-- 2. Yeni, sinifla sinirli politika (teacher_reads_student_scores ile ayni desen).
CREATE POLICY "teacher_reads_own_class_profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM class_students cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.child_email = profiles.email
        AND c.teacher_id = auth.uid()
    )
  );

-- 3. Ogrenci-ekleme-oncesi arama icin dar kapsamli RPC.
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

-- KURULUM (kod tarafi ayrica guncellendi):
-- TeacherDashboard.tsx'teki searchStudentByEmail artik
-- POST {SUPABASE_URL}/rest/v1/rpc/teacher_search_child_by_email  body: { p_email: email }
-- cagiriyor; eski GET /rest/v1/profiles?email=eq.... sorgusu kaldirildi.
