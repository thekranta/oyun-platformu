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

    const { width, height } = dimensions;
    const isLandscape = width > height;
    const isSmallScreen = Math.min(width, height) < 400;
    const isWeb = Platform.OS === 'web';

    // Responsive sizing - Web'de daha büyük
    const CELL_SIZE = isWeb
        ? Math.min(width / 8, 70)  // Web: daha büyük
        : isLandscape
            ? Math.min((height - 150) / 3, 55)
            : Math.min((width - 40) / 5.2, 60);

    // Game state
    const [round, setRound] = useState(1);
    const [targetNumber, setTargetNumber] = useState(() => Math.floor(Math.random() * 5) + 1);
    const [placedFruits, setPlacedFruits] = useState<boolean[]>(Array(10).fill(false));
    const [mistakes, setMistakes] = useState(0);
    const [startTime] = useState(Date.now());
    const [roundData, setRoundData] = useState<any[]>([]);
    const [showConfetti, setShowConfetti] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [dragCount, setDragCount] = useState(0); // Force re-render for drag

    // useRef to access latest state in PanResponder callbacks
    const placedFruitsRef = useRef(placedFruits);
    const targetNumberRef = useRef(targetNumber);

    useEffect(() => {
        placedFruitsRef.current = placedFruits;
    }, [placedFruits]);

    useEffect(() => {
        targetNumberRef.current = targetNumber;
    }, [targetNumber]);

    const pan = useRef(new Animated.ValueXY()).current;

    // Start new round
    useEffect(() => {
        if (round > 1) {
            setShowConfetti(false);
            setFeedbackMessage(null);
            setPlacedFruits(Array(10).fill(false));
            pan.setValue({ x: 0, y: 0 });

            let newTarget;
            if (round <= 4) {
                newTarget = Math.floor(Math.random() * 5) + 1;
            } else {
                newTarget = Math.floor(Math.random() * 5) + 6;
                if (newTarget > 10) newTarget = 10;
            }
            setTargetNumber(newTarget);
        }
    }, [round]);

    const handleFruitDrop = useCallback(() => {
        const currentPlaced = placedFruitsRef.current;
        const target = targetNumberRef.current;
        const currentCount = currentPlaced.filter(Boolean).length;

        console.log('Drop:', { currentCount, target });

        if (currentCount >= target) {
            pan.setValue({ x: 0, y: 0 });
            return;
        }

        const firstEmptyIndex = currentPlaced.findIndex(x => !x);
        if (firstEmptyIndex !== -1) {
            const newPlaced = [...currentPlaced];
            newPlaced[firstEmptyIndex] = true;
            setPlacedFruits(newPlaced);
            setDragCount(c => c + 1); // Force UI update

            pan.setValue({ x: 0, y: 0 });

            const newCount = currentCount + 1;
            if (newCount === target) {
                // Success!
                setShowConfetti(true);
                setFeedbackMessage('Harika! 🎉');
                setRoundData(prev => [...prev, { round, target, result: 'success' }]);

                setTimeout(() => {
                    setShowConfetti(false);
                    if (round < 10) {
                        setRound(r => r + 1);
                    } else {
                        const duration = Math.floor((Date.now() - startTime) / 1000);
                        onGameEnd('Onluk Çerçeve', duration, 10, mistakes, undefined, {
                            cizimVerisi: JSON.stringify({ roundHistory: roundData }),
                            zorlukSeviyesi: 1,
                            kazanimOdagi: 'MAB.1 Sayı Kompozisyonu',
                            algilananKelime: mistakes === 0 ? 'Mükemmel' : `${mistakes} hata`
                        });
                    }
                }, 1500);
            }
        }
    }, [round, mistakes, startTime, onGameEnd, roundData, pan]);

    const handleFruitDropRef = useRef(handleFruitDrop);
    useEffect(() => {
        handleFruitDropRef.current = handleFruitDrop;
    }, [handleFruitDrop]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.setOffset({ x: 0, y: 0 });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gesture) => {
                pan.flattenOffset();
                const distance = Math.sqrt(gesture.dx ** 2 + gesture.dy ** 2);

                if (distance > 40) {
                    handleFruitDropRef.current();
                } else {
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: false
                    }).start();
                }
            }
        })
    ).current;

    const currentCount = placedFruits.filter(Boolean).length;

    return (
        <View style={[styles.container, isLandscape && styles.containerLandscape]}>
            {showConfetti && <ConfettiCannon count={100} origin={{ x: width / 2, y: 0 }} fadeOut />}

            {/* Header Row - Always at top */}
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={onExit} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreText}>Tur: {round}/10</Text>
                </View>
                <TouchableOpacity onPress={toggleMute} style={styles.soundButton}>
                    <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={18} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Main Content */}
            <View style={[styles.mainContent, isLandscape && styles.mainContentLandscape]}>
                {/* Info Panel */}
                <View style={[styles.infoPanel, isLandscape && styles.infoPanelLandscape]}>
                    <Text style={styles.instructionText}>
                        <Text style={styles.targetNumber}>{targetNumber}</Text> elma topla!
                    </Text>
                    <Text style={styles.countText}>{currentCount} / {targetNumber}</Text>
                    {feedbackMessage && <Text style={styles.feedbackText}>{feedbackMessage}</Text>}
                </View>

                {/* Grid */}
                <View style={styles.gridWrapper}>
                    <View style={styles.gridContainer}>
                        <View style={styles.gridRow}>
                            {[0, 1, 2, 3, 4].map(i => (
                                <View key={i} style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}>
                                    {placedFruits[i] && <Text style={{ fontSize: CELL_SIZE * 0.65 }}>🍎</Text>}
                                </View>
                            ))}
                        </View>
                        <View style={styles.gridRow}>
                            {[5, 6, 7, 8, 9].map(i => (
                                <View key={i} style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}>
                                    {placedFruits[i] && <Text style={{ fontSize: CELL_SIZE * 0.65 }}>🍎</Text>}
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Drag Source */}
                <View style={[styles.dragArea, isLandscape && styles.dragAreaLandscape]}>
                    <Text style={styles.dragLabel}>Elmayı sürükle!</Text>
                    <Animated.View
                        key={dragCount}
                        style={[
                            styles.draggableFruit,
                            { transform: [{ translateX: pan.x }, { translateY: pan.y }] },
                            Platform.OS === 'web' && { userSelect: 'none', cursor: 'grab' } as any
                        ]}
                        {...panResponder.panHandlers}
                    >
                        <Text style={styles.fruitEmoji}>🍎</Text>
                    </Animated.View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E8F5E9',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
    },
    containerLandscape: {
        paddingTop: 10,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        marginBottom: 10,
    },
    backButton: { backgroundColor: '#66BB6A', padding: 8, borderRadius: 20 },
    soundButton: { backgroundColor: '#66BB6A', padding: 8, borderRadius: 20 },
    scoreContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        elevation: 2,
    },
    scoreText: { fontSize: 14, fontWeight: 'bold', color: '#388E3C' },

    mainContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 10,
    },
    mainContentLandscape: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
    },

    infoPanel: {
        alignItems: 'center',
        marginBottom: 10,
    },
    infoPanelLandscape: {
        flex: 0.25,
        justifyContent: 'center',
        marginBottom: 0,
    },
    instructionText: {
        fontSize: 22,
        color: '#2E7D32',
        fontWeight: '700',
    },
    targetNumber: {
        fontSize: 32,
        color: '#C62828',
        fontWeight: 'bold',
    },
    countText: {
        fontSize: 18,
        color: '#558B2F',
        marginTop: 5,
        fontWeight: '600',
    },
    feedbackText: {
        marginTop: 8,
        fontSize: 18,
        color: '#FF6F00',
        fontWeight: 'bold',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },

    gridWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    gridContainer: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 8,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#81C784',
    },
    gridRow: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 4,
    },
    cell: {
        backgroundColor: 'rgba(200,230,201,0.6)',
        borderWidth: 2,
        borderColor: '#A5D6A7',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },

    dragArea: {
        alignItems: 'center',
        paddingVertical: 15,
    },
    dragAreaLandscape: {
        flex: 0.25,
        justifyContent: 'center',
        paddingVertical: 0,
    },
    dragLabel: {
        fontSize: 13,
        color: '#689F38',
        marginBottom: 8,
    },
    draggableFruit: {
        width: 65,
        height: 65,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 35,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        zIndex: 100,
    },
    fruitEmoji: {
        fontSize: 38,
    },
});
