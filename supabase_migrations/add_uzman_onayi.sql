-- Tüm yeni sütunlar için SQL migrasyonu
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın

-- Uzman Onay Sistemi
ALTER TABLE oyun_skorlari
ADD COLUMN IF NOT EXISTS uzman_onayi BOOLEAN DEFAULT FALSE;

ALTER TABLE oyun_skorlari
ADD COLUMN IF NOT EXISTS onaylayan_uzman TEXT DEFAULT NULL;

-- Bunu Söyle oyunu için
ALTER TABLE oyun_skorlari
ADD COLUMN IF NOT EXISTS algilanan_kelime TEXT DEFAULT NULL;

-- Tur Analizi için
ALTER TABLE oyun_skorlari
ADD COLUMN IF NOT EXISTS toplam_tur_sayisi INTEGER DEFAULT NULL;

ALTER TABLE oyun_skorlari
ADD COLUMN IF NOT EXISTS mevcut_tur INTEGER DEFAULT NULL;

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_uzman_onayi ON oyun_skorlari(uzman_onayi);
