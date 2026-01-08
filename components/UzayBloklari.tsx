import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { speak } from '../services/speechService';

// ============= TYPES =============
interface UzayBloklariProps {
    onGameEnd: (
        oyunAdi: string,
        sure: number,
        hamle: number,
        hata: number,
        cizimVerisi?: any,
        ekstraVeri?: any
    ) => void;
    onExit: () => void;
    childName?: string;
}

interface Block {
    id: string;
    shape: number[][]; // 2D array representing shape
    color: string;
    placed: boolean;
}

interface GridCell {
    filled: boolean;
    color: string | null;
    blockId: string | null;
}

interface MoveData {
    blockId: string;
    targetCell: { row: number; col: number } | null;
    isCorrect: boolean;
    responseTime: number;
    timestamp: number;
}

// ============= CONFIG =============
const { width: screenW, height: screenH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const GRID_SIZE = 4; // 4x4 grid
const CELL_SIZE = isWeb ? 60 : Math.floor((screenW - 80) / GRID_SIZE);

// Neon colors
const COLORS = {
    neonGreen: '#39FF14',
    neonPurple: '#BF40BF',
    neonYellow: '#FFFF00',
    neonCyan: '#00FFFF',
    neonPink: '#FF69B4',
};

// Block shapes (Tetris-like)
const BLOCK_SHAPES: { shape: number[][]; color: string }[] = [
    // Square 2x2
    { shape: [[1, 1], [1, 1]], color: COLORS.neonYellow },
    // L shape
    { shape: [[1, 0], [1, 0], [1, 1]], color: COLORS.neonPurple },
    // Line 3x1
    { shape: [[1, 1, 1]], color: COLORS.neonGreen },
    // T shape
    { shape: [[1, 1, 1], [0, 1, 0]], color: COLORS.neonCyan },
    // S shape
    { shape: [[0, 1, 1], [1, 1, 0]], color: COLORS.neonPink },
];

// ============= MAIN COMPONENT =============
export default function UzayBloklari({ onGameEnd, onExit, childName = 'Tuna' }: UzayBloklariProps) {
    const [grid, setGrid] = useState<GridCell[][]>(
        Array(GRID_SIZE).fill(null).map(() =>
            Array(GRID_SIZE).fill(null).map(() => ({ filled: false, color: null, blockId: null }))
        )
    );
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
    const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [moveHistory, setMoveHistory] = useState<MoveData[]>([]);
    const [errors, setErrors] = useState(0);
    const [score, setScore] = useState(0);
    const [gameStart] = useState(Date.now());
    const [lastActionTime, setLastActionTime] = useState<number>(Date.now());
    const [timeLeft, setTimeLeft] = useState(180); // 3 dakika
    const [isGameComplete, setIsGameComplete] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [rocketLaunch, setRocketLaunch] = useState(false);

    // Animations
    const glowAnim = useRef(new Animated.Value(0)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const rocketAnim = useRef(new Animated.Value(0)).current;
    const starAnim = useRef(new Animated.Value(0)).current;

    // TTS Loading State
    const [isSpeaking, setIsSpeaking] = useState(false);

    // TTS greeting with OpenAI
    useEffect(() => {
        const greet = async () => {
            if (Platform.OS === 'web') {
                setIsSpeaking(true);
                try {
                    await speak(
                        `Merhaba ${childName}, Uzay Blokları oyununa hoş geldin! Blokları yerleştirmeme yardım eder misin?`,
                        { voice: 'nova' }
                    );
                } catch (e) {
                    console.log('TTS error:', e);
                } finally {
                    setIsSpeaking(false);
                }
            }
        };
        greet();
        initializeBlocks();
    }, []);

    // Star animation
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(starAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                Animated.timing(starAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
            ])
        ).start();
    }, []);

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
        const allFilled = grid.every(row => row.every(cell => cell.filled));
        if (allFilled && blocks.length > 0 && blocks.every(b => b.placed) && !isGameComplete) {
            handleGameComplete();
        }
    }, [grid, blocks]);

    const initializeBlocks = () => {
        // Create random blocks that can fill the grid
        const newBlocks: Block[] = BLOCK_SHAPES.slice(0, 4).map((b, idx) => ({
            id: `block-${idx}`,
            shape: b.shape,
            color: b.color,
            placed: false,
        }));
        setBlocks(newBlocks);
        setLastActionTime(Date.now());
    };

    const handleGameComplete = () => {
        setIsGameComplete(true);
        setRocketLaunch(true);

        // Rocket launch animation
        Animated.timing(rocketAnim, {
            toValue: -screenH,
            duration: 2000,
            useNativeDriver: true,
        }).start(() => {
            setShowConfetti(true);
            setTimeout(finishGame, 2000);
        });

        if (Platform.OS !== 'web') {
            Vibration.vibrate([0, 100, 100, 200, 100, 300]);
        }
    };

    const finishGame = () => {
        const duration = Math.floor((Date.now() - gameStart) / 1000);
        const totalMoves = moveHistory.length;
        const correctMoves = moveHistory.filter(m => m.isCorrect).length;
        const avgResponseTime = moveHistory.length > 0
            ? moveHistory.reduce((sum, m) => sum + m.responseTime, 0) / moveHistory.length
            : 0;

        // Görsel Dikkat Skoru: (Doğru Hamle / Toplam Süre) * 100
        const visualAttentionScore = duration > 0
            ? Math.min(100, Math.round((correctMoves / duration) * 100))
            : 0;

        onGameEnd('uzay-bloklari', duration, totalMoves, errors, undefined, {
            zorlukSeviyesi: 1,
            kazanimOdagi: 'Problem Çözme ve Uzamsal Algı',
            response_time: Math.round(avgResponseTime),
            correct_answers: correctMoves,
            cognitive_speed_score: duration > 0 ? Math.round((correctMoves / duration) * 1000) / 1000 : 0,
            visual_attention_score: visualAttentionScore,
            round_history: moveHistory,
        });
    };

    const playSuccessFeedback = () => {
        Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
            Animated.timing(glowAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
        ]).start();
    };

    const playErrorFeedback = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 15, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -15, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();

        if (Platform.OS !== 'web') {
            Vibration.vibrate(100);
        }
    };

    const canPlaceBlock = (block: Block, startRow: number, startCol: number): boolean => {
        for (let r = 0; r < block.shape.length; r++) {
            for (let c = 0; c < block.shape[r].length; c++) {
                if (block.shape[r][c] === 1) {
                    const gridRow = startRow + r;
                    const gridCol = startCol + c;
                    if (gridRow >= GRID_SIZE || gridCol >= GRID_SIZE || gridRow < 0 || gridCol < 0) {
                        return false;
                    }
                    if (grid[gridRow][gridCol].filled) {
                        return false;
                    }
                }
            }
        }
        return true;
    };

    const placeBlock = (block: Block, startRow: number, startCol: number) => {
        const newGrid = [...grid.map(row => [...row])];
        for (let r = 0; r < block.shape.length; r++) {
            for (let c = 0; c < block.shape[r].length; c++) {
                if (block.shape[r][c] === 1) {
                    const gridRow = startRow + r;
                    const gridCol = startCol + c;
                    newGrid[gridRow][gridCol] = {
                        filled: true,
                        color: block.color,
                        blockId: block.id,
                    };
                }
            }
        }
        setGrid(newGrid);

        // Mark block as placed
        setBlocks(prev => prev.map(b =>
            b.id === block.id ? { ...b, placed: true } : b
        ));

        // Record move
        const responseTime = Date.now() - lastActionTime;
        setMoveHistory(prev => [...prev, {
            blockId: block.id,
            targetCell: { row: startRow, col: startCol },
            isCorrect: true,
            responseTime,
            timestamp: Date.now(),
        }]);
        setLastActionTime(Date.now());

        setScore(prev => prev + 25);
        playSuccessFeedback();
    };

    const handleBlockSelect = (block: Block) => {
        if (block.placed) return;
        setSelectedBlock(block);
    };

    // Rotate block shape 90 degrees clockwise
    const handleRotateBlock = () => {
        if (!selectedBlock) return;

        const rotateShape = (shape: number[][]): number[][] => {
            const rows = shape.length;
            const cols = shape[0].length;
            const rotated: number[][] = [];
            for (let c = 0; c < cols; c++) {
                const newRow: number[] = [];
                for (let r = rows - 1; r >= 0; r--) {
                    newRow.push(shape[r][c]);
                }
                rotated.push(newRow);
            }
            return rotated;
        };

        const newShape = rotateShape(selectedBlock.shape);

        // Update blocks array with rotated shape
        setBlocks(prev => prev.map(b =>
            b.id === selectedBlock.id ? { ...b, shape: newShape } : b
        ));

        // Update selected block reference
        setSelectedBlock(prev => prev ? { ...prev, shape: newShape } : null);
    };

    const handleGridCellPress = (row: number, col: number) => {
        if (!selectedBlock || grid[row][col].filled) return;

        if (canPlaceBlock(selectedBlock, row, col)) {
            placeBlock(selectedBlock, row, col);
            setSelectedBlock(null);
        } else {
            // Wrong placement
            setErrors(prev => prev + 1);
            playErrorFeedback();

            setMoveHistory(prev => [...prev, {
                blockId: selectedBlock.id,
                targetCell: { row, col },
                isCorrect: false,
                responseTime: Date.now() - lastActionTime,
                timestamp: Date.now(),
            }]);
            setLastActionTime(Date.now());
        }
    };

    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate progress
    const filledCells = grid.flat().filter(c => c.filled).length;
    const totalCells = GRID_SIZE * GRID_SIZE;
    const progress = filledCells / totalCells;

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.6],
    });

    return (
        <View style={styles.container}>
            {/* Starry background */}
            <View style={styles.starsContainer}>
                {[...Array(50)].map((_, i) => (
                    <Animated.View
                        key={i}
                        style={[
                            styles.star,
                            {
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                opacity: starAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.3 + (i % 5) * 0.15, 0.8 + (i % 3) * 0.1],
                                }),
                                transform: [{
                                    scale: starAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [0.8, 1.2],
                                    })
                                }],
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
                    <Text style={styles.timerIcon}>⏳</Text>
                    <View style={styles.timerBar}>
                        <View style={[styles.timerFill, { width: `${(timeLeft / 180) * 100}%` }]} />
                    </View>
                </View>

                {/* Progress - moved to header */}
                <View style={styles.progressContainerHeader}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
                </View>
            </View>

            {/* Grid Area */}
            <View style={styles.gridContainer}>
                <Animated.View
                    style={[
                        styles.gridGlow,
                        { opacity: glowOpacity }
                    ]}
                />
                <Animated.View
                    style={[
                        styles.grid,
                        { transform: [{ translateX: shakeAnim }] }
                    ]}
                >
                    {grid.map((row, rowIndex) => (
                        <View key={rowIndex} style={styles.gridRow}>
                            {row.map((cell, colIndex) => (
                                <TouchableOpacity
                                    key={`${rowIndex}-${colIndex}`}
                                    style={[
                                        styles.gridCell,
                                        cell.filled && { backgroundColor: cell.color || 'transparent' },
                                        selectedBlock && !cell.filled && styles.gridCellHighlight,
                                    ]}
                                    onPress={() => handleGridCellPress(rowIndex, colIndex)}
                                    activeOpacity={0.7}
                                >
                                    {cell.filled && (
                                        <Text style={styles.cellStar}>✨</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    ))}
                </Animated.View>
            </View>

            {/* Rotate Button - showed when block is selected */}
            {selectedBlock && (
                <TouchableOpacity style={styles.rotateButton} onPress={handleRotateBlock}>
                    <Ionicons name="refresh" size={24} color="#FFF" />
                    <Text style={styles.rotateButtonText}>Döndür</Text>
                </TouchableOpacity>
            )}

            {/* Blocks Palette */}
            <View style={styles.blocksContainer}>
                {blocks.filter(b => !b.placed).map(block => (
                    <TouchableOpacity
                        key={block.id}
                        style={[
                            styles.blockWrapper,
                            selectedBlock?.id === block.id && styles.blockSelected,
                        ]}
                        onPress={() => handleBlockSelect(block)}
                        activeOpacity={0.8}
                    >
                        <View style={styles.blockShape}>
                            {block.shape.map((row, ri) => (
                                <View key={ri} style={styles.blockRow}>
                                    {row.map((cell, ci) => (
                                        <View
                                            key={ci}
                                            style={[
                                                styles.blockCell,
                                                cell === 1 && { backgroundColor: block.color },
                                                cell === 0 && styles.blockCellEmpty,
                                            ]}
                                        />
                                    ))}
                                </View>
                            ))}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Rocket Launch Animation */}
            {rocketLaunch && (
                <Animated.View
                    style={[
                        styles.rocketContainer,
                        { transform: [{ translateY: rocketAnim }] }
                    ]}
                >
                    <Text style={styles.rocketEmoji}>🚀</Text>
                    <View style={styles.rocketFlame}>
                        <Text style={styles.flameEmoji}>🔥</Text>
                    </View>
                </Animated.View>
            )
            }

            {/* Confetti */}
            {
                showConfetti && (
                    <ConfettiCannon
                        count={200}
                        origin={{ x: screenW / 2, y: 0 }}
                        fallSpeed={3000}
                        fadeOut
                    />
                )
            }

            {/* Speaking Indicator */}
            {isSpeaking && (
                <View style={styles.speakingOverlay}>
                    <View style={styles.speakingCard}>
                        <ActivityIndicator size="large" color="#BF40BF" />
                        <Text style={styles.speakingText}>🔊 Dinle...</Text>
                    </View>
                </View>
            )}

            {/* Game Complete Overlay */}
            {
                isGameComplete && !rocketLaunch && (
                    <View style={styles.completeOverlay}>
                        <View style={styles.completeCard}>
                            <Text style={styles.completeEmoji}>🌌🎉</Text>
                            <Text style={styles.completeTitle}>Blokları Yerleştirdin!</Text>
                            <Text style={styles.completeText}>Harika bir mimar oldun!</Text>
                            <View style={styles.statsRow}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Puan</Text>
                                    <Text style={styles.statValue}>{score}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Hata</Text>
                                    <Text style={[styles.statValue, { color: '#F44336' }]}>{errors}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )
            }
        </View >
    );
}

// ============= STYLES =============
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a2e',
    },
    starsContainer: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    star: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#FFF',
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
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'linear-gradient(135deg, #667eea, #764ba2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 8,
        borderWidth: 2,
        borderColor: 'rgba(191, 64, 191, 0.5)',
    },
    timerIcon: {
        fontSize: 18,
    },
    timerBar: {
        width: 60,
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    timerFill: {
        height: '100%',
        backgroundColor: '#BF40BF',
        borderRadius: 4,
    },
    timerText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFF',
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,215,0,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        borderWidth: 2,
        borderColor: 'rgba(255,215,0,0.4)',
    },
    scoreIcon: {
        fontSize: 18,
    },
    scoreText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFD700',
    },

    // Grid
    gridContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    gridGlow: {
        position: 'absolute',
        width: CELL_SIZE * GRID_SIZE + 40,
        height: CELL_SIZE * GRID_SIZE + 40,
        borderRadius: 25,
        backgroundColor: '#39FF14',
        shadowColor: '#39FF14',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 30,
    },
    grid: {
        padding: 10,
        backgroundColor: 'rgba(20, 20, 60, 0.9)',
        borderRadius: 20,
        // Claymorphism
        shadowColor: '#000',
        shadowOffset: { width: 8, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 15,
        borderWidth: 3,
        borderColor: 'rgba(100, 100, 180, 0.4)',
    },
    gridRow: {
        flexDirection: 'row',
    },
    gridCell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: 'rgba(30, 30, 80, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(100, 100, 180, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 2,
        borderRadius: 8,
        // Inner shadow effect
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    gridCellHighlight: {
        borderColor: '#39FF14',
        borderWidth: 2,
    },
    cellStar: {
        fontSize: isWeb ? 20 : 16,
    },

    // Progress
    progressContainer: {
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginHorizontal: 30,
        marginVertical: 15,
        borderRadius: 10,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    progressContainerHeader: {
        height: 16,
        width: 80,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    progressFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#BF40BF',
        borderRadius: 10,
    },
    progressText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
    },

    // Rotate Button
    rotateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#BF40BF',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        marginVertical: 10,
        alignSelf: 'center',
        gap: 8,
        shadowColor: '#BF40BF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 5,
    },
    rotateButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },

    // Blocks
    blocksContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 15,
        paddingBottom: Platform.OS === 'web' ? 20 : 40,
        backgroundColor: 'rgba(0,0,0,0.4)',
        gap: 15,
    },
    blockWrapper: {
        padding: 8,
        backgroundColor: 'rgba(50, 50, 100, 0.8)',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'rgba(100, 100, 180, 0.5)',
        // Claymorphism
        shadowColor: '#000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
        elevation: 8,
    },
    blockSelected: {
        borderColor: '#39FF14',
        borderWidth: 3,
        transform: [{ scale: 1.1 }],
        shadowColor: '#39FF14',
        shadowOpacity: 0.6,
    },
    blockShape: {
        flexDirection: 'column',
    },
    blockRow: {
        flexDirection: 'row',
    },
    blockCell: {
        width: isWeb ? 20 : 16,
        height: isWeb ? 20 : 16,
        margin: 1,
        borderRadius: 4,
    },
    blockCellEmpty: {
        backgroundColor: 'transparent',
    },

    // Rocket
    rocketContainer: {
        position: 'absolute',
        bottom: screenH / 2 - 50,
        left: screenW / 2 - 30,
        alignItems: 'center',
        zIndex: 100,
    },
    rocketEmoji: {
        fontSize: 60,
    },
    rocketFlame: {
        marginTop: -10,
    },
    flameEmoji: {
        fontSize: 40,
    },

    // Complete
    completeOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 10, 46, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200,
    },
    completeCard: {
        backgroundColor: 'rgba(30, 30, 80, 0.95)',
        borderRadius: 25,
        padding: 30,
        alignItems: 'center',
        elevation: 25,
        width: isWeb ? 350 : screenW - 60,
        borderWidth: 3,
        borderColor: '#BF40BF',
    },
    completeEmoji: {
        fontSize: 60,
        marginBottom: 10,
    },
    completeTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#FFD700',
        marginBottom: 8,
        textAlign: 'center',
    },
    completeText: {
        fontSize: 16,
        color: '#CCC',
        marginBottom: 20,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 20,
    },
    statBox: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 12,
    },
    statLabel: {
        fontSize: 12,
        color: '#AAA',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
    },

    // Speaking Overlay
    speakingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    speakingCard: {
        backgroundColor: '#1a1a2e',
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        gap: 15,
        borderWidth: 2,
        borderColor: '#BF40BF',
    },
    speakingText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
