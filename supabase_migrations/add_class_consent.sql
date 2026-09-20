-- ============================================================================
-- SINIF ERİŞİMİ GÜVENLİĞİ — Faz S1 (yalnız veritabanı)
-- ============================================================================
-- SORUN (canlıda, 0b çıktısındaki gerçek politika metinleriyle doğrulandı):
--   teacher_owns_classes / teacher_owns_class_students yalnız "sınıf benim" der; öğretmen olmayı
--   ya da velinin onayını istemez (teachers satırını herkes kendi ekleyebilir, e-posta doğrulaması
--   kapalı). teacher_reads_student_scores / teacher_reads_own_class_profiles ise sınıfa YAZILAN
--   e-postanın skorlarını ve profilini açar. Sonuç: giriş yapmış herkes, e-postasını bildiği/tahmin
--   ettiği bir velinin çocuğunun adını, yaşını, skorlarını, yapay zekâ yorumlarını, çizimlerini,
--   veli adını ve paket bilgisini okuyabilir.
--
-- ÇÖZÜM (ürün kararı: "ücretli sınıf paketi öğretmeni onaysız, diğerlerinde veli onayı"):
--   * class_students.accepted_at / accepted_via / accepted_user_id: kayıt YALNIZ onaylıysa veri açılır.
--     Onay durumunu istemci yazamaz (kolon izni yok), SUNUCU belirler:
--        - sınıfın sahibi ücretli sınıf paketi öğretmeniyse (teachers.subscription_tier cinar/mese,
--          süresi dolmamış; bu alanı kullanıcı kendi değiştiremez) -> 'package' (hemen açık; paket
--          sürerken geçerli),
--        - değilse -> bekliyor (veli onaylayana kadar hiçbir veri açılmaz),
--        - bu migration'dan önceki kayıtlar -> 'legacy' (olduğu gibi çalışmaya devam eder) — YALNIZ
--          sınıfın sahibinin bir teachers satırı varsa; öğretmen olmayan kişilerin açtığı sınıflardaki
--          eski kayıtlar (açığın kendisiyle eklenmiş olabilir) bekliyor olur.
--     Veli onayı ('parent') onaylayan HESABA bağlıdır (accepted_user_id): hesap silinip aynı e-posta
--     yeniden kaydedilirse eski onay yeni hesaba geçmez.
--   * Veli kendi davetlerini görür, onaylar ya da reddeder/çıkar: my_class_invites() /
--     respond_class_invite(). Reddetme/çıkma o öğretmenin BÜTÜN sınıflarındaki kaydı siler ve o
--     öğretmenin o e-postayı bir daha eklemesini ENGELLER (class_blocks).
--   * Öğretmen ham tablolardan değil, yalnız gereken alanları veren iki fonksiyondan okur:
--     teacher_class_roster() / teacher_student_scores(). Bu fonksiyonlar velinin adını, paket
--     bilgisini, rıza durumunu, yapay zekâ yorumunun VELİ NOTU kısmını ve uzman-onay iç alanlarını
--     HİÇ döndürmez. Birden çok çocuklu hesaplar kardeş ayrımı gelene kadar görünmez.
--     (Çizimler ürün kararıyla öğretmene açıktır: teacher_student_scores(..., p_with_drawings => true)
--     cizim_verisi'ni döndürür; varsayılan kapalıdır çünkü alan ağırdır. Depolamadaki dosyaları açan
--     politika ayrı bir migration'dır — yalnız görüntüleme arayüzü yazılınca gerekir.)
--   * teacher_reads_* politikaları onay şartıyla sıkılaştırılır (eski istemci de aynı korumaya
--     tabi olur). Bu iki eski doğrudan okuma politikası, yeni istemci yayınlandıktan sonra
--     drop_teacher_direct_reads.sql ile tamamen kaldırılacak; O ANA KADAR eski istemci/API onaylı
--     kayıtlar için ham satırları (veli adı, paket bilgisi vb.) hâlâ okuyabilir.
--   * teacher_search_child_by_email: çocuk adı/yaşı YALNIZ ücretli sınıf paketi öğretmenine ve yalnız
--     engellenmemiş, tek çocuklu, kayıtlı hesap için döner; diğer her durumda (kayıtsız e-posta,
--     ücretsiz öğretmen, engel, kardeşli hesap) AYNI boş-önizleme satırı (ad/yaş NULL) döner:
--     e-postanın kayıtlı olup olmadığı, engellenip engellenmediği ya da kardeşli olup olmadığı
--     sorgulanamaz. (Eski istemci bu satırla ekleme akışını sürdürebilir.)
--   * Öğretmen başına TOPLAM öğrenci sınırı sunucuda zorlanır (free/Çınar 10, Meşe sınırsız; tüm
--     sınıfları kapsar, kilitle sıralanır): toplu e-posta ekleme (REST ile, çok sınıfla) engellenir.
--   * Geçersiz/boş e-posta eklenemez; teachers.email güncellemede de oturum e-postasına sabitlenir
--     (velinin gördüğü öğretmen kimliği ve owner'ın e-posta anahtarlı paket ataması için).
--
-- HİÇBİR VERİ SİLİNMEZ. Yeni kolonlar NULL olabilir; eski istemci ÇÖKMEDEN çalışmaya devam eder, ama
-- bazı ekranlar eksik kalır — yeni istemciyi bu migration'ın HEMEN ardından yayınlayın:
--   * ücretli öğretmen: kayıtlı veli için eski akış aynen. Kayıtsız e-posta artık "bulunamadı" engeli
--     yerine boş önizleme (yeşil onay, ad yok) gösterir ve eklenebilir; aynı e-postayı ikinci kez
--     eklemek artık reddedilir (eski istemci hatayı göstermez, pencere açık kalır);
--   * ücretsiz/paketsiz öğretmen: YENİ eklemeler veli onayına düşer ve eski listede görünmez (profil
--     okuması onaya bağlı); eski istemci nedenini söylemez — yeni istemci durum rozeti ve açıklama gösterir.
--
-- ÖN KOŞULLAR (aşağıdaki DO bloğu yoksa çalışmayı REDDEDER):
--   * add_tier_insert_guard.sql (paket alanları kullanıcı tarafından yazılamıyor)
--   * add_child_profiles.sql (child_profiles + private.child_count_for_email kardeş kilidi)
--
-- SIRA: 1) add_child_profiles.sql  2) BU SQL  3) istemci sürümü (yeni TeacherDashboard + veli
--       davet kartı) HEMEN ardından  4) drop_teacher_direct_reads.sql (istemci yayında olduğu
--       doğrulanınca).
--
-- ACİL GERİ ALMA: supabase_migrations/rollback_class_consent.sql (sınıf açığını YENİDEN AÇAR;
--   fix_teacher_auth.sql dosyasını ASLA yeniden çalıştırmayın: 0. adımı tüm öğretmen/sınıf
--   verisini siler).
--
-- BİLİNEN SINIRLAR: (1) veli reddetme/çıkma sonrası engeli KALDIRMA arayüzü yok; destek:
--   DELETE FROM class_blocks WHERE child_email_lower = '<e-posta>' AND teacher_id = '<uuid>';
--   (2) onay bekleyen kayıtlar, öğretmen sonradan ücretli pakete geçse de bekler (onay eklenirken
--   verilir); öğretmen kaydı silip yeniden ekleyebilir. (3) e-posta doğrulaması KAPALI olduğundan
--   bir e-posta adresi henüz kayıtlı değilse herhangi biri o adresle kayıt olup daveti onaylayabilir;
--   kalıcı çözüm e-posta doğrulamasını açmaktır (ayrı karar).
--
-- Bu SQL'i Supabase SQL Editor'da TEK SEFERDE çalıştırın (tek işlem gibi davranır; hata olursa
-- hiçbir şey uygulanmaz). Tekrar çalıştırılabilir: geri doldurma yalnız ilk çalıştırmada olur,
-- sonradan bekleyen kayıtlar yeniden "onaylı" sayılmaz; eski okuma politikaları kaldırıldıysa
-- (drop_teacher_direct_reads.sql) yeniden YARATILMAZ.
--
-- SÜRDÜRME NOTU: ücretli paket listesi ve öğrenci sınırı lib/subscriptionTiers.ts
-- (OGRETMEN_TIER_FLAGS) ile ELLE senkron; lib/classConsentSql.test.ts ikisini karşılaştırır.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Ön kontroller
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lock_tier_insert_teachers' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Önce supabase_migrations/add_tier_insert_guard.sql çalıştırılmalı (ücretli öğretmen ayrımı paket alanlarının kullanıcı tarafından yazılamamasına dayanır)';
  END IF;
  IF to_regclass('public.child_profiles') IS NULL OR to_regprocedure('private.child_count_for_email(text)') IS NULL THEN
    RAISE EXCEPTION 'Önce supabase_migrations/add_child_profiles.sql çalıştırılmalı';
  END IF;
  IF to_regclass('public.classes') IS NULL OR to_regclass('public.class_students') IS NULL
     OR to_regclass('public.teachers') IS NULL OR to_regclass('public.owners') IS NULL
     OR to_regclass('public.oyun_skorlari') IS NULL OR to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'classes / class_students / teachers / owners / oyun_skorlari / profiles tabloları bulunamadı';
  END IF;
  IF EXISTS (SELECT 1 FROM public.class_students GROUP BY class_id, lower(btrim(child_email)) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'class_students içinde aynı sınıfa iki kez eklenmiş e-posta var; önce yinelenenleri silin';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Onay kolonları + e-posta biçimi + geri doldurma (YALNIZ ilk çalıştırmada)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = 'class_students' AND column_name = 'accepted_at') THEN
    ALTER TABLE public.class_students
      ADD COLUMN accepted_at      timestamptz,
      ADD COLUMN accepted_via     text,
      -- veli onayını veren HESAP; hesap silinirse kayıt da gider (KVKK) — eski onay yeni hesaba geçmez
      ADD COLUMN accepted_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      ADD CONSTRAINT class_students_accepted_via_check CHECK (accepted_via IN ('legacy', 'package', 'parent')),
      ADD CONSTRAINT class_students_accepted_consistent CHECK ((accepted_at IS NULL) = (accepted_via IS NULL));

    -- Bugüne kadarki kayıtlar aynen çalışmaya devam eder — yalnız sınıfın sahibi gerçek bir öğretmen
    -- (teachers satırı) ise. Öğretmen olmayan kişilerin açtığı sınıflardaki kayıtlar bekliyor olur.
    UPDATE public.class_students cs
       SET accepted_at = coalesce(cs.added_at, now()), accepted_via = 'legacy'
      FROM public.classes c
     WHERE c.id = cs.class_id
       AND EXISTS (SELECT 1 FROM public.teachers t WHERE t.user_id = c.teacher_id);
  END IF;

  -- E-posta biçimi. NOT VALID: mevcut satırlar TARANMAZ; ama kısıt bir satırın HER güncellemesinde
  -- (respond_class_invite'ın onay UPDATE'i dahil) yeniden sınanır. Boşluklu eski kayıtlar da
  -- onaylanabilsin diye biçim btrim() ile sınanır (yeni kayıtlar tetikleyicide zaten kırpılır). Yalnız
  -- gerçekten bozuk biçimli eski satırlar (ör. "g@x") güncellenemez; bunlarla hiçbir hesabın e-postası
  -- eşleşmediğinden veli onayı da söz konusu olmaz (silinebilirler).
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_students_email_format' AND conrelid = 'public.class_students'::regclass) THEN
    ALTER TABLE public.class_students
      ADD CONSTRAINT class_students_email_format
      CHECK (btrim(child_email) ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') NOT VALID;
  END IF;
END $$;

-- Aynı sınıfa aynı e-posta iki kez eklenemez (büyük/küçük harf ve boşluktan bağımsız).
CREATE UNIQUE INDEX IF NOT EXISTS uq_class_students_class_email
  ON public.class_students (class_id, lower(btrim(child_email)));

-- Sınıf listesi / öğrenci geçmişi e-postaya göre arar (lower(email) ile; şimdiye dek destekleyen dizin yoktu).
CREATE INDEX IF NOT EXISTS idx_oyun_skorlari_lower_email ON public.oyun_skorlari (lower(email));

-- ---------------------------------------------------------------------------
-- 2) class_blocks: velinin "bu öğretmen beni bir daha ekleyemesin" kararı
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_blocks (
  child_email_lower text        NOT NULL,
  teacher_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (child_email_lower, teacher_id)
);
ALTER TABLE public.class_blocks ENABLE ROW LEVEL SECURITY;   -- politika YOK: istemci hiç okuyamaz/yazamaz
REVOKE ALL ON public.class_blocks FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.class_blocks TO service_role;

