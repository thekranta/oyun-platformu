-- ============================================================================
-- KURUM KURMA (owner, SQL Editor'da çalıştırır) — ÖRNEK
-- ============================================================================
-- ÖN KOŞUL: add_institutions.sql çalışmış olmalı.
-- Aşağıdaki 3 değeri değiştirin (v_name, v_admin_email, v_teacher_emails), sonra tümünü çalıştırın.
--
-- KURALLAR
--  * Yönetici ve öğretmenlerin ÖNCEDEN hesabı olmalı (auth.users'ta e-postaları bulunmalı).
--  * Yönetici /kurum adresinden (kurum girişi) e-posta + şifreyle girer; ÖĞRETMEN KAYDI GEREKMEZ. Hesabı yoksa
--    Supabase > Authentication > Users > "Add user" ile e-posta + şifre oluşturup "Auto Confirm" işaretleyin
--    (şifreyi yöneticiye güvenli bir kanaldan iletin; "Şifremi unuttum" ile değiştirebilir).
--  * Öğretmenler kendi öğretmen paneline (öğretmen girişi) girer; yönetici de ayrıca öğretmense orada "Kurum Paneli" kartını görür.
--  * Kurum paketi Meşe satışıyla birlikte verilir: öğretmenlerin paket atamasını owner panelinden yapın
--    (bu dosya paket ATAMAZ; yalnız kurum + üyelik kurar). Süresi dolan Meşe öğretmeninin 'package' onaylı
--    çocukları panelden otomatik düşer (veri kapanır).
--  * v_expires_at NULL ise kurum süresizdir; tarih verirseniz o tarihte panel kapanır.
--  * Çalıştırma TEKRAR edilebilir: kurum adı aynıysa yeni kurum açmaz, eksik üyeleri ekler.
--
-- Bir kişiyi çıkarmak:   DELETE FROM public.institution_members WHERE institution_id = '<id>' AND user_id = '<uid>';
-- Süreyi uzatmak:        UPDATE public.institutions SET expires_at = '2027-09-01' WHERE id = '<id>';
-- ============================================================================
DO $$
DECLARE
  v_name           text        := 'Örnek Anaokulları';                       -- <== kurum adı
  v_admin_email    text        := 'mudur@ornek-okul.com';                    -- <== kurum yöneticisinin hesap e-postası
  v_teacher_emails text[]      := ARRAY['ogretmen1@ornek-okul.com',          -- <== kuruma bağlanacak öğretmenler
                                        'ogretmen2@ornek-okul.com'];
  v_expires_at     timestamptz := NULL;                                      -- <== NULL = süresiz

  v_inst  uuid;
  v_uid   uuid;
  v_mail  text;
  v_added int := 0;
BEGIN
  SELECT id INTO v_inst FROM public.institutions WHERE name = v_name ORDER BY created_at LIMIT 1;
  IF v_inst IS NULL THEN
    INSERT INTO public.institutions (name, expires_at) VALUES (v_name, v_expires_at) RETURNING id INTO v_inst;
    RAISE NOTICE 'kurum oluşturuldu: % (%)', v_name, v_inst;
  ELSE
    UPDATE public.institutions SET expires_at = v_expires_at WHERE id = v_inst;
    RAISE NOTICE 'kurum zaten var, süre güncellendi: % (%)', v_name, v_inst;
  END IF;

  -- yönetici
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(btrim(v_admin_email));
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Yönetici hesabı bulunamadı: % (önce uygulamada kayıt olmalı)', v_admin_email;
  END IF;
  INSERT INTO public.institution_members (institution_id, user_id, role) VALUES (v_inst, v_uid, 'admin')
  ON CONFLICT (institution_id, user_id) DO UPDATE SET role = 'admin';

  -- öğretmenler (yönetici aynı zamanda öğretmen listesinde olsa bile yönetici kalır)
  FOREACH v_mail IN ARRAY v_teacher_emails LOOP
    SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(btrim(v_mail));
    IF v_uid IS NULL THEN
      RAISE EXCEPTION 'Öğretmen hesabı bulunamadı: % (önce uygulamada kayıt olmalı)', v_mail;
    END IF;
    INSERT INTO public.institution_members (institution_id, user_id, role) VALUES (v_inst, v_uid, 'teacher')
    ON CONFLICT (institution_id, user_id) DO NOTHING;
    v_added := v_added + 1;
  END LOOP;

  RAISE NOTICE 'tamam: 1 yönetici + % öğretmen bağlandı. Üyeler: %', v_added,
    (SELECT count(*) FROM public.institution_members WHERE institution_id = v_inst);
END $$;

-- Kontrol: kurumlar ve üyeleri (e-posta yerine rol + sınıf sayısı)
SELECT i.name, m.role, (SELECT count(*) FROM public.classes c WHERE c.teacher_id = m.user_id) AS sinif_sayisi
  FROM public.institutions i JOIN public.institution_members m ON m.institution_id = i.id
 ORDER BY i.name, m.role, m.created_at;
