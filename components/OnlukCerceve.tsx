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

    // 16:9 Aspect Ratio Container - max 900px, 95vw
    const containerWidth = Math.min(screenWidth * 0.95, 900);
    const containerHeight = containerWidth * (9 / 16);

    // Grid sizing based on container (percentage-based)
    const CELL_SIZE = containerHeight * 0.12; // 12% of container height
    const APPLE_SIZE = CELL_SIZE * 0.85;
    const BASKET_APPLE_SIZE = containerHeight * 0.15;

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

    // Refs for state access in PanResponder
    const placedFruitsRef = useRef(placedFruits);
    const targetNumberRef = useRef(targetNumber);

    useEffect(() => { placedFruitsRef.current = placedFruits; }, [placedFruits]);
    useEffect(() => { targetNumberRef.current = targetNumber; }, [targetNumber]);

    const pan = useRef(new Animated.ValueXY()).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const countPulse = useRef(new Animated.Value(1)).current;

    // Animate count when fruit is placed
    const pulseCount = () => {
        Animated.sequence([
            Animated.timing(countPulse, { toValue: 1.3, duration: 150, useNativeDriver: true }),
            Animated.timing(countPulse, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();
    };

    // New round
    useEffect(() => {
        if (round > 1) {
            setShowConfetti(false);
            setShowSuccess(false);
            setPlacedFruits(Array(10).fill(false));
            pan.setValue({ x: 0, y: 0 });

            const newTarget = round <= 4
                ? Math.floor(Math.random() * 5) + 1
                : Math.min(Math.floor(Math.random() * 5) + 6, 10);
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
                // Success!
                setShowConfetti(true);
                setShowSuccess(true);
                setRoundData(prev => [...prev, { round, target, result: 'success' }]);

                setTimeout(() => {
                    if (round < 10) {
                        setRound(r => r + 1);
                    } else {
                        const duration = Math.floor((Date.now() - startTime) / 1000);
                        onGameEnd('Onluk Çerçeve', duration, 10, mistakes, undefined, {
                            zorlukSeviyesi: 1,
                            kazanimOdagi: 'MAB.1 Sayı Kompozisyonu',
                            algilananKelime: mistakes === 0 ? 'Mükemmel' : `${mistakes} hata`
                        });
                    }
                }, 1800);
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
                Animated.spring(scaleAnim, { toValue: 1.2, useNativeDriver: true }).start();
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gesture) => {
                pan.flattenOffset();
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();

                // Any significant drag triggers drop
                const distance = Math.sqrt(gesture.dx ** 2 + gesture.dy ** 2);
                if (distance > 30) {
                    handleFruitDropRef.current();
                } else {
                    Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
                }
            }
        })
    ).current;

    const currentCount = placedFruits.filter(Boolean).length;

    return (
        <View style={styles.outerContainer}>
            {showConfetti && <ConfettiCannon count={150} origin={{ x: screenWidth / 2, y: 0 }} fadeOut explosionSpeed={400} />}

            {/* Game Container - 16:9 Aspect Ratio */}
            <View style={[styles.gameContainer, { width: containerWidth, height: containerHeight }]}>

                {/* Header Bar */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onExit} style={styles.headerBtn}>
                        <Ionicons name="arrow-back-circle" size={36} color="#4CAF50" />
                    </TouchableOpacity>

                    <View style={styles.roundBadge}>
                        <Text style={styles.roundText}>🎯 Tur {round}/10</Text>
                    </View>

                    <TouchableOpacity onPress={toggleMute} style={styles.headerBtn}>
                        <Ionicons name={isMuted ? 'volume-mute-outline' : 'volume-high-outline'} size={32} color="#4CAF50" />
                    </TouchableOpacity>
                </View>

                {/* Main Game Area */}
                <View style={styles.mainArea}>

                    {/* Left Panel - Instructions */}
                    <View style={styles.instructionPanel}>
                        <View style={styles.targetCard}>
                            <Text style={styles.targetEmoji}>🍎</Text>
                            <Text style={[styles.targetNumber, { fontSize: containerHeight * 0.12 }]}>{targetNumber}</Text>
                            <Text style={styles.targetLabel}>elma topla!</Text>
                        </View>

                        {/* Live Counter */}
                        <Animated.View style={[styles.counterBox, { transform: [{ scale: countPulse }] }]}>
                            <Text style={[styles.counterText, { fontSize: containerHeight * 0.08 }]}>
                                {currentCount} / {targetNumber}
                            </Text>
                            {showSuccess && <Text style={styles.successText}>🎉 Harika!</Text>}
                        </Animated.View>
                    </View>

                    {/* Center - Grid Area */}
                    <View style={styles.gridArea}>
                        <View style={[styles.gridContainer, { padding: CELL_SIZE * 0.15 }]}>
                            {/* Row 1 */}
                            <View style={styles.gridRow}>
                                {[0, 1, 2, 3, 4].map(i => (
                                    <View key={i} style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}>
                                        {placedFruits[i] && (
                                            <Animated.Text style={[styles.fruitInCell, { fontSize: APPLE_SIZE }]}>
                                                🍎
                                            </Animated.Text>
                                        )}
                                        {!placedFruits[i] && (
                                            <Text style={[styles.cellNumber, { fontSize: CELL_SIZE * 0.3 }]}>{i + 1}</Text>
                                        )}
                                    </View>
                                ))}
                            </View>
                            {/* Row 2 */}
                            <View style={styles.gridRow}>
                                {[5, 6, 7, 8, 9].map(i => (
                                    <View key={i} style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}>
                                        {placedFruits[i] && (
                                            <Animated.Text style={[styles.fruitInCell, { fontSize: APPLE_SIZE }]}>
                                                🍎
                                            </Animated.Text>
                                        )}
                                        {!placedFruits[i] && (
                                            <Text style={[styles.cellNumber, { fontSize: CELL_SIZE * 0.3 }]}>{i + 1}</Text>
                                        )}
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Right Panel - Basket */}
                    <View style={styles.basketPanel}>
                        <Text style={styles.basketLabel}>⬆️ Sürükle!</Text>

                        <View style={[styles.basket, { width: BASKET_APPLE_SIZE * 1.6, height: BASKET_APPLE_SIZE * 1.2 }]}>
                            <Text style={styles.basketEmoji}>🧺</Text>
                        </View>

                        <Animated.View
                            key={dragCount}
                            style={[
                                styles.draggableApple,
                                {
                                    width: BASKET_APPLE_SIZE,
                                    height: BASKET_APPLE_SIZE,
                                    transform: [
                                        { translateX: pan.x },
                                        { translateY: pan.y },
                                        { scale: scaleAnim }
                                    ]
                                },
                                Platform.OS === 'web' && { cursor: 'grab', userSelect: 'none' } as any
                            ]}
                            {...panResponder.panHandlers}
                        >
                            <Text style={{ fontSize: BASKET_APPLE_SIZE * 0.7 }}>🍎</Text>
                        </Animated.View>
                    </View>
                </View>

                {/* Progress Dots */}
                <View style={styles.progressBar}>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <View key={i} style={[
                            styles.progressDot,
                            i < round && styles.progressDotActive,
                            i === round - 1 && styles.progressDotCurrent
                        ]} />
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: '#C8E6C9', // Soft green background
        justifyContent: 'center',
        alignItems: 'center',
    },
    gameContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        ...(Platform.OS === 'web' && { boxShadow: '0 8px 32px rgba(0,0,0,0.15)' } as any),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: '3%',
        paddingVertical: '2%',
        backgroundColor: '#E8F5E9',
        borderBottomWidth: 2,
        borderBottomColor: '#A5D6A7',
    },
    headerBtn: {
        padding: 4,
    },
    roundBadge: {
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#81C784',
    },
    roundText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    mainArea: {
        flex: 1,
        flexDirection: 'row',
        padding: '2%',
    },
    instructionPanel: {
        flex: 0.25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    targetCard: {
        backgroundColor: '#FFECB3',
        borderRadius: 16,
        padding: '8%',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFB300',
        marginBottom: '10%',
    },
    targetEmoji: {
        fontSize: 32,
    },
    targetNumber: {
        fontWeight: 'bold',
        color: '#E65100',
    },
    targetLabel: {
        fontSize: 14,
        color: '#5D4037',
        fontWeight: '600',
        marginTop: 4,
    },
    counterBox: {
        backgroundColor: '#E3F2FD',
        borderRadius: 12,
        padding: '6%',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#64B5F6',
    },
    counterText: {
        fontWeight: 'bold',
        color: '#1565C0',
    },
    successText: {
        fontSize: 16,
        color: '#4CAF50',
        fontWeight: 'bold',
        marginTop: 4,
    },
    gridArea: {
        flex: 0.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gridContainer: {
        backgroundColor: '#FFF9C4',
        borderRadius: 16,
        borderWidth: 4,
        borderColor: '#FBC02D',
    },
    gridRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 6,
    },
    cell: {
        backgroundColor: '#FFFDE7',
        borderWidth: 3,
        borderColor: '#FFEB3B',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cellNumber: {
        color: '#C8B900',
        fontWeight: 'bold',
    },
    fruitInCell: {
        // fontSize is dynamic
    },
    basketPanel: {
        flex: 0.25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    basketLabel: {
        fontSize: 14,
        color: '#689F38',
        fontWeight: 'bold',
        marginBottom: 8,
    },
    basket: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    basketEmoji: {
        fontSize: 48,
    },
    draggableApple: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 100,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 8,
        borderWidth: 3,
        borderColor: '#E57373',
        zIndex: 100,
    },
    progressBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: '1.5%',
        backgroundColor: '#F1F8E9',
    },
    progressDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#C8E6C9',
        borderWidth: 2,
        borderColor: '#A5D6A7',
    },
    progressDotActive: {
        backgroundColor: '#4CAF50',
        borderColor: '#2E7D32',
    },
    progressDotCurrent: {
        backgroundColor: '#FF9800',
        borderColor: '#E65100',
        transform: [{ scale: 1.3 }],
    },
});
