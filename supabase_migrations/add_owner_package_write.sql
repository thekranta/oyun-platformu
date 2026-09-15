-- Owner-dashboard'dan manuel paket atama: owner artık profiles/teachers'a
-- YAZABİLİR ama SADECE tier/süre sütunlarına (başkasının satırını güncellerken).
-- lock_tier_columns() fonksiyonunu CREATE OR REPLACE ile genişletiyoruz --
-- mevcut trg_lock_tier_profiles/trg_lock_tier_teachers trigger'larına dokunmaya
-- gerek yok, fonksiyon değişince otomatik devreye girer.

CREATE OR REPLACE FUNCTION lock_tier_columns()
RETURNS TRIGGER AS $$
DECLARE
  is_owner boolean := EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid());
  is_own_row boolean;
BEGIN
  IF TG_TABLE_NAME = 'profiles' THEN
    is_own_row := (NEW.email = auth.email());
  ELSE
    is_own_row := (NEW.user_id = auth.uid());
  END IF;

  IF is_owner AND NOT is_own_row THEN
    -- Owner BAŞKASININ satırını güncelliyor: sadece tier/süre sütunlarına izin ver,
    -- geri kalan her şeyi eski değerine zorla.
    IF TG_TABLE_NAME = 'profiles' THEN
      NEW.parent_name := OLD.parent_name;
      NEW.email := OLD.email;
      NEW.child_name := OLD.child_name;
      NEW.child_age_months := OLD.child_age_months;
      NEW.data_consent := OLD.data_consent;
    ELSE
      NEW.name := OLD.name;
      NEW.email := OLD.email;
      NEW.school_name := OLD.school_name;
    END IF;
  ELSIF NOT is_owner THEN
    -- Veli/öğretmen kendi satırını güncelliyor: tier/süre sütunlarına DOKUNAMAZ.
    NEW.subscription_tier := OLD.subscription_tier;
    NEW.package_started_at := OLD.package_started_at;
    NEW.package_expires_at := OLD.package_expires_at;
  END IF;
  -- (owner kendi satırını güncelliyorsa: hiçbir kısıtlama yok, mevcut davranış korunur)

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Owner için UPDATE RLS politikaları (PERMISSIVE-additive, mevcut own_update_profiles/
-- self_update_teacher politikalarının YANINA eklenir, yerine geçmez).
DROP POLICY IF EXISTS "owner_updates_profiles" ON profiles;
CREATE POLICY "owner_updates_profiles" ON profiles
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "owner_updates_teachers" ON teachers;
CREATE POLICY "owner_updates_teachers" ON teachers
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid()));
