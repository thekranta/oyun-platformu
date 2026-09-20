-- ============================================================================
-- #4 Kardeş / çoklu çocuk profili — FAZ 1 (yalnız veritabanı)
-- ============================================================================
-- AMAÇ: Fidan (2 çocuk) ve Orman (sınırsız) paketlerinin "birden çok çocuk" vaadini
-- taşıyacak veri modelini kurmak. Bugün 1 hesap = 1 profil = 1 çocuk; skorlar çocuğu
-- yalnız METİNLE (email + ogrenci_adi) tanıyor. Bu migration:
--   * child_profiles tablosunu ekler (hesap başına çocuk listesi; RLS'li),
--   * oyun_skorlari.child_id kolonunu ekler (NULL olabilir; eski istemciler bozulmaz),
--   * mevcut profilleri ve skorları çocuklara BAĞLAR (backfill),
--   * paket sınırını VERİTABANINDA zorlar (free/tohum/filiz=1, fidan=2, orman=sınırsız),
--   * yeni kayıtta ilk çocuğu otomatik açar (signup.tsx değişmez),
--   * child_id'siz gelen (eski istemci) skorlara çocuğu otomatik atar,
--   * profiles.email ve user_id'yi (güvenilmeyen çağıran için) oturumun KENDİSİNE sabitler ve
--     user_id'si boş eski profilleri e-postası eşleşen auth hesabına bağlar (bölüm 3b / 6.0),
--   * Faz 2'ye (öğretmen tarafı child_id'ye geçene) kadar KARDEŞ SIZINTISINI okuma tarafında
--     KAPALI-VARSAYILAN (fail-closed) tek bir kısıtlayıcı politikayla engeller (bkz. bölüm 5).
--
-- HİÇBİR MEVCUT KOLON, POLİTİKA, TETİKLEYİCİ SİLİNMEZ/DEĞİŞTİRİLMEZ. Yalnız ekleme.
-- (Tek mevcut-satır değişikliği: user_id'si BOŞ profillere, e-postası eşleşen auth hesabının id'si yazılır.)
-- profiles.child_name / child_age_months "ilk çocuk" olarak yerinde kalır (eski istemciler).
--
-- BİLİNEN, BU DOSYADAN BAĞIMSIZ (zaten canlı) SORUN: öğretmen okuma politikaları
-- (teacher_reads_student_scores, teacher_reads_own_class_profiles) sınıfa e-posta ekleyen
-- HERKESE o hesabın skorlarını/profilini açar; sınıf oluşturmak da "öğretmen" olmayı ya da
-- velinin onayını gerektirmiyor (fix_rls_and_admins.sql teacher_owns_*). Bu migration onu
-- düzeltmez ve kötüleştirmez; ayrı bir "veli onaylı sınıf kaydı" işi gerekir.
--
-- ÖN KOŞULLAR (aşağıdaki DO bloğu yoksa çalışmayı REDDEDER):
--   * add_tier_insert_guard.sql çalışmış olmalı (paket alanları INSERT'te korunuyor).
--   * child_profiles_faz0_dogrulama.sql + child_profiles_faz0b_politikalar.sql sonuçları
--     incelenmiş olmalı.
--
-- ÇALIŞTIRMA SIRASI (önemli): 1) BU SQL  2) uygulama kodu (istemci child_id yazmaya başlar).
--   Kod SQL'den önce giderse POST 'child_id kolonu yok' hatası verir ve skorlar kuyruğa girer.
--
-- GERİ ALMA (istemci henüz child_id yazmıyorsa güvenli), bu sırayla:
--   DROP POLICY "hide_multi_child_from_email_readers" ON public.oyun_skorlari;
--   DROP TRIGGER trg_oyun_skorlari_child_link ON public.oyun_skorlari;
--   DROP TRIGGER trg_profiles_first_child ON public.profiles;
--   DROP TRIGGER trg_profiles_pin_identity ON public.profiles;
--   ALTER TABLE public.oyun_skorlari DROP COLUMN child_id;
--   DROP TABLE public.child_profiles;
--   DROP FUNCTION public.child_profiles_before_insert();
--   DROP FUNCTION public.profiles_create_first_child();
--   DROP FUNCTION public.profiles_pin_identity();
--   DROP FUNCTION public.oyun_skorlari_child_link();
--   DROP FUNCTION private.child_count_for_email(text);
--   DROP FUNCTION private.multi_child_emails();
--   DROP INDEX IF EXISTS public.idx_profiles_lower_email;
--   (DROP SCHEMA private; yalnız başka nesne yoksa — genelde kalabilir.)
--
-- Bu SQL'i Supabase SQL Editor'da TEK SEFERDE çalıştırın. Tek işlem (transaction) gibi
-- davranır: bir hata olursa hiçbir şey uygulanmaz. Sonda sayımlar bir NOTICE olarak yazılır.
-- Dosya tekrar çalıştırılabilir (idempotent); ilk çalıştırmadan sonra yeniden çalıştırmak
-- yalnızca eksik ilk çocukları (ve YALNIZ onların skorlarını) tamamlar; mevcut bağları, sonradan
-- eklenen/silinen çocukları etkilemez.
--
-- ÖNEMLİ (Supabase paneli): "private" şeması API'de AÇIĞA ÇIKARILMAMALI. Project Settings →
-- API → Exposed schemas listesine 'private' EKLEMEYİN (varsayılan: yalnız public).
--
-- SÜRDÜRME NOTU: paket limitleri aşağıdaki CASE'te ve lib/subscriptionTiers.ts
-- VELI_TIER_FLAGS.maxChildProfiles'ta ELLE senkron tutulur; lib/childProfilesSql.test.ts
-- ikisini karşılaştırır. Birini değiştirince öbürünü de değiştirin.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Ön kontroller: yanlış ortamda / yanlış sırada çalışmayı reddet
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lock_tier_insert_profiles' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Önce supabase_migrations/add_tier_insert_guard.sql çalıştırılmalı';
  END IF;
  IF to_regclass('public.admins') IS NULL OR to_regclass('public.owners') IS NULL THEN
    RAISE EXCEPTION 'admins / owners tabloları bulunamadı (RLS politikaları bunlara dayanıyor)';
  END IF;
  IF to_regclass('public.class_students') IS NULL OR to_regclass('public.oyun_skorlari') IS NULL THEN
    RAISE EXCEPTION 'class_students / oyun_skorlari tabloları bulunamadı';
  END IF;
  -- Backfill e-postayla eşler; aynı e-postalı birden çok profil varsa hangi çocuğa
  -- yazılacağı belirsiz olur. Bugün 0 (Faz 0 doğrulaması); ileride çıkarsa burada dur.
  IF EXISTS (SELECT 1 FROM public.profiles WHERE email IS NOT NULL GROUP BY lower(email) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Aynı e-postayla birden çok profil var; önce temizleyin';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) child_profiles: hesap başına çocuk listesi
-- ---------------------------------------------------------------------------
-- user_id -> auth.users ON DELETE CASCADE: hesap silinince çocuk profilleri de gider (KVKK).
-- Silme/arşiv/düzenleme Faz 1'de İSTEMCİYE AÇIK DEĞİL (yalnız SELECT + INSERT politikası var);
-- yazım hatası vb. için destek SQL'i kullanır. Sıralama created_at, id ile yapılır
-- ("ilk çocuk" = en eski satır; paket düşünce fazla çocuklar bu sıraya göre salt-okunur olur).
CREATE TABLE IF NOT EXISTS public.child_profiles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_name       text NOT NULL CHECK (btrim(child_name) <> ''),
  child_age_months integer NOT NULL CHECK (child_age_months BETWEEN 36 AND 72),  -- profiles ile aynı aralık
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_child_profiles_user_id ON public.child_profiles (user_id, created_at, id);
-- Aşağıdaki kısıtlayıcı politika ve tetikleyiciler e-postayla arama yapar (lower(email)).
CREATE INDEX IF NOT EXISTS idx_profiles_lower_email ON public.profiles (lower(email));

ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;

-- Tabloya yalnız giriş yapmış kullanıcı erişir (anon hiç), o da yalnız SELECT + INSERT.
-- Supabase varsayılan olarak yeni tablolara authenticated için ALL verir; önce hepsini geri alıp
-- gerekeni veriyoruz (UPDATE/DELETE/TRUNCATE istemciye kapalı; RLS'ten bağımsız ikinci kat).
REVOKE ALL ON public.child_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.child_profiles TO authenticated;
GRANT ALL ON public.child_profiles TO service_role;

DROP POLICY IF EXISTS "own_select_child_profiles" ON public.child_profiles;
CREATE POLICY "own_select_child_profiles" ON public.child_profiles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own_insert_child_profiles" ON public.child_profiles;
CREATE POLICY "own_insert_child_profiles" ON public.child_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- admin / owner okuma (mevcut owner_reads_* / own_or_admin_select_* deseniyle aynı)
DROP POLICY IF EXISTS "admin_reads_child_profiles" ON public.child_profiles;
CREATE POLICY "admin_reads_child_profiles" ON public.child_profiles
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "owner_reads_child_profiles" ON public.child_profiles;
CREATE POLICY "owner_reads_child_profiles" ON public.child_profiles
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.owners WHERE user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 2) Paket sınırı (child_profiles BEFORE INSERT)
-- ---------------------------------------------------------------------------
-- Etkin paket = lib/subscriptionTiers.ts getEffectiveVeliTier ile aynı mantık:
-- süresi (package_expires_at) dolmuş ücretli paket 'free' sayılır.
-- "Güvenilir" bağlam SINIRI aşabilir (destek istisnası): SQL Editor (JWT'siz) ve service_role herkes için;
-- owner yalnız KENDİ hesabı için (uygulama içinden başkası adına ekleme RLS ile zaten kapalıdır).
CREATE OR REPLACE FUNCTION public.child_profiles_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier    text;
  v_expires timestamptz;
  v_limit   integer;
  v_count   integer;
  v_trusted boolean;
BEGIN
  v_trusted := coalesce(auth.role(), '') = 'service_role'
            OR (auth.uid() IS NULL AND auth.role() IS NULL)
            OR EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid());

  -- Başkası adına ekleme: BEFORE tetikleyicileri RLS WITH CHECK'ten ÖNCE çalışır ve bu tetikleyici
  -- SECURITY DEFINER'dır; RLS'e güvenmeyip RLS ile AYNI hatayı kendimiz veririz (ayrıntı sızmaz,
  -- profiles tetikleyicisi gibi RLS'i atlayan yollar da kapalı kalır).
  IF NOT v_trusted AND NEW.user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'new row violates row-level security policy for table "child_profiles"'
      USING ERRCODE = '42501';
  END IF;

  -- Aynı hesabın eşzamanlı eklemeleri sırayla işlensin (sınırı yarışla aşmasınlar). Güvenilir bağlam sınırı
  -- zaten aşabildiğinden kilit almaz (toplu backfill'de her satır için kilit tablosunu şişirmesin).
  IF NOT v_trusted THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 0));
  END IF;

  SELECT p.subscription_tier, p.package_expires_at
    INTO v_tier, v_expires
    FROM profiles p WHERE p.user_id = NEW.user_id;

  IF v_tier IS NULL OR (v_tier <> 'free' AND v_expires IS NOT NULL AND v_expires < now()) THEN
    v_tier := 'free';
  END IF;

  -- SÜRDÜRME: lib/subscriptionTiers.ts VELI_TIER_FLAGS.maxChildProfiles ile aynı olmalı.
  v_limit := CASE v_tier
               WHEN 'fidan' THEN 2
               WHEN 'orman' THEN NULL          -- sınırsız
               ELSE 1                          -- free, tohum, filiz (ve bilinmeyen)
             END;

  SELECT count(*) INTO v_count FROM child_profiles c WHERE c.user_id = NEW.user_id;

  IF NOT v_trusted AND v_limit IS NOT NULL AND v_count >= v_limit THEN
    RAISE EXCEPTION 'child_limit_reached'
      USING DETAIL = format('tier=%s limit=%s', v_tier, v_limit);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.child_profiles_before_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_child_profiles_before_insert ON public.child_profiles;
CREATE TRIGGER trg_child_profiles_before_insert
  BEFORE INSERT ON public.child_profiles
  FOR EACH ROW EXECUTE FUNCTION public.child_profiles_before_insert();

-- ---------------------------------------------------------------------------
-- 3) Yeni kayıtta ilk çocuğu otomatik aç (signup.tsx değişmez)
-- ---------------------------------------------------------------------------
-- Yardımcı bir tetikleyici KAYDI ENGELLEMEMELİ: hata olursa uyarı yazıp geçer; istemci
-- çocuk listesi boşsa profiles alanlarına düşer (bu migration'ı tekrar çalıştırmak da
-- eksik ilk çocukları tamamlar).
-- own_insert_profiles yalnız email = auth.email() ister, user_id'yi bağlamaz; bu tetikleyici
-- SECURITY DEFINER olduğundan RLS'i atlar. Bu yüzden çocuğu YALNIZ satırın sahibi (ya da
-- güvenilir bağlam) için açar: başkasının user_id'siyle profil eklenerek o hesaba çocuk
-- "dikilemez".
CREATE OR REPLACE FUNCTION public.profiles_create_first_child()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL
     AND (NEW.user_id = auth.uid()
          OR coalesce(auth.role(), '') = 'service_role'
          OR (auth.uid() IS NULL AND auth.role() IS NULL)
          OR EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid()))
     AND NOT EXISTS (SELECT 1 FROM child_profiles c WHERE c.user_id = NEW.user_id) THEN
    INSERT INTO child_profiles (user_id, child_name, child_age_months)
    VALUES (NEW.user_id,
            coalesce(nullif(btrim(NEW.child_name), ''), 'Çocuk'),
            coalesce(NEW.child_age_months, 60));
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'profiles_create_first_child atlandı: %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.profiles_create_first_child() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_profiles_first_child ON public.profiles;
CREATE TRIGGER trg_profiles_first_child
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_create_first_child();

