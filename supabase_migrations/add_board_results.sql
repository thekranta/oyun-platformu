-- ============================================================================
-- TAHTA MODU SONUÇ KAYDI — öğretmen, tahtada oynayan çocuğun sonucunu çocuğun dosyasına kaydeder
-- ============================================================================
-- ÜRÜN KARARI (2026-11-06): Tahta Modu'nda "Sıra kimde?" ile seçilen çocuğun oyun sonucu, öğretmenin onayıyla
-- (oyun bitince "Elif için kaydedilsin mi?") çocuğun kaydına yazılır. Sonuç veli panelinde, öğretmenin öğrenci
-- geçmişinde ve yapay zekâ özetlerinde diğer sonuçlarla birlikte görünür. Satır "sınıfta" diye ETİKETLENİR
-- (kaynak = 'tahta'): tahtadaki oyun grupla ve öğretmen eşliğinde oynanır, evdeki bireysel sonuçla aynı
-- sayılırsa raporlar yanıltır.
--
-- GÜVENLİK MODELİ (DEĞİŞMEYEN KURAL): öğretmen, çocuğun satırına DOĞRUDAN yazamaz (own_insert_scores yalnız
-- email = auth.email() ister). Bu dosya o kuralı GEVŞETMEZ; yalnız Sınıf Bahçesi'nin "ödül ver" kapısıyla
-- (teacher_award_reward, add_class_rewards.sql) AYNI kontrolleri yapan tek bir SECURITY DEFINER fonksiyon açar:
--   * kendi sınıfı + ücretli sınıf paketi (Çınar/Meşe, süresi dolmamış) + kayıt şu an GÖRÜNÜR
--     (private.class_row_readable: veli onaylı ya da paketle açık);
--   * kardeşli (birden çok çocuklu) hesaplara yazılmaz (kardeş ayrımı gelene kadar; okuma tarafıyla aynı kural);
--   * her red durumunda tek tip 'not_found' (hangi şartın tutmadığı dışarıdan ayırt edilemez).
-- Satırın kaynağı SUNUCUDA zorlanır (kaynak = 'tahta' + kaydeden öğretmen); istemci bunu belirleyemez:
-- oyun_skorlari tetikleyicisi, bu fonksiyonun işlem içinde açtığı bayrak (app.minizeka_board_write) olmadan
-- gelen her güvenilmeyen INSERT'te kaynak/kaydeden alanlarını SIFIRLAR (veli kendi satırına "sınıfta" yazamaz).
-- Bayrak yalnız bu fonksiyonun işlemi için geçerlidir (set_config is_local = true); PostgREST istemcisi
-- keyfi bir ayar yazamaz.
--
-- SUNUCUDA ZORLANAN SINIRLAR: oyun adı 1-60 karakter (normal oyun kaydıyla aynı ad; biçim serbest); süre 0-7200 sn; hamle/hata 0-10000;
-- doğru 0-1000; zorluk 0-20; deneme 0-1000; kazanım en çok 120 karakter; tur geçmişi en çok 30000 karakter ve
-- geçerli JSON; çift dokunuş: aynı öğretmen + çocuk + oyun için 20 sn içinde ikinci kayıt YAZILMAZ (var olan
-- kaydın kimliği döner); bir çocuğa 24 saatte en çok 20 tahta kaydı ('rate_limited'). Çizim verisi KAYDEDİLMEZ.
--
-- ÖN KOŞULLAR (aşağıdaki DO bloğu yoksa çalışmayı REDDEDER): add_child_profiles.sql, add_class_consent.sql,
-- add_oyun_skorlari_write_guard.sql. (Sınıf Bahçesi'nin kendisi gerekmez.)
--
-- SIRA: 1) BU SQL  2) istemci sürümü (yeni istemci, SQL yokken "kayıt henüz açık değil" der ve kayıt düğmesini
-- bırakır; çökmez). Eski istemci bu dosyadan etkilenmez: yeni sütunlar NULL olabilir, teacher_student_scores'a
-- yalnız bir sütun eklenir.
--
-- ACİL GERİ ALMA: supabase_migrations/rollback_board_results.sql (fonksiyonu kaldırır; yazılmış satırlar kalır).
-- KONTROL: supabase_migrations/board_results_dogrulama.sql (salt okunur).
--
-- Bu SQL'i Supabase SQL Editor'da TEK SEFERDE çalıştırın (tek işlem gibi davranır; hata olursa hiçbir şey
-- uygulanmaz). Tekrar çalıştırılabilir.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Ön kontroller
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.oyun_skorlari') IS NULL OR to_regclass('public.class_students') IS NULL
     OR to_regclass('public.classes') IS NULL OR to_regclass('public.profiles') IS NULL
     OR to_regclass('public.child_profiles') IS NULL OR to_regclass('public.admins') IS NULL THEN
    RAISE EXCEPTION 'oyun_skorlari / class_students / classes / profiles / child_profiles / admins tabloları bulunamadı';
  END IF;
  IF to_regprocedure('private.class_row_readable(uuid, timestamptz, text, text, uuid)') IS NULL
     OR to_regprocedure('private.class_owner_is_paid(uuid)') IS NULL
     OR to_regprocedure('private.child_count_for_email(text)') IS NULL
     OR to_regprocedure('public.teacher_student_scores(uuid, integer, boolean)') IS NULL THEN
    RAISE EXCEPTION 'Önce supabase_migrations/add_child_profiles.sql ve add_class_consent.sql çalıştırılmalı';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_oyun_skorlari_before_write' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Önce supabase_migrations/add_oyun_skorlari_write_guard.sql çalıştırılmalı';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1) Satırın kaynağı: kaynak (NULL = çocuğun/velinin kendi oyunu, 'tahta' = sınıf tahtası) + kaydeden öğretmen
