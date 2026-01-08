/**
 * OpenAI TTS API Route
 * Server-side handler to protect API key from client exposure
 * POST /api/tts
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// API key is only accessible server-side (no NEXT_PUBLIC_ prefix)
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check API key
    if (!OPENAI_API_KEY) {
        console.error('OPENAI_API_KEY not configured');
        return res.status(500).json({ error: 'TTS service not configured' });
    }

    try {
        const { text, voice = 'nova', model = 'tts-1', speed = 1.0 } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Limit text length for safety
        if (text.length > 1000) {
            return res.status(400).json({ error: 'Text too long (max 1000 chars)' });
        }

        // Validate voice option
        const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
        if (!validVoices.includes(voice)) {
            return res.status(400).json({ error: 'Invalid voice option' });
        }

        // Call OpenAI TTS API
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                input: text,
                voice,
                speed,
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

        // Return base64 encoded audio
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

        return res.status(200).json({
            audio: base64Audio,
            format: 'mp3'
        });

    } catch (error) {
        console.error('TTS API error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
