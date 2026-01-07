import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

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
    pathType: 'path' | 'circle';
    d?: string;
    cx?: number;
    cy?: number;
    r?: number;
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

// Color palette (only colors used in the SVG)
const COLOR_PALETTE = [
    { number: 3, color: '#87CEEB', name: 'Gökyüzü Mavisi' },  // Sky & Sun
    { number: 7, color: '#F4A460', name: 'Kum Rengi' },       // Sand & Leaves  
    { number: 9, color: '#8B4513', name: 'Kahverengi' },      // Tree trunk
    { number: 10, color: '#1E90FF', name: 'Deniz Mavisi' },   // Sea
];

// SVG Regions based on provided structure
const SVG_REGIONS: ColorRegion[] = [
    // Gökyüzü - No: 3
    {
        id: 'sky',
        colorNumber: 3,
        pathType: 'path',
        d: 'M0 0 L400 0 L400 250 L0 250 Z',
        labelX: 300,
        labelY: 50,
        isFilled: false
    },
    // Güneş - No: 3
    {
        id: 'sun',
        colorNumber: 3,
        pathType: 'circle',
        cx: 80,
        cy: 80,
        r: 40,
        labelX: 80,
        labelY: 85,
        isFilled: false
    },
    // Deniz - No: 10
    {
        id: 'sea',
        colorNumber: 10,
        pathType: 'path',
        d: 'M0 250 L400 250 L400 400 L0 400 Z',
        labelX: 200,
        labelY: 320,
        isFilled: false
    },
    // Ada/Kum - No: 7
    {
        id: 'island',
        colorNumber: 7,
        pathType: 'path',
        d: 'M50 250 Q200 180 350 250 Z',
        labelX: 200,
        labelY: 230,
        isFilled: false
    },
    // Ağaç Gövdesi - No: 9
    {
        id: 'trunk',
        colorNumber: 9,
        pathType: 'path',
        d: 'M190 250 L210 250 L220 150 L200 150 Z',
        labelX: 205,
        labelY: 210,
        isFilled: false
    },
    // Yapraklar - No: 7
    {
        id: 'leaves',
        colorNumber: 7,
        pathType: 'path',
        d: 'M210 150 Q260 100 310 160 Q260 140 210 150 M210 150 Q160 100 110 160 Q160 140 210 150',
        labelX: 250,
        labelY: 130,
        isFilled: false
    },
];

