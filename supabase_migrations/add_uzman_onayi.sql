-- Uzman Onay Sistemi için yeni sütunlar
-- Bu SQL'i Supabase Dashboard > SQL Editor'da çalıştırın

ALTER TABLE oyun_skorlari
ADD COLUMN IF NOT EXISTS uzman_onayi BOOLEAN DEFAULT FALSE;

ALTER TABLE oyun_skorlari
ADD COLUMN IF NOT EXISTS onaylayan_uzman TEXT DEFAULT NULL;

-- Algılanan kelime sütunu (Bunu Söyle oyunu için - eğer yoksa)
ALTER TABLE oyun_skorlari
ADD COLUMN IF NOT EXISTS algilanan_kelime TEXT DEFAULT NULL;

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_uzman_onayi ON oyun_skorlari(uzman_onayi);