-- ---------------------------------------------------------------------------
-- 3b) profiles.email ve user_id OTURUMUN KENDİSİNE sabitlenir (güvenilmeyen çağıran için)
-- ---------------------------------------------------------------------------
-- own_insert_profiles / own_update_profiles "email = auth.email()" der, ama eski "Users can insert/
-- update own profile" politikaları (auth.uid() = user_id) VEYA ile birleştiği için e-postayı BAĞLAMAZ:
-- biri KENDİ user_id'siyle ama BAŞKASININ e-postasıyla profil ekleyebilir ya da e-postasını
-- değiştirebilir. Bu (a) kardeş sayacını şişirip kurbanın skorlarını öğretmenden gizleyebilir,
-- (b) owner'ın e-posta anahtarlı paket atamasının (PATCH profiles?email=eq.) saldırganın satırını da
-- yükseltmesine yol açar, (c) kurbanın kendi profilini .single() ile okumasını bozar. Aynı desen:
-- add_tier_insert_guard.sql'de teachers.email. Güvenilir bağlam (owner / service_role / JWT'siz SQL
-- Editor) muaf; oturum e-postası yoksa dokunulmaz. UPDATE'te yalnız SET listesinde email varsa çalışır
-- (owner'ın paket PATCH'i etkilenmez).
CREATE OR REPLACE FUNCTION public.profiles_pin_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.email() IS NOT NULL
     AND NOT (coalesce(auth.role(), '') = 'service_role'
              OR EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid())) THEN
    NEW.email := auth.email();
    IF TG_OP = 'INSERT' THEN
      NEW.user_id := auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.profiles_pin_identity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_profiles_pin_identity ON public.profiles;
