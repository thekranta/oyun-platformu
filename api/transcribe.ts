/**
 * Sunucu-tarafi OpenAI Whisper (konusma->metin) proxy'si.
 * Anahtar yalnizca sunucuda okunur (OPENAI_API_KEY); istemci bundle'ina hic gitmez.
 * Istemci /api/transcribe'a { audioBase64, mimeType? } gonderir, { text } alir.
 * POST /api/transcribe
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireUser } from './_lib/auth';
import { logAiUsage } from './_lib/aiUsageLog';
import { estimateWhisperCostUsd } from '../lib/aiPricing';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  || process.env.EXPO_PUBLIC_OPENAI_API_KEY
  || process.env.EXPO_PUBLIC_SPEECH_API_KEY;

// ~2 dakikalik webm/opus konusma icin fazlasiyla yeterli; asiri buyuk govdeyi reddeder.
const MAX_BASE64_LENGTH = 8 * 1024 * 1024;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authed = await requireUser(req, res);
  if (!authed) return;

  const { audioBase64, mimeType } = req.body || {};
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    return res.status(400).json({ error: 'audioBase64 is required' });
  }
  if (audioBase64.length > MAX_BASE64_LENGTH) {
    return res.status(400).json({ error: 'Audio too large' });
  }
  if (!OPENAI_API_KEY) {
    return res.status(500).json({ error: 'Transcription service not configured' });
  }

  try {
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const type = typeof mimeType === 'string' && mimeType ? mimeType : 'audio/webm';

    const formData = new FormData();
    formData.append('file', new Blob([audioBuffer], { type }), 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'tr');
    // verbose_json 'duration' alani da doner (dakika-basi ucretlenen Whisper icin
    // maliyet tahmininde kullanilir) -- istemciye giden {text} yaniti degismez.
    formData.append('response_format', 'verbose_json');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Whisper API hatasi:', response.status, errorText);
        return res.status(502).json({ error: `Whisper API hatası: ${response.status}` });
      }

      const data = await response.json();
      const duration = typeof data.duration === 'number' ? data.duration : 0;
      await logAiUsage(authed.supabase, {
        userId: authed.user.id,
        servis: 'openai_whisper',
        model: 'whisper-1',
        ozellik: 'bunusoyle_transkript',
        girdiMiktar: duration,
        birim: 'saniye',
        maliyetUsd: estimateWhisperCostUsd(duration),
      });
      return res.status(200).json({ text: data.text || '' });
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e?.name === 'AbortError') {
        return res.status(504).json({ error: 'Transcription timed out' });
      }
      throw e;
    }
  } catch (error: any) {
    console.error('Transcribe error:', error);
    return res.status(500).json({ error: 'Failed to transcribe audio', details: error.message });
  }
}
