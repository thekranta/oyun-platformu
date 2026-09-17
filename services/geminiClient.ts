// Istemci tarafi Gemini yardimcisi: anahtari ASLA tasimaz, sunucu proxy'sini cagirir.
// Basarisizlikta Error firlatir; cagiran taraf kendi hata davranisini secer.
import { supabase } from '../lib/supabase';
import { apiUrl } from '../lib/apiBase';

export async function requestGeminiAnalysis(
  prompt: string,
  generationConfig?: Record<string, unknown>,
  feature?: string,
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Oturum bulunamadı, lütfen tekrar giriş yapın.');

  const response = await fetch(apiUrl('/api/gemini-analyze'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ prompt, generationConfig, feature }),
  });

  const data = await response.json().catch(() => ({} as { text?: string; error?: string }));

  if (!response.ok || !data?.text) {
    throw new Error(data?.error || `Gemini hatası (${response.status})`);
  }

  return data.text as string;
}
