-- ============================================================================
-- WEB SİPARİŞLERİ — İyzico ile tek seferlik web satın alması (Tohum / Filiz / Fidan / Orman)
-- ============================================================================
-- AMAÇ: Web'de İyzico ödeme formuyla alınan paketin siparişini tutmak; para alındığında paketi sunucu
-- (api/_lib/webSiparis.ts, service_role) profiles'a yazar. Çınar ve kurum paketleri BU TABLODA DEĞİL (elle satılır).
--
-- ÖN KOŞUL: supabase_migrations/fix_lock_tier_service_role.sql canlıda çalışmış olmalı. Yoksa lock_tier_columns()
-- tetikleyicisi service_role yazımını geri alır; sunucu bunu geri okumayla yakalar ve siparişi 'atama_bekliyor'
-- bırakır (para alındı, paket açılmadı: Vercel loglarında "PARA ALINDI AMA PAKET ACILMADI").
--
-- GÜVENLİK:
--   * RLS AÇIK ve HİÇBİR politika yok: anon/authenticated tabloyu ne okuyabilir ne yazabilir.
--   * Tablo izinleri de kapalı (REVOKE): RLS'ye ek ikinci kilit. Yalnız service_role (sunucu) erişir.
--   * iyzico_payment_id UNIQUE: aynı ödeme iki kez işlenip iki paket açamaz.
--   * conversation_id UNIQUE ve veritabanında üretilir (İyzico'ya giden sipariş anahtarı, tahmin edilemez).
--
-- KİŞİSEL VERİ (KVKK, veri en aza indirme):
--   * Alıcının adı, soyadı, telefonu, TC kimlik numarası ve adresi bu tabloya YAZILMAZ; yalnız İyzico'ya iletilir.
--   * email: paketin açılacağı hesabı bulmak için gerekli (profiles ile aynı anahtar), küçük harfe zorlanır.
--   * ham: İyzico yanıtından küçük, kart/kişi bilgisi İÇERMEYEN alt küme (sunucu süzer; boyut CHECK ile sınırlı).
--
-- DURUMLAR: olusturuldu -> beklemede -> atama_bekliyor (para alındı) -> odendi (paket açıldı); ya da basarisiz.
--
-- GERİ ALMA: add_web_siparisleri_rollback.sql (önce kayıtları dışa aktarın: muhasebe kaydıdır).
-- ============================================================================

create table if not exists public.web_siparisleri (
    id                 uuid primary key default gen_random_uuid(),
    conversation_id    uuid not null default gen_random_uuid(),
    email              text not null check (email = lower(email) and char_length(email) between 3 and 320),
    paket              text not null check (paket in ('tohum', 'filiz', 'fidan', 'orman')),
    tutar_kurus        integer not null check (tutar_kurus > 0),
    sure_ay            integer not null check (sure_ay between 1 and 24),
    durum              text not null default 'olusturuldu'
                       check (durum in ('olusturuldu', 'beklemede', 'odendi', 'atama_bekliyor', 'basarisiz')),
    token              text check (char_length(token) <= 200),
    iyzico_payment_id  text check (char_length(iyzico_payment_id) <= 64),
    odenen_kurus       integer check (odenen_kurus >= 0),
    ham                jsonb check (ham is null or octet_length(ham::text) <= 4000),
    atama_hedef        jsonb check (atama_hedef is null or octet_length(atama_hedef::text) <= 500),
    atanan_bitis       timestamptz,
    hata_nedeni        text check (char_length(hata_nedeni) <= 200),
    olusturma_zamani   timestamptz not null default now(),
    odeme_zamani       timestamptz,
    atama_zamani       timestamptz,
    constraint web_siparisleri_conversation_id_key unique (conversation_id),
    -- NULL'lar birbirine eşit sayılmaz: ödemesi olmayan siparişler serbest, ödeme kimliği tekil.
    constraint web_siparisleri_iyzico_payment_id_key unique (iyzico_payment_id)
);

-- Aynı İyzico jetonu iki siparişe bağlanmasın (dönüşte jetondan sipariş bulunur).
create unique index if not exists web_siparisleri_token_key on public.web_siparisleri (token) where token is not null;
-- Velinin siparişleri ve kurtarma taraması (beklemede / atama_bekliyor kalanlar).
create index if not exists web_siparisleri_email_idx on public.web_siparisleri (email, olusturma_zamani desc);
create index if not exists web_siparisleri_acik_idx on public.web_siparisleri (durum, olusturma_zamani)
    where durum in ('beklemede', 'atama_bekliyor');

alter table public.web_siparisleri enable row level security;   -- politika YOK: istemci hiç okuyamaz/yazamaz

revoke all on table public.web_siparisleri from public, anon, authenticated;
grant all on table public.web_siparisleri to service_role;

comment on table public.web_siparisleri is
    'Web (İyzico) tek seferlik paket siparişleri. Yalnız service_role. Alıcı kişisel verisi (ad, adres, TCKN, telefon) saklanmaz.';

-- ÇALIŞTIRDIKTAN SONRA DOĞRULAMA:
--   select relrowsecurity from pg_class where oid = 'public.web_siparisleri'::regclass;          -- true
--   select count(*) from pg_policies where schemaname = 'public' and tablename = 'web_siparisleri'; -- 0
--   select grantee, privilege_type from information_schema.role_table_grants
--    where table_name = 'web_siparisleri';                     -- anon / authenticated satırı OLMAMALI
