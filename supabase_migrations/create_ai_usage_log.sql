-- AI maliyet takibi: her ucretli AI cagrisini (Gemini metin analizi, OpenAI TTS,
-- OpenAI Whisper transkript) loglayan ekle-git tablo. Owner-dashboard'daki
-- "AI Maliyeti" paneli bu tabloyu okur. Bu SQL'i Supabase SQL Editor'da calistirin.

CREATE TABLE IF NOT EXISTS ai_kullanim_kayitlari (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  servis TEXT NOT NULL,        -- 'gemini' | 'openai_tts' | 'openai_whisper'
  model TEXT NOT NULL,         -- ör. 'gemini-2.0-flash', 'gpt-4o-mini-tts', 'whisper-1'
  ozellik TEXT,                -- cagri noktasi etiketi (ör. 'veli_kumulatif_rapor')
  girdi_miktar NUMERIC,        -- token (Gemini) / karakter (TTS) / saniye (Whisper)
  cikti_miktar NUMERIC,        -- yalniz Gemini: candidatesTokenCount
  birim TEXT NOT NULL,         -- 'token' | 'karakter' | 'saniye'
  tahmini_maliyet_usd NUMERIC NOT NULL
);

ALTER TABLE ai_kullanim_kayitlari ENABLE ROW LEVEL SECURITY;

-- Herhangi bir oturum acik kullanici kendi adina bir kullanim satiri ekleyebilir
-- (sunucu tarafi endpoint'ler requireUser()'in dondurdugu oturum-yetkili istemciyle yazar).
DROP POLICY IF EXISTS "own_insert_ai_usage" ON ai_kullanim_kayitlari;
CREATE POLICY "own_insert_ai_usage" ON ai_kullanim_kayitlari
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Yalniz owner tum kayitlari okuyabilir (create_owner_dashboard.sql'deki owner_reads_* deseniyle ayni).
DROP POLICY IF EXISTS "owner_reads_ai_usage" ON ai_kullanim_kayitlari;
CREATE POLICY "owner_reads_ai_usage" ON ai_kullanim_kayitlari
  FOR SELECT USING (EXISTS (SELECT 1 FROM owners WHERE user_id = auth.uid()));
