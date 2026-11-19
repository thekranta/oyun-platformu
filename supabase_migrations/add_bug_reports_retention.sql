-- ============================================================================
-- SORUN BİLDİR — hata raporlarının 90 gün sonra OTOMATİK silinmesi
-- ============================================================================
-- NEDEN: Gizlilik politikası ve Play Veri güvenliği beyanı hata raporlarının "en fazla 90 gün" saklandığını
-- söylüyor. bug_reports yalnız ekleme kabul eder (istemci silemez), silme işi yoktu; bu dosya günlük bir
-- pg_cron işi kurar. Süreyi değiştirirsen aşağıdaki '90 days', gizlilik sayfası (TR+EN) ve
-- PLAY_SURUM_HAZIRLIGI_2026-11-14.md §3 birlikte değişmeli.
--
-- ÖN KOŞUL: pg_cron eklentisi açık olmalı. Supabase panosu: Database > Extensions > "pg_cron" > Enable
-- (panodan açmak en güvenlisidir; açıksa aşağıdaki create extension satırı zararsız geçer).
--
-- ÇALIŞTIRMA: Supabase SQL Editor'da tek seferde çalıştırın. Tekrar çalıştırılabilir (iş adı aynı kalır,
-- cron.schedule aynı adlı işi günceller).
--
-- DOĞRULAMA (çalıştırdıktan sonra):
--   select jobid, jobname, schedule, command, active from cron.job where jobname = 'bug_reports_90_gun_temizlik';
--   -- active = true, schedule = 17 3 * * *  (her gün 03:17 UTC)
--   -- Sonuçlar: select status, return_message, start_time from cron.job_run_details
--   --           where jobid = (select jobid from cron.job where jobname = 'bug_reports_90_gun_temizlik')
--   --           order by start_time desc limit 5;
--
-- GERİ ALMA: select cron.unschedule('bug_reports_90_gun_temizlik');
-- ============================================================================

create extension if not exists pg_cron;

select cron.schedule(
  'bug_reports_90_gun_temizlik',
  '17 3 * * *',
  $$delete from public.bug_reports where created_at < now() - interval '90 days'$$
);
