-- ============================================================================
-- #4 Kardeş / çoklu çocuk profili — FAZ 0b: POLİTİKA TANIMLARI + VERİ ÖZETİ (salt-okunur)
-- ============================================================================
-- HİÇBİR ŞEYİ DEĞİŞTİRMEZ; yalnızca okur. Faz 0 sonucunda iki şey netleşti:
--   * profiles'ta "Users can ... own profile" adlı eski politikalar duruyor; tanımlarını
--     görmeden güvenli olduklarını söyleyemem (politikalar OR ile birleşir: biri gevşekse
--     diğerlerinin kısıtı boşa çıkar).
--   * 7 e-postada birden çok çocuk adı var; child_id geçişinde (backfill) skorların hangi
--     çocuğa yazılacağını hesap hesap görmem gerekiyor.
--
-- Nasıl çalıştırılır: Supabase → SQL Editor → tümünü yapıştır → Run.
-- Sonuç TEK hücre JSON: sağ üstteki Export → "Copy as JSON" ile kopyalayıp yapıştırın.
-- E-POSTA, AD, SKOR İÇERMEZ: yalnızca politika ifadeleri, sayılar ve evet/hayır bayrakları
-- (profiller "sira" numarasıyla anılır).
-- ============================================================================

select jsonb_build_object(
  'politika_tanimlari', (
    select jsonb_agg(jsonb_build_object(
             'tablo', tablename::text,
             'ad', policyname::text,
             'komut', cmd::text,
             'roller', roles::text,
             'using', qual,
             'with_check', with_check)
           order by tablename, policyname)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'oyun_skorlari', 'class_students', 'classes', 'teachers')),

  'rls_acik_mi', (
    select jsonb_object_agg(relname::text, relrowsecurity)
    from pg_class
    where oid in ('public.profiles'::regclass, 'public.oyun_skorlari'::regclass,
                  'public.class_students'::regclass, 'public.classes'::regclass,
                  'public.teachers'::regclass)),

  'profil_ozeti', (
    select jsonb_agg(jsonb_build_object(
             'sira', p.rn,
             'paket', p.subscription_tier,
             'user_id_dolu', p.user_id is not null,
             'auth_eposta_ayni', exists (
                select 1 from auth.users u
                where u.id = p.user_id and lower(u.email) = lower(p.email)),
             'cocuk_adi_bos', nullif(btrim(p.child_name), '') is null,
             'yas_bos', p.child_age_months is null,
             'ada_uyan_skor', (
                select count(*) from public.oyun_skorlari s
                where lower(s.email) = lower(p.email)
                  and lower(btrim(s.ogrenci_adi)) = lower(btrim(p.child_name))),
             'baska_adli_skor', (
                select count(*) from public.oyun_skorlari s
                where lower(s.email) = lower(p.email)
                  and lower(btrim(coalesce(s.ogrenci_adi, ''))) is distinct from lower(btrim(coalesce(p.child_name, '')))),
             'farkli_baska_ad_sayisi', (
                select count(distinct lower(btrim(s.ogrenci_adi))) from public.oyun_skorlari s
                where lower(s.email) = lower(p.email)
                  and lower(btrim(coalesce(s.ogrenci_adi, ''))) is distinct from lower(btrim(coalesce(p.child_name, '')))),
             'sinifta', exists (
                select 1 from public.class_students cs
                where lower(cs.child_email) = lower(p.email)))
           order by p.rn)
    from (select x.*, row_number() over (order by x.created_at, x.id) as rn
          from public.profiles x) p),

  'yetim_skor', jsonb_build_object(
    'eposta_bos', (
      select count(*) from public.oyun_skorlari where email is null or btrim(email) = ''),
    'profili_olmayan_eposta_satir', (
      select count(*) from public.oyun_skorlari s
      where s.email is not null and btrim(s.email) <> ''
        and not exists (select 1 from public.profiles p where p.email = s.email)),
    'profili_olmayan_farkli_eposta', (
      select count(distinct s.email) from public.oyun_skorlari s
      where s.email is not null
        and not exists (select 1 from public.profiles p where p.email = s.email)),
    'yalniz_buyuk_kucuk_harf_farki', (
      select count(*) from public.oyun_skorlari s
      where s.email is not null
        and not exists (select 1 from public.profiles p where p.email = s.email)
        and exists (select 1 from public.profiles p where lower(p.email) = lower(s.email)))),

  'bos_olabilir_kolonlar', (
    select jsonb_object_agg(table_name::text || '.' || column_name::text, is_nullable::text)
    from information_schema.columns
    where table_schema = 'public'
      and ((table_name = 'profiles' and column_name in ('user_id', 'email', 'child_name', 'child_age_months', 'subscription_tier'))
        or (table_name = 'oyun_skorlari' and column_name in ('email', 'ogrenci_adi'))
        or (table_name = 'class_students' and column_name = 'child_email'))),

  'admins_owners_var', jsonb_build_object(
    'admins', to_regclass('public.admins') is not null,
    'owners', to_regclass('public.owners') is not null),

  'class_students_toplam', (select count(*) from public.class_students),
  'class_students_profilli', (
    select count(*) from public.class_students cs
    where exists (select 1 from public.profiles p where lower(p.email) = lower(cs.child_email)))
) as sonuc;