CREATE TRIGGER trg_profiles_pin_identity
  BEFORE INSERT OR UPDATE OF email ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_pin_identity();

-- ---------------------------------------------------------------------------
-- 4) oyun_skorlari.child_id + otomatik bağlama / bütünlük (BEFORE INSERT)
-- ---------------------------------------------------------------------------
-- child_id NULL kalabilir: eski istemciler, profili olmayan (yetim) skorlar, belirsiz durumlar.
-- ON DELETE SET NULL: çocuk satırı silinse skor kaybolmaz (e-posta üzerinden hesabın kalır).
ALTER TABLE public.oyun_skorlari
  ADD COLUMN IF NOT EXISTS child_id uuid REFERENCES public.child_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_oyun_skorlari_child_created
  ON public.oyun_skorlari (child_id, created_at DESC);

-- Kurallar (satırın e-postası hesabı belirler; RLS zaten email = auth.email() ister):
--  * child_id verilmiş ama bu e-postanın hesabına ait değilse -> yok sayılır (NULL), skor KAYBOLMAZ.
--  * child_id yoksa (eski istemci): hesapta TEK çocuk varsa ona; birden çoksa ad (ogrenci_adi)
--    tam bir çocukla eşleşirse ona; aksi halde NULL.
CREATE OR REPLACE FUNCTION public.oyun_skorlari_child_link()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child uuid;
  v_n     integer;
