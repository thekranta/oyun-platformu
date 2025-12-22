import type { VercelRequest, VercelResponse } from '@vercel/node';

// Gemini 2.5 Flash TTS - Doğal ses sentezi
// Mevcut Gemini API key ile çalışır

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

  const { text, voiceName = 'Kore' } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  // Mevcut Gemini API key'i kullan
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API key not configured' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: text }]
          }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName // Kore, Puck, Charon, Fenrir, Aoede
                }
              }
            }
          }
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini TTS Error:', errorData);
      
      // Model bulunamazsa fallback dene
      if (errorData.error?.message?.includes('not found')) {
        // gemini-2.0-flash-exp ile dene
        const fallbackResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: text }] }],
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName }
                  }
                }
              }
            }),
          }
        );
        
        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          
          if (audioData) {
            return res.status(200).json({
              audioContent: audioData.data,
              mimeType: audioData.mimeType || 'audio/mp3'
            });
          }
        }
      }
      
      return res.status(500).json({ error: 'TTS request failed', details: errorData });
    }

    const data = await response.json();
    
    // Audio data'yı çıkar
    const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    
    if (!audioData) {
      return res.status(500).json({ error: 'No audio data in response', raw: data });
    }

    return res.status(200).json({ 
      audioContent: audioData.data,
      mimeType: audioData.mimeType || 'audio/mp3'
    });

  } catch (error: any) {
    console.error('Gemini TTS Error:', error);
    return res.status(500).json({ error: 'Failed to generate speech', details: error.message });
  }
}

