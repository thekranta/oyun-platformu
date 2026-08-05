-- Cocuk cizimleri gizlilik duzeltmesi: 'cizimler' bucket'ini OZELE cevir.
-- Neden: bucket public'ti ve dosya yolu cocugun adini iceriyordu — URL'i bilen
-- herkes kimlik dogrulamasiz erisebiliyordu.
-- On kosul (kod tarafi TAMAMLANDI):
--   * services/gameResults.ts artik public URL uretmiyor, yalniz imagePath sakliyor.
--   * app/admin.tsx DrawingPreview imagePath'ten (eski kayitlarda public URL'den
--     ayiklanan yoldan) imzali URL uretiyor (createSignedUrl, 1 saat).
-- Bu SQL'i Supabase SQL Editor'da calistirin.

-- 1) Bucket'i ozele cevir (mevcut public URL'ler 404 olur — istenen davranis).
UPDATE storage.buckets SET public = false WHERE id = 'cizimler';

-- 2) storage.objects politikalari (RLS storage'da varsayilan olarak etkin).
--    Yukleme: yalnizca oturumlu kullanicilar (oyun kaydi girisli akista olusur).
DROP POLICY IF EXISTS "auth_upload_cizimler" ON storage.objects;
CREATE POLICY "auth_upload_cizimler" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cizimler');

--    Okuma (imzali URL uretimi dahil): yalnizca admin'ler.
--    (Cizimler su an yalnizca admin panelinde goruntuleniyor; veli panelinde yok.)
DROP POLICY IF EXISTS "admin_read_cizimler" ON storage.objects;
CREATE POLICY "admin_read_cizimler" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'cizimler'
    AND EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
  );

-- NOT: fix_rls_oyun_skorlari_profiles.sql henuz calistirilmadiysa ONCE onu calistirin;
-- veli paneli okumalari artik oturum jetonu gonderiyor (VeliDashboard.getAuthHeaders),
-- panel girisi parolali (app/veli-dashboard.tsx signInWithPassword).
