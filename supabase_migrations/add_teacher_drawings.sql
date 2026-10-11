-- ============================================================================
-- ÖĞRETMEN ÇİZİM ARAYÜZÜ: onaylı öğrencilerin çizimlerini özel 'cizimler' kovasından görme
-- ============================================================================
-- Karar (kullanıcı, 2026-09-20): çizimler öğretmene AÇIK; kurum yöneticisi çizim GÖRMEZ (bu dosya yöneticiye
-- hiçbir şey açmaz). Çizim dosyaları özel kovada (private_cizimler_bucket.sql) ve yalnız admin okuyabiliyordu.
--
-- Bu dosya:
--   1) private.drawing_path_of(jsonb)       : cizim_verisi'nden depo yolunu (imagePath ya da eski imageUrl) çıkarır;
--                                              jsonb nesne VEYA jsonb-içinde-metin (text kolon) kabul eder, bozuk veride NULL döner.
--   2) private.drawing_owned_by(yol, e-posta): depo nesnesini yükleyen hesap, o e-postanın veli hesabı mı?
--   3) private.teacher_can_read_drawing(yol) : oturumdaki öğretmen bu çizimi görebilir mi? (kendi sınıfı + kayıt OKUNABİLİR +
--                                              tek çocuklu hesap + öğretmen paneliyle aynı child_id kuralı + yükleyen = velinin hesabı)
--   4) storage.objects SELECT politikası     : yalnız (3) doğruysa öğretmen imzalı URL üretebilir.
--   5) public.teacher_student_drawings(id)   : bir öğrencinin çizim listesi (yol + tarih + oyun); ağır alan (base64) DÖNMEZ.
--
-- NEDEN "yükleyen = velinin hesabı": cizim_verisi'ni veli kendi skor satırına yazar (own_insert_scores yalnız e-postaya bakar).
-- Kötü niyetli bir veli, kendi satırına BAŞKA çocuğun dosya yolunu yazıp öğretmene o çizimi gösterttirmeye çalışabilir.
-- Depo nesnesinin sahibi (storage.objects.owner/owner_id = yükleyen oturumun kullanıcısı) ile skor satırının sahibi
-- (profiles.user_id) EŞLEŞMEDİKÇE çizim görünmez; oturumsuz (anon anahtarlı) yüklemelerde sahip boştur → kapalı kalır.
--
-- ÖN KOŞUL: add_child_profiles.sql, add_class_consent.sql ve private_cizimler_bucket.sql canlıda çalışmış olmalı.
-- GERİ ALMA: rollback_teacher_drawings.sql
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('storage.objects') IS NULL THEN
    RAISE EXCEPTION 'storage.objects bulunamadı (Supabase Storage etkin olmalı)';
  END IF;
  IF to_regprocedure('private.class_row_readable(uuid,timestamptz,text,text,uuid)') IS NULL
     OR to_regprocedure('private.child_count_for_email(text)') IS NULL THEN
    RAISE EXCEPTION 'Önce supabase_migrations/add_child_profiles.sql ve add_class_consent.sql çalıştırılmalı';
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 1) cizim_verisi → depo yolu --------------------------------------------------
CREATE OR REPLACE FUNCTION private.drawing_path_of(p_raw jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  o    jsonb := p_raw;
  path text;
  url  text;
BEGIN
  IF o IS NULL THEN RETURN NULL; END IF;
  IF jsonb_typeof(o) = 'string' THEN               -- text kolon: JSON metni jsonb-metin olarak gelir
    BEGIN
      o := (o #>> '{}')::jsonb;
    EXCEPTION WHEN others THEN
      RETURN NULL;
    END;
  END IF;
  IF o IS NULL OR jsonb_typeof(o) <> 'object' THEN RETURN NULL; END IF;
  path := o ->> 'imagePath';
  IF path IS NULL THEN
    url := o ->> 'imageUrl';
    IF url IS NOT NULL THEN
      path := substring(url FROM '/object/(?:public/)?cizimler/(.+)$');
    END IF;
  END IF;
  -- savunma: boş / aşırı uzun / üst dizine çıkan yollar geçersiz
  IF path IS NULL OR btrim(path) = '' OR length(path) > 300 OR position('..' IN path) > 0 THEN RETURN NULL; END IF;
  RETURN path;
END;
$$;

-- 2) yükleyen = o e-postanın veli hesabı mı ----------------------------------------
-- (owner / owner_id kolon adı Supabase sürümüne göre değişir; to_jsonb ile her ikisi de güvenle okunur.)
CREATE OR REPLACE FUNCTION private.drawing_owned_by(p_name text, p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_name IS NOT NULL AND p_email IS NOT NULL AND EXISTS (
    SELECT 1
      FROM storage.objects o
      JOIN profiles pr ON lower(pr.email) = lower(btrim(p_email))
     WHERE o.bucket_id = 'cizimler'
       AND o.name = p_name
       AND pr.user_id IS NOT NULL
       AND coalesce(to_jsonb(o) ->> 'owner_id', to_jsonb(o) ->> 'owner') = pr.user_id::text)
$$;

-- 3) oturumdaki öğretmen bu çizimi görebilir mi ------------------------------------
CREATE OR REPLACE FUNCTION private.teacher_can_read_drawing(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_name IS NOT NULL AND auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
      FROM classes c
      JOIN class_students cs ON cs.class_id = c.id
     CROSS JOIN LATERAL (SELECT lower(btrim(cs.child_email)) AS em) e
      LEFT JOIN LATERAL (
        SELECT ch.id AS child_id
          FROM profiles pr JOIN child_profiles ch ON ch.user_id = pr.user_id
         WHERE lower(pr.email) = e.em
         ORDER BY ch.created_at, ch.id LIMIT 1) cp ON true
      JOIN oyun_skorlari s ON lower(s.email) = e.em AND (cp.child_id IS NULL OR s.child_id = cp.child_id)
     WHERE c.teacher_id = auth.uid()
       AND private.class_row_readable(cs.class_id, cs.accepted_at, cs.accepted_via, cs.child_email, cs.accepted_user_id)
       AND private.child_count_for_email(e.em) <= 1
       AND s.cizim_verisi IS NOT NULL
       AND private.drawing_path_of(to_jsonb(s.cizim_verisi)) = p_name
       AND private.drawing_owned_by(p_name, e.em))
$$;

REVOKE ALL ON FUNCTION private.drawing_path_of(jsonb), private.drawing_owned_by(text, text),
                       private.teacher_can_read_drawing(text) FROM PUBLIC, anon;
-- Politika ifadesi çağıran rolle (authenticated) değerlendirilir → yalnız bu üçlüye EXECUTE gerekir.
-- drawing_owned_by yalnız (3) içinden çağrılır; yine de doğrudan çağrılırsa "bu yol bu e-postanın mı" bilgisini
-- sızdırmasın diye authenticated'e VERİLMEZ.
GRANT EXECUTE ON FUNCTION private.drawing_path_of(jsonb), private.teacher_can_read_drawing(text) TO authenticated;
GRANT EXECUTE ON FUNCTION private.drawing_path_of(jsonb), private.drawing_owned_by(text, text),
                          private.teacher_can_read_drawing(text) TO service_role;

-- 4) depo politikası: öğretmen okuma (imzalı URL dahil) -------------------------------
DROP POLICY IF EXISTS "teacher_read_cizimler" ON storage.objects;
CREATE POLICY "teacher_read_cizimler" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'cizimler' AND private.teacher_can_read_drawing(name));

