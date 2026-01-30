/**
 * Unified TTS API Route - OpenAI Text-to-Speech
 * Warm female voice optimized for children
 * POST /api/tts
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// OpenAI API key (server-side only)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

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
        voice = 'nova',  // OpenAI voices: alloy, echo, fable, onyx, nova (warm female), shimmer
        speed = 0.9      // 0.25 to 4.0
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

    try {
        // Call OpenAI TTS API
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text,
                voice: voice,  // nova = warm female, shimmer = soft female
                speed: Math.max(0.25, Math.min(4.0, speed)),
                response_format: 'mp3'
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI TTS Error:', response.status, errorText);
            return res.status(response.status).json({
                error: 'TTS generation failed',
                details: response.status === 401 ? 'Invalid API key' : 'API error'
            });
        }

        // Get audio as buffer and send as base64
        const audioBuffer = await response.arrayBuffer();
        const base64Audio = Buffer.from(audioBuffer).toString('base64');

        // Cache this response
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 24 hours

        // Return audioContent (base64 encoded MP3)
        return res.status(200).json({
            audioContent: base64Audio,
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
