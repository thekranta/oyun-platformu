-- ============================================================
-- ADMIN GIRISI TESHIS + ONARIM
-- ------------------------------------------------------------
-- Admin paneline (/admin) giris IKI sey ister:
--   1) Gecerli bir Supabase Auth hesabi (e-posta + sifre)
--   2) O hesabin `admins` tablosunda bir satiri
--
-- KULLANIM: Supabase > SQL Editor > tumunu secip Run.
-- E-postayi SADECE asagidaki TEK satirda degistir.
-- Tekrar calistirmak guvenlidir.
-- ============================================================

-- >>>>>>>>>>>>>>  BURAYI DEGISTIR (tek yer)  <<<<<<<<<<<<<<
drop table if exists _hedef;
create temp table _hedef(email text);
insert into _hedef values ('unal.muhammed@outlook.com');
-- >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


-- ---------- 1) TESHIS: hangi adim eksik? ----------
select
  (select count(*) from auth.users u, _hedef h where u.email = h.email)          as auth_hesabi_var_mi,
  (select to_regclass('public.admins') is not null)                              as admins_tablosu_var_mi,
  (select count(*) from admins a join auth.users u on u.id = a.user_id, _hedef h
     where u.email = h.email)                                                    as admin_satiri_var_mi,
  (select u.email_confirmed_at is not null from auth.users u, _hedef h
     where u.email = h.email limit 1)                                            as eposta_dogrulanmis_mi;

-- Beklenen: auth_hesabi=1, admins_tablosu=true, admin_satiri=1, dogrulanmis=true
--   auth_hesabi_var_mi = 0 -> bu e-posta ile Supabase'de hesap YOK; once uygulamadan kayit ol
--   admin_satiri_var_mi = 0 -> asagidaki 3. adim bunu duzeltir


-- ---------- 2) ONARIM: admins tablosu + okuma politikasi ----------
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
from auth.users u, _hedef h
where u.email = h.email
  and not exists (select 1 from admins a where a.user_id = u.id);


-- ---------- 4) DOGRULAMA ----------
-- Bu sorgu senin e-postani donduruyorsa admin panelinden girebilirsin.
select a.display_name, u.email, u.email_confirmed_at is not null as dogrulanmis
from admins a
join auth.users u on u.id = a.user_id
order by u.email;
