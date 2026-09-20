-- ============================================================================
-- Veli engelleri (class_blocks) ve engel sonrası sınıf kayıtları — SALT OKUNUR
-- ============================================================================
-- Amaç: bir veli "Sınıftan çık" / "Reddet" dediğinde öğretmenin o e-postayı yeniden ekleyememesi gerekir.
-- Bu sorgu, canlıda o kararın nasıl işlediğini gösterir. Hiçbir şeyi değiştirmez; çıktıda e-posta ya da
-- isim YOKTUR (yalnız sayılar, zamanlar ve bayraklar).
--   engel_sayisi                : kaç öğretmen-veli engeli var
--   ogretmen_owner_mi           : engellenen öğretmen aynı zamanda owner hesabı mı
--   engelden_sonra_eklenen_kayit: engelden SONRA aynı öğretmenin aynı e-postayı yeniden ekleyip
--                                 ekleyemediği (0 olmalı; owner düzeltmesinden önce owner hesabı için 1 olabilir)
--   o_kayitlarin_durumu         : o kayıtların onay biçimi (legacy / package / parent / bekliyor)
-- ============================================================================

SELECT jsonb_pretty(jsonb_build_object(
  'engel_sayisi', (SELECT count(*) FROM public.class_blocks),
  'engeller', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'engel_zamani', b.created_at,
      'ogretmen_owner_mi', EXISTS (SELECT 1 FROM public.owners o WHERE o.user_id = b.teacher_id),
      'ogretmen_paketi', (SELECT t.subscription_tier FROM public.teachers t WHERE t.user_id = b.teacher_id),
      'engelden_sonra_eklenen_kayit', (
        SELECT count(*) FROM public.class_students cs
          JOIN public.classes c ON c.id = cs.class_id
         WHERE c.teacher_id = b.teacher_id
           AND lower(btrim(cs.child_email)) = b.child_email_lower
           AND cs.added_at > b.created_at),
      'o_kayitlarin_durumu', (
        SELECT coalesce(jsonb_agg(coalesce(cs.accepted_via, 'bekliyor')), '[]'::jsonb) FROM public.class_students cs
          JOIN public.classes c ON c.id = cs.class_id
         WHERE c.teacher_id = b.teacher_id AND lower(btrim(cs.child_email)) = b.child_email_lower)
    )), '[]'::jsonb) FROM public.class_blocks b),
  'sinif_kayitlari', (
    SELECT jsonb_build_object(
      'toplam',   count(*),
      'legacy',   count(*) FILTER (WHERE accepted_via = 'legacy'),
      'package',  count(*) FILTER (WHERE accepted_via = 'package'),
      'parent',   count(*) FILTER (WHERE accepted_via = 'parent'),
      'bekleyen', count(*) FILTER (WHERE accepted_at IS NULL))
      FROM public.class_students)
)) AS engel_kontrolu;
