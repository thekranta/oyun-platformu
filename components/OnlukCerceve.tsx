import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
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

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 400;
const CELL_SIZE = isSmallScreen ? (width - 80) / 5 : 60;
const FRUIT_SIZE = CELL_SIZE * 0.75;

export default function OnlukCerceve({ onGameEnd, onExit }: OnlukCerceveProps) {
    const { isMuted, toggleMute } = useSound();
    const [round, setRound] = useState(1);
    const [targetNumber, setTargetNumber] = useState(0);
    const [placedFruits, setPlacedFruits] = useState<boolean[]>(Array(10).fill(false));
    const [mistakes, setMistakes] = useState(0);
    const [startTime] = useState(Date.now());
    const [roundData, setRoundData] = useState<any[]>([]);
    const [showConfetti, setShowConfetti] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    // Draggable Fruit State
    const pan = useRef(new Animated.ValueXY()).current;
    const [draggedFruitOpacity, setDraggedFruitOpacity] = useState(1);

    useEffect(() => {
        startRound();
    }, [round]);

    const startRound = () => {
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

        if (newTarget === targetNumber && round > 1) {
            newTarget = newTarget === 10 ? 9 : newTarget + 1;
        }
        setTargetNumber(newTarget);
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.setOffset({
                    x: (pan.x as any)._value,
                    y: (pan.y as any)._value
                });
                pan.setValue({ x: 0, y: 0 });
                setDraggedFruitOpacity(1);
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gestureState) => {
                pan.flattenOffset();

                // Yukarı sürüklediyse kabul
                if (gestureState.dy < -60) {
                    handleFruitDrop();
                } else {
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: false
                    }).start();
                }
            }
        })
    ).current;

    const handleFruitDrop = () => {
        const currentCount = placedFruits.filter(Boolean).length;

        if (currentCount >= targetNumber) {
            setFeedbackMessage('Yeter bu kadar! 🚫');
            setMistakes(m => m + 1);

            Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: false
            }).start();

            setTimeout(() => setFeedbackMessage(null), 1200);
            return;
        }

        const firstEmptyIndex = placedFruits.findIndex(x => !x);
        if (firstEmptyIndex !== -1) {
            const newPlaced = [...placedFruits];
            newPlaced[firstEmptyIndex] = true;
            setPlacedFruits(newPlaced);

            setDraggedFruitOpacity(0);
            pan.setValue({ x: 0, y: 0 });
            setTimeout(() => setDraggedFruitOpacity(1), 80);

            const newCount = currentCount + 1;
            if (newCount === targetNumber) {
                handleSuccess();
            }
        }
    };

    const handleSuccess = () => {
        setShowConfetti(true);
        setFeedbackMessage('Harika! 🎉');

        setRoundData(prev => [...prev, {
            round,
            target: targetNumber,
            result: 'success',
        }]);

        setTimeout(() => {
            setShowConfetti(false);
            if (round < 10) {
                setRound(r => r + 1);
            } else {
                finishGame();
            }
        }, 2000);
    };

    const finishGame = () => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const extraData = {
            cizimVerisi: JSON.stringify({ roundHistory: roundData }),
            zorlukSeviyesi: 1,
            kazanimOdagi: 'MAB.1 Sayı Kompozisyonu',
            algilananKelime: mistakes === 0 ? 'Mükemmel' : `${mistakes} hata`
        };
        onGameEnd('Onluk Çerçeve', duration, 10, mistakes, undefined, extraData);
    };

    const currentCount = placedFruits.filter(Boolean).length;

    return (
        <View style={styles.container}>
            {showConfetti && <ConfettiCannon count={150} origin={{ x: width / 2, y: 0 }} fadeOut />}

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreText}>Tur: {round}/10</Text>
                </View>
                <TouchableOpacity onPress={toggleMute} style={styles.soundButton}>
                    <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Instruction */}
            <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>
                    <Text style={styles.targetNumber}>{targetNumber}</Text> elma topla!
                </Text>
                <Text style={styles.countText}>{currentCount} / {targetNumber}</Text>
                {feedbackMessage && (
                    <Text style={styles.feedbackText}>{feedbackMessage}</Text>
                )}
            </View>

            {/* Ten Frame Grid */}
            <View style={styles.gridWrapper}>
                <View style={styles.gridContainer}>
                    <View style={styles.gridRow}>
                        {[0, 1, 2, 3, 4].map(i => (
                            <View key={i} style={styles.cell}>
                                {placedFruits[i] && <Text style={styles.fruitEmoji}>🍎</Text>}
                            </View>
                        ))}
                    </View>
                    <View style={styles.gridRow}>
                        {[5, 6, 7, 8, 9].map(i => (
                            <View key={i} style={styles.cell}>
                                {placedFruits[i] && <Text style={styles.fruitEmoji}>🍎</Text>}
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            {/* Drag Source */}
            <View style={styles.basketArea}>
                <Text style={styles.basketLabel}>Elmayı yukarı sürükle!</Text>

                <Animated.View
                    style={[
                        styles.draggableFruit,
                        {
                            transform: [{ translateX: pan.x }, { translateY: pan.y }],
                            opacity: draggedFruitOpacity,
                        }
                    ]}
                    {...panResponder.panHandlers}
                >
                    <Text style={styles.bigFruit}>🍎</Text>
                </Animated.View>

                {/* Decorative apples */}
                <View style={styles.decorativeApples}>
                    <Text style={styles.smallFruit}>🍎</Text>
                    <Text style={styles.smallFruit}>🍎</Text>
                    <Text style={styles.smallFruit}>🍎</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E8F5E9',
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        marginBottom: 15,
    },
    backButton: { backgroundColor: '#66BB6A', padding: 10, borderRadius: 25 },
    soundButton: { backgroundColor: '#66BB6A', padding: 10, borderRadius: 25 },
    scoreContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        elevation: 3,
    },
    scoreText: { fontSize: 16, fontWeight: 'bold', color: '#388E3C' },

    instructionContainer: {
        alignItems: 'center',
        marginBottom: 15,
    },
    instructionText: {
        fontSize: isSmallScreen ? 22 : 28,
        color: '#2E7D32',
        fontWeight: '700',
    },
    targetNumber: {
        fontSize: isSmallScreen ? 32 : 40,
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
        fontSize: 20,
        color: '#FF6F00',
        fontWeight: 'bold',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 10,
    },

    gridWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gridContainer: {
        backgroundColor: 'rgba(255,255,255,0.85)',
        padding: 12,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: '#81C784',
    },
    gridRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 6,
    },
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: 'rgba(200,230,201,0.5)',
        borderWidth: 2,
        borderColor: '#A5D6A7',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fruitEmoji: {
        fontSize: FRUIT_SIZE,
    },

    basketArea: {
        alignItems: 'center',
        paddingBottom: 40,
        paddingTop: 20,
    },
    basketLabel: {
        fontSize: 14,
        color: '#689F38',
        marginBottom: 10,
    },
    draggableFruit: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderRadius: 40,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        zIndex: 100,
    },
    bigFruit: {
        fontSize: 50,
    },
    decorativeApples: {
        flexDirection: 'row',
        gap: 5,
        marginTop: 10,
        opacity: 0.5,
    },
    smallFruit: {
        fontSize: 24,
    },
});