BEGIN
  IF NEW.email IS NULL OR btrim(NEW.email) = '' THEN
    NEW.child_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.child_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM child_profiles c JOIN profiles p ON p.user_id = c.user_id
               WHERE c.id = NEW.child_id AND lower(p.email) = lower(NEW.email)) THEN
      RETURN NEW;
    END IF;
    NEW.child_id := NULL;          -- başkasına ait/yanlış id: satırı düşürme, bağı kopar
  END IF;

  SELECT count(*), (array_agg(c.id ORDER BY c.created_at, c.id))[1]
    INTO v_n, v_child
    FROM child_profiles c JOIN profiles p ON p.user_id = c.user_id
   WHERE lower(p.email) = lower(NEW.email);

  IF v_n = 1 THEN
    NEW.child_id := v_child;
  ELSIF v_n > 1 THEN
    SELECT count(*), (array_agg(c.id))[1]
      INTO v_n, v_child
      FROM child_profiles c JOIN profiles p ON p.user_id = c.user_id
     WHERE lower(p.email) = lower(NEW.email)
       AND lower(btrim(c.child_name)) = lower(btrim(coalesce(NEW.ogrenci_adi, '')));
    IF v_n = 1 THEN NEW.child_id := v_child; END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.oyun_skorlari_child_link() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_oyun_skorlari_child_link ON public.oyun_skorlari;
