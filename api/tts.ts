/**
 * Unified TTS API Route - OpenAI Text-to-Speech
 * Warm female voice optimized for children
 * POST /api/tts
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// OpenAI API key (server-side). Sunucu env'i EXPO_PUBLIC degiskenlerini de okuyabilir;
// Vercel'de yalnizca EXPO_PUBLIC_OPENAI_API_KEY/SPEECH_API_KEY tanimliysa da TTS calissin
// diye fallback ekli (aksi halde 500 -> istemci robotik tarayici sesine dusuyordu).
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    || process.env.EXPO_PUBLIC_OPENAI_API_KEY
    || process.env.EXPO_PUBLIC_SPEECH_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const {
        text,
        voice = 'coral',  // Warm female voice
        speed = 0.85,    // 0.25 to 4.0
        instructions = 'Speak in a warm, friendly, caring female voice suitable for preschool children. Keep the tone gentle and encouraging.'
    } = req.body;

    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required' });
    }

    // Limit text length
    if (text.length > 1000) {
        return res.status(400).json({ error: 'Text too long (max 1000 chars)' });
    }

    if (!OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY not configured');
        return res.status(500).json({ error: 'TTS service not configured' });
    }

    // gpt-4o-mini-tts 'coral' + instructions'i destekler ama her anahtarda olmayabilir;
    // basarisiz olursa tts-1'e duseriz (genis erisim). tts-1 'coral'/instructions desteklemez,
    // o yuzden sicak bir kadin sese (nova) esleriz.
    const TTS1_VOICE_MAP: Record<string, string> = {
        coral: 'nova', shimmer: 'shimmer', nova: 'nova', sage: 'nova', ballad: 'shimmer',
        alloy: 'alloy', echo: 'echo', fable: 'fable', onyx: 'onyx',
    };
    const safeSpeed = Math.max(0.25, Math.min(4.0, speed));
    const attempts = [
        { model: 'gpt-4o-mini-tts', voice, useInstructions: true },
        { model: 'tts-1', voice: TTS1_VOICE_MAP[voice] || 'nova', useInstructions: false },
    ];

    let lastStatus = 500;
    let lastDetail = 'API error';
    try {
        for (const attempt of attempts) {
            const body: Record<string, unknown> = {
                model: attempt.model,
                input: text,
                voice: attempt.voice,
                speed: safeSpeed,
                response_format: 'mp3',
            };
            if (attempt.useInstructions && instructions) body.instructions = instructions;

            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                const audioBuffer = await response.arrayBuffer();
                const base64Audio = Buffer.from(audioBuffer).toString('base64');
                res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours
                return res.status(200).json({ audioContent: base64Audio, format: 'mp3', model: attempt.model });
            }

            const errorText = await response.text();
            console.error(`OpenAI TTS Error (${attempt.model}):`, response.status, errorText);
            lastStatus = response.status;
            lastDetail = response.status === 401 ? 'Invalid API key' : response.status === 429 ? 'Quota/rate limit' : 'API error';
            // 401 (gecersiz anahtar) ise diger modeli denemenin anlami yok
            if (response.status === 401) break;
        }

        return res.status(lastStatus).json({ error: 'TTS generation failed', details: lastDetail });
    } catch (error: any) {
        console.error('TTS Error:', error);
        return res.status(500).json({
            error: 'Failed to generate speech',
            details: error.message
        });
    }
}