-- ---------------------------------------------------------------------------
-- kaydeden_ogretmen: öğretmen hesabı silinirse NULL olur, satır (çocuğun verisi) KALIR.
ALTER TABLE public.oyun_skorlari
  ADD COLUMN IF NOT EXISTS kaynak text,
  ADD COLUMN IF NOT EXISTS kaydeden_ogretmen uuid REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'oyun_skorlari_kaynak_check' AND conrelid = 'public.oyun_skorlari'::regclass) THEN
    ALTER TABLE public.oyun_skorlari
      ADD CONSTRAINT oyun_skorlari_kaynak_check CHECK (kaynak IS NULL OR kaynak = 'tahta') NOT VALID;
    ALTER TABLE public.oyun_skorlari VALIDATE CONSTRAINT oyun_skorlari_kaynak_check;
  END IF;
END $$;

-- Öğretmen hesabı silinirken ON DELETE SET NULL tabloyu taramasın (yalnız dolu satırları dizinler; başta boştur).
CREATE INDEX IF NOT EXISTS idx_oyun_skorlari_kaydeden
  ON public.oyun_skorlari (kaydeden_ogretmen) WHERE kaydeden_ogretmen IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2) oyun_skorlari yazma koruması: kaynak/kaydeden alanları yalnız tahta fonksiyonundan gelebilir
-- ---------------------------------------------------------------------------
-- add_oyun_skorlari_write_guard.sql'deki tetikleyici AYNEN korunur (onay alanları sıfırlanır; güvenilmeyen
-- UPDATE'te yalnız kumulatif_ai_yorumu değişebilir: yeni sütunlar to_jsonb farkıyla otomatik kapsanır),
-- üstüne INSERT'te kaynak/kaydeden sıfırlaması eklenir.
CREATE OR REPLACE FUNCTION public.oyun_skorlari_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trusted boolean;
  v_board   boolean;
