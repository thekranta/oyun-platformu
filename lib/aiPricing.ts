// AI maliyet tahmini: model basina bilinen (YAKLASIK, saglayici fiyat sayfalarina karsi
// PERIYODIK KONTROL edilmesi gereken) $ fiyatlari + saf tahmin fonksiyonlari.
// Gercek fatura API'si DEGIL (bkz. plan "Kapsam disi") -- token/karakter/saniye sayisindan
// hesaplanan bir yaklasimdir, kurus kurusuna dogru olmasi beklenmez.

// $ / 1M token (Gemini generateContent, girdi ve cikti ayri fiyatlanir).
const GEMINI_PRICING_PER_1M: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'gemini-pro': { input: 0.50, output: 1.50 },
};
// Bilinmeyen/yeni bir model gelirse en pahali bilinen orana dus (sessizce 0 gosterip
// maliyeti gizlemektense fazla tahmin etmek daha guvenli).
const GEMINI_FALLBACK = { input: 1.25, output: 5.00 };

// $ / karakter (OpenAI TTS, gpt-4o-mini-tts ve tts-1 arasinda fallback var).
const TTS_PRICING_PER_CHAR: Record<string, number> = {
  'gpt-4o-mini-tts': 0.000012,
  'tts-1': 0.000015,
};
const TTS_FALLBACK = 0.000015;

// $ / saniye (OpenAI Whisper, $0.006/dakika = $0.0001/saniye).
const WHISPER_PRICE_PER_SECOND = 0.0001;

export function estimateGeminiCostUsd(model: string, promptTokens: number, candidateTokens: number): number {
  const rate = GEMINI_PRICING_PER_1M[model] || GEMINI_FALLBACK;
  return (promptTokens / 1_000_000) * rate.input + (candidateTokens / 1_000_000) * rate.output;
}

export function estimateTtsCostUsd(model: string, charCount: number): number {
  const rate = TTS_PRICING_PER_CHAR[model] ?? TTS_FALLBACK;
  return charCount * rate;
}

export function estimateWhisperCostUsd(durationSeconds: number): number {
  return Math.max(0, durationSeconds) * WHISPER_PRICE_PER_SECOND;
}
