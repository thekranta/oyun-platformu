-- Mağaza satın alması paketi yazamıyor: lock_tier_columns() service_role'ü de kilitliyordu.
--
-- NEDEN: lock_tier_columns() (add_subscription_packages.sql + add_owner_package_write.sql) BEFORE UPDATE
-- tetikleyicisi owner OLMAYAN herkes için subscription_tier / package_started_at / package_expires_at
-- değerlerini eski haline zorlar. RevenueCat webhook'u (api/revenuecat-webhook.ts) bu sütunları
-- service_role anahtarıyla günceller; service_role'de auth.uid() NULL olduğundan is_owner = false
-- çıkar ve yazılan paket sessizce geri alınır: webhook "ok" der, paket HİÇ açılmaz, para ödeyen
-- veli/öğretmen ücretsiz kalır. Süre-doldu (EXPIRATION) sıfırlaması da aynı sebeple yazılamaz.
--
-- DEĞİŞİKLİK: Fonksiyonun başına TEK bir güvenilir bağlam istisnası eklenir:
--   coalesce(auth.role(), '') = 'service_role'  ->  RETURN NEW (değişiklik olduğu gibi kalır).
-- Aynı tespit add_tier_insert_guard.sql (lock_tier_columns_on_insert) ve add_child_profiles.sql
-- (profiles_pin_identity) içinde kullanılıyor. Owner / kendi-satır mantığı add_owner_package_write.sql
-- ile BİREBİR aynıdır (owner başkasının satırında yalnız paket sütunlarını değiştirebilir).
--
-- BİLİNÇLİ OLARAK YAPILMAYANLAR (risk):
--   * current_user / session_user KULLANILMAZ: fonksiyon SECURITY DEFINER olduğu için current_user
--     fonksiyon sahibidir (postgres); bu herkese muafiyet açardı.
--   * "JWT yok" (auth.uid() IS NULL AND auth.role() IS NULL) bağlamı UPDATE için serbest BIRAKILMAZ:
--     add_tier_insert_guard.sql sonundaki tasarım notu geçerli (SQL Editor'dan UPDATE kilitli kalır;
--     paket yazmanın yolu owner paneli ve sunucu/webhook). anon rolü de auth.uid() NULL verir.
--   * service_role anahtarı yalnız sunucuda (Vercel) durur; istemciye ASLA verilmez. Anahtar sızarsa
--     zaten RLS tamamen aşılır, bu istisna ek bir açık yaratmaz.
--
-- ÇALIŞTIRMADAN ÖNCE (canlıda mevcut gövdeyi doğrulayın; add_owner_package_write.sql ile aynı olmalı):
--   select pg_get_functiondef('lock_tier_columns'::regproc);
--   Farklıysa (başka bir el değişikliği varsa) bu dosyayı çalıştırmadan önce haber verin.
--
-- ÇALIŞTIRDIKTAN SONRA DOĞRULAMA:
--   1) select pg_get_functiondef('lock_tier_columns'::regproc);   -- 'service_role' satırı görünmeli
--   2) RevenueCat panelinden bir TEST olayı değil, gerçek/sandbox satın alma olayını yeniden gönderin
--      (sandbox için Vercel'de REVENUECAT_ALLOW_SANDBOX=1 gerekir); ardından:
--        select email, subscription_tier, package_started_at, package_expires_at
--          from profiles where email = '<satın alan e-posta>';
--      paket sütunları güncellenmiş olmalı.
--   3) Bir veli oturumuyla REST'ten kendi subscription_tier'ını değiştirmeyi deneyin: eski değer kalmalı.
--
-- GERİ ALMA: fix_lock_tier_service_role_rollback.sql (add_owner_package_write.sql gövdesine döner).
-- Tetikleyicilere (trg_lock_tier_profiles / trg_lock_tier_teachers) dokunulmaz; fonksiyon değişince
-- otomatik devreye girer.

CREATE OR REPLACE FUNCTION lock_tier_columns()
RETURNS TRIGGER AS $$
DECLARE
  is_owner boolean := EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid());
  is_own_row boolean;
BEGIN
  -- Güvenilir sunucu bağlamı (RevenueCat webhook'u, service_role anahtarı): paket sütunları dahil
  -- değişiklik serbest. Yalnız service_role; JWT'siz SQL Editor ve anon bu dala GİRMEZ.
  IF coalesce(auth.role(), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'profiles' THEN
    is_own_row := (NEW.email = auth.email());
  ELSE
    is_own_row := (NEW.user_id = auth.uid());
  END IF;

  IF is_owner AND NOT is_own_row THEN
    -- Owner BAŞKASININ satırını güncelliyor: sadece tier/süre sütunlarına izin ver,
    -- geri kalan her şeyi eski değerine zorla.
    IF TG_TABLE_NAME = 'profiles' THEN
      NEW.parent_name := OLD.parent_name;
      NEW.email := OLD.email;
      NEW.child_name := OLD.child_name;
      NEW.child_age_months := OLD.child_age_months;
      NEW.data_consent := OLD.data_consent;
    ELSE
      NEW.name := OLD.name;
      NEW.email := OLD.email;
      NEW.school_name := OLD.school_name;
    END IF;
  ELSIF NOT is_owner THEN
    -- Veli/öğretmen kendi satırını güncelliyor: tier/süre sütunlarına DOKUNAMAZ.
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.package_started_at := OLD.package_started_at;
    NEW.package_expires_at := OLD.package_expires_at;
  END IF;
  -- (owner kendi satırını güncelliyorsa: hiçbir kısıtlama yok, mevcut davranış korunur)

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
