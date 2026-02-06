import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    ImageBackground,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { FeedbackService } from '../services/FeedbackService';
import CountdownOverlay from './CountdownOverlay';
import { asset } from '../lib/assetMap';

// Arka plan görseli
const BACKGROUND_IMAGE = asset('/backgrounds/games/uzay_bg.png');

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
    shape: number[][];
    color: string;
    placed: boolean;
    position?: { row: number; col: number };
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
const GRID_SIZE = 3;
const CELL_SIZE = isWeb ? 90 : Math.floor((screenW - 60) / GRID_SIZE);
const BLOCK_CELL_SIZE = isWeb ? 45 : 35;
const GRID_PADDING = 8; // padding inside grid container
const CELL_MARGIN = 2;  // margin around each cell
const EFFECTIVE_CELL_SIZE = CELL_SIZE + (CELL_MARGIN * 2); // total space per cell including margins

const COLORS = {
    neonGreen: '#39FF14',
    neonPurple: '#BF40BF',
    neonYellow: '#FFFF00',
    neonCyan: '#00FFFF',
    neonPink: '#FF69B4',
};

const BLOCK_SHAPES: { shape: number[][]; color: string }[] = [
    { shape: [[1, 1], [1, 1]], color: COLORS.neonYellow },
    { shape: [[1, 0], [1, 0], [1, 1]], color: COLORS.neonPurple },
    { shape: [[1, 1, 1]], color: COLORS.neonGreen },
    { shape: [[1, 1, 1], [0, 1, 0]], color: COLORS.neonCyan },
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
    const [gridRotation, setGridRotation] = useState(0); // 0, 90, 180, 270
    const [moveHistory, setMoveHistory] = useState<MoveData[]>([]);
    const [errors, setErrors] = useState(0);
    const [score, setScore] = useState(0);
    const [gameStart] = useState(Date.now());
    const [lastActionTime, setLastActionTime] = useState<number>(Date.now());
    const [timeLeft, setTimeLeft] = useState(180);
    const [isGameComplete, setIsGameComplete] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [rocketLaunch, setRocketLaunch] = useState(false);
    const [gameReady, setGameReady] = useState(false);

    // Selection state (tap-to-select, tap-to-place)
    const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);

    // Animations
    const glowAnim = useRef(new Animated.Value(0)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const rocketAnim = useRef(new Animated.Value(0)).current;
    const starAnim = useRef(new Animated.Value(0)).current;
    const rotationAnim = useRef(new Animated.Value(0)).current;

    // Initialize blocks on mount
    useEffect(() => {
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
    // Timer - only starts when game is ready
    useEffect(() => {
        if (isGameComplete || !gameReady) return;
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
    }, [isGameComplete, gameReady]);

    // Check game completion
    useEffect(() => {
        const allFilled = grid.every(row => row.every(cell => cell.filled));
        if (allFilled && blocks.length > 0 && blocks.every(b => b.placed) && !isGameComplete) {
            handleGameComplete();
        }
    }, [grid, blocks]);

    const initializeBlocks = () => {
        // Define a solvable set of 3 blocks that perfectly fills 3x3 (9 cells)
        // 1. Square 2x2 (4 cells)
        // 2. Vertical Bar 1x3 (3 cells)
        // 3. Horizontal Bar 2x1 (2 cells)
        // This combination (4+3+2=9) can fill the grid (e.g. Square top-left, V-Bar right col, H-Bar bottom-left)

        const solvableShapes = [
            { shape: [[1, 1], [1, 1]], color: COLORS.neonYellow }, // 2x2 Square
            { shape: [[1], [1], [1]], color: COLORS.neonGreen },   // 1x3 Vertical
            { shape: [[1, 1]], color: COLORS.neonPurple },         // 2x1 Horizontal
        ];

        const newBlocks: Block[] = solvableShapes.map((b, idx) => ({
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
        const visualAttentionScore = duration > 0
            ? Math.min(100, Math.round((correctMoves / Math.max(duration, 1)) * 100))
            : 0;

        onGameEnd('uzay-bloklari', duration, totalMoves, errors, null, {
            response_time: Math.round(avgResponseTime),
            error_count: errors,
            visual_attention_score: visualAttentionScore,
            moveHistory,
            gridRotation,
        });
    };

    const canPlaceBlock = (block: Block, startRow: number, startCol: number): boolean => {
        const shape = block.shape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
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
        const newGrid = grid.map(row => row.map(cell => ({ ...cell })));
        const shape = block.shape;
        for (let r = 0; r < shape.length; r++) {
            for (let c = 0; c < shape[r].length; c++) {
                if (shape[r][c] === 1) {
                    newGrid[startRow + r][startCol + c] = {
                        filled: true,
                        color: block.color,
                        blockId: block.id,
                    };
                }
            }
        }
        setGrid(newGrid);
        setBlocks(prev => prev.map(b =>
            b.id === block.id ? { ...b, placed: true, position: { row: startRow, col: startCol } } : b
        ));
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

    // UNDO - Remove last placed block
    const handleUndo = () => {
        const lastPlacedBlock = [...blocks].reverse().find(b => b.placed);
        if (!lastPlacedBlock) return;

        // Remove block from grid
        const newGrid = grid.map(row => row.map(cell =>
            cell.blockId === lastPlacedBlock.id
                ? { filled: false, color: null, blockId: null }
                : cell
        ));
        setGrid(newGrid);

        // Mark block as not placed
        setBlocks(prev => prev.map(b =>
            b.id === lastPlacedBlock.id ? { ...b, placed: false, position: undefined } : b
        ));

        // Optional: Reduce score
        setScore(prev => Math.max(0, prev - 25));
    };

    // ROTATE GRID (not blocks)
    const handleRotateGrid = () => {
        const newRotation = (gridRotation + 90) % 360;
        setGridRotation(newRotation);

        Animated.timing(rotationAnim, {
            toValue: newRotation,
            duration: 300,
            useNativeDriver: true,
        }).start();
    };

    const playSuccessFeedback = () => {
        FeedbackService.playSuccess({ intensity: 'medium' });
        FeedbackService.animateSuccess({ glow: glowAnim });
        FeedbackService.playSuccessSound();
    };

    const playErrorFeedback = () => {
        FeedbackService.playError({ sound: true }); // Plays u-oh sound
        FeedbackService.animateError({ shake: shakeAnim });
    };

    // Handle selecting a block from palette
    const handleBlockSelect = (block: Block) => {
        if (block.placed) return;

        if (selectedBlock?.id === block.id) {
            // Deselect if same block tapped again
            setSelectedBlock(null);
        } else {
            setSelectedBlock(block);
        }
    };

    // Handle tapping a grid cell to place selected block
    const handleCellTap = (row: number, col: number) => {
        if (!selectedBlock) return;

        if (canPlaceBlock(selectedBlock, row, col)) {
            placeBlock(selectedBlock, row, col);
            setSelectedBlock(null);
        } else {
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

    const filledCells = grid.flat().filter(c => c.filled).length;
    const totalCells = GRID_SIZE * GRID_SIZE;
    const progress = filledCells / totalCells;

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.6],
    });

    const gridRotationInterpolate = rotationAnim.interpolate({
        inputRange: [0, 90, 180, 270, 360],
        outputRange: ['0deg', '90deg', '180deg', '270deg', '360deg'],
    });

    return (
        <ImageBackground source={BACKGROUND_IMAGE} style={styles.container} resizeMode="cover">
            <View style={styles.darkOverlay} />
            {/* Countdown Overlay - shows greeting and countdown before game starts */}
            {!gameReady && (
                <CountdownOverlay
                    message="Uzay Blokları oyununa hoş geldin! Blokları yerleştirmeme yardım eder misin?"
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => setGameReady(true)}
                />
            )}
            {/* Starry background - şimdi daha soft animasyonlu yıldızlar */}
            <View style={styles.starsContainer}>
                {[...Array(30)].map((_, i) => (
                    <Animated.View
                        key={i}
                        style={[
                            styles.star,
                            {
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                opacity: starAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.2 + (i % 5) * 0.1, 0.5 + (i % 3) * 0.1],
                                }),
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

                <View style={styles.progressContainerHeader}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
                </View>
            </View>

            {/* Portrait mode hint for mobile */}
            {!isWeb && (
                <View style={styles.portraitHint}>
                    <Text style={styles.portraitHintText}>📱 Dikey modda oyna</Text>
                </View>
            )}

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Instruction for tap-to-place */}
                {selectedBlock && (
                    <View style={styles.instructionBanner}>
                        <Text style={styles.instructionText}>👆 Yerleştirmek için ızgaraya dokun</Text>
                    </View>
                )}

                {/* Grid Area with Rotation */}
                <View style={styles.gridContainer}>
                    <Animated.View
                        style={[
                            styles.grid,
                            { transform: [{ rotate: gridRotationInterpolate }, { translateX: shakeAnim }] }
                        ]}
                    >
                        <Animated.View style={[styles.gridGlow, { opacity: glowOpacity }]} />
                        {grid.map((row, rowIndex) => (
                            <View key={rowIndex} style={styles.gridRow}>
                                {row.map((cell, colIndex) => (
                                    <TouchableOpacity
                                        key={`${rowIndex}-${colIndex}`}
                                        onPress={() => handleCellTap(rowIndex, colIndex)}
                                        activeOpacity={0.7}
                                        style={[
                                            styles.gridCell,
                                            cell.filled && { backgroundColor: cell.color || 'transparent' },
                                            selectedBlock && !cell.filled && styles.gridCellHighlight,
                                        ]}
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

                {/* Control Buttons - Rotate Grid & Undo */}
                <View style={styles.controlsRow}>
                    <TouchableOpacity style={styles.controlButton} onPress={handleRotateGrid}>
                        <Ionicons name="refresh" size={24} color="#FFF" />
                        <Text style={styles.controlButtonText}>Alanı Döndür</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.controlButton, styles.undoButton]}
                        onPress={handleUndo}
                        disabled={!blocks.some(b => b.placed)}
                    >
                        <Ionicons name="arrow-undo" size={24} color="#FFF" />
                        <Text style={styles.controlButtonText}>Geri Al</Text>
                    </TouchableOpacity>
                </View>

                {/* Blocks Palette - Tap to Select */}
                <View style={styles.blocksContainer}>
                    <Text style={styles.blocksTitle}>
                        {selectedBlock ? '✅ Blok seçildi! Izgaraya dokun.' : '👆 Bir blok seç:'}
                    </Text>
                    <View style={styles.blocksPalette}>
                        {blocks.filter(b => !b.placed).map(block => {
                            const isSelected = selectedBlock?.id === block.id;

                            return (
                                <TouchableOpacity
                                    key={block.id}
                                    onPress={() => handleBlockSelect(block)}
                                    activeOpacity={0.7}
                                    style={[
                                        styles.blockWrapper,
                                        isSelected && styles.blockWrapperSelected,
                                    ]}
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
                            );
                        })}
                    </View>
                </View>
            </ScrollView>

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
            )}

            {/* Confetti */}
            {showConfetti && (
                <ConfettiCannon
                    count={200}
                    origin={{ x: screenW / 2, y: 0 }}
                    fallSpeed={3000}
                    fadeOut
                />
            )}



            {/* Game Complete Overlay */}
            {isGameComplete && !rocketLaunch && (
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
            )}
        </ImageBackground>
    );
}

// ============= STYLES =============
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 10, 26, 0.5)',
    },
    starsContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
    },
    star: {
        position: 'absolute',
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#FFF',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'web' ? 20 : 50,
        paddingBottom: 10,
    },
    exitBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 15,
    },
    timerIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    timerBar: {
        flex: 1,
        height: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    timerFill: {
        height: '100%',
        backgroundColor: '#39FF14',
        borderRadius: 4,
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
        borderRadius: 8,
    },
    progressText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
    },
    gridContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    grid: {
        flexDirection: 'column',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 8,
        borderWidth: 2,
        borderColor: 'rgba(191, 64, 191, 0.5)',
    },
    gridGlow: {
        position: 'absolute',
        top: -10,
        left: -10,
        right: -10,
        bottom: -10,
        borderRadius: 20,
        backgroundColor: '#39FF14',
    },
    gridRow: {
        flexDirection: 'row',
    },
    gridCell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 4,
        margin: 2,
    },
    cellStar: {
        fontSize: isWeb ? 20 : 16,
    },
    controlsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        paddingVertical: 10,
    },
    controlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#BF40BF',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 8,
    },
    undoButton: {
        backgroundColor: '#FF6B6B',
    },
    controlButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    blocksContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    blocksTitle: {
        color: '#AAA',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 10,
    },
    blocksPalette: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 15,
        // Prevent text selection on web
        ...(isWeb && {
            userSelect: 'none',
            WebkitUserSelect: 'none',
        }),
    } as any,
    blockWrapper: {
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        // Prevent text selection and improve drag on web
        ...(isWeb && {
            cursor: 'grab',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none',
        }),
    } as any,
    blockShape: {
        flexDirection: 'column',
    },
    blockRow: {
        flexDirection: 'row',
    },
    blockCell: {
        width: BLOCK_CELL_SIZE,
        height: BLOCK_CELL_SIZE,
        borderRadius: 4,
        margin: 1,
    },
    blockCellEmpty: {
        backgroundColor: 'transparent',
    },
    rocketContainer: {
        position: 'absolute',
        bottom: 50,
        alignSelf: 'center',
        alignItems: 'center',
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
    completeOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    completeCard: {
        backgroundColor: '#1a1a2e',
        padding: 40,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#BF40BF',
    },
    completeEmoji: {
        fontSize: 60,
        marginBottom: 15,
    },
    completeTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
    },
    completeText: {
        fontSize: 16,
        color: '#AAA',
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
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    portraitHint: {
        alignItems: 'center',
        paddingVertical: 6,
        backgroundColor: 'rgba(191, 64, 191, 0.15)',
        borderRadius: 8,
        marginHorizontal: 60,
        marginBottom: 5,
    },
    portraitHintText: {
        color: '#BF40BF',
        fontSize: 12,
        fontWeight: '600',
    },
    instructionBanner: {
        backgroundColor: 'rgba(57, 255, 20, 0.2)',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginHorizontal: 20,
        marginBottom: 10,
        alignItems: 'center',
    },
    instructionText: {
        color: '#39FF14',
        fontSize: 16,
        fontWeight: 'bold',
    },
    gridCellHighlight: {
        borderColor: '#39FF14',
        borderWidth: 2,
        backgroundColor: 'rgba(57, 255, 20, 0.15)',
    },
    blockWrapperSelected: {
        borderWidth: 3,
        borderColor: '#39FF14',
        backgroundColor: 'rgba(57, 255, 20, 0.3)',
        transform: [{ scale: 1.1 }],
    },
});