CREATE TRIGGER trg_oyun_skorlari_child_link
  BEFORE INSERT ON public.oyun_skorlari
  FOR EACH ROW EXECUTE FUNCTION public.oyun_skorlari_child_link();

-- ---------------------------------------------------------------------------
-- 5) KARDEŞ SIZINTISI KİLİDİ (Faz 2'ye kadar): okuma tarafında KAPALI-VARSAYILAN
-- ---------------------------------------------------------------------------
-- Öğretmen okuma politikası (teacher_reads_student_scores) skorları E-POSTAYLA eşler. İki
-- çocuklu bir hesap sınıfa eklenirse öğretmen kardeşin skorlarını da görürdü. Faz 2
-- (class_students.child_id + çocuk bazlı politikalar) gelene kadar: birden çok çocuklu hesabın
-- skorları, hesabın KENDİSİ ile admin/owner dışındaki hiç kimseye (öğretmen dahil) gösterilmez.
-- Yazma tarafında hiçbir şey engellenmez (veli 2. çocuğu ekleyebilir, öğretmen sınıfa ekleyebilir),
-- hata mesajı da yok: sızıntı yalnızca "görünmemekle" kapanır.
--
-- KISITLAYICI (RESTRICTIVE) politika, mevcut izin veren (permissive) politikalara AND ile eklenir.
-- Yardımcı fonksiyonlar RLS'i atlamak için SECURITY DEFINER'dır; politika ifadesi çağıranın
-- yetkisiyle çalıştığından authenticated'e EXECUTE + şemaya USAGE verilir. Şema "private"
-- olduğu için PostgREST üzerinden (RPC) çağrılamaz; yani "bu e-postada kaç çocuk var" sorusu
-- dışarıdan sorulamaz.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.child_count_for_email(p_email text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::integer
    FROM child_profiles c JOIN profiles p ON p.user_id = c.user_id
   WHERE p_email IS NOT NULL AND lower(p.email) = lower(p_email);
$$;

-- Birden çok çocuklu hesapların e-postaları (küçük harf). Politika bunu İFADE BAŞINA BİR KEZ (karma küme)
-- değerlendirir; satır başına fonksiyon çağrısı büyük tablolarda taramayı 40-50 kat yavaşlatırdı.
CREATE OR REPLACE FUNCTION private.multi_child_emails()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(p.email)
    FROM profiles p JOIN child_profiles c ON c.user_id = p.user_id
   WHERE p.email IS NOT NULL
   GROUP BY lower(p.email)
  HAVING count(*) > 1;
$$;

REVOKE ALL ON FUNCTION private.child_count_for_email(text), private.multi_child_emails() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.child_count_for_email(text), private.multi_child_emails() TO authenticated, service_role;

DROP POLICY IF EXISTS "hide_multi_child_from_email_readers" ON public.oyun_skorlari;
CREATE POLICY "hide_multi_child_from_email_readers" ON public.oyun_skorlari
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    email IS NULL                                                   -- e-postasız (yetim) satır: bugünkü davranış
    OR email = auth.email()                                         -- hesabın kendisi
    OR EXISTS (SELECT 1 FROM public.admins WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.owners WHERE user_id = auth.uid())
    OR NOT (lower(email) IN (SELECT t.e FROM private.multi_child_emails() AS t(e)))   -- tek çocuklu hesap
  );

-- ---------------------------------------------------------------------------
-- 6) BACKFILL
-- ---------------------------------------------------------------------------
-- 6.0) user_id'si boş eski profilleri, e-postası eşleşen auth hesabına bağla (o hesap zaten var ve
--      başka bir profile bağlı değilse). Bağlanamayanlar yeni modelin DIŞINDA kalır (NOTICE'te sayılır).
UPDATE public.profiles p
   SET user_id = u.id
  FROM auth.users u
 WHERE p.user_id IS NULL
   AND p.email IS NOT NULL
   AND lower(u.email) = lower(p.email)
   AND NOT EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.user_id = u.id);

