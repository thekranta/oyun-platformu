/**
 * Unified Speech Service
 * ----------------------
 * Seslendirme önceliği:
 *   1) HAZIR KLİP (assets/sounds/tts/<slug>.wav — klon "Hikaye Sesi") — çevrimdışı,
 *      ücretsiz, tutarlı. Metin ttsSlug() ile bir dosya adına (slug) çevrilir;
 *      lib/ttsAssets.ts içinde varsa expo-av ile çalınır (web + native).
 *   2) Canlı OpenAI proxy (/api/tts) — yalnızca geçerli anahtar varsa. Şu an anahtar
 *      yoksa SESSİZ geçilir (robotik tarayıcı sesine düşmeyiz; okul öncesi için uygun değil).
 *
 * Yeni ses eklemek: scripts/gen-voices.mjs (VoiceBox) → scripts/trim-voices.mjs →
 * `node scripts/gen-tts-assets.mjs` (lib/ttsAssets.ts güncellenir). Bkz. scripts/.
 */

import { Audio as ExpoAudio } from 'expo-av';
import { TTS } from '../lib/ttsAssets';

// Canlı proxy yolu için blob önbelleği (aynı metni tekrar üretmemek için)
const audioCache = new Map<string, string>();

export interface SpeechOptions {
    voice?: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'fable' | 'nova' | 'onyx' | 'sage' | 'shimmer' | 'verse' | 'marin' | 'cedar';
    speed?: number; // 0.25 to 4.0 (default: child-friendly slower pace)
    instructions?: string; // Optional TTS style instructions
}

export interface SpeechResult {
    success: boolean;
    audioUrl?: string;
    error?: string;
}

/**
 * Metni hazır-MP3 dosya adına (slug) çevirir.
 * lib/ttsAssets.ts anahtarları ve gen-tts-assets.mjs ile AYNI kuralı kullanır.
 * Örn: "Doğru! Aferin." → "dogru-aferin"
 */
export function ttsSlug(text: string): string {
    return (text || '')
        .replace(/ç/g, 'c').replace(/Ç/g, 'c')
        .replace(/ş/g, 's').replace(/Ş/g, 's')
        .replace(/ğ/g, 'g').replace(/Ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/Ü/g, 'u')
        .replace(/ö/g, 'o').replace(/Ö/g, 'o')
        .replace(/ı/g, 'i').replace(/İ/g, 'i').replace(/I/g, 'i')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Şu an çalan hazır-MP3 sesi; yenisi gelince durdurulup boşaltılır (üst üste binmesin).
let currentTtsSound: ExpoAudio.Sound | null = null;

/**
 * Paketli (bundled) bir MP3 modülünü expo-av ile çalar. Hikaye anlatımlarındaki
 * (CevizMacera vb.) desenle birebir aynıdır: öncekini boşalt → oynat → bitince boşalt.
 */
async function playBundled(src: number): Promise<void> {
    try {
        if (currentTtsSound) {
            await currentTtsSound.unloadAsync().catch(() => { });
            currentTtsSound = null;
        }
        const { sound } = await ExpoAudio.Sound.createAsync(src, { shouldPlay: true, volume: 1.0 });
        currentTtsSound = sound;
        await new Promise<void>((resolve) => {
            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    sound.unloadAsync().catch(() => { });
                    if (currentTtsSound === sound) currentTtsSound = null;
                    resolve();
                }
            });
        });
    } catch (e) {
        console.warn('🔊 TTS: hazır MP3 çalınamadı (sessiz geçildi):', e);
    }
}

/**
 * Generate speech from text using OpenAI TTS (canlı proxy yolu — yedek).
 * Returns a blob URL that can be played with Audio element
 */
