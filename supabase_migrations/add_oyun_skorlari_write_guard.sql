-- ============================================================================
-- oyun_skorlari YAZMA KORUMASI: onay/uzman alanlarının sahteciliğini engeller
-- ============================================================================
-- BULUNAN AÇIK #1 (bkz. add_class_consent.sql'deki eski not, ~satır 686): own_insert_scores
-- politikası yalnız e-postaya bakıyor; bir veli kendi INSERT'inde onay_durumu='onaylandi'
-- yazıp uzman onayını TAKLİT edebiliyordu. (Ciddi bir sızıntı değildi — sahte metin yalnız
-- velinin KENDİ öğretmenine gidiyor ve istemci düz metin gösteriyor — ama savunma eksikti.)
--
-- BULUNAN AÇIK #2: oyun_skorlari'nde velinin KENDİ satırını UPDATE edebileceği HİÇBİR
-- politika yoktu (yalnız admins için admin_update_scores vardı). Bu yüzden veli panelindeki
-- kümülatif AI raporu SESSİZCE kaydedilemiyordu: PostgREST, RLS'in filtrelediği 0-satırlık
-- bir UPDATE'i hata değil "başarı" (204) olarak döndürür; istemci de yanıtı kontrol etmiyordu
-- (bkz. ayrı düzeltme: components/VeliDashboard.tsx, Prefer: return=representation).
--
-- ÇÖZÜM:
--   1) BEFORE INSERT OR UPDATE tetikleyicisi:
--      - INSERT'te güvenilmeyen bağlamda onay/uzman alanlarını sıfırlar (Açık #1).
--      - UPDATE'te güvenilmeyen bağlamda yalnız kumulatif_ai_yorumu'nun değişmesine izin
--        verir; başka HERHANGİ bir sütun değişirse TÜM güncellemeyi reddeder. Sütunları
--        tek tek saymak yerine to_jsonb farkına bakılır — şemaya sonradan eklenecek
--        sütunlar da otomatik kapsanır (allowlist, denylist değil — daha güvenli taraf).
--   2) own_update_scores politikası: veli kendi satırını UPDATE edebilsin (politika geniş
--      olsa da hangi sütunun değişebileceğine tetikleyici karar veriyor).
--
-- GÜVENİLİR BAĞLAM: service_role / SQL Editor (JWT yok) / admins tablosundaki bir hesap.
-- Admin onay akışı (app/admin.tsx: onOy/geriAlOnay/onItirazEt) service_role DEĞİL, kendi
-- oturum jetonuyla (authenticated) UPDATE attığı için "admins üyeliği" de güvenilir sayılır
-- — aksi halde bu düzeltme admin onay akışını da kilitlerdi.
-- ============================================================================

DO $$
BEGIN
  IF to_regclass('public.oyun_skorlari') IS NULL OR to_regclass('public.admins') IS NULL THEN
    RAISE EXCEPTION 'oyun_skorlari / admins tabloları bulunamadı';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'oyun_skorlari' AND policyname = 'own_insert_scores') THEN
    RAISE EXCEPTION 'Önce supabase_migrations/fix_rls_oyun_skorlari_profiles.sql çalıştırılmalı';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.oyun_skorlari_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trusted boolean;
BEGIN
  v_trusted := coalesce(auth.role(), '') = 'service_role'
            OR (auth.uid() IS NULL AND auth.role() IS NULL)
            OR EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid());

  IF TG_OP = 'INSERT' THEN
    IF NOT v_trusted THEN
      NEW.onay_durumu := NULL;
      NEW.uzman_onayi := NULL;
      NEW.onaylayan_uzman := NULL;
      NEW.uzman_oylamalari := NULL;
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

DROP TRIGGER IF EXISTS trg_oyun_skorlari_before_write ON public.oyun_skorlari;
CREATE TRIGGER trg_oyun_skorlari_before_write
  BEFORE INSERT OR UPDATE ON public.oyun_skorlari
  FOR EACH ROW EXECUTE FUNCTION public.oyun_skorlari_before_write();

DROP POLICY IF EXISTS "own_update_scores" ON public.oyun_skorlari;
CREATE POLICY "own_update_scores" ON public.oyun_skorlari
  FOR UPDATE
  USING (email = auth.email())
  WITH CHECK (email = auth.email());

DO $$
BEGIN
  RAISE NOTICE 'oyun_skorlari yazma koruması tamam: tetikleyici + own_update_scores hazır.';
END $$;
