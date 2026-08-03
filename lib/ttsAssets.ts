/**
 * ttsAssets — Hazır (önceden üretilmiş) seslendirme MP3'lerinin slug→modül haritası.
 * ---------------------------------------------------------------------------------
 * BU DOSYA OTOMATİK ÜRETİLİR. Elle düzenleme; şunu çalıştır:
 *   node scripts/gen-tts-assets.mjs
 * (assets/sounds/tts/ altındaki *.mp3 dosyalarını tarar ve aşağıdaki haritayı yazar.)
 *
 * Anahtar (slug) kuralı = services/speechService.ts `ttsSlug()`.
 * speak(text) önce ttsSlug(text) ile buraya bakar; varsa MP3'ü çalar, yoksa sessiz geçer.
 */
export const TTS: Record<string, number> = {
  // Henüz hazır MP3 yok. Dosyalar assets/sounds/tts/ altına eklenip bu script
  // tekrar çalıştırıldığında bu harita dolar.
};
