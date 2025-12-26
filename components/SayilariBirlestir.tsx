import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, PanResponder, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import DynamicBackground from './DynamicBackground';
import { useSound } from './SoundContext';

interface Props {
    onGameEnd: (
        oyunAdi: string,
        sure: number,
        finalHamle: number,
        finalHata: number,
    ) => void;
    onExit?: () => void;
}

// Single fruit per stage
const STAGE_FRUITS = [
    { image: require('../assets/images/elma.png'), name: 'Elma' },
    { image: require('../assets/images/uzum.png'), name: 'Üzüm' },
    { image: require('../assets/images/karpuz.png'), name: 'Karpuz' },
];

type Point = { x: number; y: number };
type NumberDot = { number: number; x: number; y: number };

const TOTAL_STAGES = 3;
const NUMBERS_COUNT = 5;

// Pre-defined layouts for each stage (relative positions 0-1)
const STAGE_LAYOUTS: { x: number; y: number }[][] = [
    // Stage 1 - Zigzag
    [
        { x: 0.2, y: 0.12 },
        { x: 0.8, y: 0.28 },
        { x: 0.2, y: 0.50 },
        { x: 0.8, y: 0.68 },
        { x: 0.5, y: 0.88 },
    ],
    // Stage 2 - Star pattern
    [
        { x: 0.5, y: 0.08 },
        { x: 0.88, y: 0.38 },
        { x: 0.7, y: 0.88 },
        { x: 0.3, y: 0.88 },
        { x: 0.12, y: 0.38 },
    ],
    // Stage 3 - Random spread
    [
        { x: 0.15, y: 0.15 },
        { x: 0.85, y: 0.20 },
        { x: 0.5, y: 0.50 },
        { x: 0.18, y: 0.80 },
        { x: 0.82, y: 0.85 },
    ],
];

