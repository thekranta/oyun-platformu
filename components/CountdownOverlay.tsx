import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { speak } from '../services/speechService';

const { width, height } = Dimensions.get('window');

interface CountdownOverlayProps {
    /**
     * The greeting message to speak before countdown
     */
    message: string;
    /**
     * Child's name to personalize the greeting
     */
    childName?: string;
    /**
     * Countdown duration in seconds (default: 5)
     */
    countdownSeconds?: number;
    /**
     * Called when countdown finishes
     */
    onComplete: () => void;
    /**
     * Optional: Skip the overlay (for games that handle their own intro)
     */
    skip?: boolean;
}

type CountdownPhase = 'speaking' | 'countdown' | 'done';

export default function CountdownOverlay({
    message,
    childName = '',
    countdownSeconds = 5,
    onComplete,
    skip = false,
}: CountdownOverlayProps) {
    const [phase, setPhase] = useState<CountdownPhase>('speaking');
    const [countdown, setCountdown] = useState(countdownSeconds);
    const [isVisible, setIsVisible] = useState(true);

    // Animations
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const countdownScale = useRef(new Animated.Value(0)).current;

    // Skip if needed
    useEffect(() => {
        if (skip) {
            setIsVisible(false);
            onComplete();
        }
    }, [skip]);

    // Start speaking on mount
    useEffect(() => {
        if (skip || Platform.OS !== 'web') {
            // On mobile, skip TTS for now and just do countdown
            if (!skip) {
                setPhase('countdown');
            }
            return;
        }

        const startSpeaking = async () => {
            // Animate in
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 6,
                useNativeDriver: true,
            }).start();

            // Pulse animation for speaker icon
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            ).start();

            try {
                // Personalize message with child name
                const personalizedMessage = childName
                    ? `Merhaba ${childName}! ${message}`
                    : message;

                await speak(personalizedMessage);
            } catch (e) {
                console.log('TTS error:', e);
            }

            // Move to countdown phase
            pulseAnim.stopAnimation();
            setPhase('countdown');
        };

        startSpeaking();
    }, []);

    // Countdown logic
    useEffect(() => {
        if (phase !== 'countdown') return;

        // Animate first number
        Animated.spring(countdownScale, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
        }).start();

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setPhase('done');
                    return 0;
                }

                // Animate each number change
                countdownScale.setValue(0);
                Animated.spring(countdownScale, {
                    toValue: 1,
                    friction: 4,
                    useNativeDriver: true,
                }).start();

                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [phase]);

    // Fade out when done
    useEffect(() => {
        if (phase !== 'done') return;

        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setIsVisible(false);
            onComplete();
        });
    }, [phase]);

    if (!isVisible) return null;

    return (
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
            <View style={styles.content}>
                {phase === 'speaking' && (
                    <Animated.View
                        style={[
                            styles.speakingContainer,
                            { transform: [{ scale: scaleAnim }] },
                        ]}
                    >
                        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                            <View style={styles.speakerCircle}>
                                <Ionicons name="volume-high" size={60} color="#fff" />
                            </View>
                        </Animated.View>
                        <Text style={styles.listeningText}>Dinle...</Text>
                        <Text style={styles.messagePreview} numberOfLines={2}>
                            {childName ? `Merhaba ${childName}!` : message}
                        </Text>
                    </Animated.View>
                )}

                {phase === 'countdown' && (
                    <View style={styles.countdownContainer}>
                        <Text style={styles.readyText}>Hazır mısın?</Text>
                        <Animated.View
                            style={[
                                styles.countdownCircle,
                                { transform: [{ scale: countdownScale }] },
                            ]}
                        >
                            <Text style={styles.countdownNumber}>{countdown}</Text>
                        </Animated.View>
                        <Text style={styles.startingSoon}>Oyun başlıyor...</Text>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    content: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    speakingContainer: {
        alignItems: 'center',
    },
    speakerCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    listeningText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    messagePreview: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        maxWidth: width * 0.8,
    },
    countdownContainer: {
        alignItems: 'center',
    },
    readyText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFD700',
        marginBottom: 30,
        textShadowColor: 'rgba(255, 215, 0, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
    },
    countdownCircle: {
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: '#FF5722',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
        shadowColor: '#FF5722',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 25,
        elevation: 15,
        borderWidth: 4,
        borderColor: '#fff',
    },
    countdownNumber: {
        fontSize: 80,
        fontWeight: 'bold',
        color: '#fff',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 5,
    },
    startingSoon: {
        fontSize: 22,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '600',
    },
});
