-- Faz 1 guvenlik duzeltmesi: classes/class_students RLS'ini kapali-varsayima cek,
-- admin yetkisini Supabase Auth + admins tablosuna tasi.
-- Bu SQL'i Supabase SQL Editor'da calistirin.

-- 1. classes / class_students: herkese acik politikalari kaldir, teacher_id = auth.uid() ile sinirla
DROP POLICY IF EXISTS "public_classes" ON classes;
DROP POLICY IF EXISTS "public_class_students" ON class_students;

CREATE POLICY "teacher_owns_classes" ON classes
  FOR ALL
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

CREATE POLICY "teacher_owns_class_students" ON class_students
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_students.class_id
        AND classes.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = class_students.class_id
        AND classes.teacher_id = auth.uid()
    )
  );

-- 2. admins tablosu: admin paneline kim girebilir bilgisini Supabase Auth user'larina bagla
CREATE TABLE IF NOT EXISTS admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Bir kullanici sadece kendi admin kaydini okuyabilir (admin paneli girisi dogrulamak icin yeterli)
CREATE POLICY "self_read_admin_row" ON admins
  FOR SELECT
  USING (user_id = auth.uid());

-- Kurulum adimlari (kod degil, manuel islem):
-- a) Supabase Dashboard > Authentication > Users uzerinden admin/fatih/turker icin
--    gercek e-posta + guclu sifre ile kullanici olustur (eski '12'/'123' sifrelerini KULLANMA).
-- b) Her kullanicinin UUID'sini alip asagidaki gibi admins tablosuna ekle:
--    INSERT INTO admins (user_id, display_name) VALUES ('<uuid>', 'Admin');
--    INSERT INTO admins (user_id, display_name) VALUES ('<uuid>', 'Fatih');
--    INSERT INTO admins (user_id, display_name) VALUES ('<uuid>', 'Türker');
