-- ============================================================================
-- E-POSTA DOĞRULAMASINI AÇMADAN ÖNCE KONTROL (yalnız OKUR, hiçbir şeyi değiştirmez)
-- ============================================================================
-- NEDEN AÇILMALI: "Confirm email" KAPALIYKEN biri başkasının e-postasıyla hesap açıp o e-postaya bağlı
-- çocuk verisine (profil, skorlar, sınıf kayıtları) oturum e-postası üzerinden erişebilir. Açıkken kayıt,
-- e-postadaki bağlantıya tıklanana kadar oturum vermez.
--
-- SIRA (siz yaparsınız; ben Supabase ayarlarını değiştirmem):
--   1) Bu dosyayı SQL Editor'da çalıştırın; "dogrulanmamis" sayısına bakın (kapalıyken kayıt olanlar otomatik
--      doğrulanmış sayılır, beklenen 0 ya da çok küçük bir sayı).
--   2) Supabase > Authentication > URL Configuration: Site URL = https://oyun.childhoodtech.com ve
--      Redirect URLs listesine aynı adresi ekleyin (doğrulama bağlantısı oraya döner).
--   3) Supabase > Authentication > Emails > "Confirm signup" şablonunu Türkçeleştirin (isteğe bağlı ama önerilir).
--   4) Supabase > Authentication > Sign In / Providers > Email > "Confirm email" AÇIN.
--   5) Uygulamada atılabilir bir e-postayla kayıt olun: "E-postanı doğrula" ekranı gelmeli; bağlantıya
--      tıklayıp giriş yapınca profil otomatik oluşur (ilk girişte).
--   Sorun çıkarsa 4. adımı geri kapatmak yeter; istemci kodu her iki durumda da çalışır.
-- ============================================================================

SELECT
  count(*)                                                   AS toplam_hesap,
  count(*) FILTER (WHERE email_confirmed_at IS NOT NULL)     AS dogrulanmis,
  count(*) FILTER (WHERE email_confirmed_at IS NULL)         AS dogrulanmamis
FROM auth.users;

-- Doğrulanmamış hesaplar (e-posta adresi yerine yalnız alan adı gösterilir):
SELECT split_part(email, '@', 2) AS alan_adi, count(*) AS adet, min(created_at)::date AS ilk_kayit
FROM auth.users
WHERE email_confirmed_at IS NULL
GROUP BY 1
ORDER BY adet DESC
LIMIT 20;

-- Profili olup auth hesabı olmayan (yetim) e-postalar — bilgi amaçlı:
SELECT count(*) AS hesapsiz_profil
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE lower(u.email) = lower(p.email));

-- (YALNIZ gerçekten gerekirse, bilinçli olarak) mevcut doğrulanmamış hesapları doğrulanmış saymak:
--   UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;
-- Bunu çalıştırmak, o hesapların e-postasının gerçekten kullanıcıya ait olduğunu KABUL etmek demektir.
