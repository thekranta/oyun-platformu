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
import Svg, { Circle, Ellipse, G, Path, Text as SvgText } from 'react-native-svg';

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
    pathType: 'path' | 'circle' | 'ellipse';
    d?: string;
    cx?: number;
    cy?: number;
    r?: number;
    rx?: number;
    ry?: number;
    strokeWidth?: number;
    labelX: number;
    labelY: number;
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

// Color palette 1-10 with vibrant colors
const COLOR_PALETTE = [
    { number: 1, color: '#1a1a4e', name: 'Lacivert' },      // Uzay Boşluğu
    { number: 2, color: '#FFD700', name: 'Sarı' },          // Büyük Ay
    { number: 3, color: '#DAA520', name: 'Altın' },         // Yıldızlar
    { number: 4, color: '#DC143C', name: 'Kırmızı' },       // Roket Gövdesi
    { number: 5, color: '#C0C0C0', name: 'Gümüş' },         // Roket Burnu
    { number: 6, color: '#708090', name: 'Gri' },           // Roket Kanatları
    { number: 7, color: '#87CEEB', name: 'Açık Mavi' },     // Pencere
    { number: 8, color: '#FF8C00', name: 'Turuncu' },       // Roket Ateşi (Dış)
    { number: 9, color: '#FF4500', name: 'Koyu Turuncu' },  // Roket Ateşi (İç)
    { number: 10, color: '#9932CC', name: 'Mor' },          // Gezegen
];

// Uzay Serüveni SVG Regions
const SPACE_ADVENTURE_REGIONS: ColorRegion[] = [
    // 1. Uzay Boşluğu (Arka Plan)
    {
        id: 'space',
        colorNumber: 1,
        pathType: 'path',
        d: 'M0 0 L400 0 L400 400 L0 400 Z',
        strokeWidth: 2,
        labelX: 20,
        labelY: 30,
        isFilled: false
    },
    // 2. Büyük Ay
    {
        id: 'moon',
        colorNumber: 2,
        pathType: 'circle',
        cx: 330,
        cy: 70,
        r: 50,
        strokeWidth: 2,
        labelX: 330,
        labelY: 75,
        isFilled: false
    },
    // 3. Yıldız 1
    {
        id: 'star1',
        colorNumber: 3,
        pathType: 'path',
        d: 'M50 50 l5 15 h15 l-12 10 l5 15 l-13-10 l-13 10 l5-15 l-12-10 h15 z',
        labelX: 50,
        labelY: 55,
        isFilled: false
    },
    // 3. Yıldız 2 (aynı numara)
    {
        id: 'star2',
        colorNumber: 3,
        pathType: 'path',
        d: 'M300 300 l3 8 h8 l-7 5 l3 8 l-7-5 l-7 5 l3-8 l-7-5 h8 z',
        labelX: 300,
        labelY: 305,
        isFilled: false
    },
    // 4. Roket Gövdesi
    {
        id: 'rocket-body',
        colorNumber: 4,
        pathType: 'path',
        d: 'M150 300 Q200 100 250 300 Z',
        strokeWidth: 2,
        labelX: 200,
        labelY: 240,
        isFilled: false
    },
    // 5. Roket Burnu
    {
        id: 'rocket-nose',
        colorNumber: 5,
        pathType: 'path',
        d: 'M175 125 Q200 75 225 125 Z',
        labelX: 200,
        labelY: 105,
        isFilled: false
    },
    // 6. Roket Kanatları
    {
        id: 'rocket-wings',
        colorNumber: 6,
        pathType: 'path',
        d: 'M150 250 L120 300 L150 300 Z M250 250 L280 300 L250 300 Z',
        labelX: 120,
        labelY: 280,
        isFilled: false
    },
    // 7. Pencere
    {
        id: 'window',
        colorNumber: 7,
        pathType: 'circle',
        cx: 200,
        cy: 180,
        r: 25,
        labelX: 200,
        labelY: 185,
        isFilled: false
    },
    // 8. Roket Ateşi (Dış)
    {
        id: 'flame-outer',
        colorNumber: 8,
        pathType: 'path',
        d: 'M170 300 Q200 380 230 300 Z',
        labelX: 200,
        labelY: 350,
        isFilled: false
    },
    // 9. Roket Ateşi (İç)
    {
        id: 'flame-inner',
        colorNumber: 9,
        pathType: 'path',
        d: 'M185 300 Q200 340 215 300 Z',
        labelX: 200,
        labelY: 325,
        isFilled: false
    },
    // 10. Gezegen (Satürn)
    {
        id: 'planet',
        colorNumber: 10,
        pathType: 'circle',
        cx: 70,
        cy: 330,
        r: 30,
        labelX: 70,
        labelY: 335,
        isFilled: false
    },
];

