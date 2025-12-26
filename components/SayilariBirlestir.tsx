import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Animated, Image, PanResponder, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
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

// Fruit images
const FRUIT_IMAGES = {
    elma: require('../assets/images/elma.png'),
    armut: require('../assets/images/armut.png'),
    cilek: require('../assets/images/cilek.png'),
    karpuz: require('../assets/images/karpuz.png'),
    uzum: require('../assets/images/uzum.png'),
    kiraz: require('../assets/images/kiraz.png'),
};

const FRUIT_KEYS = Object.keys(FRUIT_IMAGES) as (keyof typeof FRUIT_IMAGES)[];

type Point = { x: number; y: number };
type NumberDot = { number: number; x: number; y: number; fruit: keyof typeof FRUIT_IMAGES };

const TOTAL_STAGES = 3;

// Pre-defined layouts for each stage (relative positions 0-1)
const STAGE_LAYOUTS: { x: number; y: number }[][] = [
    // Stage 1 - Simple zigzag
    [
        { x: 0.2, y: 0.15 },
        { x: 0.75, y: 0.25 },
        { x: 0.25, y: 0.5 },
        { x: 0.7, y: 0.6 },
        { x: 0.45, y: 0.85 },
    ],
    // Stage 2 - Star pattern
    [
        { x: 0.5, y: 0.1 },
        { x: 0.85, y: 0.4 },
        { x: 0.65, y: 0.85 },
        { x: 0.35, y: 0.85 },
        { x: 0.15, y: 0.4 },
    ],
    // Stage 3 - Random spread
    [
        { x: 0.15, y: 0.2 },
        { x: 0.8, y: 0.15 },
        { x: 0.5, y: 0.45 },
        { x: 0.2, y: 0.75 },
        { x: 0.75, y: 0.8 },
    ],
];

