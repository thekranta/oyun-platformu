import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import { useSound } from './SoundContext';

interface OnlukCerceveProps {
    onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number, algilananKelime?: string, extraData?: any) => void;
    onExit: () => void;
}

export default function OnlukCerceve({ onGameEnd, onExit }: OnlukCerceveProps) {
    const { isMuted, toggleMute } = useSound();
    const [dimensions, setDimensions] = useState(Dimensions.get('window'));

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setDimensions(window);
        });
        return () => subscription?.remove();
    }, []);

    const { width: screenWidth, height: screenHeight } = dimensions;
    const isPortrait = screenHeight > screenWidth;

    // Responsive container - mobil için daha dar
    const containerWidth = isPortrait
        ? Math.min(screenWidth * 0.92, 500)  // Mobil: daha dar
        : Math.min(screenWidth * 0.85, 850); // Web: geniş
    const containerHeight = containerWidth * (isPortrait ? 0.7 : 9 / 16);

    // Dynamic sizing
    const CELL_SIZE = containerHeight * (isPortrait ? 0.14 : 0.12);
    const APPLE_SIZE = CELL_SIZE * 0.8;
    const BASKET_APPLE_SIZE = containerHeight * 0.18;

    // Floating animation
    const float1 = useRef(new Animated.Value(0)).current;
    const float2 = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const makeLoop = (anim: Animated.Value, duration: number) => Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 15, duration, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration, useNativeDriver: true }),
            ])
        );
        const loops = [makeLoop(float1, 4000), makeLoop(float2, 5500)];
        loops.forEach(l => l.start());
        return () => loops.forEach(l => l.stop());
    }, [float1, float2]);

    // Game state
    const [round, setRound] = useState(1);
    const [targetNumber, setTargetNumber] = useState(() => Math.floor(Math.random() * 5) + 1);
    const [placedFruits, setPlacedFruits] = useState<boolean[]>(Array(10).fill(false));
    const [mistakes, setMistakes] = useState(0);
    const [startTime] = useState(Date.now());
    const [roundData, setRoundData] = useState<any[]>([]);
    const [showConfetti, setShowConfetti] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [dragCount, setDragCount] = useState(0);
    const [gameReady, setGameReady] = useState(false);

    const placedFruitsRef = useRef(placedFruits);
    const targetNumberRef = useRef(targetNumber);
    useEffect(() => { placedFruitsRef.current = placedFruits; }, [placedFruits]);
    useEffect(() => { targetNumberRef.current = targetNumber; }, [targetNumber]);

    const pan = useRef(new Animated.ValueXY()).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const countPulse = useRef(new Animated.Value(1)).current;
    // Unmount'ta temizlenecek zamanlayicilar
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Unmount cleanup: bekleyen setTimeout'lari temizle
    useEffect(() => () => {
         
        timersRef.current.forEach(clearTimeout);
    }, []);

    const pulseCount = () => {
        Animated.sequence([
            Animated.timing(countPulse, { toValue: 1.2, duration: 100, useNativeDriver: true }),
            Animated.timing(countPulse, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
    };

    useEffect(() => {
        if (round > 1) {
            setShowConfetti(false);
            setShowSuccess(false);
            setPlacedFruits(Array(10).fill(false));
            pan.setValue({ x: 0, y: 0 });
            // Ardisik ayni hedefi engelle. targetNumberRef her zaman GUNCEL (onceki tur)
            // hedefi tutar; eski prevTarget state'i round 1 hedefine hic ayarlanmadigi icin
            // round 1->2 gecisinde ayni hedef tekrar edebiliyordu.
            let newTarget: number;
            do {
                newTarget = round <= 4
                    ? Math.floor(Math.random() * 5) + 1
                    : Math.min(Math.floor(Math.random() * 5) + 6, 10);
            } while (newTarget === targetNumberRef.current);
            setTargetNumber(newTarget);
        }
    }, [round]);

    const handleFruitDrop = useCallback(() => {
        const currentPlaced = placedFruitsRef.current;
        const target = targetNumberRef.current;
        const currentCount = currentPlaced.filter(Boolean).length;

        if (currentCount >= target) {
            pan.setValue({ x: 0, y: 0 });
            return;
        }

        const firstEmptyIndex = currentPlaced.findIndex(x => !x);
        if (firstEmptyIndex !== -1) {
            const newPlaced = [...currentPlaced];
            newPlaced[firstEmptyIndex] = true;
            setPlacedFruits(newPlaced);
            setDragCount(c => c + 1);
            pulseCount();
            pan.setValue({ x: 0, y: 0 });

            const newCount = currentCount + 1;
            if (newCount === target) {
                setShowConfetti(true);
                setShowSuccess(true);
                setRoundData(prev => [...prev, { round, target, result: 'success' }]);
                timersRef.current.push(setTimeout(() => {
                    if (round < 10) setRound(r => r + 1);
                    else {
                        const duration = Math.floor((Date.now() - startTime) / 1000);
                        onGameEnd('Onluk Çerçeve', duration, 10, mistakes, undefined, {
                            zorlukSeviyesi: 1, kazanimOdagi: 'MAB.1 Sayı Kompozisyonu'
                        });
                    }
                }, 1500));
            }
        }
    }, [round, mistakes, startTime, onGameEnd, pan]);

    const handleFruitDropRef = useRef(handleFruitDrop);
    useEffect(() => { handleFruitDropRef.current = handleFruitDrop; }, [handleFruitDrop]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.setOffset({ x: 0, y: 0 });
                pan.setValue({ x: 0, y: 0 });
                // pan (transform) JS driver kullaniyor; ayni transform'daki scale de
                // JS driver olmali, yoksa native'de "native/JS driven" cakismasi crash eder.
                Animated.spring(scaleAnim, { toValue: 1.15, useNativeDriver: false }).start();
            },
            onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
            onPanResponderRelease: (_, g) => {
                pan.flattenOffset();
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: false }).start();
                if (Math.sqrt(g.dx ** 2 + g.dy ** 2) > 25) handleFruitDropRef.current();
                else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
            }
        })
    ).current;

    const currentCount = placedFruits.filter(Boolean).length;

    return (
        <View style={styles.outerContainer}>
            {/* Floating Background Elements */}
            <Animated.Text style={[styles.floatingCloud, { top: '15%', left: '8%', transform: [{ translateY: float1 }] }]}>☁️</Animated.Text>
            <Animated.Text style={[styles.floatingCloud, { top: '25%', right: '10%', transform: [{ translateY: float2 }], opacity: 0.5 }]}>☁️</Animated.Text>
            <Animated.Text style={[styles.floatingStar, { bottom: '20%', left: '12%', transform: [{ translateY: float2 }] }]}>⭐</Animated.Text>
            <Animated.Text style={[styles.floatingStar, { top: '40%', right: '5%', transform: [{ translateY: float1 }], opacity: 0.4 }]}>✨</Animated.Text>

            {showConfetti && <ConfettiCannon count={100} origin={{ x: screenWidth / 2, y: 0 }} fadeOut />}

            {/* Game Container - Glassmorphism */}
            <View style={[styles.gameContainer, { width: containerWidth, height: containerHeight }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onExit} style={styles.headerBtn}>
                        <Ionicons name="arrow-back-circle" size={30} color="#4CAF50" />
                    </TouchableOpacity>
                    <View style={styles.roundBadge}>
                        <Text style={styles.roundText}>🎯 Tur {round}/10</Text>
                    </View>
                    <TouchableOpacity onPress={toggleMute} style={styles.headerBtn}>
                        <Ionicons name={isMuted ? 'volume-mute-outline' : 'volume-high-outline'} size={26} color="#4CAF50" />
                    </TouchableOpacity>
                </View>

                {/* Main */}
                <View style={styles.mainArea}>
                    {/* Left */}
                    <View style={styles.instructionPanel}>
                        <View style={styles.targetCard}>
                            <Text style={{ fontSize: 24 }}>🍎</Text>
                            <Text style={[styles.targetNumber, { fontSize: containerHeight * 0.12 }]}>{targetNumber}</Text>
                            <Text style={styles.targetLabel}>elma topla!</Text>
                        </View>
                        <Animated.View style={[styles.counterBox, { transform: [{ scale: countPulse }] }]}>
                            <Text style={[styles.counterText, { fontSize: containerHeight * 0.07 }]}>{currentCount} / {targetNumber}</Text>
                            {showSuccess && <Text style={styles.successText}>🎉</Text>}
                        </Animated.View>
                    </View>

                    {/* Grid */}
                    <View style={styles.gridArea}>
                        <View style={[styles.gridContainer, { padding: CELL_SIZE * 0.12 }]}>
                            {[0, 1].map(row => (
                                <View key={row} style={styles.gridRow}>
                                    {[0, 1, 2, 3, 4].map(col => {
                                        const i = row * 5 + col;
                                        return (
                                            <View key={i} style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}>
                                                {placedFruits[i] && <Text style={{ fontSize: APPLE_SIZE }}>🍎</Text>}
                                                {!placedFruits[i] && round <= 4 && (
                                                    <Text style={[styles.cellNumber, { fontSize: CELL_SIZE * 0.28 }]}>{i + 1}</Text>
                                                )}
                                                {!placedFruits[i] && round > 4 && (
                                                    <Text style={[styles.cellArrow, { fontSize: CELL_SIZE * 0.35 }]}>→</Text>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Right - Draggable */}
                    <View style={styles.basketPanel}>
                        <Text style={styles.basketLabel}>👆 Sürükle!</Text>
                        <Animated.View
                            key={dragCount}
                            style={[
                                styles.draggableApple,
                                { width: BASKET_APPLE_SIZE, height: BASKET_APPLE_SIZE, transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: scaleAnim }] },
                                Platform.OS === 'web' && { cursor: 'grab', userSelect: 'none' } as any
                            ]}
                            {...panResponder.panHandlers}
                        >
                            <Text style={{ fontSize: BASKET_APPLE_SIZE * 0.6 }}>🍎</Text>
                        </Animated.View>
                        <Text style={styles.dragHint}>⬆️ Tabloya</Text>
                    </View>
                </View>

                {/* Progress */}
                <View style={styles.progressBar}>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <View key={i} style={[styles.progressDot, i < round && styles.progressDotActive, i === round - 1 && styles.progressDotCurrent]} />
                    ))}
                </View>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    interaction="drag"
                    message="Söylenen sayı kadar meyveyi çerçeveye koy!"
                    countdownSeconds={5}
                    onComplete={() => setGameReady(true)}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        // Gradient effect via background color layers
        backgroundColor: '#A5D6A7',
    },
    floatingCloud: { position: 'absolute', fontSize: 40, opacity: 0.3, zIndex: 0 },
    floatingStar: { position: 'absolute', fontSize: 24, opacity: 0.4, zIndex: 0 },
    gameContainer: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 20,
        overflow: 'hidden',
        zIndex: 10,
        // Glassmorphism shadow
        ...(Platform.OS === 'web' ? { boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)' } as any : {
            elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 20
        }),
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: '3%', paddingVertical: '1.5%',
        backgroundColor: 'rgba(232,245,233,0.9)', borderBottomWidth: 1, borderBottomColor: '#C8E6C9',
    },
    headerBtn: { padding: 2 },
    roundBadge: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, borderWidth: 2, borderColor: '#81C784' },
    roundText: { fontSize: 13, fontWeight: 'bold', color: '#2E7D32' },
    mainArea: { flex: 1, flexDirection: 'row', padding: '2%' },
    instructionPanel: { flex: 0.25, alignItems: 'center', justifyContent: 'center' },
    targetCard: { backgroundColor: '#FFECB3', borderRadius: 12, padding: '6%', alignItems: 'center', borderWidth: 2, borderColor: '#FFB300', marginBottom: '8%' },
    targetNumber: { fontWeight: 'bold', color: '#E65100' },
    targetLabel: { fontSize: 11, color: '#5D4037', fontWeight: '600' },
    counterBox: { backgroundColor: '#E3F2FD', borderRadius: 10, padding: '5%', alignItems: 'center', borderWidth: 2, borderColor: '#64B5F6' },
    counterText: { fontWeight: 'bold', color: '#1565C0' },
    successText: { fontSize: 20, marginTop: 2 },
    gridArea: { flex: 0.5, alignItems: 'center', justifyContent: 'center' },
    gridContainer: { backgroundColor: '#FFF9C4', borderRadius: 12, borderWidth: 3, borderColor: '#FBC02D' },
    gridRow: { flexDirection: 'row', gap: 4, marginBottom: 4 },
    cell: { backgroundColor: '#FFFDE7', borderWidth: 2, borderColor: '#FFEB3B', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    cellNumber: { color: '#D4C700', fontWeight: 'bold' },
    cellArrow: { color: '#E0E0E0' },
    basketPanel: { flex: 0.25, alignItems: 'center', justifyContent: 'center' },
    basketLabel: { fontSize: 11, color: '#4CAF50', fontWeight: 'bold', marginBottom: 6 },
    dragHint: { fontSize: 10, color: '#8BC34A', marginTop: 6 },
    draggableApple: {
        justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 100, borderWidth: 3, borderColor: '#E57373', zIndex: 100,
        ...(Platform.OS === 'web' ? { boxShadow: '0 4px 16px rgba(0,0,0,0.15)' } as any : { elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8 }),
    },
    progressBar: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: '1%', backgroundColor: 'rgba(241,248,233,0.9)' },
    progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#C8E6C9', borderWidth: 1, borderColor: '#A5D6A7' },
    progressDotActive: { backgroundColor: '#4CAF50', borderColor: '#2E7D32' },
    progressDotCurrent: { backgroundColor: '#FF9800', borderColor: '#E65100', transform: [{ scale: 1.3 }] },
});
