// AI maliyet tahmini: model basina bilinen (YAKLASIK, saglayici fiyat sayfalarina karsi
// PERIYODIK KONTROL edilmesi gereken) $ fiyatlari + saf tahmin fonksiyonlari.
// Gercek fatura API'si DEGIL (bkz. plan "Kapsam disi") -- token/karakter/saniye sayisindan
// hesaplanan bir yaklasimdir, kurus kurusuna dogru olmasi beklenmez.

// $ / 1M token (OpenAI Chat Completions, girdi ve cikti ayri fiyatlanir).
const OPENAI_CHAT_PRICING_PER_1M: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
};
// Bilinmeyen/yeni bir model gelirse en pahali bilinen orana dus (sessizce 0 gosterip
// maliyeti gizlemektense fazla tahmin etmek daha guvenli).
const OPENAI_CHAT_FALLBACK = { input: 0.15, output: 0.60 };

// $ / karakter (OpenAI TTS, gpt-4o-mini-tts ve tts-1 arasinda fallback var).
const TTS_PRICING_PER_CHAR: Record<string, number> = {
  'gpt-4o-mini-tts': 0.000012,
  'tts-1': 0.000015,
};
const TTS_FALLBACK = 0.000015;

// $ / saniye (OpenAI Whisper, $0.006/dakika = $0.0001/saniye).
const WHISPER_PRICE_PER_SECOND = 0.0001;

export function estimateOpenAiChatCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const rate = OPENAI_CHAT_PRICING_PER_1M[model] || OPENAI_CHAT_FALLBACK;
  return (promptTokens / 1_000_000) * rate.input + (completionTokens / 1_000_000) * rate.output;
}

export function estimateTtsCostUsd(model: string, charCount: number): number {
  const rate = TTS_PRICING_PER_CHAR[model] ?? TTS_FALLBACK;
  return charCount * rate;
}

export function estimateWhisperCostUsd(durationSeconds: number): number {
  return Math.max(0, durationSeconds) * WHISPER_PRICE_PER_SECOND;
}
