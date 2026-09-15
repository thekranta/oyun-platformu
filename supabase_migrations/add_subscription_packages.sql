-- Yeni paket yapısı: veliler için Tohum/Filiz/Fidan/Orman, öğretmen/kurum için
-- Çınar/Meşe (childhoodtech.com "MiniZeka" pazarlama sitesindeki güncel paketler).
-- Eski subscription_tier hiçbir migration'da tanımlı değildi (CHECK constraint yok,
-- elle Supabase Dashboard'dan set ediliyordu) ve süre/bitiş alanı hiç yoktu.
--
-- ÖNCE BUNU ÇALIŞTIRIN (audit — gerçek verideki mevcut değerleri görmek için):
--   SELECT subscription_tier, count(*) FROM profiles GROUP BY 1;
--   SELECT subscription_tier, count(*) FROM teachers GROUP BY 1;
-- Sonucu paylaşın; aşağıdaki eşleme (UPDATE) satırları o sonuca göre gerekirse
-- güncellenecek. 'standard'/'premium' hiç yoksa o satırlar no-op olur, zararsızdır.

-- 1) Yeni sütunlar (nullable, mevcut satırları etkilemez)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS package_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS package_expires_at TIMESTAMPTZ;

ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS package_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS package_expires_at TIMESTAMPTZ;

-- 2) Geriye dönük eşleme: eski 'standard' kümülatif AI analizi görebiliyordu ama
-- PDF/paylaşım/geçmiş-yorum göremiyordu -- bu tam olarak yeni "Filiz" konumu.
-- Eski 'premium' tam erişimliydi -- en üst yeni tier'a ("Orman"/"Meşe") eşleniyor.
UPDATE profiles SET subscription_tier = 'filiz' WHERE subscription_tier = 'standard';
UPDATE profiles SET subscription_tier = 'orman' WHERE subscription_tier = 'premium';
UPDATE teachers SET subscription_tier = 'mese' WHERE subscription_tier = 'premium';

-- 3) CHECK constraint'ler (NOT VALID + VALIDATE ile tabloyu uzun kilitlemeden)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'tohum', 'filiz', 'fidan', 'orman')) NOT VALID;
ALTER TABLE profiles VALIDATE CONSTRAINT profiles_subscription_tier_check;

ALTER TABLE teachers
  DROP CONSTRAINT IF EXISTS teachers_subscription_tier_check;
ALTER TABLE teachers
  ADD CONSTRAINT teachers_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'cinar', 'mese')) NOT VALID;
ALTER TABLE teachers VALIDATE CONSTRAINT teachers_subscription_tier_check;

ALTER TABLE profiles ALTER COLUMN subscription_tier SET DEFAULT 'free';
ALTER TABLE teachers ALTER COLUMN subscription_tier SET DEFAULT 'free';

-- 4) Güvenlik: paket sütunlarını client tarafından değiştirilemez yap.
--
-- Bulgu: own_update_profiles (fix_rls_oyun_skorlari_profiles.sql) ve
-- self_update_teacher (fix_teacher_auth.sql) politikaları "email/user_id = kendisi"
-- eşleşmesiyle TÜM sütunlara yazma izni veriyor. Hiçbir kod bunu kullanmıyor ama
-- herhangi bir veli/öğretmen tarayıcı konsolundan kendi subscription_tier'ını
-- değiştirebilir. Paket/ödeme mantığı artık ciddileştiği için bu kapatılıyor.
--
-- Not: Owner-dashboard'a bu fazda yazma yetkisi EKLENMEDİ (kullanıcı kararı) --
-- paket ataması şimdilik yine Supabase Dashboard'dan elle yapılacak. İleride
-- owner-write eklenirse bu trigger'a "owner ise dokunma" istisnası eklenmeli.
CREATE OR REPLACE FUNCTION lock_tier_columns()
RETURNS TRIGGER AS $$
BEGIN
  NEW.subscription_tier := OLD.subscription_tier;
  NEW.package_started_at := OLD.package_started_at;
  NEW.package_expires_at := OLD.package_expires_at;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_lock_tier_profiles ON profiles;
CREATE TRIGGER trg_lock_tier_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION lock_tier_columns();

DROP TRIGGER IF EXISTS trg_lock_tier_teachers ON teachers;
CREATE TRIGGER trg_lock_tier_teachers
  BEFORE UPDATE ON teachers
  FOR EACH ROW EXECUTE FUNCTION lock_tier_columns();
