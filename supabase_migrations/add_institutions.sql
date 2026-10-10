-- ============================================================================
-- KURUM YÖNETİM PANELİ (Meşe) — salt okunur, TOPLU özet
-- ============================================================================
-- Kurum yöneticisi (rol 'admin'), üyesi olan öğretmenlerin sınıflarına ait ÖZET etkinlik sayılarını görür.
-- Sınıflar öğretmende kalır (classes.teacher_id); kurum, öğretmenleri üyelik (institution_members) ile bağlar.
--
-- GÖRÜR : öğretmen/sınıf/çocuk sayıları, etkin çocuk, oyun sayısı, süre, doğru-yanlış toplamı, günlük etkinlik,
--         oyun türüne göre sayı, sınıf özeti, sınıftaki çocuğun adı + yaşı + son oynama + özet sayıları.
-- GÖRMEZ: çizimler, yapay zekâ yorumu (veli notu da akademik kısım da), veli adı/e-postası/paketi/rıza durumu,
--         tek tek oyun geçmişi, çocuğun e-posta adresi. (İlk sürümde AI yorumu bilerek YOK; istenirse ayrı eklenir.)
--
-- KİMİN VERİSİ: yalnız sınıf kaydı OKUNABİLİR olan çocuklar (private.class_row_readable: legacy / paket sürerken
-- 'package' / veli onaylı 'parent'). Yani bir öğretmenin göremediği çocuğu kurum yöneticisi de GÖREMEZ; ve skorlar
-- öğretmen paneliyle AYNI kuralla sayılır (tek çocuklu hesapta o çocuğun child_id'si; kardeşli hesap dışarıda).
-- Kardeşli hesaplar (birden çok çocuklu e-posta) tüm sayıların DIŞINDA tutulur; yalnız "hidden_count" olarak bildirilir.
--
-- KVKK NOTU (sahibi karar verdi / hukuki metin gerekir): bu panel, öğretmenin ZATEN görebildiği veriyi kurum
-- yöneticisine (özet düzeyde) açar. Veli, sınıf davetleri kartında "bu sınıf X kurumuna bağlı" bilgisini görür
-- (my_class_institutions) ve "Sınıftan çık" ile her zaman ayrılabilir. Aydınlatma metni/veli sözleşmesi bu paylaşımı
-- içermelidir. Bir öğretmen sonradan kuruma eklenirse, o sınıftaki mevcut okunabilir kayıtlar da panele yansır.
--
-- PENCERELER: "son N gün" = İstanbul takvim günü, bugün DAHİL (N=7 → bugün + önceki 6 gün). Bir önceki dönem
-- bundan hemen önceki N gündür. Gelecek tarihli skorlar sayılmaz; süre/doğru/yanlış satır başına kırpılır.
--
-- ÖN KOŞUL: add_child_profiles.sql ve add_class_consent.sql canlıda çalışmış olmalı.
-- Kurumu ve üyeleri SİZ (owner) kurarsınız: bkz. kurum_olustur_ornek.sql. İstemci tabloya DOKUNAMAZ;
-- yalnız aşağıdaki fonksiyonları çağırır (SECURITY DEFINER, anon yok). GERİ ALMA: rollback_institutions.sql.
-- Not: oyun_skorlari üzerinde yeni dizin kurulurken yazmalar kısa süre bekler; yoğun olmayan saatte çalıştırın.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Ön kontroller
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('private.class_row_readable(uuid,timestamptz,text,text,uuid)') IS NULL
     OR to_regprocedure('private.child_count_for_email(text)') IS NULL THEN
    RAISE EXCEPTION 'Önce supabase_migrations/add_child_profiles.sql ve add_class_consent.sql çalıştırılmalı';
  END IF;
  IF to_regclass('public.classes') IS NULL OR to_regclass('public.teachers') IS NULL
     OR to_regclass('public.oyun_skorlari') IS NULL OR to_regclass('public.class_students') IS NULL
     OR to_regclass('public.child_profiles') IS NULL OR to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'classes / teachers / oyun_skorlari / class_students / child_profiles / profiles tabloları bulunamadı';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Tablolar (istemciye KAPALI; yalnız service_role / SQL Editor yazar)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institutions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 120),
  expires_at timestamptz,                      -- NULL = süresiz; dolunca panel boş döner
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.institution_members (
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role           text NOT NULL CHECK (role IN ('admin', 'teacher')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (institution_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_institution_members_user ON public.institution_members (user_id);

-- Skor taramaları (e-posta + tarih) için bileşik dizin: created_at filtresi için yığına dönmeden sayar.
CREATE INDEX IF NOT EXISTS idx_oyun_skorlari_lower_email_created
  ON public.oyun_skorlari (lower(email), created_at DESC);

ALTER TABLE public.institutions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_members ENABLE ROW LEVEL SECURITY;
-- Politika YOK: RLS açık + izin yok = istemci hiçbir satır göremez/yazamaz. (Supabase varsayılan olarak yeni
-- tablolara anon/authenticated için ALL verir; önce hepsini geri alıyoruz — ikinci savunma katı.)
REVOKE ALL ON public.institutions, public.institution_members FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.institutions, public.institution_members TO service_role;

-- ---------------------------------------------------------------------------
-- 2) Yardımcılar (private şeması). İstemci rolleri bunları ÇAĞIRAMAZ: SECURITY DEFINER public fonksiyonlar
--    sahip yetkisiyle çalıştığı için authenticated'e EXECUTE verilmez (savunma derinliği: şema bir gün
--    yanlışlıkla açığa çıksa bile e-posta/kurum bilgisi sızmaz).
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.institution_active(p_inst uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM institutions i
                  WHERE i.id = p_inst AND (i.expires_at IS NULL OR i.expires_at > now()))
$$;

-- Oturumdaki kullanıcı bu kurumun YÖNETİCİSİ mi (ve kurum süresi dolmamış mı)?
CREATE OR REPLACE FUNCTION private.is_institution_admin(p_inst uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
     AND private.institution_active(p_inst)
     AND EXISTS (SELECT 1 FROM institution_members m
                  WHERE m.institution_id = p_inst AND m.user_id = auth.uid() AND m.role = 'admin')
$$;

-- Dönem başlangıcı (İstanbul takvim günü, bugün dahil): p_back = kaç gün geriye kaydırılacağı.
--   period_start(7, 0)  → 6 gün önceki günün 00:00'ı (bu dönem)
--   period_start(7, 7)  → bir önceki dönemin başlangıcı
CREATE OR REPLACE FUNCTION private.period_start(p_days integer, p_back integer DEFAULT 0)
RETURNS timestamptz
LANGUAGE sql STABLE SET search_path = public, pg_temp
AS $$
  SELECT ((((now() AT TIME ZONE 'Europe/Istanbul')::date - (p_days - 1) - p_back))::timestamp) AT TIME ZONE 'Europe/Istanbul'
$$;

-- Kurumun OKUNABİLİR öğrencileri (üye öğretmenlerin sınıflarından); YÖNETİCİ değilse boş.
--   hidden = kardeşli hesap (ad/sayı dışarıda). child_id = tek çocuklu hesapta o çocuğun profili:
--   skorlar öğretmen panelindeki kuralla (child_id eşleşmesi) sayılır. p_class: yalnız o sınıf (filtre içeride).
DROP FUNCTION IF EXISTS private.institution_students(uuid);
CREATE OR REPLACE FUNCTION private.institution_students(p_inst uuid, p_class uuid DEFAULT NULL)
RETURNS TABLE (class_id uuid, student_id uuid, email text, hidden boolean,
               child_id uuid, child_name text, child_age_months integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT cs.class_id::uuid, cs.id::uuid, e.em::text,
         (private.child_count_for_email(e.em) > 1)::boolean,
         cp.child_id::uuid,
         coalesce(cp.child_name, pf.child_name)::text,
         coalesce(cp.child_age_months, pf.child_age_months)::integer
    FROM institution_members m
    JOIN classes c ON c.teacher_id = m.user_id
    JOIN class_students cs ON cs.class_id = c.id
   CROSS JOIN LATERAL (SELECT lower(btrim(cs.child_email)) AS em) e
    LEFT JOIN LATERAL (
      SELECT ch.id AS child_id, ch.child_name, ch.child_age_months
        FROM profiles pr JOIN child_profiles ch ON ch.user_id = pr.user_id
       WHERE lower(pr.email) = e.em
       ORDER BY ch.created_at, ch.id LIMIT 1) cp ON true
    LEFT JOIN LATERAL (
      SELECT pr.child_name, pr.child_age_months
        FROM profiles pr WHERE lower(pr.email) = e.em
       ORDER BY pr.user_id LIMIT 1) pf ON true
   WHERE m.institution_id = p_inst
     AND private.is_institution_admin(p_inst)
     AND (p_class IS NULL OR cs.class_id = p_class)
     AND private.class_row_readable(cs.class_id, cs.accepted_at, cs.accepted_via, cs.child_email, cs.accepted_user_id)
$$;

REVOKE ALL ON FUNCTION private.institution_active(uuid), private.is_institution_admin(uuid),
                       private.period_start(integer, integer), private.institution_students(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.institution_active(uuid), private.is_institution_admin(uuid),
                          private.period_start(integer, integer), private.institution_students(uuid, uuid)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 3) YÖNETİCİ fonksiyonları (hepsi: yönetici değilse BOŞ küme; başka kurumun id'si ayırt edilemez)
--    p_days 1..90 aralığına kırpılır. Skor satırı: created_at <= now(); süre ≤ 24 sa, doğru/yanlış ≤ 1000 (kırpılır).
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.my_admin_institutions();
DROP FUNCTION IF EXISTS public.institution_overview(uuid, integer);
DROP FUNCTION IF EXISTS public.institution_activity_daily(uuid, integer);
DROP FUNCTION IF EXISTS public.institution_games_by_type(uuid, integer);
DROP FUNCTION IF EXISTS public.institution_classes(uuid, integer);
DROP FUNCTION IF EXISTS public.institution_class_children(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.my_class_institutions();

-- Yöneticisi olduğum kurumlar
CREATE FUNCTION public.my_admin_institutions()
RETURNS TABLE (institution_id uuid, name text, expires_at timestamptz, teacher_count bigint, class_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT i.id::uuid, left(i.name, 120)::text, i.expires_at::timestamptz,
         (SELECT count(*) FROM institution_members t
           WHERE t.institution_id = i.id AND EXISTS (SELECT 1 FROM classes c WHERE c.teacher_id = t.user_id))::bigint,
         (SELECT count(*) FROM institution_members t JOIN classes c ON c.teacher_id = t.user_id
           WHERE t.institution_id = i.id)::bigint
    FROM institutions i
   WHERE private.is_institution_admin(i.id)
   ORDER BY i.name, i.id
$$;

-- Genel özet (+ bir önceki aynı uzunlukta dönemle karşılaştırma için prev_*)
CREATE FUNCTION public.institution_overview(p_institution uuid, p_days integer DEFAULT 7)
RETURNS TABLE (teacher_count bigint, class_count bigint, child_count bigint, hidden_count bigint,
               active_children bigint, game_count bigint, total_seconds bigint,
               correct_total bigint, error_total bigint,
               prev_active_children bigint, prev_game_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  d       integer     := least(greatest(coalesce(p_days, 7), 1), 90);
  v_from  timestamptz := private.period_start(least(greatest(coalesce(p_days, 7), 1), 90), 0);
  v_prev  timestamptz := private.period_start(least(greatest(coalesce(p_days, 7), 1), 90),
                                              least(greatest(coalesce(p_days, 7), 1), 90));
BEGIN
  IF NOT private.is_institution_admin(p_institution) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH st AS (SELECT * FROM private.institution_students(p_institution)),
       kids AS (SELECT DISTINCT s.email AS kemail, s.child_id AS kchild FROM st s WHERE NOT s.hidden),
       sc AS (
         SELECT k.kemail AS email, o.created_at,
                least(greatest(coalesce(o.sure, 0), 0), 86400) AS secs,
                least(greatest(coalesce(o.correct_answers, 0), 0), 1000) AS cor,
                least(greatest(coalesce(o.hata_sayisi, 0), 0), 1000) AS err
           FROM kids k
           JOIN oyun_skorlari o ON lower(o.email) = k.kemail AND (k.kchild IS NULL OR o.child_id = k.kchild)
          WHERE o.created_at >= v_prev AND o.created_at <= now()),
       cur AS (SELECT * FROM sc WHERE created_at >= v_from),
       prv AS (SELECT * FROM sc WHERE created_at <  v_from)
  SELECT
    (SELECT count(*) FROM institution_members m
      WHERE m.institution_id = p_institution
        AND EXISTS (SELECT 1 FROM classes c WHERE c.teacher_id = m.user_id))::bigint,
    (SELECT count(*) FROM institution_members m JOIN classes c ON c.teacher_id = m.user_id
      WHERE m.institution_id = p_institution)::bigint,
    (SELECT count(DISTINCT kemail) FROM kids)::bigint,
    (SELECT count(DISTINCT s.email) FROM st s WHERE s.hidden)::bigint,
    (SELECT count(DISTINCT email) FROM cur)::bigint,
    (SELECT count(*) FROM cur)::bigint,
    (SELECT coalesce(sum(secs), 0) FROM cur)::bigint,
    (SELECT coalesce(sum(cor), 0) FROM cur)::bigint,
    (SELECT coalesce(sum(err), 0) FROM cur)::bigint,
    (SELECT count(DISTINCT email) FROM prv)::bigint,
    (SELECT count(*) FROM prv)::bigint;
END;
$$;

-- Günlük etkinlik (boş günler 0 olarak gelir; günler İstanbul takvim günüdür, özetle aynı pencere)
CREATE FUNCTION public.institution_activity_daily(p_institution uuid, p_days integer DEFAULT 7)
RETURNS TABLE (day date, game_count bigint, active_children bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  d      integer     := least(greatest(coalesce(p_days, 7), 1), 90);
  today  date        := (now() AT TIME ZONE 'Europe/Istanbul')::date;
  v_from timestamptz := private.period_start(least(greatest(coalesce(p_days, 7), 1), 90), 0);
BEGIN
  IF NOT private.is_institution_admin(p_institution) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH kids AS (SELECT DISTINCT s.email AS kemail, s.child_id AS kchild
                  FROM private.institution_students(p_institution) s WHERE NOT s.hidden),
       sc AS (
         SELECT k.kemail AS email, (o.created_at AT TIME ZONE 'Europe/Istanbul')::date AS dy
           FROM kids k
           JOIN oyun_skorlari o ON lower(o.email) = k.kemail AND (k.kchild IS NULL OR o.child_id = k.kchild)
          WHERE o.created_at >= v_from AND o.created_at <= now())
  SELECT g.dy::date,
         count(sc.email)::bigint,
         count(DISTINCT sc.email)::bigint
    FROM generate_series((today - (d - 1))::timestamp, today::timestamp, interval '1 day') AS g(dy)
    LEFT JOIN sc ON sc.dy = g.dy::date
   GROUP BY g.dy
   ORDER BY g.dy;
END;
$$;

-- Oyun türüne göre sayılar (alan eşlemesi istemcide: constants/maarifMap.ts tek kaynak)
CREATE FUNCTION public.institution_games_by_type(p_institution uuid, p_days integer DEFAULT 7)
RETURNS TABLE (oyun_turu text, game_count bigint, child_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_from timestamptz := private.period_start(least(greatest(coalesce(p_days, 7), 1), 90), 0);
BEGIN
  IF NOT private.is_institution_admin(p_institution) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH kids AS (SELECT DISTINCT s.email AS kemail, s.child_id AS kchild
                  FROM private.institution_students(p_institution) s WHERE NOT s.hidden)
  SELECT o.oyun_turu::text, count(*)::bigint, count(DISTINCT k.kemail)::bigint
    FROM kids k
    JOIN oyun_skorlari o ON lower(o.email) = k.kemail AND (k.kchild IS NULL OR o.child_id = k.kchild)
   WHERE o.created_at >= v_from AND o.created_at <= now()
     AND o.oyun_turu IS NOT NULL
   GROUP BY o.oyun_turu
   ORDER BY count(*) DESC, o.oyun_turu
   LIMIT 300;
END;
$$;

-- Sınıf özeti (bir çocuk iki sınıftaysa iki sınıfta da sayılır; kurum toplamında bir kez)
CREATE FUNCTION public.institution_classes(p_institution uuid, p_days integer DEFAULT 7)
RETURNS TABLE (class_id uuid, class_name text, teacher_name text, child_count bigint, hidden_count bigint,
               active_children bigint, game_count bigint, last_played_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_from timestamptz := private.period_start(least(greatest(coalesce(p_days, 7), 1), 90), 0);
BEGIN
  IF NOT private.is_institution_admin(p_institution) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH st AS (SELECT * FROM private.institution_students(p_institution)),
       ps AS (
         SELECT s.class_id AS cid, s.email AS pemail, a.games, a.last_at
           FROM st s
           LEFT JOIN LATERAL (
             SELECT count(*) FILTER (WHERE o.created_at >= v_from) AS games, max(o.created_at) AS last_at
               FROM oyun_skorlari o
              WHERE lower(o.email) = s.email AND (s.child_id IS NULL OR o.child_id = s.child_id)
                AND o.created_at <= now()) a ON true
          WHERE NOT s.hidden)
  SELECT c.id::uuid,
         left(c.name, 80)::text,
         left(t.name, 80)::text,
         (SELECT count(*) FROM ps WHERE ps.cid = c.id)::bigint,
         (SELECT count(*) FROM st s WHERE s.class_id = c.id AND s.hidden)::bigint,
         (SELECT count(*) FROM ps WHERE ps.cid = c.id AND coalesce(ps.games, 0) > 0)::bigint,
         (SELECT coalesce(sum(ps.games), 0) FROM ps WHERE ps.cid = c.id)::bigint,
         (SELECT max(ps.last_at) FROM ps WHERE ps.cid = c.id)::timestamptz
    FROM institution_members m
    JOIN classes c ON c.teacher_id = m.user_id
    LEFT JOIN teachers t ON t.user_id = c.teacher_id
   WHERE m.institution_id = p_institution
   ORDER BY t.name NULLS LAST, c.name, c.id;
END;
$$;

-- Bir sınıfın çocukları: ad + yaş + son oynama + özet sayılar. Çizim/AI/veli bilgisi/e-posta YOK.
-- Kardeşli hesap: ad ve sayılar NULL, hidden = true.
CREATE FUNCTION public.institution_class_children(p_institution uuid, p_class_id uuid, p_days integer DEFAULT 7)
RETURNS TABLE (student_id uuid, child_name text, child_age_months integer, hidden boolean,
               game_count bigint, correct_total bigint, error_total bigint, last_played_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
DECLARE
  v_from timestamptz := private.period_start(least(greatest(coalesce(p_days, 7), 1), 90), 0);
BEGIN
  IF p_class_id IS NULL OR NOT private.is_institution_admin(p_institution) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT s.student_id::uuid,
         (CASE WHEN NOT s.hidden THEN left(s.child_name, 60) END)::text,
         (CASE WHEN NOT s.hidden THEN s.child_age_months END)::integer,
         s.hidden::boolean,
         (CASE WHEN NOT s.hidden THEN a.games END)::bigint,
         (CASE WHEN NOT s.hidden THEN a.cor END)::bigint,
         (CASE WHEN NOT s.hidden THEN a.err END)::bigint,
         (CASE WHEN NOT s.hidden THEN a.last_at END)::timestamptz
    FROM private.institution_students(p_institution, p_class_id) s
    LEFT JOIN LATERAL (
      SELECT count(*) FILTER (WHERE o.created_at >= v_from) AS games,
             coalesce(sum(least(greatest(coalesce(o.correct_answers, 0), 0), 1000)) FILTER (WHERE o.created_at >= v_from), 0) AS cor,
             coalesce(sum(least(greatest(coalesce(o.hata_sayisi, 0), 0), 1000)) FILTER (WHERE o.created_at >= v_from), 0) AS err,
             max(o.created_at) AS last_at
        FROM oyun_skorlari o
       WHERE NOT s.hidden AND lower(o.email) = s.email AND (s.child_id IS NULL OR o.child_id = s.child_id)
         AND o.created_at <= now()) a ON true
   ORDER BY s.hidden, lower(s.child_name), s.student_id;
END;
$$;

REVOKE ALL ON FUNCTION public.my_admin_institutions(),
                       public.institution_overview(uuid, integer),
                       public.institution_activity_daily(uuid, integer),
                       public.institution_games_by_type(uuid, integer),
                       public.institution_classes(uuid, integer),
                       public.institution_class_children(uuid, uuid, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_admin_institutions(),
                          public.institution_overview(uuid, integer),
                          public.institution_activity_daily(uuid, integer),
                          public.institution_games_by_type(uuid, integer),
                          public.institution_classes(uuid, integer),
                          public.institution_class_children(uuid, uuid, integer)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) VELİ bilgilendirmesi: çocuğumun sınıfı hangi kuruma bağlı?
--    Velinin kendi sınıf kayıtları için kurum ADI döner (kurum yöneticisinin toplu özet görebildiğini
--    bilmesi için). Başka hiçbir bilgi dönmez. Kayıt başına tek satır (öğretmen iki kurumdaysa ilk ad).
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.my_class_institutions()
RETURNS TABLE (invite_id uuid, institution_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT DISTINCT ON (cs.id) cs.id::uuid, left(i.name, 120)::text
    FROM class_students cs
    JOIN classes c ON c.id = cs.class_id
    JOIN institution_members m ON m.user_id = c.teacher_id
    JOIN institutions i ON i.id = m.institution_id AND (i.expires_at IS NULL OR i.expires_at > now())
   WHERE nullif(auth.email(), '') IS NOT NULL
     AND lower(btrim(cs.child_email)) = lower(btrim(auth.email()))
   ORDER BY cs.id, i.name
   LIMIT 50
$$;

REVOKE ALL ON FUNCTION public.my_class_institutions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_class_institutions() TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Sonuç özeti + PostgREST şema önbelleğini yenile
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'kurum paneli tamam: % kurum, % üyelik', (SELECT count(*) FROM public.institutions), (SELECT count(*) FROM public.institution_members);
END $$;

NOTIFY pgrst, 'reload schema';
