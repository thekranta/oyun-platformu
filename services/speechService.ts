/**
 * Unified Speech Service - OpenAI TTS
 * Warm female voice optimized for children
 */

// Cache for audio blobs to avoid repeated API calls
const audioCache = new Map<string, string>();

export interface SpeechOptions {
    voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    speed?: number; // 0.25 to 4.0 (default: 0.9 for children)
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
        voice = 'shimmer',  // Soft, warm voice - best for children
        speed = 0.9      // Slightly slower for comprehension
    } = options;

    // Check cache first
    const cacheKey = `${text}-${voice}-${speed}`;
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
        return new Promise((resolve) => {
            const audio = new Audio(result.audioUrl);
            audio.onended = () => resolve();
            audio.onerror = () => {
                console.error('Audio playback error, using fallback');
                fallbackTTS(text);
                resolve();
            };
            audio.play().catch(() => {
                console.error('Audio play failed, using fallback');
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
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        utterance.rate = 0.9;
        utterance.pitch = 1.2;

        // Try to find a Turkish female voice
        const voices = window.speechSynthesis.getVoices();
        const turkishFemale = voices.find(v =>
            v.lang.includes('tr') && v.name.toLowerCase().includes('female')
        );
        const anyTurkish = voices.find(v => v.lang.includes('tr'));

        if (turkishFemale) {
            utterance.voice = turkishFemale;
        } else if (anyTurkish) {
            utterance.voice = anyTurkish;
        }

        window.speechSynthesis.speak(utterance);
    }
}

/**
 * Stop any currently playing speech
 */
export function stopSpeech(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}

/**
 * Clear the audio cache
 */
export function clearSpeechCache(): void {
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