BEGIN
  v_trusted := coalesce(auth.role(), '') = 'service_role'
            OR (auth.uid() IS NULL AND auth.role() IS NULL)
            OR EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid());

  -- Yalnız teacher_save_board_result bu bayrağı (işlem içinde) açar.
  v_board := coalesce(current_setting('app.minizeka_board_write', true), '') = 'on';

  IF TG_OP = 'INSERT' THEN
    IF NOT v_trusted THEN
      NEW.onay_durumu := NULL;
      NEW.uzman_onayi := NULL;
      NEW.onaylayan_uzman := NULL;
      NEW.uzman_oylamalari := NULL;
      IF NOT v_board THEN
        NEW.kaynak := NULL;
        NEW.kaydeden_ogretmen := NULL;
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- TG_OP = 'UPDATE': güvenilmeyen bağlamda yalnız kumulatif_ai_yorumu değişebilir.
  IF NOT v_trusted THEN
    IF (to_jsonb(NEW) - 'kumulatif_ai_yorumu') IS DISTINCT FROM (to_jsonb(OLD) - 'kumulatif_ai_yorumu') THEN
      RAISE EXCEPTION 'oyun_skorlari_update_forbidden';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.oyun_skorlari_before_write() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) ÖĞRETMEN: tahtada oynayan çocuğun sonucunu kaydet