export async function generateSpeech(
    text: string,
    options: SpeechOptions = {}
): Promise<SpeechResult> {
    const {
        voice = 'coral',  // Warm, friendly female voice
        speed = 0.85,     // Slightly slower for children comprehension
        instructions,
    } = options;

    // Check cache first
    const cacheKey = `${text}-${voice}-${speed}-${instructions ?? ''}`;
    if (audioCache.has(cacheKey)) {
        return {
            success: true,
            audioUrl: audioCache.get(cacheKey)
        };
    }

    try {
        // Call secure server-side API route (OpenAI TTS)
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                voice,
                speed,
                instructions
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                error: errorData.error || `API Error: ${response.status}`
            };
        }

        const data = await response.json();

        if (!data.audioContent) {
            return {
                success: false,
                error: 'No audio data received'
            };
        }

        // Convert base64 to blob URL
        const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3');
        const audioUrl = URL.createObjectURL(audioBlob);

        // Cache the result
        audioCache.set(cacheKey, audioUrl);

        return {
            success: true,
            audioUrl
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Convert base64 string to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

/**
 * Play speech audio from text.
 *   1) Önce HAZIR MP3 (slug eşleşmesi) — çevrimdışı çalar.
 *   2) Yoksa canlı proxy (anahtar yoksa sessiz geçer).
 */
export async function speak(
    text: string,
    options: SpeechOptions = {}
): Promise<void> {
    // 1) HAZIR MP3 var mı?
    const bundled = TTS[ttsSlug(text)];
    if (bundled != null) {
        await playBundled(bundled);
        return;
    }

    // 2) Hazır MP3 yoksa canlı proxy (şu an anahtar yok → sessiz)
    const result = await generateSpeech(text, options);

    if (result.success && result.audioUrl) {
        return new Promise((resolve) => {
            // NOT: expo-av 'Audio' takma adla (ExpoAudio) import edildi; buradaki 'Audio'
            // tarayıcının global HTMLAudioElement'idir (bu yol yalnızca web'de çalışır).
            const audio = new Audio(result.audioUrl);
            audio.onended = () => resolve();
            audio.onerror = () => {
                console.warn('🔊 TTS: Audio oynatma hatasi (sessiz gecildi)');
                resolve();
            };
            audio.play().catch(() => {
                console.warn('🔊 TTS: Audio play basarisiz (sessiz gecildi)');
                resolve();
            });
        });
    } else {
        // Robotik tarayıcı sesine DÜŞMÜYORUZ; sessiz geçiyoruz.
        console.warn('🔊 TTS: hazır MP3 yok + coral üretilemedi, sessiz geçildi:', text.substring(0, 40));
    }
}

/**
 * Metni seslendirir ve max(ses süresi, minMs) kadar bekledikten SONRA çözülür.
 * Doğru cevap sonrası "Aferin" sesinin yarıda kesilmemesi için: bir sonraki aşamaya /
 * tura geçmeden önce `await speakThenWait(text, minMs)` (ya da .then(...)) kullanılır.
 * Ses yoksa (klip eşleşmezse) yalnız minMs beklenir; ses uzunsa ses bitene kadar beklenir.
 */
export async function speakThenWait(text: string, minMs = 1200, options: SpeechOptions = {}): Promise<void> {
    await Promise.all([
        speak(text, options),
        new Promise<void>((resolve) => setTimeout(resolve, minMs)),
    ]);
}

/**
 * Stop any currently playing speech (hazır MP3 + eski tarayıcı speechSynthesis).
 */
export function stopSpeech(): void {
    if (currentTtsSound) {
        const s = currentTtsSound;
        currentTtsSound = null;
        s.stopAsync().catch(() => { });
        s.unloadAsync().catch(() => { });
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}

/**
 * Clear the audio cache - call this on app start or page refresh
 */
export function clearSpeechCache(): void {
    audioCache.forEach((url) => {
        URL.revokeObjectURL(url);
    });
    audioCache.clear();
}

/**
 * Pre-generate speech for common phrases (yalnızca canlı proxy yolu için; hazır MP3
 * kullanıldığında gerek yok — bundled sesler zaten anında hazırdır).
 */
export async function preloadCommonPhrases(childName: string): Promise<void> {
    const phrases = [
        `Merhaba ${childName}! Oyuna hoş geldin!`,
        `Harika iş çıkardın ${childName}!`,
        `Tebrikler!`,
        `Aferin sana!`,
        `Tekrar dene!`,
    ];

    phrases.forEach(phrase => {
        // Hazır MP3 varsa proxy'yi hiç çağırma
        if (TTS[ttsSlug(phrase)] != null) return;
        generateSpeech(phrase).catch(() => { });
    });
}

export default {
    speak,
    speakThenWait,
    generateSpeech,
    stopSpeech,
    clearSpeechCache,
    preloadCommonPhrases,
    ttsSlug,
};