// ============= MAIN COMPONENT =============
export default function SihirliTuval({ onGameEnd, onExit }: SihirliTuvalProps) {
    const [regions, setRegions] = useState<ColorRegion[]>(SPACE_ADVENTURE_REGIONS.map(r => ({ ...r })));
    const [selectedColorNumber, setSelectedColorNumber] = useState<number | null>(null);
    const [moveHistory, setMoveHistory] = useState<MoveData[]>([]);
    const [errors, setErrors] = useState(0);
    const [correctAnswers, setCorrectAnswers] = useState(0);
    const [gameStart] = useState(Date.now());
    const [lastColorSelectTime, setLastColorSelectTime] = useState<number>(Date.now());
    const [score, setScore] = useState(0);
    const [showFeedback, setShowFeedback] = useState<{ type: 'success' | 'error'; regionId: string } | null>(null);
    const [timeLeft, setTimeLeft] = useState(300); // 5 dakika
    const [isGameComplete, setIsGameComplete] = useState(false);
    const [cognitiveSpeed, setCognitiveSpeed] = useState(0);

    // Animations
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const flashAnim = useRef(new Animated.Value(0)).current;
    const selectedButtonScale = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Pulse animation for selected button
    useEffect(() => {
        if (selectedColorNumber) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [selectedColorNumber]);

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

    // Calculate cognitive speed whenever correctAnswers changes
    useEffect(() => {
        const elapsedTime = (Date.now() - gameStart) / 1000;
        if (elapsedTime > 0 && correctAnswers > 0) {
            const speed = correctAnswers / elapsedTime;
            setCognitiveSpeed(Math.round(speed * 100) / 100);
        }
    }, [correctAnswers, gameStart]);

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

        const finalCognitiveSpeed = duration > 0 ? correctAnswers / duration : 0;

        onGameEnd('sihirli-tuval', duration, totalMoves, errors, undefined, {
            zorlukSeviyesi: 1,
            kazanimOdagi: 'Görsel Dikkat ve Sembolik Eşleme (MAB.2.1)',
            response_time: Math.round(avgResponseTime),
            correct_answers: correctAnswers,
            cognitive_speed_score: Math.round(finalCognitiveSpeed * 1000) / 1000,
            round_history: moveHistory,
        });
    };

    const playErrorFeedback = () => {
        // Red flash animation
        Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: false }),
            Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
        ]).start();

        // Shake animation
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 20, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -20, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 20, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -20, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();

        if (Platform.OS !== 'web') {
            Vibration.vibrate(150);
        }
    };

    const playSuccessFeedback = () => {
        Animated.sequence([
            Animated.timing(selectedButtonScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
            Animated.timing(selectedButtonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
    };

    const handleColorSelect = useCallback((colorNumber: number) => {
        setSelectedColorNumber(colorNumber);
        setLastColorSelectTime(Date.now());

        Animated.sequence([
            Animated.timing(selectedButtonScale, { toValue: 0.85, duration: 50, useNativeDriver: true }),
            Animated.timing(selectedButtonScale, { toValue: 1.15, duration: 100, useNativeDriver: true }),
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
            // Aynı numaraya sahip TÜM bölgeleri boya
            setRegions(prev => prev.map(r =>
                r.colorNumber === selectedColorNumber ? { ...r, isFilled: true } : r
            ));
            // Kaç bölge boyandı say
            const filledCount = regions.filter(r => r.colorNumber === selectedColorNumber).length;
            setCorrectAnswers(prev => prev + filledCount);
            setScore(prev => prev + (10 * filledCount));
            playSuccessFeedback();
            setShowFeedback({ type: 'success', regionId });
        } else {
            setErrors(prev => prev + 1);
            playErrorFeedback();
            setShowFeedback({ type: 'error', regionId });
        }

        setTimeout(() => setShowFeedback(null), 500);
        setSelectedColorNumber(null);
    }, [selectedColorNumber, regions, lastColorSelectTime]);

    const getRegionFillColor = (region: ColorRegion): string => {
        if (region.isFilled) {
            const colorData = COLOR_PALETTE.find(c => c.number === region.colorNumber);
            return colorData?.color || '#FFFFFF';
        }
        return '#FCFCFC';
    };

    const getRegionStroke = (region: ColorRegion): string => {
        if (showFeedback?.regionId === region.id) {
            return showFeedback.type === 'success' ? '#00FF00' : '#FF0000';
        }
        return '#333333';
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Unique color numbers için progress hesapla
    const uniqueColorNumbers = [...new Set(SPACE_ADVENTURE_REGIONS.map(r => r.colorNumber))];
    const filledColorNumbers = [...new Set(regions.filter(r => r.isFilled).map(r => r.colorNumber))];
    const progress = filledColorNumbers.length / uniqueColorNumbers.length;

    const flashOpacity = flashAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.4],
    });

    const svgWidth = isWeb ? 380 : screenW - 50;
    const svgHeight = isWeb ? 380 : screenW - 50;

    return (
        <View style={styles.container}>
            {/* Dark Wood texture background */}
            <View style={styles.woodBackground}>
                {[...Array(30)].map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.woodGrain,
                            {
                                top: i * 28,
                                opacity: 0.2 + (i % 4) * 0.08,
                                height: 2 + (i % 3),
                            }
                        ]}
                    />
                ))}
            </View>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.exitBtn}>
                    <Ionicons name="home" size={22} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.timerContainer}>
                    <Text style={styles.timerIcon}>🚀</Text>
                    <View style={styles.timerBar}>
                        <View style={[styles.timerFill, { width: `${(timeLeft / 300) * 100}%` }]} />
                    </View>
                    <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
                </View>

                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreIcon}>⭐</Text>
                    <Text style={styles.scoreText}>{score}</Text>
                </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>🌌 Uzay Serüveni: Sayılarla Boyama</Text>

            {/* Instructions */}
            <View style={styles.instructionContainer}>
                {!selectedColorNumber ? (
                    <Text style={styles.instructionText}>👇 Aşağıdan bir numara seç!</Text>
                ) : (
                    <Text style={styles.instructionText}>
                        🎯 <Text style={[styles.numberHighlight, { color: COLOR_PALETTE.find(c => c.number === selectedColorNumber)?.color }]}>
                            {selectedColorNumber}
                        </Text> numaralı alana dokun!
                    </Text>
                )}
            </View>

            {/* Progress bar */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                <Text style={styles.progressText}>{Math.round(progress * 100)}% Tamamlandı</Text>
            </View>

            {/* SVG Canvas */}
            <Animated.View style={[
                styles.canvasContainer,
                { transform: [{ translateX: shakeAnim }] }
            ]}>
                <Animated.View
                    style={[styles.flashOverlay, { opacity: flashOpacity }]}
                    pointerEvents="none"
                />

                <View style={styles.canvasFrame}>
                    <Svg
                        width={svgWidth}
                        height={svgHeight}
                        viewBox="0 0 400 400"
                        style={styles.svgCanvas}
                    >
                        {/* Render all regions - order matters for layering */}
                        {regions.map(region => (
                            <G key={region.id}>
                                {region.pathType === 'path' && (
                                    <Path
                                        d={region.d}
                                        fill={getRegionFillColor(region)}
                                        stroke={getRegionStroke(region)}
                                        strokeWidth={region.strokeWidth || 1.5}
                                        onPress={() => handleRegionPress(region.id)}
                                    />
                                )}
                                {region.pathType === 'circle' && (
                                    <Circle
                                        cx={region.cx}
                                        cy={region.cy}
                                        r={region.r}
                                        fill={getRegionFillColor(region)}
                                        stroke={getRegionStroke(region)}
                                        strokeWidth={region.strokeWidth || 1.5}
                                        onPress={() => handleRegionPress(region.id)}
                                    />
                                )}
                                {/* Number label */}
                                {!region.isFilled && (
                                    <SvgText
                                        x={region.labelX}
                                        y={region.labelY}
                                        fontSize={16}
                                        fontWeight="bold"
                                        fill="#888"
                                        textAnchor="middle"
                                        onPress={() => handleRegionPress(region.id)}
                                    >
                                        {region.colorNumber}
                                    </SvgText>
                                )}
                                {region.isFilled && (
                                    <SvgText
                                        x={region.labelX}
                                        y={region.labelY}
                                        fontSize={18}
                                        fill={region.colorNumber === 1 ? '#FFF' : '#FFF'}
                                        textAnchor="middle"
                                    >
                                        ✓
                                    </SvgText>
                                )}
                            </G>
                        ))}

                        {/* Saturn ring - decorative, always visible */}
                        <Ellipse
                            cx={70}
                            cy={330}
                            rx={50}
                            ry={10}
                            fill="none"
                            stroke={regions.find(r => r.id === 'planet')?.isFilled ? '#7B68EE' : '#333'}
                            strokeWidth={2}
                        />
                    </Svg>
                </View>

                {/* Selected color indicator */}
                {selectedColorNumber && (
                    <Animated.View style={[styles.selectedIndicator, { transform: [{ scale: pulseAnim }] }]}>
                        <Text style={styles.selectedText}>
                            {COLOR_PALETTE.find(c => c.number === selectedColorNumber)?.name}
                        </Text>
                        <View style={[
                            styles.selectedColorPreview,
                            { backgroundColor: COLOR_PALETTE.find(c => c.number === selectedColorNumber)?.color }
                        ]}>
                            <Text style={styles.selectedNumber}>{selectedColorNumber}</Text>
                        </View>
                    </Animated.View>
                )}
            </Animated.View>

            {/* Color Palette - Claymorphism style */}
            <View style={styles.paletteContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.paletteScroll}
                >
                    {COLOR_PALETTE.map(colorItem => {
                        const isColored = regions.some(r => r.colorNumber === colorItem.number && r.isFilled);
                        return (
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
                                        isColored && styles.colorButtonUsed,
                                    ]}
                                    onPress={() => handleColorSelect(colorItem.number)}
                                    activeOpacity={0.7}
                                    disabled={isColored}
                                >
                                    <Text style={[
                                        styles.colorNumber,
                                        colorItem.number === 1 && { color: '#FFF' }
                                    ]}>
                                        {isColored ? '✓' : colorItem.number}
                                    </Text>
                                </TouchableOpacity>
                                <Text style={styles.colorName} numberOfLines={1}>{colorItem.name}</Text>
                            </Animated.View>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Stats overlay */}
            <View style={styles.statsOverlay}>
                <Text style={styles.statText}>✅ {correctAnswers}</Text>
                <Text style={styles.statText}>❌ {errors}</Text>
                <Text style={styles.statText}>⚡ {cognitiveSpeed.toFixed(2)}</Text>
            </View>

            {/* Feedback emoji */}
            {showFeedback && (
                <View style={styles.feedbackOverlay}>
                    <Text style={styles.feedbackEmoji}>
                        {showFeedback.type === 'success' ? '🌟' : '💥'}
                    </Text>
                </View>
            )}

            {/* Game complete overlay */}
            {isGameComplete && (
                <View style={styles.completeOverlay}>
                    <View style={styles.completeCard}>
                        <Text style={styles.completeEmoji}>🚀🎉</Text>
                        <Text style={styles.completeTitle}>Uzay Görevi Tamamlandı!</Text>
                        <Text style={styles.completeText}>Harika bir astronot oldun!</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Puan</Text>
                                <Text style={styles.statValue}>{score}</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Doğru</Text>
                                <Text style={[styles.statValue, { color: '#4CAF50' }]}>{correctAnswers}</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Hata</Text>
                                <Text style={[styles.statValue, { color: '#F44336' }]}>{errors}</Text>
                            </View>
                        </View>
                        <Text style={styles.cognitiveLabel}>
                            ⚡ Bilişsel Hız: {cognitiveSpeed.toFixed(3)}
                        </Text>
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
        backgroundColor: '#1a0a00',
    },
    woodBackground: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#2d1810',
        overflow: 'hidden',
    },
    woodGrain: {
        position: 'absolute',
        left: 0,
        right: 0,
        backgroundColor: '#1a0a00',
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'web' ? 12 : 48,
        paddingHorizontal: 12,
        paddingBottom: 8,
        zIndex: 20,
    },
    exitBtn: {
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 18,
        gap: 6,
        elevation: 5,
    },
    timerIcon: {
        fontSize: 16,
    },
    timerBar: {
        width: 50,
        height: 6,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        overflow: 'hidden',
    },
    timerFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 3,
    },
    timerText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 18,
        gap: 4,
        elevation: 5,
    },
    scoreIcon: {
        fontSize: 16,
    },
    scoreText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },

    // Title
    title: {
        fontSize: isWeb ? 22 : 17,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
        marginVertical: 4,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
    },

    // Instructions
    instructionContainer: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        marginHorizontal: 15,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginBottom: 6,
        elevation: 3,
    },
    instructionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },
    numberHighlight: {
        fontWeight: 'bold',
        fontSize: 18,
    },

    // Progress
    progressContainer: {
        height: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginHorizontal: 15,
        borderRadius: 9,
        marginBottom: 8,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    progressFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#FFD700',
        borderRadius: 9,
    },
    progressText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },

    // Canvas
    canvasContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        position: 'relative',
    },
    flashOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FF0000',
        borderRadius: 15,
        zIndex: 10,
    },
    canvasFrame: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 8,
        elevation: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        borderWidth: 5,
        borderColor: '#8B4513',
    },
    svgCanvas: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
    },
    selectedIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 10,
        elevation: 5,
    },
    selectedText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    selectedColorPreview: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 3,
        borderColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },

    // Palette - Claymorphism
    paletteContainer: {
        paddingVertical: 12,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    paletteScroll: {
        paddingHorizontal: 10,
    },
    colorButton: {
        width: isWeb ? 58 : 52,
        height: isWeb ? 58 : 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 5,
        // Claymorphism
        shadowColor: '#000',
        shadowOffset: { width: 5, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 10,
        borderWidth: 3,
        borderTopColor: 'rgba(255,255,255,0.5)',
        borderLeftColor: 'rgba(255,255,255,0.5)',
        borderRightColor: 'rgba(0,0,0,0.2)',
        borderBottomColor: 'rgba(0,0,0,0.25)',
    },
    colorButtonSelected: {
        borderColor: '#FFD700',
        borderWidth: 4,
        transform: [{ scale: 1.15 }],
    },
    colorButtonUsed: {
        opacity: 0.5,
    },
    colorNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    colorName: {
        fontSize: 9,
        color: '#CCC',
        textAlign: 'center',
        marginTop: 3,
        fontWeight: '500',
        width: isWeb ? 58 : 52,
    },

    // Stats
    statsOverlay: {
        position: 'absolute',
        top: Platform.OS === 'web' ? 55 : 90,
        right: 10,
        flexDirection: 'row',
        gap: 8,
        zIndex: 30,
    },
    statText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFF',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
    },

    // Feedback
    feedbackOverlay: {
        position: 'absolute',
        top: '42%',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 100,
    },
    feedbackEmoji: {
        fontSize: 70,
    },

    // Complete
    completeOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200,
    },
    completeCard: {
        backgroundColor: '#1a1a4e',
        borderRadius: 25,
        padding: 30,
        alignItems: 'center',
        elevation: 25,
        width: isWeb ? 360 : screenW - 50,
        borderWidth: 3,
        borderColor: '#FFD700',
    },
    completeEmoji: {
        fontSize: 60,
        marginBottom: 12,
    },
    completeTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFD700',
        marginBottom: 6,
        textAlign: 'center',
    },
    completeText: {
        fontSize: 16,
        color: '#CCC',
        marginBottom: 18,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 12,
    },
    statBox: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 12,
    },
    statLabel: {
        fontSize: 11,
        color: '#AAA',
        marginBottom: 3,
    },
    statValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFF',
    },
    cognitiveLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFD700',
        marginTop: 8,
    },
});
