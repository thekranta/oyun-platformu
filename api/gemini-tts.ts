import type { VercelRequest, VercelResponse } from '@vercel/node';

// Gemini 2.5 Flash TTS API
// Doğal Türkçe ses sentezi

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { text, voiceName = 'Aoede' } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Gemini API key not configured' });

  // Denenecek model adları
  const models = [
    'gemini-2.5-flash-preview-tts',
    'gemini-2.0-flash-exp', 
    'gemini-2.0-flash'
  ];

  for (const model of models) {
    try {
      console.log(`Trying model: ${model}`);
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName }
                }
              }
            }
          }),
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        console.log(`Model ${model} failed:`, data.error?.message);
        continue; // Sonraki modeli dene
      }

      // Audio data'yı çıkar
      const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      
      if (audioData?.data) {
        console.log(`Success with model: ${model}`);
        return res.status(200).json({
          audioContent: audioData.data,
          mimeType: audioData.mimeType || 'audio/wav',
          model: model
        });
      }
      
      console.log(`Model ${model} - no audio data in response`);
      
    } catch (error: any) {
      console.log(`Model ${model} error:`, error.message);
      continue;
    }
  }

  // Hiçbir model çalışmadı
  return res.status(500).json({ 
    error: 'TTS not available', 
    message: 'Gemini TTS models are not accessible. Please check API key permissions.',
    triedModels: models
  });
}
