-- ============================================================================
-- DÜZELTME: owner hesabı, sınıfa öğrenci eklerken veli engelini AŞAMAZ
-- ============================================================================
-- SORUN: add_class_consent.sql'deki class_students_before_insert tetikleyicisi, "güvenilir bağlam" olarak
-- owners tablosundaki hesapları da muaf tutuyordu. Owner hesabı aynı zamanda öğretmen olarak uygulamadan
-- öğrenci eklerse: velinin reddi/çıkışı (class_blocks), öğretmen başına öğrenci sınırı ve e-posta biçimi
-- doğrulaması ATLANIYORDU (veli reddettikten sonra owner-öğretmen onu yeniden ekleyebiliyordu).
--
-- DÜZELTME: güvenilir bağlam yalnız service_role ve SQL Editor (JWT'siz destek işlemleri). Owner hesabı
-- öğretmen olarak eklerken sıradan öğretmen gibi işlem görür. (Onay durumu zaten hiçbir istemci hesabı
-- tarafından yazılamaz: kolon izni yok.)
--
-- ÖN KOŞUL: add_class_consent.sql uygulanmış olmalı (yoksa çalışmayı reddeder).
-- Yalnız fonksiyon gövdesini değiştirir; tetikleyici, veri ve izinler aynen kalır. Tekrar çalıştırılabilir.
-- Aynı değişiklik add_class_consent.sql'e de işlendi (yeniden uygulansa da geri dönmez).
-- NOT: Bu düzeltmeden ÖNCE owner hesabıyla yeniden eklenmiş kayıtlar silinmez; bakmak için
-- class_consent_engel_kontrolu.sql çalıştırılabilir.
-- ============================================================================

DO $$
BEGIN
  IF to_regprocedure('public.class_students_before_insert()') IS NULL
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_class_students_before_insert' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Önce add_class_consent.sql uygulanmalı (class_students_before_insert / tetikleyici yok)';
  END IF;
END $$;

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
  -- Güvenilir bağlam YALNIZ destek işlemleridir: service_role ve SQL Editor (JWT'siz). Owner hesabı
  -- uygulamadan öğretmen olarak eklerken muaf DEĞİLDİR: veli engeli, öğrenci sınırı ve e-posta doğrulaması
  -- onu da bağlar (owner olmak, velinin "beni bir daha ekleme" kararını aşma yetkisi vermez).
  v_trusted := coalesce(auth.role(), '') = 'service_role'
            OR (auth.uid() IS NULL AND auth.role() IS NULL);

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

DO $$
BEGIN
  RAISE NOTICE 'class_students_before_insert güncellendi: owner hesabı artık veli engelini / sınırı / e-posta doğrulamasını aşamaz.';
END $$;
