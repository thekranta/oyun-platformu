-- ============================================================
-- ADMIN GIRISI TESHIS + ONARIM
-- ------------------------------------------------------------
-- Admin paneline (/admin) giris IKI sey ister:
--   1) Gecerli bir Supabase Auth hesabi (e-posta + sifre)
--   2) O hesabin `admins` tablosunda bir satiri
-- Bu dosya once DURUMU gosterir, sonra eksigi tamamlar.
--
-- KULLANIM: Supabase > SQL Editor. E-postayi kendi adresinle degistir
-- (asagida 3 yerde geciyor).
-- ============================================================

-- ---------- 1) TESHIS: hangi adim eksik? ----------
select
  (select count(*) from auth.users where email = 'muhammed.28unal@gmail.com')            as auth_hesabi_var_mi,
  (select to_regclass('public.admins') is not null)                                       as admins_tablosu_var_mi,
  (select count(*) from admins a join auth.users u on u.id = a.user_id
     where u.email = 'muhammed.28unal@gmail.com')                                         as admin_satiri_var_mi,
  (select email_confirmed_at is not null from auth.users
     where email = 'muhammed.28unal@gmail.com' limit 1)                                    as eposta_dogrulanmis_mi;

-- Beklenen: hepsi 1 / true.
--   auth_hesabi_var_mi = 0  -> once uygulamadan bu e-posta ile KAYIT OL
--   admins_tablosu_var_mi = false -> asagidaki 2. adimi calistir
--   admin_satiri_var_mi = 0 -> asagidaki 3. adimi calistir
--   eposta_dogrulanmis_mi = false -> gelen kutusundaki dogrulama baglantisina tikla
--                                    (ya da Supabase > Authentication > Users > kullaniciyi
--                                     ac > "Confirm email")


-- ---------- 2) ONARIM: admins tablosu + okuma politikasi ----------
-- (fix_rls_and_admins.sql calistirilmadiysa gerekir; tekrar calistirmak guvenli)
create table if not exists admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz default now()
);

alter table admins enable row level security;

-- Kullanici KENDI admin satirini okuyabilmeli — panel girisi bunu sorgular.
-- Bu politika yoksa gercek admin bile "yetkiniz yok" hatasi alir.
drop policy if exists "self_read_admin_row" on admins;
create policy "self_read_admin_row" on admins
  for select
  using (user_id = auth.uid());


-- ---------- 3) ONARIM: bu e-postaya admin yetkisi ver ----------
insert into admins (user_id, display_name)
select u.id, 'Yönetici'
from auth.users u
where u.email = 'muhammed.28unal@gmail.com'
  and not exists (select 1 from admins a where a.user_id = u.id);


-- ---------- 4) DOGRULAMA: artik admin misin? ----------
select a.display_name, u.email, u.email_confirmed_at is not null as dogrulanmis
from admins a
join auth.users u on u.id = a.user_id;
-- Bu sorgu senin e-postani donduruyorsa admin panelinden girebilirsin.
