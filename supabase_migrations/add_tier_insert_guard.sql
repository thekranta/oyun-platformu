-- GÜVENLİK: paket (subscription_tier / package_*) alanları INSERT sırasında da korunur.
--
-- SORUN: lock_tier_columns() (add_subscription_packages.sql + add_owner_package_write.sql)
-- yalnızca BEFORE UPDATE çalışıyor. profiles için "own_insert_profiles"
-- (email = auth.email()) ve teachers için "self_insert_teacher" (user_id = auth.uid())
-- INSERT politikaları paket kolonlarını kısıtlamıyor. Yani oturum açmış herhangi bir
-- kullanıcı REST/konsoldan kendi satırını subscription_tier='orman' (veli) ya da
-- 'mese' (öğretmen) ile EKLEYEBİLİR ve ücretsiz paket alabilir. Paket artık oyun
-- erişimini de belirlediği için bu açık kapatılmalı.
--
-- ÇÖZÜM: BEFORE INSERT trigger'ı. Kimin eklediğine göre:
--   * service_role (sunucu tarafı API) -> güvenilir, olduğu gibi bırakılır.
--   * JWT hiç yok (auth.uid() ve auth.role() ikisi de NULL): Supabase SQL Editor /
--     doğrudan DB bağlantısı -> güvenilir. (anon-key isteği bu DEĞİLDİR: role='anon' gelir.)
--   * owner (owners tablosu) -> platform sahibi, olduğu gibi bırakılır.
--   * diğer herkes (veli/öğretmen, anon) -> tier 'free', süreler NULL'a zorlanır.
--
-- Bu SQL'i Supabase SQL Editor'da çalıştırın. Tekrar çalıştırılabilir (idempotent).
-- Mevcut satırlara dokunmaz; sadece yeni INSERT'leri korur.
--
-- ÇALIŞTIRMADAN ÖNCE (bağımsız denetimin önerdiği kontroller; ikisi de 1 sn):
--   1) select auth.uid(), auth.role(), auth.email(), to_regclass('public.owners');
--        beklenen: NULL, NULL, NULL, owners   (hata verirse bu guard'ı UYGULAMAYIN —
--        trigger gövdesi CREATE anında çözümlenmez, sorun ilk INSERT'te kayıtları kırardı)
--   2) select tgname, tgrelid::regclass from pg_trigger
--        where tgrelid in ('auth.users'::regclass,'public.profiles'::regclass,'public.teachers'::regclass)
--          and not tgisinternal;
--        JWT'siz çalışan (ör. auth.users üzerindeki) bir trigger profiles/teachers'a tier yazıyorsa
--        o yol 'güvenilir' sayılır; böyle bir şey görürseniz haber verin.
--   3) select tablename, policyname, cmd, roles, with_check from pg_policies
--        where tablename in ('profiles','teachers') and cmd in ('INSERT','ALL');
--        anon'a açık veya USING(true) INSERT politikası OLMAMALI.

CREATE OR REPLACE FUNCTION lock_tier_columns_on_insert()
RETURNS TRIGGER AS $$
DECLARE
  is_owner boolean := EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid());
  trusted boolean;
BEGIN
  trusted := is_owner
          OR coalesce(auth.role(), '') = 'service_role'
          OR (auth.uid() IS NULL AND auth.role() IS NULL);
  IF NOT trusted THEN
    NEW.subscription_tier := 'free';
    NEW.package_started_at := NULL;
    NEW.package_expires_at := NULL;
    -- teachers'ta self_insert_teacher yalnız user_id'yi kontrol ediyor; biri başkasının
    -- (ör. Çınar müşterisinin) e-postasıyla satır açıp owner'ın e-posta anahtarlı paket
    -- atamasından (PATCH teachers?email=eq.) yararlanmasın: e-posta oturumun kendi e-postası olur.
    IF TG_TABLE_NAME = 'teachers' AND auth.email() IS NOT NULL THEN
      NEW.email := auth.email();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_lock_tier_insert_profiles ON profiles;
CREATE TRIGGER trg_lock_tier_insert_profiles
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION lock_tier_columns_on_insert();

DROP TRIGGER IF EXISTS trg_lock_tier_insert_teachers ON teachers;
CREATE TRIGGER trg_lock_tier_insert_teachers
  BEFORE INSERT ON teachers
  FOR EACH ROW EXECUTE FUNCTION lock_tier_columns_on_insert();

-- ---------------------------------------------------------------------------
-- DOĞRULAMA (isteğe bağlı, migration'dan sonra):
--   1) SQL Editor'da (auth.uid() NULL -> muaf) elle eklenen satır tier'ını korur:
--        INSERT INTO teachers (user_id, name, email, subscription_tier) VALUES (...,'mese');
--   2) Bir veli hesabının oturum jetonuyla REST çağrısı:
--        POST /rest/v1/profiles  {"email":"<kendi e-postası>", ..., "subscription_tier":"orman"}
--      -> satır 'free' olarak oluşmalı (başka bir kısıt yüzünden hata alırsanız da sorun yok;
--         önemli olan tier'ın 'orman' KALMAMASI).
--
-- MEVCUT SATIRLARI DENETLEYİN (bu açık kapanmadan önce kimse suistimal etmiş olabilir):
--   SELECT email, subscription_tier, package_started_at, package_expires_at, created_at
--     FROM profiles WHERE subscription_tier <> 'free' ORDER BY created_at DESC;
--   SELECT email, subscription_tier, package_started_at, package_expires_at
--     FROM teachers WHERE subscription_tier <> 'free';
--   Owner panelinden atamadığınız / tanımadığınız ücretli kayıt varsa owner panelindeki
--   "Paket Atama" formundan 'Ücretsiz'e çekin. (SQL Editor'dan UPDATE işe yaramaz:
--   lock_tier_columns() UPDATE trigger'ı owner olmayan — auth.uid() NULL dahil — herkes için
--   tier'ı eski değere zorlar; bilinçli tasarım, owner paneli tek yazma yolu.)