-- ---------------------------------------------------------------------------
-- 3) class_students: istemcinin yazabileceği kolonlar
-- ---------------------------------------------------------------------------
-- Öğretmen yalnız (class_id, child_email) EKLEYEBİLİR; hiçbir kolonu GÜNCELLEYEMEZ (onay kolonlarını
-- kendine onaylayamasın). Supabase varsayılan olarak ALL verir; önce geri alıp gerekeni veriyoruz.
-- Satır düzeyi güvenlik (teacher_owns_class_students) aynen devam eder.
REVOKE ALL ON public.class_students FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON public.class_students TO authenticated;
GRANT INSERT (class_id, child_email) ON public.class_students TO authenticated;
GRANT ALL ON public.class_students TO service_role;

-- ---------------------------------------------------------------------------
-- 4) Yardımcılar (private şeması: API'de açığa çıkmaz)
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- Sınıfın sahibi ücretli sınıf paketi (Çınar/Meşe) öğretmeni mi? (getEffectiveOgretmenTier ile aynı mantık)
-- SÜRDÜRME: paket listesi lib/subscriptionTiers.ts OGRETMEN_TIER_FLAGS'te 'free' dışındaki paketler.
CREATE OR REPLACE FUNCTION private.class_owner_is_paid(p_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM classes c JOIN teachers t ON t.user_id = c.teacher_id
     WHERE c.id = p_class_id
       AND t.subscription_tier IN ('cinar', 'mese')
       AND (t.package_expires_at IS NULL OR t.package_expires_at > now()))
$$;

-- Bir kullanıcı şu an ücretli sınıf paketi öğretmeni mi? (arama önizlemesi için)
CREATE OR REPLACE FUNCTION private.user_is_paid_teacher(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM teachers t
     WHERE t.user_id = p_user_id
       AND t.subscription_tier IN ('cinar', 'mese')
       AND (t.package_expires_at IS NULL OR t.package_expires_at > now()))
$$;

-- Kayıttaki veri şu an OKUNABİLİR mi?
--   legacy : her zaman;
--   package: yalnız sınıf sahibinin paketi sürerken;
--   parent : yalnız onayı veren HESAP hâlâ bu e-postanın sahibiyse. Kimliğe (auth.users) bakılır, profil
--            satırına DEĞİL: profil kaydı olmayan veli de onaylayabilir; hesap silinip e-posta yeniden
--            kaydedildiyse ya da hesabın e-postası değiştiyse eski onay (profil satırı eskiyi taşısa bile)
--            geçersizdir.
CREATE OR REPLACE FUNCTION private.class_row_readable(
  p_class_id uuid, p_accepted_at timestamptz, p_accepted_via text, p_child_email text, p_accepted_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_accepted_at IS NOT NULL
     AND (p_accepted_via = 'legacy'
          OR (p_accepted_via = 'package' AND private.class_owner_is_paid(p_class_id))
          OR (p_accepted_via = 'parent' AND p_accepted_user IS NOT NULL
              AND EXISTS (SELECT 1 FROM auth.users u
                           WHERE u.id = p_accepted_user
                             AND lower(btrim(u.email)) = lower(btrim(p_child_email)))))
$$;

-- ÖĞRETMEN başına toplam öğrenci sınırı (tüm sınıfları kapsar). SÜRDÜRME: OGRETMEN_TIER_FLAGS.maxStudentsPerClass
-- (free 10, cinar 10, mese sınırsız; Çınar/free zaten tek sınıf). NULL = sınırsız (yalnız süresi dolmamış Meşe).
CREATE OR REPLACE FUNCTION private.class_student_limit(p_class_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE WHEN t.subscription_tier = 'mese' AND (t.package_expires_at IS NULL OR t.package_expires_at > now())
              THEN NULL ELSE 10 END
    FROM classes c LEFT JOIN teachers t ON t.user_id = c.teacher_id
   WHERE c.id = p_class_id
$$;

-- Yapay zekâ yorumunun AKADEMİK kısmı. lib/aiAudience.ts splitAnalysis ile AYNI kural: "VELİ
-- BİLGİLENDİRME NOTU" ifadesinin geçtiği satırdan itibaren HER ŞEY veli notudur (sonradan gelen
-- '---' blokları dahil); akademik kısım o satırdan ÖNCEKİ metindir. İşaret yoksa metnin tamamı.
-- Boşluk sınıfı JavaScript'in \s'i ile aynıdır: PostgreSQL'in \s'i bölünmez boşlukları (U+00A0, U+202F,
-- U+2007...) ve BOM'u saymaz, JS sayar; işaret bu karakterlerle yazılırsa veli notu öğretmene sızardı.
CREATE OR REPLACE FUNCTION private.ai_academic_part(p_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text;
  ws constant text := '[[:space:]   -     　﻿]+';
  m constant text := 'VEL[İIiı]' || ws || 'B[İIiı]LG[İIiı]LEND[İIiı]RME' || ws || 'NOTU';
BEGIN
  IF p_text IS NULL THEN
    RETURN NULL;
  END IF;
  v := btrim(replace(p_text, E'\r\n', E'\n'));
  IF v = '' THEN
    RETURN NULL;
  END IF;
  IF v !~* m THEN
    RETURN v;
  END IF;
  v := regexp_replace(v, m || '.*$', '', 'i');             -- ilk işaretten sona kadar her şey veli notu
  v := regexp_replace(v, '[^\n]*$', '');                   -- işaretin bulunduğu satırın başı ("**", "## BÖLÜM 2: ")
  v := regexp_replace(v, '(\n[ \t]*([-*_]{3,}|#{1,6})?[ \t]*)+$', '');   -- sondaki boş/ayırıcı satırlar
  v := regexp_replace(v, '^([ \t]*([-*_]{3,}|#{1,6})?[ \t]*\n)+', '');   -- baştaki boş/ayırıcı satırlar
  v := btrim(v);
  IF v ~ '^([-*_]{3,}|#{1,6})?$' THEN                                    -- geriye yalnız süs kaldıysa
    RETURN NULL;
  END IF;
  RETURN nullif(v, '');
END;
$$;

REVOKE ALL ON FUNCTION private.class_owner_is_paid(uuid), private.user_is_paid_teacher(uuid),
  private.class_row_readable(uuid, timestamptz, text, text, uuid),
  private.class_student_limit(uuid), private.ai_academic_part(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.class_owner_is_paid(uuid), private.user_is_paid_teacher(uuid),
  private.class_row_readable(uuid, timestamptz, text, text, uuid),
  private.class_student_limit(uuid), private.ai_academic_part(text) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5) class_students BEFORE INSERT: e-posta normalizasyonu/doğrulama, engel, sınır, onay durumu
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.class_students_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner   uuid;
  v_trusted boolean;
  v_limit   integer;
  v_count   integer;
BEGIN
  NEW.child_email := lower(btrim(NEW.child_email));   -- eşleşmeler e-postanın küçük harfli hâline göre

  SELECT c.teacher_id INTO v_owner FROM classes c WHERE c.id = NEW.class_id;
  v_trusted := coalesce(auth.role(), '') = 'service_role'
            OR (auth.uid() IS NULL AND auth.role() IS NULL)
            OR EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid());

  IF NOT v_trusted THEN
    -- Başkasının sınıfına ekleme: RLS reddedecek; BEFORE tetikleyicileri RLS'ten ÖNCE çalışır,
    -- bu yüzden engel/sınır durumunu sızdırmadan geç.
    IF v_owner IS DISTINCT FROM auth.uid() THEN
      RETURN NEW;
    END IF;

    IF NEW.child_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
      RAISE EXCEPTION 'invalid_email';
    END IF;

    IF EXISTS (SELECT 1 FROM class_blocks b
                WHERE b.teacher_id = v_owner AND b.child_email_lower = NEW.child_email) THEN
      RAISE EXCEPTION 'class_enroll_blocked';
    END IF;

    v_limit := private.class_student_limit(NEW.class_id);
    IF v_limit IS NOT NULL THEN
      -- Öğretmenin eşzamanlı eklemeleri sırayla işlensin; sayım TÜM sınıfları kapsar.
      PERFORM pg_advisory_xact_lock(hashtextextended('class_students:' || v_owner::text, 7));
      SELECT count(*) INTO v_count
        FROM class_students cs JOIN classes c ON c.id = cs.class_id
       WHERE c.teacher_id = v_owner;
      IF v_count >= v_limit THEN
        RAISE EXCEPTION 'class_student_limit' USING DETAIL = format('limit=%s', v_limit);
      END IF;
    END IF;

    -- Onay durumu SUNUCUDA belirlenir. İstemci bu kolonlara zaten YAZAMAZ (kolon izni yok: değer
    -- gönderirse tetikleyiciye gelmeden "permission denied" alır); aşağıdaki sıfırlamalar yalnız ek savunmadır.
    NEW.accepted_at := NULL;
    NEW.accepted_via := NULL;
    NEW.accepted_user_id := NULL;
  END IF;

  -- Güvenilir bağlam (destek) açıkça değer verdiyse ona dokunma; yoksa pakete göre karar ver.
  IF NEW.accepted_at IS NULL AND NEW.accepted_via IS NULL AND private.class_owner_is_paid(NEW.class_id) THEN
    NEW.accepted_at := now();
    NEW.accepted_via := 'package';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.class_students_before_insert() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_class_students_before_insert ON public.class_students;
CREATE TRIGGER trg_class_students_before_insert
  BEFORE INSERT ON public.class_students
  FOR EACH ROW EXECUTE FUNCTION public.class_students_before_insert();

-- ---------------------------------------------------------------------------
-- 5b) teachers.email GÜNCELLEMEDE de oturum e-postasına sabitlenir
-- ---------------------------------------------------------------------------
-- add_tier_insert_guard.sql yalnız INSERT'te sabitliyordu; self_update_teacher her kolona izin veriyor.
-- Aksi halde öğretmen e-postasını başkasınınkine (ör. destek adresine ya da henüz kayıtsız bir Çınar
-- müşterisininkine) çevirip velinin gördüğü kimliği taklit edebilir ya da owner'ın e-posta anahtarlı paket
-- atamasından (PATCH teachers?email=eq.) yararlanabilir. UPDATE'te yalnız SET listesinde email varsa çalışır.
CREATE OR REPLACE FUNCTION public.teachers_pin_identity()
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
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.teachers_pin_identity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_teachers_pin_identity ON public.teachers;
CREATE TRIGGER trg_teachers_pin_identity
  BEFORE UPDATE OF email ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.teachers_pin_identity();

-- ---------------------------------------------------------------------------
-- 6) Öğretmen okuma politikalarını onay şartıyla sıkılaştır
-- ---------------------------------------------------------------------------
-- (Yeni istemci bu politikalara hiç dayanmayacak; eski istemci de onaysız veriyi göremez.) Eşleşme,
-- eski politikalarla AYNI (tam eşitlik; yeni kayıtlar küçük harfe çevrildiği için yeter). Yalnız
-- giriş yapmış rollere uygulanır: anon eskisi gibi boş küme alır (class_students izni olmadığından
-- politika anon için değerlendirilirse hata verirdi). drop_teacher_direct_reads.sql bu politikaları
-- kaldırdıysa YENİDEN YARATILMAZ.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'oyun_skorlari'
                AND policyname = 'teacher_reads_student_scores') THEN
    DROP POLICY "teacher_reads_student_scores" ON public.oyun_skorlari;
    CREATE POLICY "teacher_reads_student_scores" ON public.oyun_skorlari
      FOR SELECT TO authenticated USING (
        EXISTS (
          SELECT 1
            FROM public.class_students cs
            JOIN public.classes c ON c.id = cs.class_id
           WHERE cs.child_email = oyun_skorlari.email
             AND c.teacher_id = auth.uid()
             AND private.class_row_readable(cs.class_id, cs.accepted_at, cs.accepted_via, cs.child_email, cs.accepted_user_id)
        )
      );
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'
                AND policyname = 'teacher_reads_own_class_profiles') THEN
    DROP POLICY "teacher_reads_own_class_profiles" ON public.profiles;
    CREATE POLICY "teacher_reads_own_class_profiles" ON public.profiles
      FOR SELECT TO authenticated USING (
        EXISTS (
          SELECT 1
            FROM public.class_students cs
            JOIN public.classes c ON c.id = cs.class_id
           WHERE cs.child_email = profiles.email
             AND c.teacher_id = auth.uid()
             AND private.class_row_readable(cs.class_id, cs.accepted_at, cs.accepted_via, cs.child_email, cs.accepted_user_id)
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7) teacher_search_child_by_email: önizleme, varlık/engel/kardeş bilgisi sızdırmadan
-- ---------------------------------------------------------------------------
-- Gerçek çocuk adı/yaşı YALNIZ ücretli sınıf paketi öğretmenine, engellenmemiş, tek çocuklu, kayıtlı hesap
-- için döner. Diğer her durumda (kayıtsız e-posta, ücretsiz öğretmen, engel, kardeşli hesap) AYNI satır döner:
-- (NULL, NULL, e-posta) — böylece hiçbir durum diğerinden ayırt edilemez ve eski istemci ekleme akışını
-- sürdürebilir. Geçersiz biçimde boş küme. Aynı imza; istemci uyumlu.
CREATE OR REPLACE FUNCTION public.teacher_search_child_by_email(p_email text)
RETURNS TABLE (child_name text, child_age_months int, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_email, '')));
BEGIN
  IF v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RETURN;
  END IF;

  IF private.user_is_paid_teacher(auth.uid())
     AND NOT EXISTS (SELECT 1 FROM class_blocks b WHERE b.teacher_id = auth.uid() AND b.child_email_lower = v_email)
     AND private.child_count_for_email(v_email) <= 1 THEN
    RETURN QUERY
      SELECT p.child_name, p.child_age_months, p.email
        FROM profiles p
       WHERE lower(p.email) = v_email
       LIMIT 1;
    IF FOUND THEN
      RETURN;
    END IF;
  END IF;

  RETURN QUERY SELECT NULL::text, NULL::int, v_email;
