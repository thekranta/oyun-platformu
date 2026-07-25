/**
 * Unified Speech Service - OpenAI TTS
 * Warm female voice optimized for children
 */

// Cache for audio blobs to avoid repeated API calls
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
 * Generate speech from text using OpenAI TTS
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
        console.log('🔊 TTS: Using cached audio for:', text.substring(0, 30) + '...');
        return {
            success: true,
            audioUrl: audioCache.get(cacheKey)
        };
    }

    try {
        console.log('🔊 TTS: Calling OpenAI API for:', text.substring(0, 30) + '...', { voice, speed });

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
            console.error('🔊 TTS API Error:', response.status, errorData);
            return {
                success: false,
                error: errorData.error || `API Error: ${response.status}`
            };
        }

        const data = await response.json();

        if (!data.audioContent) {
            console.error('🔊 TTS: No audio content received');
            return {
                success: false,
                error: 'No audio data received'
            };
        }

        console.log('🔊 TTS: OpenAI audio received successfully');

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
        console.error('🔊 TTS: Speech generation failed:', error);
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
 * Play speech audio from text
 * Falls back to browser TTS if API fails
 */
export async function speak(
    text: string,
    options: SpeechOptions = {}
): Promise<void> {
    const result = await generateSpeech(text, options);

    if (result.success && result.audioUrl) {
        return new Promise((resolve) => {
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
        // Coral (OpenAI) sesi uretilemezse robotik tarayici sesine DUSMUYORUZ; robotik ses
        // okul oncesi cocuk icin uygun degil ve tekduzeligi bozuyor. Sessiz geciyoruz.
        console.warn('🔊 TTS: coral uretilemedi, sessiz gecildi:', text.substring(0, 40));
    }
}

/**
 * Stop any currently playing speech (robotik tarayici sesi fallback'i kaldirildi;
 * yine de eski oturumlardan kalan speechSynthesis'i iptal etmek zararsiz).
 */
export function stopSpeech(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}

/**
 * Clear the audio cache - call this on app start or page refresh
 */
export function clearSpeechCache(): void {
    console.log('🔊 TTS: Clearing audio cache');
    audioCache.forEach((url) => {
        URL.revokeObjectURL(url);
    });
    audioCache.clear();
}

/**
 * Pre-generate speech for common phrases
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
        generateSpeech(phrase).catch(console.error);
    });
}

export default {
    speak,
    generateSpeech,
    stopSpeech,
    clearSpeechCache,
    preloadCommonPhrases
};
