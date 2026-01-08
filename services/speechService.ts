/**
 * OpenAI TTS Service
 * Text-to-Speech using OpenAI's audio/speech API
 * Uses tts-1 model with 'nova' voice (maple fallback if available)
 */

// Cache for audio blobs to avoid repeated API calls
const audioCache = new Map<string, string>();

// Environment variable for API key
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

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
 * Generate speech from text using OpenAI TTS API
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

    // Check API key
    if (!OPENAI_API_KEY) {
        console.warn('OpenAI API key not found, falling back to browser TTS');
        return {
            success: false,
            error: 'API key not configured'
        };
    }

    try {
        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                input: text,
                voice,
                speed,
                response_format: 'mp3'
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI TTS Error:', response.status, errorText);
            return {
                success: false,
                error: `API Error: ${response.status}`
            };
        }

        // Get audio blob
        const audioBlob = await response.blob();
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
 * Play speech audio from text
 * Falls back to browser TTS if OpenAI fails
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