-- ---------------------------------------------------------------------------
-- Dönen değer yeni (ya da 20 sn içindeki aynı) kaydın kimliğidir. Tur geçmişi (round_history) istemcinin zaten
-- gönderdiği gibi JSON METNİ olarak alınır ve satıra metin olarak yazılır (diğer oyun kayıtlarıyla aynı biçim).
-- INSERT, sütun tiplerinden bağımsız olsun diye jsonb_populate_record üzerinden yapılır (canlı şemadaki küçük
-- tip farklarına karşı sigorta; açık sütun listesi sayesinde id/created_at varsayılanları işler).
CREATE OR REPLACE FUNCTION public.teacher_save_board_result(
  p_student_id       uuid,
  p_oyun_turu        text,
  p_sure             integer,
  p_hamle            integer,
  p_hata             integer,
  p_correct_answers  integer DEFAULT NULL,
  p_zorluk           integer DEFAULT NULL,
  p_kazanim          text    DEFAULT NULL,
  p_deneme           integer DEFAULT NULL,
  p_distance_effect  numeric DEFAULT NULL,
  p_response_time    numeric DEFAULT NULL,
  p_cognitive_speed  numeric DEFAULT NULL,
  p_visual_attention numeric DEFAULT NULL,
  p_round_history    text    DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class  uuid;
  v_email  text;
  v_ok     boolean;
  v_child  uuid;
  v_name   text;
  v_age    integer;
  v_recent bigint;
  v_count  integer;
  v_id     bigint;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  -- 1) Kapı: teacher_award_reward ile AYNI (kendi sınıfı + ücretli sınıf paketi + görünür kayıt).
  SELECT cs.class_id,
         lower(btrim(cs.child_email)),
         c.teacher_id = auth.uid()
         AND private.class_owner_is_paid(cs.class_id)
         AND private.class_row_readable(cs.class_id, cs.accepted_at, cs.accepted_via, cs.child_email, cs.accepted_user_id)
    INTO v_class, v_email, v_ok
    FROM class_students cs
    JOIN classes c ON c.id = cs.class_id
   WHERE cs.id = p_student_id;

  IF v_class IS NULL OR NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  -- Kardeşli hesap: hangi çocuk olduğu ayırt edilemez, yazılmaz (okuma tarafıyla aynı kural; aynı hata).
  IF private.child_count_for_email(v_email) > 1 THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  -- 2) Çocuk (hesapta tek): ad/yaş hesaptan gelir, istemciden DEĞİL (teacher_class_roster ile aynı kaynak).
  SELECT ch.id,
         coalesce(ch.child_name, pr.child_name),
         coalesce(ch.child_age_months, pr.child_age_months)
    INTO v_child, v_name, v_age
    FROM profiles pr
    LEFT JOIN child_profiles ch ON ch.user_id = pr.user_id
   WHERE lower(pr.email) = v_email
   ORDER BY ch.created_at NULLS LAST, ch.id
   LIMIT 1;

  IF v_name IS NULL OR btrim(v_name) = '' THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  -- 3) Girdi sınırları (isteğe bağlı alanlar NULL ise sınanmaz).
  -- Oyun adı: normal oyun kaydıyla AYNI ad yazılır; eski oyunlar 'Kodlama Oyunu', 'Sayı Komşuları', 'Yapboz - ...' gibi
  -- adlarla kayıt açar, bu yüzden biçim kısıtlanmaz: yalnız 1-60 karakter, baş/son boşluk ve denetim karakteri yok.
  IF p_oyun_turu IS NULL OR char_length(p_oyun_turu) NOT BETWEEN 1 AND 60
     OR p_oyun_turu ~ '[[:cntrl:]]' OR p_oyun_turu <> btrim(p_oyun_turu)
     OR p_sure IS NULL OR p_sure NOT BETWEEN 0 AND 7200
     OR p_hamle IS NULL OR p_hamle NOT BETWEEN 0 AND 10000
     OR p_hata IS NULL OR p_hata NOT BETWEEN 0 AND 10000
     OR p_correct_answers NOT BETWEEN 0 AND 1000
     OR p_zorluk NOT BETWEEN 0 AND 20
     OR p_deneme NOT BETWEEN 0 AND 1000
     OR char_length(p_kazanim) > 120
     OR abs(p_distance_effect) > 1000000
     OR abs(p_response_time) > 100000000
     OR abs(p_cognitive_speed) > 1000000
     OR abs(p_visual_attention) > 1000000
     OR char_length(p_round_history) > 30000 THEN
    RAISE EXCEPTION 'invalid_argument';
  END IF;

  IF p_round_history IS NOT NULL THEN
    BEGIN
      PERFORM p_round_history::jsonb;
    EXCEPTION WHEN others THEN
      RAISE EXCEPTION 'invalid_argument';
    END;
  END IF;

  -- 4) Kötüye kullanım: aynı çocuk için eşzamanlı istekler sırayla işlensin.
  PERFORM pg_advisory_xact_lock(hashtextextended('board_result:' || v_email, 11));

  -- Çift dokunuş: aynı öğretmen + çocuk + oyun için son 20 sn içinde kayıt varsa YENİ satır yazma, onu döndür.
  SELECT s.id INTO v_recent
    FROM oyun_skorlari s
   WHERE s.kaynak = 'tahta'
     AND s.kaydeden_ogretmen = auth.uid()
     AND lower(s.email) = v_email
     AND s.oyun_turu = p_oyun_turu
     AND s.created_at > now() - interval '20 seconds'
   ORDER BY s.created_at DESC, s.id DESC
   LIMIT 1;
  IF v_recent IS NOT NULL THEN
    RETURN v_recent;
  END IF;

  -- Günlük sınır: bir çocuğa 24 saatte en çok 20 tahta kaydı.
  SELECT count(*) INTO v_count
    FROM oyun_skorlari s
   WHERE s.kaynak = 'tahta'
     AND lower(s.email) = v_email
     AND s.created_at > now() - interval '24 hours';
  IF v_count >= 20 THEN
    RAISE EXCEPTION 'rate_limited';
  END IF;

  -- 5) Yaz. Kaynak ve kaydeden SUNUCUDA verilir; tetikleyici bu bayrakla onları korur.
  PERFORM set_config('app.minizeka_board_write', 'on', true);

  INSERT INTO oyun_skorlari (
    oyun_turu, hamle_sayisi, hata_sayisi, ogrenci_adi, ogrenci_yasi, sure, email, child_id,
    zorluk_seviyesi, kazanim_odagi, deneme_no, distance_effect, response_time, round_history,
    correct_answers, cognitive_speed_score, visual_attention_score, kaynak, kaydeden_ogretmen)
  SELECT r.oyun_turu, r.hamle_sayisi, r.hata_sayisi, r.ogrenci_adi, r.ogrenci_yasi, r.sure, r.email, r.child_id,
         r.zorluk_seviyesi, r.kazanim_odagi, r.deneme_no, r.distance_effect, r.response_time, r.round_history,
         r.correct_answers, r.cognitive_speed_score, r.visual_attention_score, r.kaynak, r.kaydeden_ogretmen
    FROM jsonb_populate_record(NULL::public.oyun_skorlari, jsonb_build_object(
           'oyun_turu', p_oyun_turu,
           'hamle_sayisi', p_hamle,
           'hata_sayisi', p_hata,
           'ogrenci_adi', v_name,
           'ogrenci_yasi', v_age,
           'sure', p_sure,
           'email', v_email,
           'child_id', v_child,
           'zorluk_seviyesi', p_zorluk,
           'kazanim_odagi', p_kazanim,
           'deneme_no', p_deneme,
           'distance_effect', p_distance_effect,
           'response_time', p_response_time,
           'round_history', p_round_history,
           'correct_answers', p_correct_answers,
           'cognitive_speed_score', p_cognitive_speed,
           'visual_attention_score', p_visual_attention,
           'kaynak', 'tahta',
           'kaydeden_ogretmen', auth.uid())) r
  RETURNING id INTO v_id;

  PERFORM set_config('app.minizeka_board_write', '', true);
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.teacher_save_board_result(
  uuid, text, integer, integer, integer, integer, integer, text, integer, numeric, numeric, numeric, numeric, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_save_board_result(
  uuid, text, integer, integer, integer, integer, integer, text, integer, numeric, numeric, numeric, numeric, text
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) ÖĞRETMEN: öğrenci geçmişi artık kaynağı da döndürür (add_class_consent.sql'deki fonksiyonun AYNISI + kaynak)
-- ---------------------------------------------------------------------------
-- Dönüş sütunları değiştiği için önce DROP gerekir (aynı desen). Gövde değişmez: yalnız onaylı kayıt, yalnız
-- tek çocuklu hesap, çizim yalnız p_with_drawings = true iken, yapay zekâ yorumunun yalnız AKADEMİK kısmı.
-- kaynak = 'tahta' satırlarını öğretmen panelinde ve öğretmen özetinin yapay zekâ isteminde "sınıfta" diye işaretlemek içindir.
DROP FUNCTION IF EXISTS public.teacher_student_scores(uuid, integer, boolean);
CREATE OR REPLACE FUNCTION public.teacher_student_scores(
  p_student_id uuid, p_limit integer DEFAULT 20, p_with_drawings boolean DEFAULT false)
RETURNS TABLE (score_id bigint, created_at timestamptz, oyun_turu text, hamle_sayisi bigint, hata_sayisi bigint,
               sure bigint, correct_answers integer, zorluk_seviyesi integer, kazanim_odagi text,
               cizim_verisi jsonb, ai_akademik text, kaynak text)
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
  v_email := lower(btrim(v_email));            -- boşluklu eski kayıtlar da eşleşsin (onay/kısıt zaten btrim'lidir)
  IF private.child_count_for_email(v_email) > 1 THEN
    RETURN;
  END IF;

  SELECT ch.id INTO v_child
    FROM profiles pr JOIN child_profiles ch ON ch.user_id = pr.user_id
   WHERE lower(pr.email) = lower(v_email)
   ORDER BY ch.created_at, ch.id LIMIT 1;

  RETURN QUERY
  -- (RETURN QUERY sütun tiplerini birebir ister; açık dönüşümler canlı şemadaki küçük tip farklarına karşı
  -- sigortadır. to_jsonb: cizim_verisi canlıda jsonb da olsa text de olsa çalışır.)
  SELECT s.id::bigint, s.created_at::timestamptz, s.oyun_turu::text, s.hamle_sayisi::bigint, s.hata_sayisi::bigint,
         s.sure::bigint, s.correct_answers::integer, s.zorluk_seviyesi::integer, s.kazanim_odagi::text,
         (CASE WHEN coalesce(p_with_drawings, false) THEN to_jsonb(s.cizim_verisi) END)::jsonb,
         (CASE WHEN s.onay_durumu = 'onaylandi' THEN private.ai_academic_part(s.yapay_zeka_yorumu) END)::text,
         s.kaynak::text
    FROM oyun_skorlari s
   WHERE lower(s.email) = lower(v_email)
     AND (v_child IS NULL OR s.child_id = v_child)
   ORDER BY s.created_at DESC, s.id DESC
   LIMIT least(greatest(coalesce(p_limit, 20), 1), 100);
END;
$$;

REVOKE ALL ON FUNCTION public.teacher_student_scores(uuid, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_student_scores(uuid, integer, boolean) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5) Sonuç özeti
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'tahta sonuç kaydı tamam: kaynak/kaydeden_ogretmen sütunları, tetikleyici bayrağı, teacher_save_board_result ve kaynaklı teacher_student_scores hazır.';
END $$;

NOTIFY pgrst, 'reload schema';