-- 5) öğrencinin çizim listesi ------------------------------------------------------
DROP FUNCTION IF EXISTS public.teacher_student_drawings(uuid, integer);
CREATE FUNCTION public.teacher_student_drawings(p_student_id uuid, p_limit integer DEFAULT 12)
RETURNS TABLE (score_id bigint, created_at timestamptz, oyun_turu text, image_path text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
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
    RETURN;                                  -- başkasının / onaysız / olmayan kayıt: boş küme
  END IF;
  v_email := lower(btrim(v_email));
  IF private.child_count_for_email(v_email) > 1 THEN
    RETURN;                                  -- kardeşli hesap: öğretmen panelindeki kuralla aynı
  END IF;

  SELECT ch.id INTO v_child
    FROM profiles pr JOIN child_profiles ch ON ch.user_id = pr.user_id
   WHERE lower(pr.email) = v_email
   ORDER BY ch.created_at, ch.id LIMIT 1;

  RETURN QUERY
  SELECT s.id::bigint, s.created_at::timestamptz, s.oyun_turu::text, private.drawing_path_of(to_jsonb(s.cizim_verisi))::text
    FROM oyun_skorlari s
   WHERE lower(s.email) = v_email
     AND (v_child IS NULL OR s.child_id = v_child)
     AND s.cizim_verisi IS NOT NULL
     AND private.drawing_path_of(to_jsonb(s.cizim_verisi)) IS NOT NULL
     AND private.drawing_owned_by(private.drawing_path_of(to_jsonb(s.cizim_verisi)), v_email)
   ORDER BY s.created_at DESC, s.id DESC
   LIMIT least(greatest(coalesce(p_limit, 12), 1), 40);
END;
$$;

REVOKE ALL ON FUNCTION public.teacher_student_drawings(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_student_drawings(uuid, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
