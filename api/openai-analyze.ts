import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth';
import { logAiUsage } from './_lib/aiUsageLog';
import { estimateOpenAiChatCostUsd } from '../lib/aiPricing';

// OpenAI metin uretimi icin sunucu-tarafi proxy (pedagojik AI yorumu).
// Anahtar yalnizca sunucuda okunur; istemci bundle'ina hic gitmez.
// Istemci /api/openai-analyze'a { prompt, generationConfig?, feature? } gonderir, { text } alir.
// Kimliksiz internetten maliyet-DoS'u onlemek icin gecerli bir Supabase oturumu sart.

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '').trim();
const MODEL = 'gpt-4o-mini'; // maliyet-bilincli, TTS/Whisper'la ayni felsefe

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authed = await requireUser(req, res);
  if (!authed) return;

  const { prompt, generationConfig, feature } = req.body || {};
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: generationConfig?.temperature,
        max_tokens: generationConfig?.maxOutputTokens,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      const text = data?.choices?.[0]?.message?.content;
      if (text) {
        const promptTokens = data?.usage?.prompt_tokens || 0;
        const completionTokens = data?.usage?.completion_tokens || 0;
        await logAiUsage(authed.supabase, {
          userId: authed.user.id,
          servis: 'openai_chat',
          model: MODEL,
          ozellik: typeof feature === 'string' ? feature : 'genel',
          girdiMiktar: promptTokens,
          ciktiMiktar: completionTokens,
          birim: 'token',
          maliyetUsd: estimateOpenAiChatCostUsd(MODEL, promptTokens, completionTokens),
        });
        return res.status(200).json({ text, model: MODEL });
      }
      return res.status(502).json({ error: 'Yanitta metin bulunamadi' });
    }

    return res.status(502).json({ error: data?.error?.message || `Status: ${response.status}` });
  } catch (e: any) {
    return res.status(502).json({ error: e.message || 'OpenAI request failed' });
  }
}
