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

const { width } = Dimensions.get('window');

// Oyunun nasıl oynandığını gösteren etkileşim türü.
export type InteractionType = 'tap' | 'drag' | 'draw';

const GESTURE_LABEL: Record<InteractionType, string> = {
    tap: 'DOKUN',
    drag: 'SÜRÜKLE',
    draw: 'PARMAĞINLA ÇİZ',
};

interface CountdownOverlayProps {
    message: string;
    childName?: string;
    countdownSeconds?: number;
    onComplete: () => void;
    skip?: boolean;
    /**
     * Oyunun etkileşim türü — geri sayımda görsel olarak gösterilir.
     * 'tap' (dokun, varsayılan) | 'drag' (sürükle-bırak) | 'draw' (parmakla çiz)
     */
    interaction?: InteractionType;
}

type CountdownPhase = 'speaking' | 'countdown' | 'done';

// ============================================================
// Etkileşim demosu: geri sayım sırasında el/parmak animasyonuyla
// oyunun nasıl oynandığını gösterir. Sessizken bile anlaşılır (tamamen görsel).
// ============================================================
function GestureDemo({ type }: { type: InteractionType }) {
    const a = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1600, useNativeDriver: true }));
        loop.start();
        return () => { a.stopAnimation(); };
    }, [a]);

    if (type === 'drag') {
        const x = a.interpolate({ inputRange: [0, 0.6, 0.82, 1], outputRange: [0, 118, 118, 0] });
        return (
            <View style={styles.demoBox}>
                {/* hedef kutu */}
                <View style={styles.dropBox} />
                {/* sürüklenen nesne + parmak */}
                <Animated.View style={[styles.dragGroup, { transform: [{ translateX: x }] }]}>
                    <Text style={styles.dragObject}>⭐</Text>
                    <Text style={styles.finger}>👆</Text>
                </Animated.View>
            </View>
        );
    }

    if (type === 'draw') {
        const x = a.interpolate({ inputRange: [0, 0.85, 1], outputRange: [0, 128, 0] });
        const y = a.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.85], outputRange: [0, -12, 10, -12, 0], extrapolate: 'clamp' });
        return (
            <View style={styles.demoBox}>
                <View style={styles.drawLine} />
                <Animated.Text style={[styles.fingerBig, { transform: [{ translateX: x }, { translateY: y }] }]}>✏️</Animated.Text>
            </View>
        );
    }

    // tap
    const fingerY = a.interpolate({ inputRange: [0, 0.18, 0.4, 1], outputRange: [0, 18, 0, 0] });
    const ringScale = a.interpolate({ inputRange: [0, 0.2, 0.6], outputRange: [0.4, 0.5, 1.9], extrapolate: 'clamp' });
    const ringOpacity = a.interpolate({ inputRange: [0.2, 0.6], outputRange: [0.85, 0], extrapolate: 'clamp' });
    return (
        <View style={styles.demoBox}>
            <View style={styles.tapTarget} />
            <Animated.View style={[styles.tapRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
            <Animated.Text style={[styles.fingerBig, styles.tapFinger, { transform: [{ translateY: fingerY }] }]}>👆</Animated.Text>
        </View>
    );
}

export default function CountdownOverlay({
    message,
    childName = '',
    countdownSeconds = 5,
    onComplete,
    skip = false,
    interaction = 'tap',
}: CountdownOverlayProps) {
    const [phase, setPhase] = useState<CountdownPhase>('speaking');
    const [countdown, setCountdown] = useState(countdownSeconds);
    const [isVisible, setIsVisible] = useState(true);

    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const countdownScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (skip) {
            setIsVisible(false);
            onComplete();
        }
    }, [skip]);

    useEffect(() => {
        if (skip || Platform.OS !== 'web') {
            if (!skip) setPhase('countdown');
            return;
        }
        const startSpeaking = async () => {
            Animated.spring(scaleAnim, { toValue: 1, friction: 6, useNativeDriver: true }).start();
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            ).start();
            try {
                const personalizedMessage = childName ? `Merhaba ${childName}! ${message}` : message;
                await speak(personalizedMessage);
            } catch (e) {
                console.log('TTS error:', e);
            }
            pulseAnim.stopAnimation();
            setPhase('countdown');
        };
        startSpeaking();
    }, []);

    useEffect(() => {
        if (phase !== 'countdown') return;
        Animated.spring(countdownScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setPhase('done');
                    return 0;
                }
                countdownScale.setValue(0);
                Animated.spring(countdownScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [phase]);

    useEffect(() => {
        if (phase !== 'done') return;
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
            setIsVisible(false);
            onComplete();
        });
    }, [phase]);

    if (!isVisible) return null;

    return (
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
            <View style={styles.content}>
                {phase === 'speaking' && (
                    <Animated.View style={[styles.speakingContainer, { transform: [{ scale: scaleAnim }] }]}>
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
                        <Text style={styles.readyText}>Nasıl oynanır?</Text>

                        {/* Görsel etkileşim demosu — ses kapalıyken bile anlaşılır */}
                        <GestureDemo type={interaction} />
                        <View style={styles.gestureLabelWrap}>
                            <Text style={styles.gestureLabel}>{GESTURE_LABEL[interaction]}</Text>
                        </View>

                        <Animated.View style={[styles.countdownCircle, { transform: [{ scale: countdownScale }] }]}>
                            <Text style={styles.countdownNumber}>{countdown}</Text>
                        </Animated.View>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', zIndex: 9999 },
    content: { alignItems: 'center', justifyContent: 'center', padding: 20 },
    speakingContainer: { alignItems: 'center' },
    speakerCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#4CAF50', justifyContent: 'center', alignItems: 'center', marginBottom: 20, shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
    listeningText: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
    messagePreview: { fontSize: 18, color: 'rgba(255, 255, 255, 0.7)', textAlign: 'center', maxWidth: width * 0.8 },

    countdownContainer: { alignItems: 'center' },
    readyText: { fontSize: 26, fontWeight: 'bold', color: '#FFD700', marginBottom: 14, textShadowColor: 'rgba(255, 215, 0, 0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15 },

    // Etkileşim demosu
    demoBox: { width: 200, height: 96, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', justifyContent: 'center' },
    fingerBig: { fontSize: 40, position: 'absolute' },
    finger: { fontSize: 30, position: 'absolute', left: 22, top: 20 },
    // tap
    tapTarget: { position: 'absolute', alignSelf: 'center', top: 40, width: 44, height: 44, borderRadius: 22, backgroundColor: '#4FC3F7', borderWidth: 3, borderColor: '#fff' },
    tapRing: { position: 'absolute', alignSelf: 'center', top: 40, width: 44, height: 44, borderRadius: 22, borderWidth: 4, borderColor: '#FFEB3B' },
    tapFinger: { alignSelf: 'center', top: 14 },
    // drag
    dropBox: { position: 'absolute', right: 20, top: 26, width: 52, height: 52, borderRadius: 12, borderWidth: 3, borderColor: '#FFEB3B', borderStyle: 'dashed', backgroundColor: 'rgba(255,235,59,0.1)' },
    dragGroup: { position: 'absolute', left: 16, top: 24, width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
    dragObject: { fontSize: 40 },
    // draw
    drawLine: { position: 'absolute', left: 34, right: 34, top: 48, borderTopWidth: 3, borderColor: 'rgba(255,235,59,0.7)', borderStyle: 'dashed' },

    gestureLabelWrap: { backgroundColor: '#FFEB3B', paddingHorizontal: 18, paddingVertical: 6, borderRadius: 999, marginTop: 12 },
    gestureLabel: { fontSize: 18, fontWeight: '900', color: '#5A3A00', letterSpacing: 0.5 },

    countdownCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#FF5722', justifyContent: 'center', alignItems: 'center', marginTop: 18, shadowColor: '#FF5722', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 12, borderWidth: 4, borderColor: '#fff' },
    countdownNumber: { fontSize: 52, fontWeight: 'bold', color: '#fff', textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 5 },
});