-- 6a) Çocuğu olmayan her profil için (user_id dolu) ilk çocuğu oluştur; BU ÇALIŞTIRMADA oluşanları not al
--     (skor bağlama yalnız bunlar için yapılır: yeniden çalıştırma sonradan silinen/eklenen çocukları bozmaz).
DROP TABLE IF EXISTS _child_backfill_new;
CREATE TEMP TABLE _child_backfill_new (id uuid PRIMARY KEY);

WITH ins AS (
  INSERT INTO public.child_profiles (user_id, child_name, child_age_months, created_at)
  SELECT p.user_id,
         coalesce(nullif(btrim(p.child_name), ''), 'Çocuk'),
         coalesce(p.child_age_months, 60),
         coalesce(p.created_at, now())
    FROM public.profiles p
   WHERE p.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.child_profiles c WHERE c.user_id = p.user_id)
  RETURNING id
)
INSERT INTO _child_backfill_new SELECT id FROM ins;

-- 6b) Skorları çocuğa bağla — eski veli panelinin "önce ada göre, hiç eşleşmezse e-postaya göre"
--     mantığını korur (ad eşleşmesi büyük/küçük harf ve boşluk duyarsızdır). Yalnız 6a'da bu
--     çalıştırmada oluşan çocuklar için.
--     (i) e-posta + ad eşleşmesi (hesapta bu adı taşıyan TEK çocuk varsa):
UPDATE public.oyun_skorlari s
   SET child_id = c.id
  FROM public.profiles p
  JOIN public.child_profiles c ON c.user_id = p.user_id
 WHERE s.child_id IS NULL
   AND c.id IN (SELECT id FROM _child_backfill_new)
   AND lower(s.email) = lower(p.email)
   AND lower(btrim(coalesce(s.ogrenci_adi, ''))) = lower(btrim(c.child_name))
   AND (SELECT count(*) FROM public.child_profiles c2
         WHERE c2.user_id = c.user_id
           AND lower(btrim(c2.child_name)) = lower(btrim(c.child_name))) = 1;

