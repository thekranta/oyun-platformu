import type { SupabaseClient } from '@supabase/supabase-js';

// Ucretli AI cagrilarini (Gemini/TTS/Whisper) ai_kullanim_kayitlari tablosuna loglar.
// requireUser()'in dondurdugu oturum-yetkili istemciyle yazar (RLS own_insert_ai_usage
// politikasi user_id = auth.uid() bekliyor). Loglama HATASI gercek AI yanitini asla
// bozmamali -- bu yuzden cagiran taraf sonucu beklemeden/kontrol etmeden cagirir.
export async function logAiUsage(
  supabase: SupabaseClient,
  params: {
    userId: string;
    servis: 'gemini' | 'openai_tts' | 'openai_whisper';
    model: string;
    ozellik?: string;
    girdiMiktar: number;
    ciktiMiktar?: number;
    birim: 'token' | 'karakter' | 'saniye';
    maliyetUsd: number;
  }
): Promise<void> {
  try {
    await supabase.from('ai_kullanim_kayitlari').insert({
      user_id: params.userId,
      servis: params.servis,
      model: params.model,
      ozellik: params.ozellik || null,
      girdi_miktar: params.girdiMiktar,
      cikti_miktar: params.ciktiMiktar ?? null,
      birim: params.birim,
      tahmini_maliyet_usd: params.maliyetUsd,
    });
  } catch (e) {
    console.error('AI kullanim loglama hatasi (yanit etkilenmedi):', e);
  }
}