END;
$$;

REVOKE ALL ON FUNCTION public.teacher_search_child_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_search_child_by_email(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 8) VELİ fonksiyonları: davetleri gör, onayla / reddet-çık
-- ---------------------------------------------------------------------------
-- Yalnız e-postası kayıtla eşleşen (auth.email()) hesap görür/yanıtlar. Öğretmenin adı/okulu velinin
-- bilinçli karar verebilmesi için döner ve ÖĞRETMENİN KENDİ BEYANIDIR (doğrulanmamıştır; metin
-- kırpılır); teacher_email oturum e-postasına sabitlidir; teacher_is_paid owner'ın atadığı sınıf
-- paketidir (güvenilir işaret). teacher_name NULL ise o kişinin kayıtlı öğretmen profili YOKTUR.
CREATE OR REPLACE FUNCTION public.my_class_invites()
RETURNS TABLE (invite_id uuid, status text, class_name text, teacher_name text, teacher_email text,
               school_name text, teacher_is_paid boolean, added_at timestamptz, accepted_via text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cs.id,
         CASE WHEN cs.accepted_at IS NULL THEN 'pending'
              WHEN private.class_row_readable(cs.class_id, cs.accepted_at, cs.accepted_via, cs.child_email, cs.accepted_user_id) THEN 'accepted'
              ELSE 'suspended' END,
         left(c.name, 80), left(t.name, 80), left(t.email, 120), left(t.school_name, 120),
         private.class_owner_is_paid(cs.class_id),
         cs.added_at, cs.accepted_via
    FROM class_students cs
    JOIN classes c ON c.id = cs.class_id
    LEFT JOIN teachers t ON t.user_id = c.teacher_id
   WHERE nullif(auth.email(), '') IS NOT NULL
     AND lower(btrim(cs.child_email)) = lower(btrim(auth.email()))
   -- Onaylı (veriyi açan / açmış) kayıtlar HER ZAMAN başta: bekleyen davet seli onları listeden
   -- itemesin (aksi halde veli, veriyi gören öğretmeni göremez ve çıkamazdı).
   ORDER BY (cs.accepted_at IS NULL), cs.added_at DESC, cs.id
   LIMIT 50
$$;

-- p_accept = true  : onayla (kalıcı; onaylayan hesaba bağlanır, paket süresine bağlı olmaktan çıkar)
-- p_accept = false : reddet / sınıftan çık -> o öğretmenin BÜTÜN sınıflarındaki bu e-postaya ait kayıtlar
--                    silinir ve o öğretmen bu e-postayı bir daha ekleyemez
CREATE OR REPLACE FUNCTION public.respond_class_invite(p_id uuid, p_accept boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class uuid;
  v_owner uuid;
BEGIN
  IF nullif(auth.email(), '') IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL OR p_accept IS NULL THEN
    RAISE EXCEPTION 'invalid_argument';
  END IF;

  SELECT cs.class_id INTO v_class
    FROM class_students cs
   WHERE cs.id = p_id AND lower(btrim(cs.child_email)) = lower(btrim(auth.email()));
  IF v_class IS NULL THEN
    RAISE EXCEPTION 'invite_not_found';          -- başkasının / olmayan id: aynı yanıt
  END IF;

  IF p_accept THEN
    UPDATE class_students
       SET accepted_at = coalesce(accepted_at, now()), accepted_via = 'parent', accepted_user_id = auth.uid()
     WHERE id = p_id;
  ELSE
    SELECT c.teacher_id INTO v_owner FROM classes c WHERE c.id = v_class;
    DELETE FROM class_students cs
     USING classes c
     WHERE c.id = cs.class_id
       AND c.teacher_id IS NOT DISTINCT FROM v_owner
       AND lower(btrim(cs.child_email)) = lower(btrim(auth.email()));
    IF v_owner IS NOT NULL THEN
      INSERT INTO class_blocks (child_email_lower, teacher_id)
      VALUES (lower(btrim(auth.email())), v_owner)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.my_class_invites(), public.respond_class_invite(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_class_invites(), public.respond_class_invite(uuid, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 9) ÖĞRETMEN fonksiyonları: yalnız gereken alanlar
-- ---------------------------------------------------------------------------
-- Sınıf listesi. Onaylı olmayan kayıtta yalnız öğretmenin kendi yazdığı e-posta ve durum döner
-- (çocuk adı/yaşı/oyun sayısı NULL). Birden çok çocuklu hesap: hidden = true (kardeş ayrımı gelene kadar).
-- Başkasının sınıfı ile olmayan sınıf ayırt edilemez (boş küme).
CREATE OR REPLACE FUNCTION public.teacher_class_roster(p_class_id uuid)
RETURNS TABLE (student_id uuid, student_email text, status text, added_at timestamptz,
               child_name text, child_age_months integer, game_count bigint, hidden boolean)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM classes c WHERE c.id = p_class_id AND c.teacher_id = auth.uid()) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH r AS (
    SELECT cs.id AS rid, cs.child_email AS remail, cs.class_id AS rclass, cs.accepted_at AS racc, cs.added_at AS radded,
           private.class_row_readable(cs.class_id, cs.accepted_at, cs.accepted_via, cs.child_email, cs.accepted_user_id) AS rok,
           private.child_count_for_email(cs.child_email) AS rn
      FROM class_students cs
     WHERE cs.class_id = p_class_id)
  SELECT r.rid,
         r.remail,
         CASE WHEN r.racc IS NULL THEN 'pending' WHEN r.rok THEN 'accepted' ELSE 'suspended' END,
         r.radded,
         CASE WHEN r.rok AND r.rn <= 1 THEN coalesce(cp.child_name, pr.child_name) END,
         CASE WHEN r.rok AND r.rn <= 1 THEN coalesce(cp.child_age_months, pr.child_age_months) END,
         CASE WHEN r.rok AND r.rn <= 1 THEN
                (SELECT count(*) FROM oyun_skorlari s
                  WHERE lower(s.email) = lower(r.remail) AND (cp.child_id IS NULL OR s.child_id = cp.child_id))
         END,
         (r.rok AND r.rn > 1)
    FROM r
    LEFT JOIN profiles pr ON lower(pr.email) = lower(r.remail)
    LEFT JOIN LATERAL (
      SELECT ch.id AS child_id, ch.child_name, ch.child_age_months
        FROM child_profiles ch WHERE ch.user_id = pr.user_id
       ORDER BY ch.created_at, ch.id LIMIT 1) cp ON true
   ORDER BY r.radded DESC, r.rid;
END;
$$;

-- Bir öğrencinin oyun geçmişi: yalnız onaylı, yalnız tek çocuklu hesap, yalnız gereken kolonlar.
-- Çizim (cizim_verisi) AĞIR bir alandır (satır başına yüzlerce KB olabilir): yalnız p_with_drawings = true
-- iken döner (varsayılan false → NULL); liste görünümü çizim istemez, çizim ekranı ister.
-- Yapay zekâ yorumu: yalnız onay_durumu = 'onaylandi' olanların AKADEMİK kısmı (veli notu çıkarılır).
-- NOT: onay_durumu'nu satırın sahibi (veli) EKLERKEN yazabilir (own_insert_scores yalnız e-postaya bakar);
-- bu kapı "uzman onayladı" GARANTİSİ değil, dürüst istemciler için savunmadır. Sahte metin yalnız velinin
-- kendi (onayladığı) öğretmenine gider, başka hesaba sızmaz; istemci onu DÜZ METİN gösterir. Kalıcı çözüm
-- oyun_skorlari için BEFORE INSERT tetikleyicisidir (admin kuyruğunun onay_durumu varsayımları doğrulanınca).
DROP FUNCTION IF EXISTS public.teacher_student_scores(uuid, integer);
CREATE OR REPLACE FUNCTION public.teacher_student_scores(
  p_student_id uuid, p_limit integer DEFAULT 20, p_with_drawings boolean DEFAULT false)
RETURNS TABLE (score_id bigint, created_at timestamptz, oyun_turu text, hamle_sayisi bigint, hata_sayisi bigint,
               sure bigint, correct_answers integer, zorluk_seviyesi integer, kazanim_odagi text,
               cizim_verisi jsonb, ai_akademik text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_ok    boolean;
  v_child uuid;
BEGIN
  SELECT cs.child_email, private.class_row_readable(cs.class_id, cs.accepted_at, cs.accepted_via, cs.child_email, cs.accepted_user_id)
    INTO v_email, v_ok
    FROM class_students cs
    JOIN classes c ON c.id = cs.class_id
   WHERE cs.id = p_student_id AND c.teacher_id = auth.uid();

  IF v_email IS NULL OR NOT coalesce(v_ok, false) THEN
    RETURN;
  END IF;
  IF private.child_count_for_email(v_email) > 1 THEN
    RETURN;
  END IF;

  SELECT ch.id INTO v_child
    FROM profiles pr JOIN child_profiles ch ON ch.user_id = pr.user_id
   WHERE lower(pr.email) = lower(v_email)
   ORDER BY ch.created_at, ch.id LIMIT 1;

  RETURN QUERY
  SELECT s.id, s.created_at, s.oyun_turu, s.hamle_sayisi, s.hata_sayisi, s.sure, s.correct_answers,
         s.zorluk_seviyesi, s.kazanim_odagi,
         CASE WHEN coalesce(p_with_drawings, false) THEN s.cizim_verisi END,
         CASE WHEN s.onay_durumu = 'onaylandi' THEN private.ai_academic_part(s.yapay_zeka_yorumu) END
    FROM oyun_skorlari s
   WHERE lower(s.email) = lower(v_email)
     AND (v_child IS NULL OR s.child_id = v_child)
   ORDER BY s.created_at DESC, s.id DESC
   LIMIT least(greatest(coalesce(p_limit, 20), 1), 100);
END;
$$;

REVOKE ALL ON FUNCTION public.teacher_class_roster(uuid), public.teacher_student_scores(uuid, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_class_roster(uuid), public.teacher_student_scores(uuid, integer, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 10) Sonuç özeti
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_total   bigint;
  v_legacy  bigint;
  v_pending bigint;
BEGIN
  SELECT count(*) INTO v_total   FROM public.class_students;
  SELECT count(*) INTO v_legacy  FROM public.class_students WHERE accepted_via = 'legacy';
  SELECT count(*) INTO v_pending FROM public.class_students WHERE accepted_at IS NULL;
  RAISE NOTICE 'class consent tamam: % sınıf kaydı (legacy=%, onay bekleyen=%)', v_total, v_legacy, v_pending;
END $$;

NOTIFY pgrst, 'reload schema';
