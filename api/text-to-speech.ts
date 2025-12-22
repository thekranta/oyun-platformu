import type { VercelRequest, VercelResponse } from '@vercel/node';

// Google Cloud Text-to-Speech API - WaveNet Türkçe Sesleri
// Çocuklara uygun sıcak ve doğal ses

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

  const { text, voice = 'tr-TR-Wavenet-D', speakingRate = 0.9, pitch = 2.0 } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Google Cloud TTS API key not configured' });
  }

  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'tr-TR',
            name: voice, // tr-TR-Wavenet-A (kadın), tr-TR-Wavenet-B (erkek), tr-TR-Wavenet-D (kadın - en sıcak)
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: speakingRate, // 0.25 - 4.0, default 1.0
            pitch: pitch, // -20.0 - 20.0, default 0.0 (pozitif = daha tiz/çocuksu)
            volumeGainDb: 0.0,
            effectsProfileId: ['small-bluetooth-speaker-class-device'], // Mobil cihazlar için optimize
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Google TTS Error:', errorData);
      return res.status(500).json({ error: 'TTS request failed', details: errorData });
    }

    const data = await response.json();
    
    // audioContent base64 encoded MP3
    return res.status(200).json({ 
      audioContent: data.audioContent,
      format: 'mp3'
    });

  } catch (error: any) {
    console.error('TTS Error:', error);
    return res.status(500).json({ error: 'Failed to generate speech', details: error.message });
  }
}

