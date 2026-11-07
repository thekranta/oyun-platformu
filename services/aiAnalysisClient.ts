// Istemci tarafi AI yardimcisi: anahtari ASLA tasimaz, sunucu proxy'sini cagirir.
// Basarisizlikta Error firlatir; cagiran taraf kendi hata davranisini secer.
import { supabase } from '../lib/supabase';
import { apiUrl } from '../lib/apiBase';
import { AiConsentDeclinedError, hasAiConsent, isConsentExemptFeature } from '../lib/aiConsent';

export async function requestAiAnalysis(
  prompt: string,
  generationConfig?: Record<string, unknown>,
  feature?: string,
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Oturum bulunamadı, lütfen tekrar giriş yapın.');

  // Apple 5.1.2(i): çocuğun bilgisi ebeveyn izni olmadan yapay zekâ hizmetine gönderilmez (izin ekranı çağıran özellikte açılır).
  if (!isConsentExemptFeature(feature) && !(await hasAiConsent('report'))) throw new AiConsentDeclinedError();

  const response = await fetch(apiUrl('/api/openai-analyze'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ prompt, generationConfig, feature }),
  });

  const data = await response.json().catch(() => ({} as { text?: string; error?: string }));

  // Sunucu izni ayrıca denetler (api/_lib/aiAccess.ts): hesaptaki izin eksikse (ör. izin yalnız cihaza yazılabilmişse)
  // bilinçli red gibi ele alınır; çağıran özellik izin ekranını yeniden açar.
  if (response.status === 403 && (data as { error?: string })?.error === 'consent_required') throw new AiConsentDeclinedError();

  if (!response.ok || !data?.text) {
    throw new Error(data?.error || `AI analiz hatası (${response.status})`);
  }

  return data.text as string;
}
