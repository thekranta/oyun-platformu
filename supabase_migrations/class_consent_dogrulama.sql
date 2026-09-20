-- ============================================================================
-- add_class_consent.sql SONRASI doğrulama (SALT OKUNUR — hiçbir şeyi değiştirmez)
-- ============================================================================
-- Supabase SQL Editor RAISE NOTICE mesajlarını göstermez; bu sorgu canlı durumu tek bir JSON'da toplar:
--   * sınıf kayıtlarının onay dağılımı (legacy / package / parent / bekleyen) — e-posta İÇERMEZ,
--   * eski okuma politikalarının roller ve varlığı, yeni fonksiyon/tetikleyici/tablo varlığı ve izinleri,
--   * öğretmen e-postası sapması, kardeşli hesap sayısı,
--   * GERÇEK canlı verinin üzerinde RPC duman testi: en çok öğrencisi olan öğretmen gibi teacher_class_roster /
--     teacher_student_scores, ilk eşleşen veli gibi my_class_invites çağrılır (JWT talepleri işlem içinde
--     taklit edilir; hata olursa yakalanıp JSON'a yazılır, sorgu düşmez).
-- Sonucu (tek hücre) kopyalayıp gönderin. Kişisel veri içermez (yalnız sayılar, durumlar, ad var/yok bayrakları).
-- ============================================================================

DO $$
DECLARE
  o        jsonb := '{}'::jsonb;
  v_teacher uuid;
  v_temail  text;
  v_class   uuid;
  v_sid     uuid;
  v_parent  text;
  v_puid    uuid;
BEGIN
  -- 1) Sınıf kayıtları (e-posta yok)
  o := o || jsonb_build_object('sinif_kayitlari', (
    SELECT jsonb_build_object(
      'toplam',   count(*),
      'legacy',   count(*) FILTER (WHERE accepted_via = 'legacy'),
      'package',  count(*) FILTER (WHERE accepted_via = 'package'),
      'parent',   count(*) FILTER (WHERE accepted_via = 'parent'),
      'bekleyen', count(*) FILTER (WHERE accepted_at IS NULL))
      FROM public.class_students));

  o := o || jsonb_build_object('legacy_kayit_sahipleri', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'ogretmen_satiri_var', t.user_id IS NOT NULL,
             'ogretmen_paketi', t.subscription_tier,
             'sinif_adi_uzunlugu', length(c.name))), '[]'::jsonb)
      FROM public.class_students cs
      JOIN public.classes c ON c.id = cs.class_id
      LEFT JOIN public.teachers t ON t.user_id = c.teacher_id
     WHERE cs.accepted_via = 'legacy'));

  -- 2) Politikalar, nesneler, izinler
  o := o || jsonb_build_object('okuma_politikalari', (
    SELECT coalesce(jsonb_agg(jsonb_build_object('tablo', tablename, 'ad', policyname, 'roller', roles::text)), '[]'::jsonb)
      FROM pg_policies
     WHERE schemaname = 'public' AND policyname IN ('teacher_reads_student_scores', 'teacher_reads_own_class_profiles')));

  o := o || jsonb_build_object('nesneler', jsonb_build_object(
    'my_class_invites',            to_regprocedure('public.my_class_invites()') IS NOT NULL,
    'respond_class_invite',        to_regprocedure('public.respond_class_invite(uuid, boolean)') IS NOT NULL,
    'teacher_class_roster',        to_regprocedure('public.teacher_class_roster(uuid)') IS NOT NULL,
    'teacher_student_scores_3arg', to_regprocedure('public.teacher_student_scores(uuid, integer, boolean)') IS NOT NULL,
    'teacher_student_scores_eski', to_regprocedure('public.teacher_student_scores(uuid, integer)') IS NOT NULL,
    'sinif_tetikleyicisi',         EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_class_students_before_insert' AND NOT tgisinternal),
    'ogretmen_email_tetikleyicisi', EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_teachers_pin_identity' AND NOT tgisinternal),
    'class_blocks_rls_acik',       (SELECT relrowsecurity FROM pg_class WHERE oid = to_regclass('public.class_blocks')),
    'tekil_dizin',                 to_regclass('public.uq_class_students_class_email') IS NOT NULL));

  o := o || jsonb_build_object('class_students_tablo_izinleri', (
    SELECT coalesce(jsonb_object_agg(grantee, privs), '{}'::jsonb)
      FROM (SELECT grantee, string_agg(privilege_type, ',' ORDER BY privilege_type) AS privs
              FROM information_schema.role_table_grants
             WHERE table_schema = 'public' AND table_name = 'class_students' AND grantee IN ('anon', 'authenticated')
             GROUP BY grantee) g));

  o := o || jsonb_build_object('ogretmen_email_sapmasi', (
    SELECT count(*) FROM public.teachers t JOIN auth.users u ON u.id = t.user_id
     WHERE u.email IS NOT NULL AND lower(btrim(t.email)) IS DISTINCT FROM lower(btrim(u.email))));

  o := o || jsonb_build_object('kardesli_hesap_sayisi', (SELECT count(*) FROM private.multi_child_emails()));

  -- 3) DUMAN TESTİ: gerçek veri, taklit edilmiş JWT (işlem-yerel; sonunda temizlenir)
  BEGIN
    SELECT c.teacher_id, t.email, c.id
      INTO v_teacher, v_temail, v_class
      FROM public.classes c
      JOIN public.teachers t ON t.user_id = c.teacher_id
      JOIN (SELECT class_id, count(*) AS n FROM public.class_students GROUP BY class_id) k ON k.class_id = c.id
     ORDER BY k.n DESC, c.id
     LIMIT 1;

    IF v_teacher IS NULL THEN
      o := o || jsonb_build_object('roster_rpc', 'atlandi: öğrencisi olan sınıf/öğretmen yok');
    ELSE
      PERFORM set_config('request.jwt.claim.sub', v_teacher::text, true);
      PERFORM set_config('request.jwt.claim.email', coalesce(v_temail, ''), true);
      PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

      o := o || jsonb_build_object('roster_rpc', (
        SELECT jsonb_build_object(
                 'satir', count(*),
                 'accepted', count(*) FILTER (WHERE status = 'accepted'),
                 'pending', count(*) FILTER (WHERE status = 'pending'),
                 'suspended', count(*) FILTER (WHERE status = 'suspended'),
                 'ad_gorunen', count(*) FILTER (WHERE child_name IS NOT NULL),
                 'gizli_kardesli', count(*) FILTER (WHERE hidden))
          FROM public.teacher_class_roster(v_class)));

      SELECT student_id INTO v_sid
        FROM public.teacher_class_roster(v_class)
       WHERE status = 'accepted' AND child_name IS NOT NULL
       ORDER BY game_count DESC NULLS LAST LIMIT 1;

      IF v_sid IS NULL THEN
        o := o || jsonb_build_object('skor_rpc', 'atlandi: bu sınıfta verisi görünen onaylı öğrenci yok');
      ELSE
        o := o || jsonb_build_object('skor_rpc', (
          SELECT jsonb_build_object(
                   'satir', count(*),
                   'cizim_varsayilan_dolu', count(*) FILTER (WHERE cizim_verisi IS NOT NULL),
                   'ai_akademik_var', count(*) FILTER (WHERE ai_akademik IS NOT NULL),
                   'ai_veli_notu_SIZDI', count(*) FILTER (WHERE ai_akademik ~* 'VEL[İIiı]\s+B[İIiı]LG[İIiı]LEND[İIiı]RME\s+NOTU'))
            FROM public.teacher_student_scores(v_sid)));
        o := o || jsonb_build_object('skor_rpc_cizimli', (
          SELECT jsonb_build_object('cizim_dolu', count(*) FILTER (WHERE cizim_verisi IS NOT NULL))
            FROM public.teacher_student_scores(v_sid, 20, true)));
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    o := o || jsonb_build_object('ogretmen_rpc_HATA', SQLERRM);
  END;

  BEGIN
    -- Veli tarafı: bir sınıf kaydıyla eşleşen kayıtlı hesap (e-posta çıktıya YAZILMAZ)
    SELECT u.id, u.email INTO v_puid, v_parent
      FROM public.class_students cs
      JOIN auth.users u ON lower(btrim(u.email)) = lower(btrim(cs.child_email))
     ORDER BY cs.added_at
     LIMIT 1;

    IF v_puid IS NULL THEN
      o := o || jsonb_build_object('veli_rpc', 'atlandi: sınıf kaydıyla eşleşen kayıtlı veli hesabı yok');
    ELSE
      PERFORM set_config('request.jwt.claim.sub', v_puid::text, true);
      PERFORM set_config('request.jwt.claim.email', v_parent, true);
      PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
      o := o || jsonb_build_object('veli_rpc', (
        SELECT jsonb_build_object(
                 'davet', count(*),
                 'accepted', count(*) FILTER (WHERE status = 'accepted'),
                 'pending', count(*) FILTER (WHERE status = 'pending'),
                 'suspended', count(*) FILTER (WHERE status = 'suspended'),
                 'ogretmen_adi_gorunen', count(*) FILTER (WHERE teacher_name IS NOT NULL),
                 'ucretli_ogretmen', count(*) FILTER (WHERE teacher_is_paid))
          FROM public.my_class_invites()));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    o := o || jsonb_build_object('veli_rpc_HATA', SQLERRM);
  END;

  -- taklit edilen kimliği temizle
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.email', '', true);
  PERFORM set_config('request.jwt.claim.role', '', true);

  PERFORM set_config('app.class_consent_dogrulama', o::text, true);
END $$;

SELECT jsonb_pretty(current_setting('app.class_consent_dogrulama')::jsonb) AS class_consent_dogrulama;
