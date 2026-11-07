import type { VercelRequest, VercelResponse } from '@vercel/node';
import { enforceAiAccess } from './_lib/aiAccess';
import { requireUser } from './_lib/auth';
import { logAiUsage } from './_lib/aiUsageLog';
import { estimateClaudeCostUsd } from '../lib/aiPricing';

// Claude (Anthropic) ile metin uretimi icin sunucu-tarafi proxy (pedagojik AI yorumu).
// Yol adi (openai-analyze) eski istemcilerle uyum icin korunur; saglayici artik Anthropic'tir.
// Anahtar (ANTHROPIC_API_KEY) yalnizca sunucuda okunur; istemci bundle'ina hic gitmez, EXPO_PUBLIC_ oneki KULLANILMAZ.
// Istemci /api/openai-analyze'a { prompt, generationConfig?, feature? } gonderir, { text } alir.
// Kimliksiz internetten maliyet-DoS'u onlemek icin gecerli bir Supabase oturumu sart; ayrica ebeveyn/ogretmen izni
// (user_metadata.ai_consent 'report') ya da admin_* ozellikleri icin admins uyeligi sunucuda denetlenir
// (api/_lib/aiAccess.ts). Girdi sinirlari genel amacli bir GPT vekili olarak kotuye kullanimi onler.

const ANTHROPIC_API_KEY = (process.env.ANTHROPIC_API_KEY || '').trim();
// Varsayilan model; Vercel'de ANTHROPIC_MODEL ile (ornegin daha ucuz claude-haiku-5-5) degistirilebilir.
const MODEL = (process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5').trim();
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

  if (!ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY sunucu ortaminda tanimli degil');
    return res.status(500).json({ error: 'ai_not_configured' });
  }

  const config = generationConfig && typeof generationConfig === 'object' ? (generationConfig as Record<string, unknown>) : {};
  const maxTokens = Math.round(clampNumber(config.maxOutputTokens, 64, MAX_OUTPUT_TOKENS, MAX_OUTPUT_TOKENS));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    // Not: yeni Claude modelleri ornekleme parametrelerini (temperature) her zaman kabul etmez; gonderilmez.
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      const blocks: Array<{ type?: string; text?: string }> = Array.isArray(data?.content) ? data.content : [];
      const text = blocks.filter((b) => b?.type === 'text' && typeof b.text === 'string').map((b) => b.text).join('').trim();
      if (text) {
        const promptTokens = data?.usage?.input_tokens || 0;
        const completionTokens = data?.usage?.output_tokens || 0;
        await logAiUsage(authed.supabase, {
          userId: authed.user.id,
          servis: 'openai_chat', // kayit etiketi korunur (panel gruplamasi); gercek saglayici `model` alaninda
          model: MODEL,
          ozellik: typeof feature === 'string' ? feature : 'genel',
          girdiMiktar: promptTokens,
          ciktiMiktar: completionTokens,
          birim: 'token',
          maliyetUsd: estimateClaudeCostUsd(MODEL, promptTokens, completionTokens),
        });
        return res.status(200).json({ text, model: MODEL });
      }
      return res.status(502).json({ error: 'Yanitta metin bulunamadi' });
    }

    // Saglayici hata metni istemciye aktarilmaz (anahtar/kota ayrintisi sizdirmasin); sunucu gunlugune yazilir.
    console.error('Claude hatasi:', response.status, data?.error?.type || '', data?.error?.message || '');
    return res.status(502).json({ error: 'ai_upstream_error', status: response.status });
  } catch (e: any) {
    if (e?.name === 'AbortError') return res.status(504).json({ error: 'ai_timeout' });
    console.error('Claude istegi basarisiz:', e?.message || e);
    return res.status(502).json({ error: 'ai_request_failed' });
  } finally {
    clearTimeout(timeoutId);
  }
}
