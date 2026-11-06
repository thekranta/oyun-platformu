-- ============================================================================
-- add_board_results.sql SONRASI doğrulama (SALT OKUNUR — hiçbir şeyi değiştirmez)
-- ============================================================================
-- Supabase SQL Editor RAISE NOTICE mesajlarını göstermez; bu sorgu canlı durumu tek bir JSON'da toplar. Beklenen:
--   sutunlar                    -> ["kaydeden_ogretmen", "kaynak"]
--   kisit                       -> true
--   kayit_fonksiyonu            -> true
--   giris_yapan_calistirir      -> true   (authenticated)
--   anon_calistirir             -> false  (anon: giriş yapmamış)
--   herkes_calistirir           -> false  (PUBLIC)
--   tetikleyici_bayrak          -> true   (oyun_skorlari tetikleyicisi bayrağı tanıyor)
--   ogrenci_gecmisi_kaynak      -> true   (teacher_student_scores kaynağı döndürüyor)
--   tahta_satir_sayisi          -> şimdiye dek kaydedilen tahta sonucu (başta 0)
--   tahta_etiketsiz_kaydeden    -> 0      (kaynağı 'tahta' olmayıp kaydeden öğretmen dolu satır: olmamalı)
-- Göçten ÖNCE çalıştırılırsa hata vermez: sutunlar boş, diğerleri false/null görünür.
-- Sonucu (tek hücre) kopyalayıp gönderin. Kişisel veri içermez (yalnız sayılar ve bayraklar).
-- ============================================================================

WITH f AS (
  SELECT to_regprocedure('public.teacher_save_board_result(uuid, text, integer, integer, integer, integer, integer, text, integer, numeric, numeric, numeric, numeric, text)') AS fn,
         to_regprocedure('public.oyun_skorlari_before_write()') AS trg,
         to_regprocedure('public.teacher_student_scores(uuid, integer, boolean)') AS hist
)
SELECT jsonb_pretty(jsonb_build_object(
  'sutunlar', (SELECT coalesce(jsonb_agg(column_name::text ORDER BY column_name), '[]'::jsonb)
                 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'oyun_skorlari'
                  AND column_name IN ('kaynak', 'kaydeden_ogretmen')),
  'kisit', EXISTS (SELECT 1 FROM pg_constraint
                    WHERE conname = 'oyun_skorlari_kaynak_check' AND conrelid = 'public.oyun_skorlari'::regclass AND convalidated),
  'kayit_fonksiyonu', (SELECT fn FROM f) IS NOT NULL,
  'giris_yapan_calistirir', coalesce(has_function_privilege('authenticated', (SELECT fn FROM f), 'EXECUTE'), false),
  'anon_calistirir', coalesce(has_function_privilege('anon', (SELECT fn FROM f), 'EXECUTE'), false),
  'herkes_calistirir', coalesce(has_function_privilege('public', (SELECT fn FROM f), 'EXECUTE'), false),
  'tetikleyici_bayrak', position('app.minizeka_board_write' in coalesce(pg_get_functiondef((SELECT trg FROM f)), '')) > 0,
  'ogrenci_gecmisi_kaynak', position('kaynak text' in coalesce(pg_get_function_result((SELECT hist FROM f)), '')) > 0,
  'tahta_satir_sayisi', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'oyun_skorlari' AND column_name = 'kaynak')
                             THEN (SELECT count(*) FROM public.oyun_skorlari WHERE to_jsonb(oyun_skorlari) ->> 'kaynak' = 'tahta') END,
  'tahta_etiketsiz_kaydeden', CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'oyun_skorlari' AND column_name = 'kaydeden_ogretmen')
                                   THEN (SELECT count(*) FROM public.oyun_skorlari
                                          WHERE to_jsonb(oyun_skorlari) ->> 'kaynak' IS DISTINCT FROM 'tahta'
                                            AND to_jsonb(oyun_skorlari) ->> 'kaydeden_ogretmen' IS NOT NULL) END
)) AS dogrulama
FROM f;
