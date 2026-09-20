-- ============================================================================
-- #4 Kardeş / çoklu çocuk profili — FAZ 0: CANLI ŞEMA DOĞRULAMA (salt-okunur)
-- ============================================================================
-- Bu dosya HİÇBİR ŞEYİ DEĞİŞTİRMEZ; yalnızca okur. Amaç: profiles / oyun_skorlari /
-- class_students için repoda CREATE TABLE olmadığından, gerçek kolon-kısıt-politika
-- durumunu görmeden child_profiles migration'ı yazmamak.
--
-- Nasıl çalıştırılır: Supabase → SQL Editor → tümünü yapıştır → Run.
-- Sonuç TEK satır/TEK hücre JSON'dur; hücreye tıklayıp içeriği kopyalayın.
-- (E-posta / ad içermez; yalnızca kolon adları, kısıt/politika adları ve sayılar.)
-- ============================================================================

select jsonb_build_object(
  'profiles_kolonlar', (
    select jsonb_agg(column_name::text || ':' || data_type::text order by ordinal_position)
    from information_schema.columns where table_schema = 'public' and table_name = 'profiles'),
  'oyun_skorlari_kolonlar', (
    select jsonb_agg(column_name::text || ':' || data_type::text order by ordinal_position)
    from information_schema.columns where table_schema = 'public' and table_name = 'oyun_skorlari'),
  'class_students_kolonlar', (
    select jsonb_agg(column_name::text || ':' || data_type::text order by ordinal_position)
    from information_schema.columns where table_schema = 'public' and table_name = 'class_students'),
  'kisitlar', (
    select jsonb_agg(conrelid::regclass::text || ' | ' || conname::text || ' | ' || pg_get_constraintdef(oid))
    from pg_constraint
    where conrelid in ('public.profiles'::regclass, 'public.oyun_skorlari'::regclass,
                       'public.class_students'::regclass, 'public.classes'::regclass,
                       'public.teachers'::regclass)),
  'politikalar', (
    select jsonb_agg(tablename::text || '.' || policyname::text || ' [' || cmd::text || ']' order by tablename, policyname)
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'oyun_skorlari', 'class_students', 'classes', 'teachers')),
  'tetikleyiciler', (
    select jsonb_agg(distinct event_object_table::text || '.' || trigger_name::text)
    from information_schema.triggers
    where trigger_schema = 'public'
      and event_object_table in ('profiles', 'oyun_skorlari', 'class_students', 'classes', 'teachers')),
  -- Backfill güvenliği: 1 e-posta = 1 profil olmalı (beklenen 0)
  'ayni_epostali_birden_cok_profil', (
    select count(*) from (select email from public.profiles group by email having count(*) > 1) x),
  -- Auth e-postayı küçük harfe çeviriyorsa büyük harfli profil e-postası eşleşmez (beklenen 0)
  'buyuk_harfli_profil_eposta', (
    select count(*) from public.profiles where email <> lower(email)),
  -- child_id backfill'i sonrası sahipsiz kalacak skorlar (ideal 0)
  'profilsiz_veya_epostasiz_skor', (
    select count(*) from public.oyun_skorlari s
    where s.email is null or not exists (select 1 from public.profiles p where p.email = s.email)),
  'toplam_profil', (select count(*) from public.profiles),
  'toplam_skor', (select count(*) from public.oyun_skorlari),
  -- Bugün aynı e-postayla birden çok çocuk adı kullanılmış mı? (backfill'de ad eşlemesi gerekir mi)
  'birden_cok_ogrenci_adli_hesap', (
    select count(*) from (
      select email from public.oyun_skorlari where email is not null
      group by email having count(distinct ogrenci_adi) > 1) x),
  'child_profiles_zaten_var', (to_regclass('public.child_profiles') is not null),
  'skorlarda_child_id_zaten_var', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'oyun_skorlari' and column_name = 'child_id')
) as sonuc;
