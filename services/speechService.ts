/**
 * OpenAI TTS Service (Secure Version)
 * Uses server-side /api/tts endpoint to protect API key
 */

// Cache for audio blobs to avoid repeated API calls
const audioCache = new Map<string, string>();

export interface SpeechOptions {
    voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    model?: 'tts-1' | 'tts-1-hd';
    speed?: number; // 0.25 to 4.0
}

export interface SpeechResult {
    success: boolean;
    audioUrl?: string;
    error?: string;
}

/**
 * Generate speech from text using secure server-side API
 * Returns a blob URL that can be played with Audio element
 */
export async function generateSpeech(
    text: string,
    options: SpeechOptions = {}
): Promise<SpeechResult> {
    const {
        voice = 'nova', // Default to nova (energetic female voice)
        model = 'tts-1',
        speed = 1.0
    } = options;

    // Check cache first
    const cacheKey = `${text}-${voice}-${model}-${speed}`;
    if (audioCache.has(cacheKey)) {
        return {
            success: true,
            audioUrl: audioCache.get(cacheKey)
        };
    }

    try {
        // Call secure server-side API route
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text,
                voice,
                model,
                speed
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('TTS API Error:', response.status, errorData);
            return {
                success: false,
                error: errorData.error || `API Error: ${response.status}`
            };
        }

        const data = await response.json();

        if (!data.audio) {
            return {
                success: false,
                error: 'No audio data received'
            };
        }

        // Convert base64 to blob URL
        const audioBlob = base64ToBlob(data.audio, 'audio/mp3');
        const audioUrl = URL.createObjectURL(audioBlob);

        // Cache the result
        audioCache.set(cacheKey, audioUrl);

        return {
            success: true,
            audioUrl
        };
    } catch (error) {
        console.error('Speech generation failed:', error);
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
        return new Promise((resolve, reject) => {
            const audio = new Audio(result.audioUrl);
            audio.onended = () => resolve();
            audio.onerror = (e) => {
                console.error('Audio playback error:', e);
                // Fallback to browser TTS
                fallbackTTS(text);
                resolve();
            };
            audio.play().catch((e) => {
                console.error('Audio play failed:', e);
                fallbackTTS(text);
                resolve();
            });
        });
    } else {
        // Fallback to browser TTS
        fallbackTTS(text);
    }
}

/**
 * Browser fallback TTS using Web Speech API
 */
function fallbackTTS(text: string): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}

/**
 * Clear the audio cache
 * Call this to free memory if needed
 */
export function clearSpeechCache(): void {
    // Revoke all blob URLs
    audioCache.forEach((url) => {
        URL.revokeObjectURL(url);
    });
    audioCache.clear();
}

/**
 * Pre-generate speech for common phrases
 * Call this during app initialization to reduce latency
 */
export async function preloadCommonPhrases(childName: string): Promise<void> {
    const phrases = [
        `Merhaba ${childName}, Uzay Blokları oyununa hoş geldin! Blokları yerleştirmeme yardım eder misin?`,
        `Harika iş çıkardın ${childName}!`,
        `Tebrikler, görevi tamamladın!`,
    ];

    // Generate all phrases in parallel but don't wait for all
    phrases.forEach(phrase => {
        generateSpeech(phrase).catch(console.error);
    });
}

export default {
    speak,
    generateSpeech,
    clearSpeechCache,
    preloadCommonPhrases
};
