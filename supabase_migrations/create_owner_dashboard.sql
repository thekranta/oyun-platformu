-- Sahip (owner) paneli icin: platformdaki TUM rollerin (veli/cocuk, ogretmen, uzman)
-- aktivitesini TEK bir salt-okunur "godmode" akisinda gorebilen, admins'ten AYRI,
-- gizli bir rol. Bu SQL'i Supabase SQL Editor'da calistirin.
--
-- TASARIM: owners tablosu admins ile AYNI sekilde (user_id, display_name, created_at)
-- ama TAMAMEN ayri bir tablo -- admins'e DOKUNULMUYOR, admin paneli davranisi degismiyor.
--
-- GUVENLIK NOTU: asagidaki "owner_reads_*" politikalari SADECE SELECT icin eklenir.
-- Postgres RLS'te varsayilan politika tipi PERMISSIVE'tir; ayni tabloda ayni komut
-- icin birden fazla PERMISSIVE politika OR ile birlesir -- yani bu politikalar mevcut
-- "own_or_admin_select_*" / "teacher_owns_*" / "self_read_admin_row" politikalarinin
-- YERINE GECMEZ, YANINA eklenir. Veli/ogretmen/admin erisimi degismeden kalir.

-- 1) owners tablosu (admins ile birebir ayni sekil, ayri tablo)
CREATE TABLE IF NOT EXISTS owners (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE owners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "self_read_owner_row" ON owners;
CREATE POLICY "self_read_owner_row" ON owners
  FOR SELECT
  USING (user_id = auth.uid());

-- 2) owner-bypass SELECT politikalari -- RLS her tabloda zaten ACIK.

DROP POLICY IF EXISTS "owner_reads_profiles" ON profiles;
CREATE POLICY "owner_reads_profiles" ON profiles
  FOR SELECT USING (EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "owner_reads_scores" ON oyun_skorlari;
CREATE POLICY "owner_reads_scores" ON oyun_skorlari
  FOR SELECT USING (EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "owner_reads_teachers" ON teachers;
CREATE POLICY "owner_reads_teachers" ON teachers
  FOR SELECT USING (EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "owner_reads_classes" ON classes;
CREATE POLICY "owner_reads_classes" ON classes
  FOR SELECT USING (EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "owner_reads_class_students" ON class_students;
CREATE POLICY "owner_reads_class_students" ON class_students
  FOR SELECT USING (EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "owner_reads_admins" ON admins;
CREATE POLICY "owner_reads_admins" ON admins
  FOR SELECT USING (EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid()));

-- KURULUM (kod degil, manuel islem, TEK SEFERLIK):
-- Asagidaki e-postayi platform sahibinin hesabiyla degistirip calistirin (zaten
-- dogruysa oldugu gibi birakabilirsiniz).
insert into owners (user_id, display_name)
select u.id, 'Sahip'
from auth.users u
where u.email = 'muhammed.28unal@gmail.com'
  and not exists (select 1 from owners o where o.user_id = u.id);
