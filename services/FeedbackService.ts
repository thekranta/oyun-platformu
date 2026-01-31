/**
 * FeedbackService - Global Oyun Geri Bildirim Sistemi
 * Her oyunda tutarlı görsel ve işitsel geri bildirim sağlar
 * 
 * Kullanım:
 * import { FeedbackService } from '../services/FeedbackService';
 * FeedbackService.playSuccess();  // Konfeti + parlama
 * FeedbackService.playError();    // Shake + u-oh sesi
 */

import { Animated, Platform, Vibration } from 'react-native';

// ============== TYPES ==============
export interface FeedbackOptions {
    haptic?: boolean;      // Titreşim (mobil)
    sound?: boolean;       // Ses efekti
    intensity?: 'light' | 'medium' | 'heavy';
}

export interface AnimationRefs {
    scale?: Animated.Value;
    shake?: Animated.Value;
    glow?: Animated.Value;
}

// ============== FEEDBACK SERVICE ==============
export class FeedbackService {
    // ============== SUCCESS FEEDBACK ==============
    /**
     * Doğru hamle geri bildirimi
     * - Parlama efekti
     * - Titreşim (mobilde)
     * - Opsiyonel ses
     */
    static playSuccess(options: FeedbackOptions = {}): void {
        const { haptic = true, intensity = 'medium' } = options;

        // Haptic feedback (mobile only)
        if (haptic && Platform.OS !== 'web') {
            if (intensity === 'light') {
                Vibration.vibrate(30);
            } else if (intensity === 'medium') {
                Vibration.vibrate(50);
            } else {
                Vibration.vibrate([0, 50, 30, 50]);
            }
        }

        // Web vibration fallback
        if (haptic && Platform.OS === 'web' && 'vibrate' in navigator) {
            navigator.vibrate(50);
        }
    }

    /**
     * Başarı animasyonu - glow/scale efekti
     */
    static animateSuccess(refs: AnimationRefs): void {
        const { glow, scale } = refs;

        const animations: Animated.CompositeAnimation[] = [];

        if (glow) {
            animations.push(
                Animated.sequence([
                    Animated.timing(glow, { toValue: 1, duration: 200, useNativeDriver: true }),
                    Animated.timing(glow, { toValue: 0, duration: 300, useNativeDriver: true }),
                ])
            );
        }

        if (scale) {
            animations.push(
                Animated.sequence([
                    Animated.timing(scale, { toValue: 1.2, duration: 100, useNativeDriver: true }),
                    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
                ])
            );
        }

        if (animations.length > 0) {
            Animated.parallel(animations).start();
        }
    }

    // ============== ERROR FEEDBACK ==============
    /**
     * Yanlış hamle geri bildirimi
     * - Shake animasyonu
     * - "u-oh" sesi (opsiyonel)
     * - Titreşim
     */
    static playError(options: FeedbackOptions = {}): void {
        const { haptic = true, sound = false } = options;

        // Haptic feedback
        if (haptic && Platform.OS !== 'web') {
            Vibration.vibrate([0, 100, 50, 100]);
        }

        // Web vibration
        if (haptic && Platform.OS === 'web' && 'vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
        }

        // Play u-oh sound if enabled
        if (sound && Platform.OS === 'web') {
            this.playUhOhSound();
        }
    }

    /**
     * Hata animasyonu - shake efekti
     */
    static animateError(refs: AnimationRefs): void {
        const { shake } = refs;

        if (shake) {
            Animated.sequence([
                Animated.timing(shake, { toValue: 10, duration: 50, useNativeDriver: true }),
                Animated.timing(shake, { toValue: -10, duration: 50, useNativeDriver: true }),
                Animated.timing(shake, { toValue: 8, duration: 50, useNativeDriver: true }),
                Animated.timing(shake, { toValue: -8, duration: 50, useNativeDriver: true }),
                Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
            ]).start();
        }
    }

