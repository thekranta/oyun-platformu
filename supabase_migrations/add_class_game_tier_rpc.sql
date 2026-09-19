-- Çınar/Meşe sınıfındaki öğrencilerin sınıf üzerinden oyun erişimi (paket) kazanması.
--
-- Çocuk oturumu (authenticated, kendi e-postasıyla) RLS yüzünden şu zinciri okuyamaz:
--   class_students.child_email -> classes.teacher_id -> teachers.subscription_tier
-- RLS'i gevşetmek öğretmen e-postası/adı sızdırırdı. Bunun yerine dar bir
-- SECURITY DEFINER fonksiyonu SADECE "en yüksek aktif sınıf paketi" bilgisini
-- (tier + bitiş) döndürür; başka hiçbir veri çıkmaz.
--
-- İstemci (lib/classAccess.ts + lib/subscriptionTiers.ts combineGameTier) bunu kendi
-- paketiyle birleştirir: cinar -> Filiz düzeyi, mese -> Fidan düzeyi; çoklu sınıfta en yükseği.
-- Yalnızca OYUN kilidini açar (veli paneli AI/PDF özellikleri velinin kendi paketine bağlı kalır).
--
-- ÖN KOŞUL: add_tier_insert_guard.sql (yoksa herkes kendi 'teachers' satırını mese ekleyip
-- e-postaları sınıfa yazarak bedava erişim dağıtabilir).
--
-- Çınar sınırı burada da sunucu tarafında zorlanır: bir Çınar öğretmeninin sınıflarındaki
-- ilk 10 öğrenci (added_at, id sırasıyla) hak kazanır; fazlası REST ile eklenmiş olsa bile kazanmaz.
-- (10 = lib/subscriptionTiers.ts OGRETMEN_TIER_FLAGS.cinar.maxStudentsPerClass * maxClasses(1);
--  ikisi değişirse buradaki sayı da elle senkron tutulmalı.)
--
-- Geri alma: DROP FUNCTION public.my_class_game_tier();  (istemci hata alırsa kendi paketine düşer.)
-- Bu SQL'i Supabase SQL Editor'da çalıştırın. Tekrar çalıştırılabilir (idempotent).
--
-- SIRA: 1) add_tier_insert_guard.sql  2) mevcut ücretli satırları denetleyin (o dosyanın sonundaki
-- sorgular; guard mevcut satırlara dokunmaz, daha önce eklenmiş sahte 'cinar'/'mese' satırları bu
-- RPC oluşur oluşmaz geçerli olur)  3) bu dosya.

-- Ön kontrol: guard trigger'ı yoksa RPC'yi kurmayı reddet (yoksa herkes kendi teachers satırını
-- 'mese' ekleyip sınıfa e-posta yazarak bedava erişim dağıtabilir).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lock_tier_insert_teachers' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Önce supabase_migrations/add_tier_insert_guard.sql çalıştırılmalı';
  END IF;
END $$;

-- Aramayı hızlandırır (e-posta ile arama başka hiçbir index'i kullanamıyordu).
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_lower_child_email ON class_students (lower(child_email));

CREATE OR REPLACE FUNCTION public.my_class_game_tier()
RETURNS TABLE (tier text, expires_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.subscription_tier::text, t.package_expires_at
  FROM class_students cs
  JOIN classes  c ON c.id = cs.class_id
  JOIN teachers t ON t.user_id = c.teacher_id          -- teachers.id DEĞİL, user_id
  WHERE nullif((SELECT auth.email()), '') IS NOT NULL
    AND lower(cs.child_email) = lower((SELECT auth.email()))
    AND t.subscription_tier IN ('cinar', 'mese')
    AND (t.package_expires_at IS NULL OR t.package_expires_at > now())
    AND (
      t.subscription_tier = 'mese'
      OR (
        SELECT count(*)
        FROM class_students cs2
        JOIN classes c2 ON c2.id = cs2.class_id
        WHERE c2.teacher_id = c.teacher_id
          AND (coalesce(cs2.added_at, 'epoch'::timestamptz), cs2.id)
            < (coalesce(cs.added_at,  'epoch'::timestamptz), cs.id)
      ) < 10
    )
  ORDER BY (t.subscription_tier = 'mese') DESC, t.package_expires_at DESC NULLS FIRST
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.my_class_game_tier() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_class_game_tier() FROM anon;
GRANT EXECUTE ON FUNCTION public.my_class_game_tier() TO authenticated;

-- DOĞRULAMA (isteğe bağlı): sınıfa eklenmiş bir çocuğun hesabıyla giriş yapıp
--   SELECT * FROM my_class_game_tier();      -- (SQL Editor'da auth.email() NULL olduğundan boş döner;
--                                             --  gerçek test için uygulamadan giriş yapıp menüye girin)
