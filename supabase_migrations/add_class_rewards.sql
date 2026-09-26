-- ============================================================================
-- SINIF BAHÇESİ — davranış ödül panosu (bitki büyüme, akvaryum/balık DEĞİL)
-- ============================================================================
-- ÜRÜN KARARI (2026-09-26): her öğrenci bir fidan; öğretmen iyi davranışa "ödül"
-- (su/güneş) verdikçe fidan büyür (tohum→filiz→fidan→çiçek, bkz. private.reward_stage).
-- Gün sonunda sıfırlanır (bkz. reward_day) — kalıcı geçmiş class_reward_events'te
-- durur, istenirse ileride haftalık rozet gibi bir özellik buradan türetilebilir.
-- Yalnız ÜCRETLİ SINIF PAKETİ (Çınar/Meşe) öğretmenleri kullanabilir — mevcut
-- "sınıf yönetimi" özellikleriyle aynı sınır (lib/subscriptionTiers.ts
-- OGRETMEN_TIER_FLAGS.canUseRewardBoard). Bu sınır yalnız istemci tarafında
-- DEĞİL, aşağıdaki teacher_award_reward() içinde private.class_owner_is_paid()
-- ile SUNUCUDA da zorlanır (istemci gating'i yalnız kullanıcı deneyimi içindir).
--
-- Veri modeli, add_class_consent.sql'deki desenin AYNISI: ham tabloya istemci
-- hiç dokunmaz (RLS açık, izin YOK), erişim yalnız SECURITY DEFINER RPC'lerle;
-- "bu kayıt görünür mü" kararı zaten var olan private.class_row_readable()'a
-- devredilir (onay bekleyen/reddedilmiş/kardeşli öğrenciye ödül verilemez —
-- ayrı bir görünürlük mantığı İCAT EDİLMEDİ, mevcut kural tekrar kullanıldı).
--
-- ÖN KOŞUL: add_class_consent.sql çalıştırılmış olmalı (classes, class_students,
-- private.class_row_readable, private.class_owner_is_paid gerekir).
--
-- BİLİNEN SINIR: "gün" sınırı UTC tarihine göre (reward_day = (now() at time
-- zone 'utc')::date). Türkiye (UTC+3) için gece yarısından sonraki ~3 saatte
-- teorik bir kayma olur; okul saatleri (sabah-öğleden sonra) bundan HİÇ
-- etkilenmez, bu yüzden MVP için kabul edilebilir bir basitleştirme.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0) Ön kontroller
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.classes') IS NULL OR to_regclass('public.class_students') IS NULL THEN
    RAISE EXCEPTION 'classes / class_students tabloları bulunamadı';
  END IF;
  IF to_regprocedure('private.class_row_readable(uuid, timestamptz, text, text, uuid)') IS NULL
     OR to_regprocedure('private.class_owner_is_paid(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Önce supabase_migrations/add_class_consent.sql çalıştırılmalı (private.class_row_readable / private.class_owner_is_paid yok)';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 0b) classes.reward_theme — şu an aktif görsel konsept (tek değer; geçmiş
-- günlerin hangi konseptle gösterildiğinin ayrı bir kaydı YOK, gerek de yok)
-- ---------------------------------------------------------------------------
-- 'gokyuzu' henüz istemci tarafında yok ama CHECK'e şimdiden eklemek, o konsept
-- gelince ikinci bir ALTER gerektirmiyor. SÜRDÜRME: yeni bir üçüncü konsept
-- eklenirse bu CHECK DROP+ADD CONSTRAINT ile genişletilir; izin verilen liste
-- components/rewardBoard/types.ts'teki RewardConceptId ile ELLE senkron tutulur.
-- NOT NULL DEFAULT 'bitki': Postgres'te sabit DEFAULT'lu kolon eklemek metadata-only
-- bir işlemdir, mevcut sınıflar tabloyu yeniden yazmadan 'bitki' değerini alır.
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS reward_theme text NOT NULL DEFAULT 'bitki'
    CHECK (reward_theme IN ('bitki', 'gokyuzu'));

