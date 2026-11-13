-- ============================================================================
-- SORUN BİLDİR — hata raporları (uygulama içi "Sorun bildir" düğmesi + otomatik oyun hatası kaydı)
-- ============================================================================
-- AMAÇ: Kapalı test / canlıda farklı telefon ve Android sürümlerinde çıkan hataları, testçiden cihaz bilgisi
-- İSTEMEDEN toplamak. İstemci cihaz modelini, işletim sistemi sürümünü, uygulama sürümünü, ekranı/oyunu ve (varsa)
-- hata metnini kendisi ekler; testçi yalnız "ne oldu"yu yazar.
--
-- GİZLİLİK (çocuk uygulaması):
--   * Çocuk adı, e-posta, kullanıcı kimliği YAZILMAZ; istemci hata/not metnindeki e-postaları da maskeler.
--   * Tabloyu YALNIZ EKLEYEBİLİRSİNİZ (anon + authenticated); OKUMA/GÜNCELLEME/SİLME yok → yalnız
--     Supabase panosu / service_role okur. İstemci bu yüzden "Prefer: return=minimal" ile yazar.
--   * Uzunluk sınırları CHECK ile sunucuda da zorlanır (sınırı aşan istek reddedilir; istemci kırpar).
--
-- GERİ ALMA (gerekirse):  drop table if exists public.bug_reports;
-- ============================================================================

create table if not exists public.bug_reports (
    id            uuid primary key default gen_random_uuid(),
    created_at    timestamptz not null default now(),
    kind          text not null default 'manual' check (kind in ('manual', 'auto')),
    platform      text not null check (platform in ('android', 'ios', 'web')),
    device_model  text check (char_length(device_model) <= 80),
    os_version    text check (char_length(os_version) <= 60),
    app_version   text check (char_length(app_version) <= 30),
    build_number  text check (char_length(build_number) <= 20),
    locale        text check (char_length(locale) <= 20),
    screen        text check (char_length(screen) <= 120),
    game          text check (char_length(game) <= 80),
    note          text check (char_length(note) <= 1200),
    error_text    text check (char_length(error_text) <= 3000)
);

create index if not exists bug_reports_created_idx on public.bug_reports (created_at desc);

alter table public.bug_reports enable row level security;

drop policy if exists bug_reports_insert on public.bug_reports;
create policy bug_reports_insert on public.bug_reports
    for insert to anon, authenticated
    with check (true);

-- Tablo izinleri: yalnız ekleme. (RLS'ye ek olarak ikinci kilit.)
revoke all on table public.bug_reports from anon, authenticated;
grant insert on table public.bug_reports to anon, authenticated;
