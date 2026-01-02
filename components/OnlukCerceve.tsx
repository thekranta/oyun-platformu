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
    const { width, height } = Dimensions.get('window');
    const isLandscape = width > height;
    const isSmallScreen = Math.min(width, height) < 400;

    // Responsive sizing
    const CELL_SIZE = isLandscape
        ? Math.min((height - 200) / 3, 55)
        : Math.min((width - 80) / 5, 60);

    const { isMuted, toggleMute } = useSound();

    // İlk hedef sayıyı hemen hesapla (useState içinde)
    const getInitialTarget = () => Math.floor(Math.random() * 5) + 1;

    const [round, setRound] = useState(1);
    const [targetNumber, setTargetNumber] = useState(getInitialTarget);
    const [placedFruits, setPlacedFruits] = useState<boolean[]>(Array(10).fill(false));
    const [mistakes, setMistakes] = useState(0);
    const [startTime] = useState(Date.now());
    const [roundData, setRoundData] = useState<any[]>([]);
    const [showConfetti, setShowConfetti] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    const pan = useRef(new Animated.ValueXY()).current;
    const [draggedFruitOpacity, setDraggedFruitOpacity] = useState(1);

    // Round değiştiğinde yeni hedef belirle
    useEffect(() => {
        if (round > 1) {
            startNewRound();
        }
    }, [round]);

    const startNewRound = useCallback(() => {
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
    }, [round, pan]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.setOffset({
                    x: (pan.x as any)._value,
                    y: (pan.y as any)._value
                });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gestureState) => {
                pan.flattenOffset();

                // Herhangi bir yöne yeterince sürüklediyse kabul et (sadece yukarı değil)
                const totalDistance = Math.sqrt(gestureState.dx ** 2 + gestureState.dy ** 2);

                if (totalDistance > 50) {
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

        // DEBUG: Konsola yazdır
        console.log('Drop attempt:', { currentCount, targetNumber, placedFruits });

        // HATA DÜZELTMESİ: >= değil > kullan (hedef sayıya ulaşana kadar izin ver)
        if (currentCount >= targetNumber) {
            setFeedbackMessage('Tamamlandı! ✓');

            Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: false
            }).start();

            setTimeout(() => setFeedbackMessage(null), 1000);
            return;
        }

        const firstEmptyIndex = placedFruits.findIndex(x => !x);
        if (firstEmptyIndex !== -1) {
            const newPlaced = [...placedFruits];
            newPlaced[firstEmptyIndex] = true;
            setPlacedFruits(newPlaced);

            // Meyveyi geri döndür
            setDraggedFruitOpacity(0);
            pan.setValue({ x: 0, y: 0 });
            setTimeout(() => setDraggedFruitOpacity(1), 100);

            const newCount = currentCount + 1;
            if (newCount === targetNumber) {
                handleSuccess();
            }
        } else {
            // Hiç boş hücre kalmadı
            Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: false
            }).start();
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
        }, 1800);
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

    // Dynamic styles for landscape
    const dynamicStyles = {
        container: {
            flexDirection: isLandscape ? 'row' as const : 'column' as const,
        },
        gameArea: {
            flex: isLandscape ? 1 : undefined,
        }
    };

    return (
        <View style={[styles.container, dynamicStyles.container]}>
            {showConfetti && <ConfettiCannon count={120} origin={{ x: width / 2, y: 0 }} fadeOut />}

            {/* Left/Top Section */}
            <View style={[styles.topSection, isLandscape && styles.leftSection]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onExit} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.scoreContainer}>
                        <Text style={styles.scoreText}>Tur: {round}/10</Text>
                    </View>
                    <TouchableOpacity onPress={toggleMute} style={styles.soundButton}>
                        <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={18} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Instruction */}
                <View style={styles.instructionContainer}>
                    <Text style={[styles.instructionText, isSmallScreen && { fontSize: 20 }]}>
                        <Text style={styles.targetNumber}>{targetNumber}</Text> elma topla!
                    </Text>
                    <Text style={styles.countText}>{currentCount} / {targetNumber}</Text>
                    {feedbackMessage && (
                        <Text style={styles.feedbackText}>{feedbackMessage}</Text>
                    )}
                </View>
            </View>

            {/* Grid Area */}
            <View style={[styles.gridWrapper, dynamicStyles.gameArea]}>
                <View style={[styles.gridContainer, { padding: isLandscape ? 8 : 12 }]}>
                    <View style={styles.gridRow}>
                        {[0, 1, 2, 3, 4].map(i => (
                            <View key={i} style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}>
                                {placedFruits[i] && <Text style={[styles.fruitEmoji, { fontSize: CELL_SIZE * 0.7 }]}>🍎</Text>}
                            </View>
                        ))}
                    </View>
                    <View style={styles.gridRow}>
                        {[5, 6, 7, 8, 9].map(i => (
                            <View key={i} style={[styles.cell, { width: CELL_SIZE, height: CELL_SIZE }]}>
                                {placedFruits[i] && <Text style={[styles.fruitEmoji, { fontSize: CELL_SIZE * 0.7 }]}>🍎</Text>}
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            {/* Drag Source */}
            <View style={[styles.basketArea, isLandscape && styles.basketAreaLandscape]}>
                <Text style={styles.basketLabel}>Elmayı sürükle!</Text>

                <Animated.View
                    style={[
                        styles.draggableFruit,
                        {
                            transform: [{ translateX: pan.x }, { translateY: pan.y }],
                            opacity: draggedFruitOpacity,
                        },
                        // Web'de metin seçimini engelle
                        Platform.OS === 'web' && { userSelect: 'none', cursor: 'grab' } as any
                    ]}
                    {...panResponder.panHandlers}
                >
                    <Text style={[styles.bigFruit, Platform.OS === 'web' && { userSelect: 'none' } as any]}>🍎</Text>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E8F5E9',
        paddingTop: Platform.OS === 'ios' ? 50 : 25,
    },
    topSection: {
        paddingHorizontal: 15,
    },
    leftSection: {
        flex: 0.4,
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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

    instructionContainer: {
        alignItems: 'center',
        marginBottom: 10,
    },
    instructionText: {
        fontSize: 24,
        color: '#2E7D32',
        fontWeight: '700',
    },
    targetNumber: {
        fontSize: 34,
        color: '#C62828',
        fontWeight: 'bold',
    },
    countText: {
        fontSize: 16,
        color: '#558B2F',
        marginTop: 3,
        fontWeight: '600',
    },
    feedbackText: {
        marginTop: 6,
        fontSize: 18,
        color: '#FF6F00',
        fontWeight: 'bold',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 8,
    },

    gridWrapper: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
    },
    gridContainer: {
        backgroundColor: 'rgba(255,255,255,0.9)',
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
    fruitEmoji: {
        // fontSize dynamic
    },

    basketArea: {
        alignItems: 'center',
        paddingBottom: 30,
        paddingTop: 15,
    },
    basketAreaLandscape: {
        flex: 0.3,
        justifyContent: 'center',
        paddingBottom: 0,
    },
    basketLabel: {
        fontSize: 13,
        color: '#689F38',
        marginBottom: 8,
    },
    draggableFruit: {
        width: 70,
        height: 70,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 35,
        elevation: 6,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 5,
        zIndex: 100,
    },
    bigFruit: {
        fontSize: 42,
    },
});