// ============= MAIN COMPONENT =============
export default function SihirliTuval({ onGameEnd, onExit }: SihirliTuvalProps) {
    const [regions, setRegions] = useState<ColorRegion[]>(SVG_REGIONS.map(r => ({ ...r })));
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
    const [cognitiveSpeed, setCognitiveSpeed] = useState(0);

    // Animations
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const flashAnim = useRef(new Animated.Value(0)).current;
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

    // Calculate cognitive speed whenever correctAnswers changes
    useEffect(() => {
        const elapsedTime = (Date.now() - gameStart) / 1000; // seconds
        if (elapsedTime > 0 && correctAnswers > 0) {
            const speed = correctAnswers / elapsedTime;
            setCognitiveSpeed(Math.round(speed * 100) / 100); // Round to 2 decimals
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

        // Calculate final cognitive speed
        const finalCognitiveSpeed = duration > 0 ? correctAnswers / duration : 0;

        onGameEnd('sihirli-tuval', duration, totalMoves, errors, undefined, {
            zorlukSeviyesi: 1,
            kazanimOdagi: 'Görsel Motor Koordinasyon ve Sayı Tanıma',
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
            Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();

        // Vibration on mobile
        if (Platform.OS !== 'web') {
            Vibration.vibrate(150);
        }
    };

    const playSuccessFeedback = () => {
        // Quick pulse animation
        Animated.sequence([
            Animated.timing(selectedButtonScale, { toValue: 1.2, duration: 100, useNativeDriver: true }),
            Animated.timing(selectedButtonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
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
            // Wrong coloring - shake and flash red
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
        return '#F5F5F5'; // Light gray for unfilled
    };

    const getRegionStroke = (region: ColorRegion): string => {
        if (showFeedback?.regionId === region.id) {
            return showFeedback.type === 'success' ? '#4CAF50' : '#F44336';
        }
        return '#CCCCCC';
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = regions.filter(r => r.isFilled).length / regions.length;

    // Interpolate flash animation for red overlay
    const flashOpacity = flashAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.3],
    });

    // Calculate SVG dimensions
    const svgWidth = isWeb ? 400 : screenW - 60;
    const svgHeight = isWeb ? 400 : 350;

    return (
        <View style={styles.container}>
            {/* Wood texture background */}
            <View style={styles.woodBackground}>
                {/* Wood grain lines */}
                {[...Array(25)].map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.woodGrain,
                            {
                                top: i * 35,
                                opacity: 0.15 + (i % 3) * 0.1,
                            }
                        ]}
                    />
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

                {/* Score & Cognitive Speed */}
                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreIcon}>🎓</Text>
                    <Text style={styles.scoreText}>{score}</Text>
                    <Text style={styles.speedText}>⚡{cognitiveSpeed.toFixed(2)}</Text>
                </View>
            </View>

            {/* Title */}
            <Text style={styles.title}>🎨 Sihirli Tuval: Sayılarla Boyama</Text>

            {/* Instructions */}
            <View style={styles.instructionContainer}>
                {!selectedColorNumber ? (
                    <Text style={styles.instructionText}>👇 Önce aşağıdan bir numaralı renk seç!</Text>
                ) : (
                    <Text style={styles.instructionText}>
                        👆 Şimdi <Text style={styles.numberHighlight}>{selectedColorNumber}</Text> numaralı alana dokun!
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
                {/* Red flash overlay */}
                <Animated.View
                    style={[
                        styles.flashOverlay,
                        { opacity: flashOpacity }
                    ]}
                    pointerEvents="none"
                />

                <View style={styles.canvasFrame}>
                    <Svg
                        width={svgWidth}
                        height={svgHeight}
                        viewBox="0 0 400 400"
                        style={styles.svgCanvas}
                    >
                        {/* Render all regions */}
                        {regions.map(region => (
                            <G key={region.id}>
                                {region.pathType === 'path' ? (
                                    <Path
                                        d={region.d}
                                        fill={getRegionFillColor(region)}
                                        stroke={getRegionStroke(region)}
                                        strokeWidth={showFeedback?.regionId === region.id ? 4 : 2}
                                        onPress={() => handleRegionPress(region.id)}
                                    />
                                ) : (
                                    <Circle
                                        cx={region.cx}
                                        cy={region.cy}
                                        r={region.r}
                                        fill={getRegionFillColor(region)}
                                        stroke={getRegionStroke(region)}
                                        strokeWidth={showFeedback?.regionId === region.id ? 4 : 2}
                                        onPress={() => handleRegionPress(region.id)}
                                    />
                                )}
                                {/* Number label - only show if not filled */}
                                {!region.isFilled && (
                                    <SvgText
                                        x={region.labelX}
                                        y={region.labelY}
                                        fontSize={20}
                                        fontWeight="bold"
                                        fill="#666"
                                        textAnchor="middle"
                                        onPress={() => handleRegionPress(region.id)}
                                    >
                                        {region.colorNumber}
                                    </SvgText>
                                )}
                                {/* Checkmark for filled regions */}
                                {region.isFilled && (
                                    <SvgText
                                        x={region.labelX}
                                        y={region.labelY}
                                        fontSize={24}
                                        fill="#FFFFFF"
                                        textAnchor="middle"
                                    >
                                        ✓
                                    </SvgText>
                                )}
                            </G>
                        ))}
                    </Svg>
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
                        ]}>
                            <Text style={styles.selectedNumber}>{selectedColorNumber}</Text>
                        </View>
                    </View>
                )}
            </Animated.View>

            {/* Color Palette - Claymorphism style */}
            <View style={styles.paletteContainer}>
                <Text style={styles.paletteTitle}>Renk Paleti</Text>
                <View style={styles.palette}>
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
                            <Text style={styles.colorName}>{colorItem.name}</Text>
                        </Animated.View>
                    ))}
                </View>
            </View>

            {/* Feedback emoji overlay */}
            {showFeedback && (
                <View style={styles.feedbackOverlay}>
                    <Text style={styles.feedbackEmoji}>
                        {showFeedback.type === 'success' ? '✨' : '❌'}
                    </Text>
                </View>
            )}

            {/* Stats overlay */}
            <View style={styles.statsOverlay}>
                <Text style={styles.statText}>✅ {correctAnswers}</Text>
                <Text style={styles.statText}>❌ {errors}</Text>
            </View>

            {/* Game complete overlay */}
            {isGameComplete && (
                <View style={styles.completeOverlay}>
                    <View style={styles.completeCard}>
                        <Text style={styles.completeEmoji}>🎉</Text>
                        <Text style={styles.completeTitle}>Harika!</Text>
                        <Text style={styles.completeText}>Resmi tamamladın!</Text>
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
        height: 3,
        backgroundColor: '#5D2E0C',
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
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20,
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    timerIcon: {
        fontSize: 18,
    },
    timerBar: {
        width: 60,
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
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    scoreIcon: {
        fontSize: 18,
    },
    scoreText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    speedText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FF9800',
        marginLeft: 5,
    },

    // Title
    title: {
        fontSize: isWeb ? 24 : 18,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
        marginVertical: 5,
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
    },

    // Instructions
    instructionContainer: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        marginHorizontal: 20,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 15,
        marginBottom: 8,
        elevation: 3,
    },
    instructionText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },
    numberHighlight: {
        color: '#E91E63',
        fontWeight: 'bold',
        fontSize: 18,
    },

    // Progress
    progressContainer: {
        height: 22,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 20,
        borderRadius: 11,
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
        borderRadius: 11,
    },
    progressText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },

    // Canvas
    canvasContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 15,
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
        borderRadius: 15,
        padding: 10,
        elevation: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        borderWidth: 6,
        borderColor: '#DEB887',
    },
    svgCanvas: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
    },
    selectedIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 25,
        gap: 12,
        elevation: 5,
    },
    selectedText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    selectedColorPreview: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 3,
        borderColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },

    // Palette - Claymorphism
    paletteContainer: {
        paddingVertical: 15,
        paddingHorizontal: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },
    paletteTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 10,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    palette: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 15,
    },
    colorButton: {
        width: isWeb ? 70 : 65,
        height: isWeb ? 70 : 65,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        // Claymorphism effect
        shadowColor: '#000',
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 10,
        borderWidth: 4,
        borderTopColor: 'rgba(255,255,255,0.6)',
        borderLeftColor: 'rgba(255,255,255,0.6)',
        borderRightColor: 'rgba(0,0,0,0.15)',
        borderBottomColor: 'rgba(0,0,0,0.2)',
    },
    colorButtonSelected: {
        borderColor: '#333',
        borderWidth: 5,
        transform: [{ scale: 1.15 }],
    },
    colorNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 3,
    },
    colorName: {
        fontSize: 10,
        color: '#FFF',
        textAlign: 'center',
        marginTop: 5,
        fontWeight: '500',
    },

    // Stats overlay
    statsOverlay: {
        position: 'absolute',
        top: Platform.OS === 'web' ? 60 : 95,
        right: 15,
        flexDirection: 'row',
        gap: 10,
        zIndex: 30,
    },
    statText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFF',
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },

    // Feedback
    feedbackOverlay: {
        position: 'absolute',
        top: '45%',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
    },
    feedbackEmoji: {
        fontSize: 80,
    },

    // Complete
    completeOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200,
    },
    completeCard: {
        backgroundColor: '#FFF',
        borderRadius: 30,
        padding: 35,
        alignItems: 'center',
        elevation: 25,
        width: isWeb ? 350 : screenW - 60,
    },
    completeEmoji: {
        fontSize: 70,
        marginBottom: 15,
    },
    completeTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginBottom: 8,
    },
    completeText: {
        fontSize: 18,
        color: '#666',
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 15,
    },
    statBox: {
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 15,
    },
    statLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    cognitiveLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FF9800',
        marginTop: 10,
    },
});