--     (ii) Ada göre HİÇ eşleşmesi olmayan TEK çocuklu hesapta kalan skorlar o çocuğa gider
--     (ad sonradan değişmiş / farklı yazılmış hesaplar). Adı eşleşen bir çocuğu olan hesapta
--     başka adlı skorlar (test/deneme adları) NULL kalır: yanlış çocuğa yazılmaz. Birden çok
--     çocuğu olan hesapta bu adım ASLA çalışmaz.
UPDATE public.oyun_skorlari s
   SET child_id = c.id
  FROM public.profiles p
  JOIN public.child_profiles c ON c.user_id = p.user_id
 WHERE s.child_id IS NULL
   AND c.id IN (SELECT id FROM _child_backfill_new)
   AND lower(s.email) = lower(p.email)
   AND (SELECT count(*) FROM public.child_profiles c2 WHERE c2.user_id = c.user_id) = 1
   AND NOT EXISTS (SELECT 1 FROM public.oyun_skorlari s2 WHERE s2.child_id = c.id);

DROP TABLE _child_backfill_new;

-- ---------------------------------------------------------------------------
-- 7) Sonuç denetimi: çocuğu olmayan (user_id'li) profil kalırsa TÜM migration geri alınır
-- ---------------------------------------------------------------------------
-- (Yanlış hesaba bağlı skor denetimi bilerek yok: backfill e-postayla eşleştirdiği için bu
-- durum yapısal olarak oluşamaz; eski bağları bugünkü profiles.email ile karşılaştırmak ise
-- e-postası sonradan düzeltilmiş hesaplarda yeniden çalıştırmayı gereksiz yere bozardı.)
DO $$
DECLARE
  v_profiles  bigint;
  v_children  bigint;
  v_no_child  bigint;
  v_no_uid    bigint;
  v_linked    bigint;
  v_unlinked  bigint;
BEGIN
  SELECT count(*) INTO v_profiles FROM public.profiles WHERE user_id IS NOT NULL;
  SELECT count(*) INTO v_children FROM public.child_profiles;
  SELECT count(*) INTO v_no_child FROM public.profiles p
   WHERE p.user_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM public.child_profiles c WHERE c.user_id = p.user_id);
  SELECT count(*) INTO v_no_uid   FROM public.profiles WHERE user_id IS NULL;
  SELECT count(*) INTO v_linked   FROM public.oyun_skorlari WHERE child_id IS NOT NULL;
  SELECT count(*) INTO v_unlinked FROM public.oyun_skorlari WHERE child_id IS NULL;

  IF v_no_child > 0 THEN
    RAISE EXCEPTION 'Çocuğu olmayan profil kaldı: % (backfill eksik)', v_no_child;
  END IF;

  RAISE NOTICE 'child_profiles tamam: % profil, % çocuk; skor bağlı=% bağsız=% (bağsız = yetim/belirsiz, sorun değil); user_id''siz profil=% (auth hesabı bulunamadı: yeni modelin dışında)',
    v_profiles, v_children, v_linked, v_unlinked, v_no_uid;
END $$;

NOTIFY pgrst, 'reload schema';
