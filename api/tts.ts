/**
 * Unified TTS API Route - Google Cloud Text-to-Speech
 * Warm Turkish female voice optimized for children
 * POST /api/tts
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Google Cloud TTS API key (server-side only)
const GOOGLE_CLOUD_TTS_API_KEY = process.env.GOOGLE_CLOUD_TTS_API_KEY;

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
        voice = 'tr-TR-Wavenet-D',  // Warm Turkish female voice (best for children)
        speakingRate = 0.85,         // Slower for better comprehension
        pitch = 2.0                  // Higher pitch = warmer, friendlier
    } = req.body;

    if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text is required' });
    }

    // Limit text length
    if (text.length > 1000) {
        return res.status(400).json({ error: 'Text too long (max 1000 chars)' });
    }

    if (!GOOGLE_CLOUD_TTS_API_KEY) {
        console.error('GOOGLE_CLOUD_TTS_API_KEY not configured');
        return res.status(500).json({ error: 'TTS service not configured' });
    }

    try {
        const response = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_CLOUD_TTS_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: { text },
                    voice: {
                        languageCode: 'tr-TR',
                        name: voice,
                        // Available voices:
                        // tr-TR-Wavenet-A: Female (clear)
                        // tr-TR-Wavenet-B: Male
                        // tr-TR-Wavenet-C: Female 
                        // tr-TR-Wavenet-D: Female (warmest - RECOMMENDED)
                        // tr-TR-Wavenet-E: Male
                    },
                    audioConfig: {
                        audioEncoding: 'MP3',
                        speakingRate: Math.max(0.25, Math.min(4.0, speakingRate)),
                        pitch: Math.max(-20, Math.min(20, pitch)),
                        volumeGainDb: 0.0,
                        // Mobile device optimized audio profile
                        effectsProfileId: ['small-bluetooth-speaker-class-device'],
                    },
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Google TTS Error:', response.status, errorData);
            return res.status(500).json({
                error: 'TTS request failed',
                details: errorData.error?.message || 'Unknown error'
            });
        }

        const data = await response.json();

        // Cache this response
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours

        // Return audioContent (base64 encoded MP3)
        return res.status(200).json({
            audioContent: data.audioContent,
            format: 'mp3'
        });

    } catch (error: any) {
        console.error('TTS Error:', error);
        return res.status(500).json({
            error: 'Failed to generate speech',
            details: error.message
        });
    }
}
