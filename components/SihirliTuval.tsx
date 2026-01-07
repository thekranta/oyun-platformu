import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';

// ============= TYPES =============
interface SihirliTuvalProps {
    onGameEnd: (
        oyunAdi: string,
        sure: number,
        hamle: number,
        hata: number,
        cizimVerisi?: any,
        ekstraVeri?: any
    ) => void;
    onExit: () => void;
}

interface ColorRegion {
    id: string;
    colorNumber: number;
    name: string;
    emoji: string;
    isFilled: boolean;
}

interface MoveData {
    regionId: string;
    selectedColor: number;
    correctColor: number;
    isCorrect: boolean;
    responseTime: number;
    timestamp: number;
}

// ============= CONFIG =============
const { width: screenW, height: screenH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Color palette with claymorphism effect (1-10)
const COLOR_PALETTE = [
    { number: 1, color: '#FF6B6B', name: 'Kırmızı' },
    { number: 2, color: '#4ECDC4', name: 'Turkuaz' },
    { number: 3, color: '#45B7D1', name: 'Mavi' },
    { number: 4, color: '#96CEB4', name: 'Yeşil' },
    { number: 5, color: '#FFEAA7', name: 'Sarı' },
    { number: 6, color: '#DDA0DD', name: 'Mor' },
    { number: 7, color: '#FF8C00', name: 'Turuncu' },
    { number: 8, color: '#87CEEB', name: 'Açık Mavi' },
    { number: 9, color: '#FFB6C1', name: 'Pembe' },
    { number: 10, color: '#98D8C8', name: 'Mint' },
];

// Palm Island illustration regions - simplified grid layout
const PALM_ISLAND_REGIONS: ColorRegion[] = [
    // Row 1 - Sky
    { id: 'sky1', colorNumber: 8, name: 'Gökyüzü', emoji: '☁️', isFilled: false },
    { id: 'sun', colorNumber: 5, name: 'Güneş', emoji: '☀️', isFilled: false },
    { id: 'sky2', colorNumber: 8, name: 'Gökyüzü', emoji: '🌤️', isFilled: false },

    // Row 2 - Palm tree top
    { id: 'leaf1', colorNumber: 4, name: 'Yaprak', emoji: '🌿', isFilled: false },
    { id: 'leaf2', colorNumber: 4, name: 'Yaprak', emoji: '🍃', isFilled: false },
    { id: 'leaf3', colorNumber: 4, name: 'Yaprak', emoji: '🌴', isFilled: false },

    // Row 3 - Trunk and coconuts
    { id: 'coconut1', colorNumber: 7, name: 'Hindistan Cevizi', emoji: '🥥', isFilled: false },
    { id: 'trunk', colorNumber: 7, name: 'Gövde', emoji: '🪵', isFilled: false },
    { id: 'coconut2', colorNumber: 7, name: 'Hindistan Cevizi', emoji: '🥥', isFilled: false },

    // Row 4 - Island
    { id: 'sand1', colorNumber: 5, name: 'Kum', emoji: '🏖️', isFilled: false },
    { id: 'sand2', colorNumber: 5, name: 'Kum', emoji: '⛱️', isFilled: false },
    { id: 'sand3', colorNumber: 5, name: 'Kum', emoji: '🐚', isFilled: false },

    // Row 5 - Water
    { id: 'water1', colorNumber: 3, name: 'Su', emoji: '🌊', isFilled: false },
    { id: 'water2', colorNumber: 3, name: 'Su', emoji: '💧', isFilled: false },
    { id: 'water3', colorNumber: 3, name: 'Su', emoji: '🐠', isFilled: false },
];

// ============= MAIN COMPONENT =============
export default function SihirliTuval({ onGameEnd, onExit }: SihirliTuvalProps) {
    const [regions, setRegions] = useState<ColorRegion[]>(PALM_ISLAND_REGIONS.map(r => ({ ...r })));
    const [selectedColorNumber, setSelectedColorNumber] = useState<number | null>(null);
    const [moveHistory, setMoveHistory] = useState<MoveData[]>([]);
    const [errors, setErrors] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [gameStart] = useState(Date.now());
    const [lastColorSelectTime, setLastColorSelectTime] = useState<number>(Date.now());
    const [score, setScore] = useState(0);
    const [showFeedback, setShowFeedback] = useState<{ type: 'success' | 'error'; regionId: string } | null>(null);
    const [timeLeft, setTimeLeft] = useState(180); // 3 dakika
    const [isGameComplete, setIsGameComplete] = useState(false);

    // Animations
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    const selectedButtonScale = useRef(new Animated.Value(1)).current;

    // Timer
    useEffect(() => {
        if (isGameComplete) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    finishGame();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isGameComplete]);

    // Check game completion
    useEffect(() => {
        const allFilled = regions.every(r => r.isFilled);
        if (allFilled && !isGameComplete) {
            setIsGameComplete(true);
            setTimeout(finishGame, 1500);
        }
    }, [regions]);

    const finishGame = () => {
        const duration = Math.floor((Date.now() - gameStart) / 1000);
        const totalMoves = moveHistory.length;
        const avgResponseTime = moveHistory.length > 0
            ? moveHistory.reduce((sum, m) => sum + m.responseTime, 0) / moveHistory.length
            : 0;

        onGameEnd('sihirli-tuval', duration, totalMoves, errors, undefined, {
            zorlukSeviyesi: 1,
            kazanimOdagi: 'Görsel Motor Koordinasyon ve Sayı Tanıma',
            response_time: Math.round(avgResponseTime),
            correct_answers: correctAnswers,
            round_history: moveHistory,
        });
    };

    const playErrorFeedback = () => {
        // Shake animation
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();

        // Vibration on mobile
        if (Platform.OS !== 'web') {
            Vibration.vibrate(100);
        }
    };

    const playSuccessFeedback = () => {
        // Glow animation
        Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
    };

    const handleColorSelect = useCallback((colorNumber: number) => {
        setSelectedColorNumber(colorNumber);
        setLastColorSelectTime(Date.now());

        // Button press animation
        Animated.sequence([
            Animated.timing(selectedButtonScale, { toValue: 0.9, duration: 50, useNativeDriver: true }),
            Animated.timing(selectedButtonScale, { toValue: 1.1, duration: 100, useNativeDriver: true }),
            Animated.timing(selectedButtonScale, { toValue: 1, duration: 50, useNativeDriver: true }),
        ]).start();
    }, []);

    const handleRegionPress = useCallback((regionId: string) => {
        if (!selectedColorNumber) return;

        const region = regions.find(r => r.id === regionId);
        if (!region || region.isFilled) return;

        const responseTime = Date.now() - lastColorSelectTime;
        const isCorrect = region.colorNumber === selectedColorNumber;

        const moveData: MoveData = {
            regionId,
            selectedColor: selectedColorNumber,
            correctColor: region.colorNumber,
            isCorrect,
            responseTime,
            timestamp: Date.now(),
        };

        setMoveHistory(prev => [...prev, moveData]);

        if (isCorrect) {
            // Correct coloring
            setRegions(prev => prev.map(r =>
                r.id === regionId ? { ...r, isFilled: true } : r
            ));
            setCorrectAnswers(prev => prev + 1);
            setScore(prev => prev + 10);
            playSuccessFeedback();
            setShowFeedback({ type: 'success', regionId });
        } else {
            // Wrong coloring
            setErrors(prev => prev + 1);
            playErrorFeedback();
            setShowFeedback({ type: 'error', regionId });
        }

        // Clear feedback after a short delay
        setTimeout(() => setShowFeedback(null), 500);
        setSelectedColorNumber(null);
    }, [selectedColorNumber, regions, lastColorSelectTime]);

    const getRegionFillColor = (region: ColorRegion): string => {
        if (region.isFilled) {
            const colorData = COLOR_PALETTE.find(c => c.number === region.colorNumber);
            return colorData?.color || '#FFFFFF';
        }
        return '#FFFFFF';
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = regions.filter(r => r.isFilled).length / regions.length;

    return (
        <View style={styles.container}>
            {/* Wood texture background */}
            <View style={styles.woodBackground}>
                {/* Wood grain lines */}
                {[...Array(20)].map((_, i) => (
                    <View key={i} style={[styles.woodGrain, { top: i * 40 + Math.random() * 10 }]} />
                ))}
            </View>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.exitBtn}>
                    <Ionicons name="home" size={24} color="#FFF" />
                </TouchableOpacity>

                {/* Timer (Hourglass style) */}
                <View style={styles.timerContainer}>
                    <Text style={styles.timerIcon}>⏳</Text>
                    <View style={styles.timerBar}>
                        <View style={[styles.timerFill, { width: `${(timeLeft / 180) * 100}%` }]} />
                    </View>
                    <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                </View>

                {/* Score */}
                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreIcon}>🎓</Text>
                    <Text style={styles.scoreText}>{score}</Text>
                </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>🎨 Sihirli Tuval: Sayılarla Boyama</Text>

            {/* Instructions */}
            {!selectedColorNumber && (
                <View style={styles.instructionContainer}>
                    <Text style={styles.instructionText}>👇 Önce aşağıdan bir renk seç!</Text>
                </View>
            )}
            {selectedColorNumber && (
                <View style={styles.instructionContainer}>
                    <Text style={styles.instructionText}>
                        👆 Şimdi "{selectedColorNumber}" numaralı bir bölgeye dokun!
                    </Text>
                </View>
            )}

            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                <Text style={styles.progressText}>{Math.round(progress * 100)}% Tamamlandı</Text>
            </View>

            {/* Canvas area - Grid Layout */}
            <Animated.View style={[
                styles.canvasContainer,
                { transform: [{ translateX: shakeAnim }] }
            ]}>
                <View style={styles.canvasFrame}>
                    <Text style={styles.canvasTitle}>🏝️ Palmiye Adası</Text>
                    <View style={styles.gridContainer}>
                        {regions.map((region, index) => (
                            <TouchableOpacity
                                key={region.id}
                                style={[
                                    styles.gridCell,
                                    { backgroundColor: getRegionFillColor(region) },
                                    showFeedback?.regionId === region.id && (
                                        showFeedback.type === 'success'
                                            ? styles.cellSuccess
                                            : styles.cellError
                                    ),
                                    region.isFilled && styles.cellFilled,
                                ]}
                                onPress={() => handleRegionPress(region.id)}
                                activeOpacity={0.7}
                                disabled={region.isFilled}
                            >
                                <Text style={styles.cellEmoji}>{region.emoji}</Text>
                                {!region.isFilled && (
                                    <View style={styles.cellNumberBadge}>
                                        <Text style={styles.cellNumber}>{region.colorNumber}</Text>
                                    </View>
                                )}
                                {region.isFilled && (
                                    <Text style={styles.checkMark}>✓</Text>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Selected color indicator */}
                {selectedColorNumber && (
                    <View style={styles.selectedIndicator}>
                        <Text style={styles.selectedText}>
                            Seçili: {COLOR_PALETTE.find(c => c.number === selectedColorNumber)?.name}
                        </Text>
                        <View style={[
                            styles.selectedColorPreview,
                            { backgroundColor: COLOR_PALETTE.find(c => c.number === selectedColorNumber)?.color }
                        ]} />
                    </View>
                )}
            </Animated.View>

            {/* Color Palette - Claymorphism style */}
            <View style={styles.paletteContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.paletteScroll}
                >
                    {COLOR_PALETTE.map(colorItem => (
                        <Animated.View
                            key={colorItem.number}
                            style={[
                                selectedColorNumber === colorItem.number && {
                                    transform: [{ scale: selectedButtonScale }]
                                }
                            ]}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.colorButton,
                                    { backgroundColor: colorItem.color },
                                    selectedColorNumber === colorItem.number && styles.colorButtonSelected,
                                ]}
                                onPress={() => handleColorSelect(colorItem.number)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.colorNumber}>{colorItem.number}</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </ScrollView>
            </View>

            {/* Feedback overlay */}
            {showFeedback && (
                <View style={[
                    styles.feedbackOverlay,
                    showFeedback.type === 'success' ? styles.successOverlay : styles.errorOverlay
                ]}>
                    <Text style={styles.feedbackEmoji}>
                        {showFeedback.type === 'success' ? '✨' : '❌'}
                    </Text>
                </View>
            )}

            {/* Game complete overlay */}
            {isGameComplete && (
                <View style={styles.completeOverlay}>
                    <View style={styles.completeCard}>
                        <Text style={styles.completeEmoji}>🎉</Text>
                        <Text style={styles.completeTitle}>Harika!</Text>
                        <Text style={styles.completeText}>Resmi tamamladın!</Text>
                        <Text style={styles.completeScore}>Puan: {score}</Text>
                    </View>
                </View>
            )}
        </View>
    );
}

// ============= STYLES =============
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#8B4513',
    },
    woodBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#A0522D',
        overflow: 'hidden',
    },
    woodGrain: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(139, 69, 19, 0.3)',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'web' ? 15 : 50,
        paddingHorizontal: 15,
        paddingBottom: 10,
        zIndex: 20,
    },
    exitBtn: {
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
    },
    timerIcon: {
        fontSize: 20,
    },
    timerBar: {
        width: 80,
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    timerFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 4,
    },
    timerText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    scoreIcon: {
        fontSize: 20,
    },
    scoreText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },

    // Title
    title: {
        fontSize: isWeb ? 24 : 20,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
        marginVertical: 5,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },

    // Instructions
    instructionContainer: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        marginHorizontal: 20,
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 15,
        marginBottom: 5,
    },
    instructionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },

    // Progress
    progressContainer: {
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 20,
        borderRadius: 10,
        marginBottom: 10,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    progressFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#4CAF50',
        borderRadius: 10,
    },
    progressText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
    },

    // Canvas
    canvasContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 15,
    },
    canvasFrame: {
        backgroundColor: '#FFFAF0',
        borderRadius: 15,
        padding: 15,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        borderWidth: 8,
        borderColor: '#DEB887',
        width: isWeb ? 400 : screenW - 40,
    },
    canvasTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        marginBottom: 10,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
    },
    gridCell: {
        width: isWeb ? 100 : (screenW - 100) / 3,
        height: isWeb ? 80 : 70,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#DDD',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    cellFilled: {
        borderColor: '#4CAF50',
        borderWidth: 3,
    },
    cellSuccess: {
        borderColor: '#4CAF50',
        borderWidth: 4,
    },
    cellError: {
        borderColor: '#F44336',
        borderWidth: 4,
    },
    cellEmoji: {
        fontSize: 28,
    },
    cellNumberBadge: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(0,0,0,0.7)',
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cellNumber: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFF',
    },
    checkMark: {
        position: 'absolute',
        top: 5,
        right: 5,
        fontSize: 16,
        color: '#4CAF50',
        fontWeight: 'bold',
    },
    selectedIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 10,
    },
    selectedText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    selectedColorPreview: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#333',
    },

    // Palette - Claymorphism
    paletteContainer: {
        paddingVertical: 15,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    paletteScroll: {
        paddingHorizontal: 15,
        gap: 10,
    },
    colorButton: {
        width: isWeb ? 60 : 55,
        height: isWeb ? 60 : 55,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        // Claymorphism effect
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.5)',
        marginHorizontal: 5,
    },
    colorButtonSelected: {
        borderColor: '#333',
        borderWidth: 4,
        transform: [{ scale: 1.1 }],
    },
    colorNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },

    // Feedback
    feedbackOverlay: {
        position: 'absolute',
        top: '40%',
        left: '40%',
        right: '40%',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    successOverlay: {},
    errorOverlay: {},
    feedbackEmoji: {
        fontSize: 60,
    },

    // Complete
    completeOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200,
    },
    completeCard: {
        backgroundColor: '#FFF',
        borderRadius: 25,
        padding: 30,
        alignItems: 'center',
        elevation: 20,
    },
    completeEmoji: {
        fontSize: 60,
        marginBottom: 10,
    },
    completeTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginBottom: 5,
    },
    completeText: {
        fontSize: 18,
        color: '#666',
        marginBottom: 10,
    },
    completeScore: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
});
