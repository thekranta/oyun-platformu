import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceAiAccess } from './_lib/aiAccess';
import { requireUser } from './_lib/auth';
import { logAiUsage } from './_lib/aiUsageLog';
import { estimateOpenAiChatCostUsd } from '../lib/aiPricing';

// OpenAI metin uretimi icin sunucu-tarafi proxy (pedagojik AI yorumu).
// Anahtar yalnizca sunucuda okunur; istemci bundle'ina hic gitmez.
// Istemci /api/openai-analyze'a { prompt, generationConfig?, feature? } gonderir, { text } alir.
// Kimliksiz internetten maliyet-DoS'u onlemek icin gecerli bir Supabase oturumu sart; ayrica ebeveyn/ogretmen izni
// (user_metadata.ai_consent 'report') ya da admin_* ozellikleri icin admins uyeligi sunucuda denetlenir
// (api/_lib/aiAccess.ts). Girdi sinirlari genel amacli bir GPT vekili olarak kotuye kullanimi onler.

const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY || '').trim();
const MODEL = 'gpt-4o-mini'; // maliyet-bilincli, TTS/Whisper'la ayni felsefe
/** En uzun istem (veli raporu: 12 oyunluk JSON + yonerge) ~6 KB; pay birakilir. */
export const MAX_PROMPT_CHARS = 24000;
export const MAX_OUTPUT_TOKENS = 2048;
const UPSTREAM_TIMEOUT_MS = 45000;

export function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authed = await requireUser(req, res);
  if (!authed) return;

  const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : {};
  const { prompt, generationConfig, feature } = body;
  if (typeof prompt !== 'string' || prompt.trim() === '') return res.status(400).json({ error: 'prompt is required' });
  if (prompt.length > MAX_PROMPT_CHARS) return res.status(413).json({ error: 'prompt_too_long', max: MAX_PROMPT_CHARS });

  if (!(await enforceAiAccess(res, authed, feature, 'text'))) return;

  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OpenAI API key not configured' });

  const config = generationConfig && typeof generationConfig === 'object' ? (generationConfig as Record<string, unknown>) : {};
  const temperature = clampNumber(config.temperature, 0, 1.5, 0.7);
  const maxTokens = Math.round(clampNumber(config.maxOutputTokens, 64, MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
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
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

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

    // Saglayici hata metni istemciye aktarilmaz (anahtar/kota ayrintisi sizdirmasin); sunucu gunlugune yazilir.
    console.error('OpenAI chat hatasi:', response.status, data?.error?.message || '');
    return res.status(502).json({ error: 'ai_upstream_error', status: response.status });
  } catch (e: any) {
    if (e?.name === 'AbortError') return res.status(504).json({ error: 'ai_timeout' });
    console.error('OpenAI istegi basarisiz:', e?.message || e);
    return res.status(502).json({ error: 'ai_request_failed' });
  } finally {
    clearTimeout(timeoutId);
  }
}
