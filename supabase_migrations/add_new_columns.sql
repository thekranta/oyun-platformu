-- Bu SQL'i Supabase SQL Editor'da çalıştırın
-- oyun_skorlari tablosuna yeni sütunlar ekleme

-- Zorluk seviyesi: Oyunun zorluk derecesini tutar (1-5 gibi)
ALTER TABLE oyun_skorlari 
ADD COLUMN IF NOT EXISTS zorluk_seviyesi INT4;

-- Kazanım odağı: Oyunun hangi pedagojik beceriyi hedeflediğini yazar
ALTER TABLE oyun_skorlari 
ADD COLUMN IF NOT EXISTS kazanim_odagi TEXT;

-- Deneme no: Çocuğun bu oyunu kaçıncı kez oynadığını tutar
ALTER TABLE oyun_skorlari 
ADD COLUMN IF NOT EXISTS deneme_no INT4;

-- Başarılı ekleme kontrolü
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'oyun_skorlari' 
AND column_name IN ('zorluk_seviyesi', 'kazanim_odagi', 'deneme_no');
