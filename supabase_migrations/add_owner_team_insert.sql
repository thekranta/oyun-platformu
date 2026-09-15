-- Owner-dashboard'dan yeni uzman/sahip ekleme: admins/owners tablolarına şu ana
-- kadar hiçbir INSERT RLS politikası yoktu (sadece SQL Editor'dan elle ekleniyordu).
-- Owner için INSERT izni ekleniyor (PERMISSIVE, mevcut self_read_admin_row/
-- self_read_owner_row SELECT politikalarının yanına, onları değiştirmeden).

DROP POLICY IF EXISTS "owner_inserts_admins" ON admins;
CREATE POLICY "owner_inserts_admins" ON admins
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "owner_inserts_owners" ON owners;
CREATE POLICY "owner_inserts_owners" ON owners
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid()));
