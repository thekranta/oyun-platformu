// Istemci tarafi Gemini yardimcisi: anahtari ASLA tasimaz, sunucu proxy'sini cagirir.
// Basarisizlikta Error firlatir; cagiran taraf kendi hata davranisini secer.

export async function requestGeminiAnalysis(
  prompt: string,
  generationConfig?: Record<string, unknown>,
): Promise<string> {
  const response = await fetch('/api/gemini-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, generationConfig }),
  });

  const data = await response.json().catch(() => ({} as { text?: string; error?: string }));

  if (!response.ok || !data?.text) {
    throw new Error(data?.error || `Gemini hatası (${response.status})`);
  }

  return data.text as string;
}
