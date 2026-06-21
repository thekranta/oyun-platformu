import type { VercelRequest, VercelResponse } from '@vercel/node';

// Gemini metin uretimi icin sunucu-tarafi proxy.
// Anahtar yalnizca sunucuda okunur (GEMINI_API_KEY); istemci bundle'ina hic gitmez.
// Istemci /api/gemini-analyze'a { prompt, generationConfig? } gonderir, { text } alir.

const MODELS = [
  { name: 'gemini-2.0-flash', version: 'v1' },
  { name: 'gemini-1.5-flash', version: 'v1' },
  { name: 'gemini-1.5-pro', version: 'v1' },
  { name: 'gemini-pro', version: 'v1beta' },
];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, generationConfig } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  // Sunucu-tarafi anahtar tercih edilir; eski EXPO_PUBLIC degiskeni yalnizca gecis
  // donemi icin fallback (sunucu env'i istemciye sizmaz).
  const apiKey = (process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '').trim();
  if (!apiKey) return res.status(500).json({ error: 'Gemini API key not configured' });

  let lastError = '';
  for (const model of MODELS) {
    try {
      const body: Record<string, unknown> = { contents: [{ parts: [{ text: prompt }] }] };
      if (generationConfig) body.generationConfig = generationConfig;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/${model.version}/models/${model.name}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (response.ok) {
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return res.status(200).json({ text, model: model.name });
        lastError = 'Yanitta metin bulunamadi';
        continue;
      }

      lastError = data?.error?.message || `Status: ${response.status}`;
      // Sadece model bulunamadi / gecersiz istek hatalarinda sonraki modeli dene.
      // Quota / yetki gibi hatalarda devam etmenin anlami yok.
      if (response.status !== 404 && response.status !== 400) break;
    } catch (e: any) {
      lastError = e.message;
    }
  }

  return res.status(502).json({ error: lastError || 'Gemini request failed' });
}
