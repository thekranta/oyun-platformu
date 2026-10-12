-- ============================================================================
-- KURUM PANELİ: süresi dolan kurumun yöneticisi artık "yönetici değilsiniz" mesajı görmez
-- ============================================================================
-- Sorun: public.my_admin_institutions() yalnız SÜRESİ DOLMAMIŞ kurumları döndürüyordu (private.is_institution_admin
-- süre kontrolünü de içerir). Paketi biten kurumun yöneticisi giriş yapınca boş liste alıp "Bu hesap bir kurumun
-- yöneticisi olarak tanımlı değil" mesajı görüyordu; yenileme zamanı gelen bir müşteri hesabının bozuk olduğunu sanırdı.
--
-- Çözüm: yalnız bu liste fonksiyonu, kullanıcının YÖNETİCİ ÜYELİĞİ olan kurumları süresi dolmuş olsa da döndürür
-- (expires_at zaten sütunda). İstemci süresi dolanı ayırıp "Kurum paketinizin süresi dolmuş" der ve panele sokmaz.
-- VERİ fonksiyonları (institution_overview, _classes, _class_children ...) AYNEN private.is_institution_admin ile
-- kapalı kalır: süresi dolan kurumun hiçbir verisi sunucudan dönmez. Başka kurumun yöneticisi hiçbir şey göremez
-- (üyelik koşulu auth.uid() ile).
--
-- GERİ ALMA: supabase_migrations/add_institutions.sql içindeki my_admin_institutions tanımını (WHERE
-- private.is_institution_admin(i.id)) yeniden çalıştırın.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.my_admin_institutions()
RETURNS TABLE (institution_id uuid, name text, expires_at timestamptz, teacher_count bigint, class_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp
AS $$
  SELECT i.id::uuid, left(i.name, 120)::text, i.expires_at::timestamptz,
         (SELECT count(*) FROM institution_members t
           WHERE t.institution_id = i.id AND EXISTS (SELECT 1 FROM classes c WHERE c.teacher_id = t.user_id))::bigint,
         (SELECT count(*) FROM institution_members t JOIN classes c ON c.teacher_id = t.user_id
           WHERE t.institution_id = i.id)::bigint
    FROM institutions i
   WHERE auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM institution_members m
                  WHERE m.institution_id = i.id AND m.user_id = auth.uid() AND m.role = 'admin')
   ORDER BY i.name, i.id
$$;

REVOKE ALL ON FUNCTION public.my_admin_institutions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_admin_institutions() TO authenticated;

NOTIFY pgrst, 'reload schema';
