-- Faz 1 guvenlik duzeltmesi (devam): oyun_skorlari ve profiles icin RLS.
-- On kosul: index.tsx / admin.tsx artik anon key yerine oturum jetonu gonderiyor (tamamlandi).
-- Bu SQL'i Supabase SQL Editor'da calistirin.

ALTER TABLE oyun_skorlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- oyun_skorlari: veli kendi cocugunun skorlarini görebilir/ekleyebilir; admin hepsini görebilir/güncelleyebilir
CREATE POLICY "own_or_admin_select_scores" ON oyun_skorlari
  FOR SELECT
  USING (
    email = auth.email()
    OR EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

CREATE POLICY "own_insert_scores" ON oyun_skorlari
  FOR INSERT
  WITH CHECK (email = auth.email());

CREATE POLICY "admin_update_scores" ON oyun_skorlari
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()));

-- profiles: veli kendi profilini görebilir/düzenleyebilir; admin hepsini görebilir
CREATE POLICY "own_or_admin_select_profiles" ON profiles
  FOR SELECT
  USING (
    email = auth.email()
    OR EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

CREATE POLICY "own_insert_profiles" ON profiles
  FOR INSERT
  WITH CHECK (email = auth.email());

CREATE POLICY "own_update_profiles" ON profiles
  FOR UPDATE
  USING (email = auth.email())
  WITH CHECK (email = auth.email());
