-- ============================================================
-- ADMIN YETKİSİ VERME
-- ------------------------------------------------------------
-- Admin paneli (/admin) girişi iki şey ister:
--   1) Geçerli bir Supabase Auth hesabı (e-posta + şifre)
--   2) O hesabın `admins` tablosunda bir satırı
-- Bu script, verilen e-postaya sahip Auth kullanıcısını `admins`'e ekler.
--
-- ÖN KOŞUL: Bu e-posta ile daha önce uygulamada kayıt olunmuş olmalı
-- (Auth > Users listesinde görünmeli). Yoksa önce uygulamadan kayıt ol,
-- sonra bu script'i çalıştır.
--
-- KULLANIM: Supabase > SQL Editor'de aşağıyı çalıştır.
-- E-postayı kendi admin e-postanla değiştir.
-- ============================================================

insert into admins (user_id, display_name)
select u.id, 'Yönetici'
from auth.users u
where u.email = 'muhammed.28unal@gmail.com'
  and not exists (select 1 from admins a where a.user_id = u.id);

-- Kontrol: admin satırların
select a.user_id, a.display_name, u.email
from admins a
join auth.users u on u.id = a.user_id;