-- ---------------------------------------------------------------------------
-- 1) class_reward_events: ham tabloya istemci HİÇ erişemez (yalnız RPC'lerle)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.class_reward_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES public.class_students(id) ON DELETE CASCADE,
  teacher_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  awarded_at  timestamptz NOT NULL DEFAULT now(),
  reward_day  date NOT NULL DEFAULT ((now() AT TIME ZONE 'utc')::date)
);
CREATE INDEX IF NOT EXISTS idx_class_reward_events_student_day
  ON public.class_reward_events (student_id, reward_day);

ALTER TABLE public.class_reward_events ENABLE ROW LEVEL SECURITY;   -- politika YOK: istemci hiç okuyamaz/yazamaz
REVOKE ALL ON public.class_reward_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.class_reward_events TO service_role;

-- ---------------------------------------------------------------------------
-- 2) Büyüme aşaması: tek doğruluk kaynağı (RPC'ler arasında eşiği DRIFT ETMESİN)
-- ---------------------------------------------------------------------------
-- 0 = tohum, 1 = filiz, 2 = fidan, 3 = çiçek. SÜRDÜRME: eşikleri değiştirirsen
-- istemci tarafındaki (henüz yazılmamış) aynı sabitleri de güncelle.
CREATE OR REPLACE FUNCTION private.reward_stage(p_count integer)
RETURNS smallint
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (CASE
            WHEN p_count IS NULL OR p_count <= 0 THEN 0
            WHEN p_count <= 2 THEN 1
            WHEN p_count <= 5 THEN 2
            ELSE 3
          END)::smallint
$$;

REVOKE ALL ON FUNCTION private.reward_stage(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.reward_stage(integer) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3) ÖĞRETMEN: ödül ver
-- ---------------------------------------------------------------------------
-- Yalnız: (a) kendi sınıfı, (b) ücretli sınıf paketi (Çınar/Meşe — sunucu tarafı
-- gating, bkz. dosya başı not), (c) kayıt şu an GÖRÜNÜR (class_row_readable) ise
-- çalışır. Aksi hâlde tek tip 'not_found' hatası (oracle sızdırmaz — hangi
-- şartın tuttuğu/tutmadığı dışarıdan ayırt edilemez).
CREATE OR REPLACE FUNCTION public.teacher_award_reward(p_student_id uuid)
RETURNS TABLE (today_count integer, stage smallint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_class   uuid;
  v_ok      boolean;
BEGIN
  SELECT cs.class_id,
         c.teacher_id = auth.uid()
         AND private.class_owner_is_paid(cs.class_id)
         AND private.class_row_readable(cs.class_id, cs.accepted_at, cs.accepted_via, cs.child_email, cs.accepted_user_id)
    INTO v_class, v_ok
    FROM class_students cs
    JOIN classes c ON c.id = cs.class_id
   WHERE cs.id = p_student_id;

  IF v_class IS NULL OR NOT coalesce(v_ok, false) THEN
    RAISE EXCEPTION 'not_found';
  END IF;

  INSERT INTO class_reward_events (class_id, student_id, teacher_id)
  VALUES (v_class, p_student_id, auth.uid());

  RETURN QUERY
  SELECT cnt::integer, private.reward_stage(cnt::integer)
    FROM (
      SELECT count(*) AS cnt FROM class_reward_events
       WHERE student_id = p_student_id
         AND reward_day = (now() AT TIME ZONE 'utc')::date
    ) x;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3b) ÖĞRETMEN: aktif görsel konsepti değiştir (yalnız ücretli sınıf paketi)
-- ---------------------------------------------------------------------------
-- classes RLS'i (teacher_owns_classes) öğretmenin kendi sınıfını zaten UPDATE
-- edebilmesine izin veriyor; bu RPC istemciye ayrı bir kolon izni AÇMIYOR, yalnız
-- kullanışlı/tutarlı bir çağrı yüzeyi + ücretli-paket kontrolünü SUNUCUDA da
-- tekrarlıyor (aynı private.class_owner_is_paid, teacher_award_reward'daki gibi).
-- Ücretsiz bir öğretmen reward_theme'i doğrudan REST PATCH ile değiştirse bile
-- teacher_award_reward paket kontrolünden geçemediği için hiçbir ödül olayı
-- oluşturamaz — yani kozmetik bir ayarı boşa değiştirmiş olur, gerçek bir
-- yetki/veri sızıntısı değil (bu yüzden classes tablosunu ayrıca kilitlemiyoruz).
CREATE OR REPLACE FUNCTION public.teacher_set_reward_theme(p_class_id uuid, p_theme text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE classes
     SET reward_theme = p_theme
   WHERE id = p_class_id
     AND teacher_id = auth.uid()
     AND private.class_owner_is_paid(p_class_id);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.teacher_set_reward_theme(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_set_reward_theme(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) ÖĞRETMEN: sınıfın bugünkü panosu (yalnız görünür kayıtlar)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.teacher_class_reward_summary(p_class_id uuid)
RETURNS TABLE (student_id uuid, today_count integer, stage smallint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM classes c WHERE c.id = p_class_id AND c.teacher_id = auth.uid()) THEN
    RETURN;
  END IF;

  -- NOT: alt sorguda "student_id" değil "cre.student_id" kullanılır — bu fonksiyonun OUT
  -- parametresi de student_id olduğundan (plpgsql'de OUT parametreler gövde boyunca görünen
  -- değişkenlerdir), niteliksiz "student_id" sütun/değişken arasında "ambiguous" hatası verir.
  RETURN QUERY
  SELECT cs.id,
         coalesce(cnt.c, 0)::integer,
         private.reward_stage(coalesce(cnt.c, 0)::integer)
    FROM class_students cs
    LEFT JOIN (
      SELECT cre.student_id AS sid, count(*) AS c
        FROM class_reward_events cre
       WHERE cre.reward_day = (now() AT TIME ZONE 'utc')::date
       GROUP BY cre.student_id
    ) cnt ON cnt.sid = cs.id
   WHERE cs.class_id = p_class_id
     AND private.class_row_readable(cs.class_id, cs.accepted_at, cs.accepted_via, cs.child_email, cs.accepted_user_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) VELİ: çocuğunun bugünkü ödülleri (yalnız kendi onayladığı/görünür sınıflar)
-- ---------------------------------------------------------------------------
-- reward_theme eklendi: veli classes tablosunu hiç okuyamıyor (RLS onu eşlemiyor),
-- bu yüzden hangi görsel konseptle göstereceğini yalnız bu RPC'den öğrenebilir.
-- RETURNS TABLE sütun listesi değiştiği için önce DROP gerekir (add_class_consent.sql'in
-- teacher_student_scores'u genişletirken kullandığı desen).
DROP FUNCTION IF EXISTS public.my_child_rewards();
CREATE OR REPLACE FUNCTION public.my_child_rewards()
RETURNS TABLE (class_name text, teacher_name text, today_count integer, stage smallint, reward_theme text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT left(c.name, 80),
         left(t.name, 80),
         coalesce(cnt.c, 0)::integer,
         private.reward_stage(coalesce(cnt.c, 0)::integer),
         c.reward_theme
    FROM class_students cs
    JOIN classes c ON c.id = cs.class_id
    LEFT JOIN teachers t ON t.user_id = c.teacher_id
    LEFT JOIN (
      SELECT student_id, count(*) AS c
        FROM class_reward_events
       WHERE reward_day = (now() AT TIME ZONE 'utc')::date
       GROUP BY student_id
    ) cnt ON cnt.student_id = cs.id
   WHERE nullif(auth.email(), '') IS NOT NULL
     AND lower(btrim(cs.child_email)) = lower(btrim(auth.email()))
     AND private.class_row_readable(cs.class_id, cs.accepted_at, cs.accepted_via, cs.child_email, cs.accepted_user_id)
$$;

REVOKE ALL ON FUNCTION public.teacher_award_reward(uuid), public.teacher_class_reward_summary(uuid), public.my_child_rewards()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.teacher_award_reward(uuid), public.teacher_class_reward_summary(uuid), public.my_child_rewards()
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 6) Sonuç özeti
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE 'class rewards tamam: class_reward_events + teacher_award_reward/teacher_class_reward_summary/my_child_rewards hazır.';
END $$;
