-- Faz 3: Ogretmen panelini gercek Supabase Auth'a tasi.
-- Bu SQL'i Supabase SQL Editor'da SIRAYLA calistirin.
--
-- ON KOSUL: teachers/classes/class_students tablolarindaki mevcut veri TEST verisidir
-- ve silinebilir (kullanici onayladi). Eski kayitlar auth kullanicisina bagli olmadigi
-- icin yeni akista zaten erisilemez; temiz baslangic icin siliniyorlar.

-- 0. Test verisini temizle (siralama: class_students -> classes -> teachers)
DELETE FROM class_students;
DELETE FROM classes;
DELETE FROM teachers;

-- 1. teachers tablosunu Supabase Auth kullanicisina bagla
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);

-- 2. teachers RLS: ogretmen yalnizca kendi kaydini gorur/ekler/gunceller
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "self_read_teacher" ON teachers;
CREATE POLICY "self_read_teacher" ON teachers
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "self_insert_teacher" ON teachers;
CREATE POLICY "self_insert_teacher" ON teachers
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "self_update_teacher" ON teachers;
CREATE POLICY "self_update_teacher" ON teachers
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. profiles: ogretmen, ogrenci eklemek icin email ile arama yapabilmeli.
--    (Sinifa eklemeden ONCE profili gormesi gerektigi icin kendi sinifiyla sinirlanamaz.)
--    Bir ogretmen (teachers tablosunda kaydi olan) tum ogrenci profillerini OKUYABILIR.
--    Mevcut veli/admin politikalari korunur (RLS permissive = OR mantigi).
DROP POLICY IF EXISTS "teacher_reads_profiles" ON profiles;
CREATE POLICY "teacher_reads_profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM teachers t WHERE t.user_id = auth.uid())
  );

-- 4. oyun_skorlari: ogretmen yalnizca KENDI sinifindaki ogrencilerin skorlarini gorur.
--    (Skor verisi hassas; profilden farkli olarak kendi sinifiyla sinirli.)
DROP POLICY IF EXISTS "teacher_reads_student_scores" ON oyun_skorlari;
CREATE POLICY "teacher_reads_student_scores" ON oyun_skorlari
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM class_students cs
      JOIN classes c ON c.id = cs.class_id
      WHERE cs.child_email = oyun_skorlari.email
        AND c.teacher_id = auth.uid()
    )
  );

-- NOT: classes / class_students RLS politikalari (teacher_owns_classes,
-- teacher_owns_class_students) zaten fix_rls_and_admins.sql ile teacher_id = auth.uid()
-- olarak kuruldu. Bu migration'da classes.teacher_id artik auth kullanici UUID'sini
-- tasidigi icin (kod tarafi guncellendi) bu politikalar dogru calisir.

-- KURULUM (kod degil, manuel islem):
-- a) Test icin: uygulamadaki Ogretmen Paneli > Kayit Ol ile yeni ogretmen olustur
--    (artik sifre istiyor). Bu otomatik olarak Auth kullanicisi + teachers satiri olusturur.
-- b) Alternatif: Supabase Dashboard > Authentication > Users'tan kullanici olustur,
--    sonra INSERT INTO teachers (user_id, name, email, subscription_tier)
--    VALUES ('<uuid>', 'Ad', 'email', 'free');
