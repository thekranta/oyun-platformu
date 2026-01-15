import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    View
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Svg, { Line } from 'react-native-svg';
import CountdownOverlay from './CountdownOverlay';

// ============= TYPES =============
interface RenkliBaglantalarProps {
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

interface Ball {
    id: string;
    row: number;
    col: number;
    color: string;
    isPopping: boolean;
}

// ============= CONFIG =============
const { width: screenW, height: screenH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const GRID_SIZE = 3;
const BALL_SIZE = isWeb ? 80 : Math.min(80, (screenW - 100) / GRID_SIZE);
const CELL_SIZE = BALL_SIZE + 20;
const MAX_POPS = 6;

// Modern, vibrant colors
const BALL_COLORS = ['#FF6B9D', '#4ECDC4']; // Pink & Teal

// ============= MAIN COMPONENT =============
export default function RenkliBaglantalar({ onGameEnd, onExit, childName = 'Tuna' }: RenkliBaglantalarProps) {
    const [balls, setBalls] = useState<Ball[]>([]);
    const [selectedBalls, setSelectedBalls] = useState<Ball[]>([]);
    const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
    const [popCount, setPopCount] = useState(0);
    const [score, setScore] = useState(0);
    const [errors, setErrors] = useState(0);
    const [gameStart] = useState(Date.now());
    const [isGameComplete, setIsGameComplete] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [moveHistory, setMoveHistory] = useState<any[]>([]);
    const [gameReady, setGameReady] = useState(false);

    // Grid layout ref
    const gridRef = useRef<View>(null);
    const [gridLayout, setGridLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

    // Animations
    const floatingAnim = useRef(new Animated.Value(0)).current;
    const ballAnims = useRef<{ [key: string]: Animated.Value }>({});

    // Initialize game
    useEffect(() => {
        initializeGame();
        startFloatingAnimation();
    }, []);

    const startFloatingAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatingAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
                Animated.timing(floatingAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
            ])
        ).start();
    };