export default function SayilariBirlestir({ onGameEnd, onExit }: Props) {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const { playSound } = useSound();

    const [stage, setStage] = useState(1);
    const [dots, setDots] = useState<NumberDot[]>([]);
    const [connectedLines, setConnectedLines] = useState<{ from: number; to: number }[]>([]);
    const [currentNumber, setCurrentNumber] = useState(1);
    const [drawingLine, setDrawingLine] = useState<{ start: Point; end: Point } | null>(null);
    const [errors, setErrors] = useState(0);
    const [moves, setMoves] = useState(0);
    const [stageComplete, setStageComplete] = useState(false);
    const startTimeRef = useRef(Date.now());
    const canvasRef = useRef<View>(null);
    const canvasLayoutRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

    const progressAnim = useRef(new Animated.Value(0)).current;
    const successAnim = useRef(new Animated.Value(0)).current;

    const dotSize = Math.min(screenWidth * 0.18, 80);
    const fruitSize = dotSize * 0.9;

    // Generate dots for current stage
    const generateDots = () => {
        const layout = STAGE_LAYOUTS[(stage - 1) % STAGE_LAYOUTS.length];
        const shuffledFruits = [...FRUIT_KEYS].sort(() => Math.random() - 0.5);

        const newDots: NumberDot[] = layout.map((pos, i) => ({
            number: i + 1,
            x: pos.x,
            y: pos.y,
            fruit: shuffledFruits[i % shuffledFruits.length],
        }));

        setDots(newDots);
        setConnectedLines([]);
        setCurrentNumber(1);
        setStageComplete(false);
        setDrawingLine(null);

        Animated.timing(progressAnim, {
            toValue: stage / TOTAL_STAGES,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    React.useEffect(() => {
        generateDots();
    }, [stage]);

    const getDotCenter = (dot: NumberDot): Point => {
        const { width, height } = canvasLayoutRef.current;
        return {
            x: dot.x * width,
            y: dot.y * height,
        };
    };

    const findDotAtPoint = (x: number, y: number): NumberDot | null => {
        const { width, height } = canvasLayoutRef.current;
        const threshold = dotSize * 0.6;

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

    const handleDotPress = (dot: NumberDot) => {
        if (stageComplete) return;

        if (dot.number === currentNumber) {
            // Correct starting point
            setMoves(prev => prev + 1);

            if (currentNumber === 5) {
                // Stage complete!
                setStageComplete(true);
                playSound('correct');

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
                // Move to next number
                setConnectedLines(prev => [...prev, { from: currentNumber, to: currentNumber + 1 }]);
                setCurrentNumber(prev => prev + 1);
                playSound('correct');
            }
        } else if (dot.number !== currentNumber - 1) {
            // Wrong dot
            setErrors(prev => prev + 1);
            playSound('wrong');
        }
    };

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
            const { locationX, locationY } = e.nativeEvent;
            const startDot = findDotAtPoint(locationX, locationY);

            if (startDot && startDot.number === currentNumber) {
                const center = getDotCenter(startDot);
                setDrawingLine({ start: center, end: center });
            }
        },
        onPanResponderMove: (e) => {
            if (drawingLine) {
                const { locationX, locationY } = e.nativeEvent;
                setDrawingLine(prev => prev ? { ...prev, end: { x: locationX, y: locationY } } : null);
            }
        },
        onPanResponderRelease: (e) => {
            if (drawingLine) {
                const { locationX, locationY } = e.nativeEvent;
                const endDot = findDotAtPoint(locationX, locationY);

                if (endDot && endDot.number === currentNumber + 1) {
                    // Correct connection!
                    handleDotPress(endDot);
                } else if (endDot && endDot.number !== currentNumber) {
                    // Wrong connection
                    setErrors(prev => prev + 1);
                    playSound('wrong');
                }

                setDrawingLine(null);
            }
        },
        onPanResponderTerminate: () => {
            setDrawingLine(null);
        },
    });

    const renderLine = (from: NumberDot, to: NumberDot, key: string) => {
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
                    styles.connectionLine,
                    {
                        width: length,
                        left: x1,
                        top: y1 - 3,
                        transform: [{ rotate: `${angle}deg` }],
                        transformOrigin: 'left center',
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
                        top: start.y - 3,
                        transform: [{ rotate: `${angle}deg` }],
                        transformOrigin: 'left center',
                    },
                ]}
            />
        );
    };

    return (
        <DynamicBackground>
            <View style={styles.container}>
                {/* Exit button */}
                <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                    <Ionicons name="close" size={26} color="#d84315" />
                </TouchableOpacity>

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
                        Meyveleri 1'den 5'e sırayla birleştir! 🍎
                    </Text>
                </View>

                {/* Canvas */}
                <View
                    ref={canvasRef}
                    style={styles.canvas}
                    onLayout={(e) => {
                        canvasLayoutRef.current = e.nativeEvent.layout;
                    }}
                    {...panResponder.panHandlers}
                >
                    {/* Connected lines */}
                    {connectedLines.map((line, i) => {
                        const fromDot = dots.find(d => d.number === line.from);
                        const toDot = dots.find(d => d.number === line.to);
                        if (fromDot && toDot) {
                            return renderLine(fromDot, toDot, `line-${i}`);
                        }
                        return null;
                    })}

                    {/* Drawing line */}
                    {renderDrawingLine()}

                    {/* Number dots with fruits */}
                    {dots.map((dot) => {
                        const { width, height } = canvasLayoutRef.current;
                        const isActive = dot.number === currentNumber;
                        const isConnected = dot.number < currentNumber;

                        return (
                            <TouchableOpacity
                                key={dot.number}
                                style={[
                                    styles.dotContainer,
                                    {
                                        left: dot.x * width - dotSize / 2,
                                        top: dot.y * height - dotSize / 2,
                                        width: dotSize,
                                        height: dotSize,
                                    },
                                    isActive && styles.dotActive,
                                    isConnected && styles.dotConnected,
                                ]}
                                onPress={() => handleDotPress(dot)}
                                activeOpacity={0.7}
                            >
                                <Image
                                    source={FRUIT_IMAGES[dot.fruit]}
                                    style={{ width: fruitSize, height: fruitSize }}
                                    resizeMode="contain"
                                />
                                <View style={[styles.numberBadge, isConnected && styles.numberBadgeConnected]}>
                                    <Text style={styles.numberText}>{dot.number}</Text>
                                </View>
                            </TouchableOpacity>
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
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255, 229, 224, 0.95)',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        zIndex: 100,
    },
    progressBarContainer: {
        marginTop: 45,
        marginBottom: 10,
        marginHorizontal: 50,
        alignItems: 'center',
    },
    progressBarBg: {
        width: '100%',
        height: 8,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 4,
    },
    progressText: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    instructionContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 14,
        padding: 12,
        marginHorizontal: 16,
        marginBottom: 12,
        elevation: 4,
    },
    instructionText: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#333',
    },
    canvas: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderRadius: 20,
        marginBottom: 20,
        overflow: 'hidden',
    },
    dotContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.9)',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    dotActive: {
        borderWidth: 3,
        borderColor: '#4CAF50',
        transform: [{ scale: 1.1 }],
    },
    dotConnected: {
        opacity: 0.6,
    },
    numberBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#FF9800',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 3,
    },
    numberBadgeConnected: {
        backgroundColor: '#4CAF50',
    },
    numberText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
    },
    connectionLine: {
        position: 'absolute',
        height: 6,
        backgroundColor: '#4CAF50',
        borderRadius: 3,
    },
    drawingLine: {
        position: 'absolute',
        height: 6,
        backgroundColor: '#81C784',
        borderRadius: 3,
        opacity: 0.7,
    },
    successContainer: {
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    successText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#4CAF50',
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 30,
        paddingVertical: 16,
        borderRadius: 25,
        overflow: 'hidden',
    },
});