    // ============== MICRO ANIMATIONS ==============
    /**
     * Jöle titreme efekti - nesneler sürüklenirken
     */
    static animateJelly(scale: Animated.Value): void {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scale, { toValue: 1.08, duration: 150, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 0.95, duration: 150, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 1.05, duration: 100, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
            ]),
            { iterations: 1 }
        ).start();
    }

    /**
     * Parmak altında canlanma efekti - seçim sırasında
     */
    static animatePickUp(scale: Animated.Value): void {
        Animated.spring(scale, {
            toValue: 1.15,
            friction: 4,
            tension: 100,
            useNativeDriver: true,
        }).start();
    }

    /**
     * Bırakma efekti
     */
    static animateDrop(scale: Animated.Value): void {
        Animated.spring(scale, {
            toValue: 1,
            friction: 5,
            tension: 80,
            useNativeDriver: true,
        }).start();
    }

    /**
     * Pulse (nabız) animasyonu - dikkat çekmek için
     */
    static animatePulse(scale: Animated.Value): Animated.CompositeAnimation {
        return Animated.loop(
            Animated.sequence([
                Animated.timing(scale, { toValue: 1.1, duration: 400, useNativeDriver: true }),
                Animated.timing(scale, { toValue: 1, duration: 400, useNativeDriver: true }),
            ])
        );
    }

    // ============== LEVEL COMPLETE ==============
    /**
     * Seviye tamamlama geri bildirimi
     */
    static playLevelComplete(): void {
        if (Platform.OS !== 'web') {
            Vibration.vibrate([0, 100, 100, 200, 100, 300]);
        } else if ('vibrate' in navigator) {
            navigator.vibrate([100, 100, 200, 100, 300]);
        }
    }

    // ============== SOUND EFFECTS ==============
    /**
     * U-oh ses efekti (Web Audio API)
     */
    private static playUhOhSound(): void {
        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

            // Create a simple "u-oh" sound using oscillators
            const oscillator1 = audioContext.createOscillator();
            const oscillator2 = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator1.type = 'sine';
            oscillator2.type = 'sine';

            // "U" sound (higher pitch)
            oscillator1.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator1.frequency.linearRampToValueAtTime(350, audioContext.currentTime + 0.1);

            // "Oh" sound (lower pitch, starts after U)
            oscillator2.frequency.setValueAtTime(300, audioContext.currentTime + 0.15);
            oscillator2.frequency.linearRampToValueAtTime(220, audioContext.currentTime + 0.35);

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);

            oscillator1.connect(gainNode);
            oscillator2.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator1.start(audioContext.currentTime);
            oscillator1.stop(audioContext.currentTime + 0.15);

            oscillator2.start(audioContext.currentTime + 0.15);
            oscillator2.stop(audioContext.currentTime + 0.4);
        } catch (e) {
            console.warn('FeedbackService: Could not play u-oh sound', e);
        }
    }

    /**
     * Başarı ses efekti (Web Audio API)
     */
    static playSuccessSound(): void {
        if (Platform.OS !== 'web') return;

        try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = 'sine';

            // Rising "ding" sound
            oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
            oscillator.frequency.linearRampToValueAtTime(659, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.linearRampToValueAtTime(784, audioContext.currentTime + 0.2); // G5

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (e) {
            console.warn('FeedbackService: Could not play success sound', e);
        }
    }
}

// ============== HOOK: useFeedback ==============
/**
 * React hook for easy feedback integration
 * 
 * const { shakeAnim, glowAnim, scaleAnim, playSuccess, playError } = useFeedback();
 */
export function useFeedbackAnimations() {
    const shakeAnim = new Animated.Value(0);
    const glowAnim = new Animated.Value(0);
    const scaleAnim = new Animated.Value(1);

    const playSuccess = () => {
        FeedbackService.playSuccess();
        FeedbackService.animateSuccess({ glow: glowAnim, scale: scaleAnim });
    };

    const playError = () => {
        FeedbackService.playError({ sound: true });
        FeedbackService.animateError({ shake: shakeAnim });
    };

    const animatePickUp = () => {
        FeedbackService.animatePickUp(scaleAnim);
    };

    const animateDrop = () => {
        FeedbackService.animateDrop(scaleAnim);
    };

    return {
        shakeAnim,
        glowAnim,
        scaleAnim,
        playSuccess,
        playError,
        animatePickUp,
        animateDrop,
    };
}

export default FeedbackService;
