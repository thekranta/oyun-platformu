-- ============================================================================
-- add_institutions.sql GERİ ALMA (kurum paneli kapatılır)
-- ============================================================================
-- Yalnız FONKSİYONLARI kaldırır: panel girişi kaybolur, öğretmen/veli paneli etkilenmez.
-- Kurum ve üyelik VERİLERİ (institutions, institution_members) SİLİNMEZ; paneli yeniden açmak için
-- add_institutions.sql'i tekrar çalıştırmanız yeterlidir.
-- Verileri de tamamen silmek isterseniz en alttaki (yorumlu) iki satırı açın — geri alınamaz.
-- ============================================================================
DROP FUNCTION IF EXISTS public.my_admin_institutions();
DROP FUNCTION IF EXISTS public.institution_overview(uuid, integer);
DROP FUNCTION IF EXISTS public.institution_activity_daily(uuid, integer);
DROP FUNCTION IF EXISTS public.institution_games_by_type(uuid, integer);
DROP FUNCTION IF EXISTS public.institution_classes(uuid, integer);
DROP FUNCTION IF EXISTS public.institution_class_children(uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.my_class_institutions();

DROP FUNCTION IF EXISTS private.institution_students(uuid, uuid);
DROP FUNCTION IF EXISTS private.period_start(integer, integer);
DROP FUNCTION IF EXISTS private.is_institution_admin(uuid);
DROP FUNCTION IF EXISTS private.institution_active(uuid);

-- Skor dizini başka sorgulara da yarayabilir; silinmez. Silmek isterseniz:
--   DROP INDEX IF EXISTS public.idx_oyun_skorlari_lower_email_created;

-- TAMAMEN SİLMEK İÇİN (veri kaybı!):
--   DROP TABLE IF EXISTS public.institution_members;
--   DROP TABLE IF EXISTS public.institutions;

NOTIFY pgrst, 'reload schema';