export default function SayilariBirlestir({ onGameEnd, onExit }: Props) {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const isPortrait = screenHeight > screenWidth;
    const { playSound } = useSound();

    const [stage, setStage] = useState(1);
    const [dots, setDots] = useState<NumberDot[]>([]);
    const [completedLines, setCompletedLines] = useState<{ from: number; to: number }[]>([]);
    const [currentNumber, setCurrentNumber] = useState(1);
    const [drawingLine, setDrawingLine] = useState<{ start: Point; end: Point } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [errors, setErrors] = useState(0);
    const [moves, setMoves] = useState(0);
    const [stageComplete, setStageComplete] = useState(false);
    const startTimeRef = useRef(Date.now());
    const canvasLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

    const progressAnim = useRef(new Animated.Value(0)).current;
    const successAnim = useRef(new Animated.Value(0)).current;

    // Bigger fruits on mobile
    const fruitSize = isPortrait ? Math.min(screenWidth * 0.22, 100) : Math.min(screenWidth * 0.12, 90);
    const currentFruit = STAGE_FRUITS[(stage - 1) % STAGE_FRUITS.length];

    // Generate dots for current stage
    const generateDots = () => {
        const layout = STAGE_LAYOUTS[(stage - 1) % STAGE_LAYOUTS.length];

        const newDots: NumberDot[] = layout.map((pos, i) => ({
            number: i + 1,
            x: pos.x,
            y: pos.y,
        }));

        setDots(newDots);
        setCompletedLines([]);
        setCurrentNumber(1);
        setStageComplete(false);
        setDrawingLine(null);
        setIsDragging(false);

        Animated.timing(progressAnim, {
            toValue: stage / TOTAL_STAGES,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    useEffect(() => {
        generateDots();
    }, [stage]);

    const getDotPixelPos = (dot: NumberDot): Point => {
        const { width, height } = canvasLayoutRef.current;
        return {
            x: dot.x * width,
            y: dot.y * height,
        };
    };

    const findDotAtPoint = (x: number, y: number): NumberDot | null => {
        const { width, height } = canvasLayoutRef.current;
        const threshold = fruitSize * 0.7;

        for (const dot of dots) {
            const dotX = dot.x * width;
            const dotY = dot.y * height;
            const distance = Math.sqrt((x - dotX) ** 2 + (y - dotY) ** 2);
            if (distance < threshold) {
                return dot;
            }
        }
        return null;
    };

    const handleConnectionComplete = (fromNum: number, toNum: number) => {
        if (fromNum === currentNumber && toNum === currentNumber + 1) {
            // Correct connection!
            setCompletedLines(prev => [...prev, { from: fromNum, to: toNum }]);
            setMoves(prev => prev + 1);
            playSound('correct');

            if (toNum === NUMBERS_COUNT) {
                // Stage complete!
                setStageComplete(true);
                setCurrentNumber(NUMBERS_COUNT + 1); // Prevent further input

                Animated.spring(successAnim, {
                    toValue: 1,
                    useNativeDriver: true,
                }).start();

                setTimeout(() => {
                    successAnim.setValue(0);
                    if (stage < TOTAL_STAGES) {
                        setStage(prev => prev + 1);
                    } else {
                        const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
                        onGameEnd('sayilari-birlestir', duration, moves + 1, errors);
                    }
                }, 1500);
            } else {
                setCurrentNumber(prev => prev + 1);
            }
        } else {
            // Wrong connection
            setErrors(prev => prev + 1);
            playSound('wrong');
        }
    };

    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
            if (stageComplete) return;

            const { locationX, locationY } = e.nativeEvent;
            const startDot = findDotAtPoint(locationX, locationY);

            // Must start from the current number
            if (startDot && startDot.number === currentNumber) {
                const center = getDotPixelPos(startDot);
                setDrawingLine({ start: center, end: center });
                setIsDragging(true);
            }
        },
        onPanResponderMove: (e) => {
            if (!isDragging || !drawingLine || stageComplete) return;

            const { locationX, locationY } = e.nativeEvent;
            setDrawingLine(prev => prev ? { ...prev, end: { x: locationX, y: locationY } } : null);
        },
        onPanResponderRelease: (e) => {
            if (!isDragging || !drawingLine || stageComplete) {
                setDrawingLine(null);
                setIsDragging(false);
                return;
            }

            const { locationX, locationY } = e.nativeEvent;
            const endDot = findDotAtPoint(locationX, locationY);

            if (endDot) {
                handleConnectionComplete(currentNumber, endDot.number);
            }

            setDrawingLine(null);
            setIsDragging(false);
        },
        onPanResponderTerminate: () => {
            setDrawingLine(null);
            setIsDragging(false);
        },
    }), [currentNumber, isDragging, drawingLine, stageComplete, dots, fruitSize]);

    const renderCompletedLine = (from: NumberDot, to: NumberDot, key: string) => {
        const { width, height } = canvasLayoutRef.current;
        const x1 = from.x * width;
        const y1 = from.y * height;
        const x2 = to.x * width;
        const y2 = to.y * height;

        const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

        return (
            <View
                key={key}
                style={[
                    styles.completedLine,
                    {
                        width: length,
                        left: x1,
                        top: y1 - 4,
                        transform: [{ rotate: `${angle}deg` }],
                    },
                ]}
            />
        );
    };

    const renderDrawingLine = () => {
        if (!drawingLine) return null;

        const { start, end } = drawingLine;
        const length = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
        const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);

        return (
            <View
                style={[
                    styles.drawingLine,
                    {
                        width: length,
                        left: start.x,
                        top: start.y - 4,
                        transform: [{ rotate: `${angle}deg` }],
                    },
                ]}
            />
        );
    };

    return (
        <DynamicBackground>
            <View style={styles.container}>
                {/* Exit button */}
                <View style={styles.exitBtn}>
                    <Ionicons name="close" size={26} color="#d84315" onPress={onExit} />
                </View>

                {/* Progress bar */}
                <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBg}>
                        <Animated.View
                            style={[
                                styles.progressBarFill,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%'],
                                    }),
                                },
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>{stage} / {TOTAL_STAGES}</Text>
                </View>

                {/* Instructions */}
                <View style={styles.instructionContainer}>
                    <Text style={styles.instructionText}>
                        {currentFruit.name}ları 1'den 5'e çizgi çizerek birleştir!
                    </Text>
                    <Text style={styles.hintText}>
                        {currentNumber <= NUMBERS_COUNT ? `Şimdi ${currentNumber}'den başla` : ''}
                    </Text>
                </View>

                {/* Canvas */}
                <View
                    style={styles.canvas}
                    onLayout={(e) => {
                        canvasLayoutRef.current = e.nativeEvent.layout;
                    }}
                    {...panResponder.panHandlers}
                >
                    {/* Completed lines */}
                    {completedLines.map((line, i) => {
                        const fromDot = dots.find(d => d.number === line.from);
                        const toDot = dots.find(d => d.number === line.to);
                        if (fromDot && toDot) {
                            return renderCompletedLine(fromDot, toDot, `line-${i}`);
                        }
                        return null;
                    })}

                    {/* Drawing line (while dragging) */}
                    {renderDrawingLine()}

                    {/* Fruit dots with numbers inside */}
                    {dots.map((dot) => {
                        const { width, height } = canvasLayoutRef.current;
                        const isActive = dot.number === currentNumber;
                        const isCompleted = dot.number < currentNumber;

                        return (
                            <View
                                key={dot.number}
                                style={[
                                    styles.fruitContainer,
                                    {
                                        left: dot.x * width - fruitSize / 2,
                                        top: dot.y * height - fruitSize / 2,
                                        width: fruitSize,
                                        height: fruitSize,
                                    },
                                    isActive && styles.fruitActive,
                                    isCompleted && styles.fruitCompleted,
                                ]}
                            >
                                <Image
                                    source={currentFruit.image}
                                    style={{ width: fruitSize * 0.85, height: fruitSize * 0.85 }}
                                    resizeMode="contain"
                                />
                                {/* Number inside fruit */}
                                <View style={[
                                    styles.numberOverlay,
                                    isCompleted && styles.numberOverlayCompleted,
                                ]}>
                                    <Text style={[
                                        styles.numberText,
                                        { fontSize: fruitSize * 0.4 },
                                        isCompleted && styles.numberTextCompleted,
                                    ]}>
                                        {dot.number}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Success message */}
                {stageComplete && (
                    <Animated.View
                        style={[
                            styles.successContainer,
                            {
                                opacity: successAnim,
                                transform: [{ scale: successAnim }],
                            },
                        ]}
                    >
                        <Text style={styles.successText}>🎉 Harika!</Text>
                    </Animated.View>
                )}
            </View>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 45,
        paddingHorizontal: 12,
    },
    exitBtn: {
        position: 'absolute',
        top: 45,
        left: 12,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 229, 224, 0.95)',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        zIndex: 100,
    },
    progressBarContainer: {
        marginTop: 50,
        marginBottom: 8,
        marginHorizontal: 50,
        alignItems: 'center',
    },
    progressBarBg: {
        width: '100%',
        height: 10,
        backgroundColor: '#e0e0e0',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 5,
    },
    progressText: {
        marginTop: 4,
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    instructionContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 16,
        padding: 14,
        marginHorizontal: 12,
        marginBottom: 10,
        elevation: 4,
    },
    instructionText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#333',
    },
    hintText: {
        fontSize: 14,
        textAlign: 'center',
        color: '#666',
        marginTop: 4,
    },
    canvas: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
    },
    fruitContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 50,
    },
    fruitActive: {
        transform: [{ scale: 1.15 }],
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
    },
    fruitCompleted: {
        opacity: 0.7,
    },
    numberOverlay: {
        position: 'absolute',
        width: '60%',
        height: '60%',
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    numberOverlayCompleted: {
        backgroundColor: 'rgba(76, 175, 80, 0.9)',
    },
    numberText: {
        fontWeight: 'bold',
        color: '#333',
    },
    numberTextCompleted: {
        color: '#fff',
    },
    completedLine: {
        position: 'absolute',
        height: 8,
        backgroundColor: '#4CAF50',
        borderRadius: 4,
        transformOrigin: 'left center',
    },
    drawingLine: {
        position: 'absolute',
        height: 8,
        backgroundColor: '#81C784',
        borderRadius: 4,
        opacity: 0.8,
        transformOrigin: 'left center',
    },
    successContainer: {
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    successText: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#4CAF50',
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 35,
        paddingVertical: 18,
        borderRadius: 28,
        overflow: 'hidden',
    },
});