    const initializeGame = () => {
        const newBalls: Ball[] = [];
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const ballId = `ball-${row}-${col}`;
                newBalls.push({
                    id: ballId,
                    row,
                    col,
                    color: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)],
                    isPopping: false,
                });
                ballAnims.current[ballId] = new Animated.Value(1);
            }
        }
        setBalls(newBalls);
        setSelectedBalls([]);
        setCurrentPath([]);
    };

    const getBallPosition = (ball: Ball) => {
        return {
            x: ball.col * CELL_SIZE + CELL_SIZE / 2,
            y: ball.row * CELL_SIZE + CELL_SIZE / 2,
        };
    };

    const findBallAtPosition = (x: number, y: number): Ball | null => {
        for (const ball of balls) {
            if (ball.isPopping) continue;
            const pos = getBallPosition(ball);
            const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
            if (distance < BALL_SIZE / 2 + 10) {
                return ball;
            }
        }
        return null;
    };

    const isAdjacent = (ball1: Ball, ball2: Ball): boolean => {
        const rowDiff = Math.abs(ball1.row - ball2.row);
        const colDiff = Math.abs(ball1.col - ball2.col);
        // Adjacent: horizontally, vertically, or diagonally
        return (rowDiff <= 1 && colDiff <= 1) && !(rowDiff === 0 && colDiff === 0);
    };

    const handlePop = (poppedBalls: Ball[]) => {
        if (poppedBalls.length < 3) {
            setErrors(prev => prev + 1);
            setMoveHistory(prev => [...prev, { type: 'error', count: poppedBalls.length }]);
            return;
        }

        // Animate pop
        poppedBalls.forEach(ball => {
            Animated.sequence([
                Animated.timing(ballAnims.current[ball.id], {
                    toValue: 1.4,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(ballAnims.current[ball.id], {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        });

        // Mark balls as popping
        setBalls(prev => prev.map(b =>
            poppedBalls.some(pb => pb.id === b.id) ? { ...b, isPopping: true } : b
        ));

        // After animation, drop new balls
        setTimeout(() => {
            dropNewBalls(poppedBalls);

            const newPopCount = popCount + 1;
            setPopCount(newPopCount);
            setScore(prev => prev + poppedBalls.length * 50);
            setMoveHistory(prev => [...prev, { type: 'pop', count: poppedBalls.length }]);

            // Check game end
            if (newPopCount >= MAX_POPS) {
                setIsGameComplete(true);
                setShowConfetti(true);
                setTimeout(finishGame, 2500);
            }
        }, 400);
    };

    const dropNewBalls = (poppedBalls: Ball[]) => {
        // Group popped balls by column
        const poppedByCol: { [col: number]: number[] } = {};
        poppedBalls.forEach(b => {
            if (!poppedByCol[b.col]) poppedByCol[b.col] = [];
            poppedByCol[b.col].push(b.row);
        });

        setBalls(prev => {
            const newBalls = [...prev];

            // For each column, shift balls down and add new ones
            Object.keys(poppedByCol).forEach(colStr => {
                const col = parseInt(colStr);
                const poppedRows = poppedByCol[col].sort((a, b) => b - a); // Sort descending

                // Get non-popped balls in this column, sorted by row (bottom to top)
                const colBalls = newBalls
                    .filter(b => b.col === col && !b.isPopping)
                    .sort((a, b) => b.row - a.row);

                // Assign new rows (bottom up)
                let nextRow = GRID_SIZE - 1;
                colBalls.forEach(b => {
                    b.row = nextRow;
                    nextRow--;
                });

                // Add new balls at top
                const newBallsCount = poppedRows.length;
                for (let i = 0; i < newBallsCount; i++) {
                    const newBallId = `ball-${Date.now()}-${col}-${i}`;
                    const newBall: Ball = {
                        id: newBallId,
                        row: i,
                        col,
                        color: BALL_COLORS[Math.floor(Math.random() * BALL_COLORS.length)],
                        isPopping: false,
                    };
                    ballAnims.current[newBallId] = new Animated.Value(1);
                    newBalls.push(newBall);
                }
            });

            // Remove popped balls
            return newBalls.filter(b => !b.isPopping);
        });
    };

    const finishGame = () => {
        const duration = Math.floor((Date.now() - gameStart) / 1000);
        onGameEnd('renkli-baglantalar', duration, popCount, errors, null, {
            pop_count: popCount,
            total_score: score,
            error_count: errors,
            moveHistory,
        });
    };

    // Pan responder for drag-connect
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const touch = evt.nativeEvent;
                // Use page coordinates and subtract grid offset for reliability
                const x = touch.pageX - gridLayout.x;
                const y = touch.pageY - gridLayout.y;

                const ball = findBallAtPosition(x, y);
                if (ball) {
                    setIsDragging(true);
                    setSelectedBalls([ball]);
                    const pos = getBallPosition(ball);
                    setCurrentPath([{ x: pos.x, y: pos.y }]);
                }
            },
            onPanResponderMove: (evt) => {
                if (!isDragging) return;

                const touch = evt.nativeEvent;
                const x = touch.pageX - gridLayout.x;
                const y = touch.pageY - gridLayout.y;

                // Update current path endpoint
                setCurrentPath(prev => {
                    if (prev.length === 0) return prev;
                    const newPath = [...prev];
                    // Keep start points, update end point
                    if (newPath.length > selectedBalls.length) {
                        newPath.pop();
                    }
                    newPath.push({ x, y });
                    return newPath;
                });

                const ball = findBallAtPosition(x, y);
                if (ball && !selectedBalls.some(sb => sb.id === ball.id)) {
                    const lastBall = selectedBalls[selectedBalls.length - 1];
                    if (lastBall && isAdjacent(lastBall, ball) && ball.color === lastBall.color) {
                        setSelectedBalls(prev => [...prev, ball]);
                        const pos = getBallPosition(ball);
                        setCurrentPath(prev => {
                            const newPath = prev.slice(0, -1); // Remove trailing point
                            newPath.push({ x: pos.x, y: pos.y });
                            newPath.push({ x, y }); // Add new trailing point
                            return newPath;
                        });
                    }
                }
            },
            onPanResponderRelease: () => {
                if (selectedBalls.length >= 3) {
                    handlePop(selectedBalls);
                } else if (selectedBalls.length > 0) {
                    setErrors(prev => prev + 1);
                }
                setIsDragging(false);
                setSelectedBalls([]);
                setCurrentPath([]);
            },
        })
    ).current;

    // Floating animation
    const floatingTranslate = floatingAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 10],
    });

    const progress = popCount / MAX_POPS;

    return (
        <View style={styles.container}>
            {/* Countdown Overlay */}
            {!gameReady && (
                <CountdownOverlay
                    message="Aynı renk topları birbirine bağla ve patlat!"
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => setGameReady(true)}
                />
            )}
            {/* Background with floating elements */}
            <View style={styles.background}>
                {[...Array(6)].map((_, i) => (
                    <Animated.View
                        key={i}
                        style={[
                            styles.floatingBubble,
                            {
                                top: `${15 + (i * 15) % 70}%`,
                                left: `${5 + (i * 18) % 85}%`,
                                opacity: 0.15,
                                transform: [
                                    { translateY: floatingTranslate },
                                    { scale: 0.4 + (i % 3) * 0.3 },
                                ],
                            },
                        ]}
                    >
                        <Text style={{ fontSize: 35 }}>
                            {['🫧', '✨', '💫', '🌟', '🎈', '🦋'][i]}
                        </Text>
                    </Animated.View>
                ))}
            </View>

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.exitBtn} onTouchEnd={onExit}>
                    <Ionicons name="home" size={22} color="#FFF" />
                </View>

                <View style={styles.popCounter}>
                    <Text style={styles.popEmoji}>💥</Text>
                    <Text style={styles.popText}>{popCount}/{MAX_POPS}</Text>
                </View>

                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
            </View>

            {/* Instruction */}
            <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>
                    3+ aynı renk topu sürükle ve bağla! 🎯
                </Text>
            </View>

            {/* Game Grid */}
            <View style={styles.gameArea}>
                <View
                    ref={gridRef}
                    style={[
                        styles.gridContainer,
                        {
                            width: GRID_SIZE * CELL_SIZE,
                            height: GRID_SIZE * CELL_SIZE,
                        }
                    ]}
                    onLayout={(e) => {
                        gridRef.current?.measureInWindow((x, y, width, height) => {
                            setGridLayout({ x, y, width, height });
                        });
                    }}
                    {...panResponder.panHandlers}
                >
                    {/* Connection Lines */}
                    <Svg style={StyleSheet.absoluteFill}>
                        {currentPath.length > 1 && currentPath.slice(0, -1).map((point, idx) => (
                            <Line
                                key={idx}
                                x1={point.x}
                                y1={point.y}
                                x2={currentPath[idx + 1].x}
                                y2={currentPath[idx + 1].y}
                                stroke={selectedBalls[0]?.color || '#FFF'}
                                strokeWidth={8}
                                strokeLinecap="round"
                                opacity={0.7}
                            />
                        ))}
                    </Svg>

                    {/* Balls */}
                    {balls.filter(b => !b.isPopping).map(ball => {
                        const pos = getBallPosition(ball);
                        const isSelected = selectedBalls.some(sb => sb.id === ball.id);
                        const scaleAnim = ballAnims.current[ball.id] || new Animated.Value(1);

                        return (
                            <Animated.View
                                key={ball.id}
                                style={[
                                    styles.ballContainer,
                                    {
                                        left: pos.x - BALL_SIZE / 2,
                                        top: pos.y - BALL_SIZE / 2,
                                        width: BALL_SIZE,
                                        height: BALL_SIZE,
                                        transform: [{ scale: scaleAnim }],
                                    },
                                ]}
                            >
                                <View
                                    style={[
                                        styles.ball,
                                        {
                                            backgroundColor: ball.color,
                                            width: BALL_SIZE,
                                            height: BALL_SIZE,
                                            borderRadius: BALL_SIZE / 2,
                                        },
                                        isSelected && styles.ballSelected,
                                    ]}
                                >
                                    {/* Inner glow */}
                                    <View style={styles.ballInnerGlow} />
                                    {/* Highlight */}
                                    <View style={styles.ballHighlight} />
                                </View>
                            </Animated.View>
                        );
                    })}
                </View>
            </View>

            {/* Score Display */}
            <View style={styles.scoreContainer}>
                <View style={styles.scoreBox}>
                    <Text style={styles.scoreLabel}>Puan</Text>
                    <Text style={styles.scoreValue}>{score}</Text>
                </View>
                <View style={styles.scoreBox}>
                    <Text style={styles.scoreLabel}>Hata</Text>
                    <Text style={[styles.scoreValue, { color: '#FF6B6B' }]}>{errors}</Text>
                </View>
            </View>

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
            {isGameComplete && (
                <View style={styles.completeOverlay}>
                    <View style={styles.completeCard}>
                        <Text style={styles.completeEmoji}>🎉🫧</Text>
                        <Text style={styles.completeTitle}>Harika!</Text>
                        <Text style={styles.completeText}>Tüm topları patlattın!</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Puan</Text>
                                <Text style={styles.statValue}>{score}</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Patlatma</Text>
                                <Text style={styles.statValue}>{popCount}</Text>
                            </View>
                        </View>
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
        backgroundColor: '#1a1a2e',
    },
    background: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' as any,
    },
    floatingBubble: {
        position: 'absolute',
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
    popCounter: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,107,157,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(255,107,157,0.4)',
    },
    popEmoji: {
        fontSize: 18,
        marginRight: 6,
    },
    popText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    progressBar: {
        height: 12,
        width: 100,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 6,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4ECDC4',
        borderRadius: 6,
    },
    instructionContainer: {
        alignItems: 'center',
        marginVertical: 10,
    },
    instructionText: {
        color: '#FFF',
        fontSize: isWeb ? 18 : 16,
        fontWeight: '600',
        opacity: 0.9,
    },
    gameArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gridContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 24,
        position: 'relative',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    ballContainer: {
        position: 'absolute',
    },
    ball: {
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 10,
    },
    ballSelected: {
        borderWidth: 4,
        borderColor: '#FFF',
    },
    ballInnerGlow: {
        position: 'absolute',
        width: '60%',
        height: '60%',
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    ballHighlight: {
        position: 'absolute',
        top: '12%',
        left: '18%',
        width: '28%',
        height: '28%',
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.5)',
    },
    scoreContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 25,
        paddingVertical: 20,
    },
    scoreBox: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 18,
    },
    scoreLabel: {
        fontSize: 13,
        color: '#AAA',
        marginBottom: 4,
    },
    scoreValue: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#FFF',
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
        borderRadius: 28,
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#4ECDC4',
    },
    completeEmoji: {
        fontSize: 60,
        marginBottom: 15,
    },
    completeTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 8,
    },
    completeText: {
        fontSize: 17,
        color: '#AAA',
        marginBottom: 24,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 20,
    },
    statBox: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 14,
    },
    statLabel: {
        fontSize: 13,
        color: '#AAA',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#FFF',
    },
});
