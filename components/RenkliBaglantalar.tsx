import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
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
import Svg, { Defs, Line, LinearGradient, Stop } from 'react-native-svg';
import { speak } from '../services/speechService';

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

interface Dot {
    id: string;
    row: number;
    col: number;
    color: string;
    connected: boolean;
    pairId: string;
}

interface Connection {
    from: Dot;
    to: Dot;
    color: string;
}

interface LevelConfig {
    level_id: number;
    grid_size: [number, number];
    colors: string[];
    target_connections: number;
    academic_metrics: string[];
}

// ============= LEVELS =============
const LEVELS: LevelConfig[] = [
    {
        level_id: 1,
        grid_size: [3, 3],
        colors: ['#FF5E5E', '#FFD93D', '#6BCB77'],
        target_connections: 3,
        academic_metrics: ['visual_tracking', 'color_matching']
    },
    {
        level_id: 2,
        grid_size: [4, 4],
        colors: ['#FF5E5E', '#FFD93D', '#6BCB77', '#4ECDC4'],
        target_connections: 4,
        academic_metrics: ['visual_tracking', 'color_matching', 'spatial_reasoning']
    },
    {
        level_id: 3,
        grid_size: [4, 4],
        colors: ['#FF5E5E', '#FFD93D', '#6BCB77', '#4ECDC4', '#A855F7'],
        target_connections: 5,
        academic_metrics: ['visual_tracking', 'color_matching', 'spatial_reasoning', 'working_memory']
    },
];

// ============= CONFIG =============
const { width: screenW, height: screenH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// ============= MAIN COMPONENT =============
export default function RenkliBaglantalar({ onGameEnd, onExit, childName = 'Tuna' }: RenkliBaglantalarProps) {
    const [currentLevel, setCurrentLevel] = useState(0);
    const [dots, setDots] = useState<Dot[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [selectedDot, setSelectedDot] = useState<Dot | null>(null);
    const [drawingLine, setDrawingLine] = useState<{ startDot: Dot; currentX: number; currentY: number } | null>(null);
    const [errors, setErrors] = useState(0);
    const [score, setScore] = useState(0);
    const [gameStart] = useState(Date.now());
    const [isGameComplete, setIsGameComplete] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [moveHistory, setMoveHistory] = useState<any[]>([]);

    // Grid layout ref for coordinate calculations
    const gridRef = useRef<View>(null);
    const [gridLayout, setGridLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

    // Animations
    const pulseAnims = useRef<{ [key: string]: Animated.Value }>({});
    const glowAnim = useRef(new Animated.Value(0)).current;
    const floatingAnim = useRef(new Animated.Value(0)).current;

    // Current level config
    const levelConfig = LEVELS[currentLevel];
    const DOT_SIZE = isWeb ? 60 : Math.min(60, (screenW - 80) / levelConfig.grid_size[1]);
    const CELL_SIZE = DOT_SIZE * 1.8;

    // Initialize level
    useEffect(() => {
        initializeLevel();
        playGreeting();
        startFloatingAnimation();
    }, [currentLevel]);

    const startFloatingAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatingAnim, { toValue: 1, duration: 3000, useNativeDriver: true }),
                Animated.timing(floatingAnim, { toValue: 0, duration: 3000, useNativeDriver: true }),
            ])
        ).start();
    };

    const playGreeting = async () => {
        if (Platform.OS === 'web') {
            setIsSpeaking(true);
            try {
                await speak(
                    `Merhaba ${childName}! Haydi, aynı renkleri el ele tutuştur!`,
                    { voice: 'nova' }
                );
            } catch (e) {
                console.log('TTS error:', e);
            } finally {
                setIsSpeaking(false);
            }
        }
    };

    const initializeLevel = () => {
        const config = LEVELS[currentLevel];
        const [rows, cols] = config.grid_size;
        const newDots: Dot[] = [];

        // Create pairs of dots for each color
        config.colors.slice(0, config.target_connections).forEach((color, colorIdx) => {
            // Generate two random positions for each color pair
            const positions: { row: number; col: number }[] = [];
            while (positions.length < 2) {
                const row = Math.floor(Math.random() * rows);
                const col = Math.floor(Math.random() * cols);
                const posKey = `${row}-${col}`;

                // Check if position is already taken
                const isTaken = newDots.some(d => d.row === row && d.col === col) ||
                    positions.some(p => p.row === row && p.col === col);

                if (!isTaken) {
                    positions.push({ row, col });
                }
            }

            // Create two dots with same color
            const pairId = `pair-${colorIdx}`;
            positions.forEach((pos, idx) => {
                const dotId = `dot-${colorIdx}-${idx}`;
                newDots.push({
                    id: dotId,
                    row: pos.row,
                    col: pos.col,
                    color,
                    connected: false,
                    pairId,
                });
                // Initialize pulse animation for each dot
                pulseAnims.current[dotId] = new Animated.Value(1);
            });
        });

        setDots(newDots);
        setConnections([]);
        setSelectedDot(null);
    };

    const getDotPosition = (dot: Dot) => {
        const [rows, cols] = levelConfig.grid_size;
        const gridWidth = cols * CELL_SIZE;
        const gridHeight = rows * CELL_SIZE;

        return {
            x: (dot.col + 0.5) * CELL_SIZE,
            y: (dot.row + 0.5) * CELL_SIZE,
        };
    };

    const handleDotPress = (dot: Dot) => {
        if (dot.connected) return;

        // Pulse animation
        Animated.sequence([
            Animated.timing(pulseAnims.current[dot.id], { toValue: 1.3, duration: 150, useNativeDriver: true }),
            Animated.timing(pulseAnims.current[dot.id], { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();

        if (!selectedDot) {
            // First dot selected
            setSelectedDot(dot);
            if (Platform.OS !== 'web') Vibration.vibrate(30);
        } else {
            // Second dot selected
            if (selectedDot.id === dot.id) {
                // Same dot - deselect
                setSelectedDot(null);
            } else if (selectedDot.color === dot.color && selectedDot.pairId === dot.pairId) {
                // Correct match!
                const newConnection: Connection = {
                    from: selectedDot,
                    to: dot,
                    color: dot.color,
                };
                setConnections(prev => [...prev, newConnection]);

                // Mark dots as connected
                setDots(prev => prev.map(d =>
                    d.id === selectedDot.id || d.id === dot.id
                        ? { ...d, connected: true }
                        : d
                ));

                setScore(prev => prev + 100);
                setMoveHistory(prev => [...prev, { type: 'correct', from: selectedDot.id, to: dot.id }]);
                playSuccessFeedback();
                setSelectedDot(null);

                // Check if level complete
                const remainingPairs = dots.filter(d => !d.connected && d.id !== selectedDot.id && d.id !== dot.id).length / 2;
                if (remainingPairs === 0) {
                    handleLevelComplete();
                }
            } else {
                // Wrong match
                setErrors(prev => prev + 1);
                setMoveHistory(prev => [...prev, { type: 'error', from: selectedDot.id, to: dot.id }]);
                playErrorFeedback();
                setSelectedDot(null);
            }
        }
    };

    const playSuccessFeedback = () => {
        Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
        if (Platform.OS !== 'web') {
            Vibration.vibrate([0, 50, 30, 50]);
        }
        // Play pop sound effect could be added here
    };

    const playErrorFeedback = () => {
        if (Platform.OS !== 'web') {
            Vibration.vibrate([0, 100, 50, 100]);
        }
    };

    const handleLevelComplete = () => {
        if (currentLevel < LEVELS.length - 1) {
            // Next level
            setTimeout(() => {
                setCurrentLevel(prev => prev + 1);
            }, 1500);
        } else {
            // Game complete
            setIsGameComplete(true);
            setShowConfetti(true);
            setTimeout(finishGame, 3000);
        }
    };

    const finishGame = () => {
        const duration = Math.floor((Date.now() - gameStart) / 1000);
        onGameEnd('renkli-baglantalar', duration, connections.length * 2, errors, null, {
            visual_tracking_score: Math.max(0, 100 - errors * 10),
            color_matching_accuracy: connections.length > 0 ? (connections.length / (connections.length + errors)) * 100 : 0,
            levels_completed: currentLevel + 1,
            moveHistory,
        });
    };

    // Calculate progress
    const totalPairs = levelConfig.target_connections;
    const connectedPairs = connections.length;
    const progress = connectedPairs / totalPairs;

    // Floating background objects animation
    const floatingTranslate = floatingAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 15],
    });

    return (
        <View style={styles.container}>
            {/* Gradient Background with floating objects */}
            <View style={styles.backgroundGradient}>
                {/* Floating decorative elements */}
                {[...Array(8)].map((_, i) => (
                    <Animated.View
                        key={i}
                        style={[
                            styles.floatingObject,
                            {
                                top: `${10 + (i * 12) % 80}%`,
                                left: `${5 + (i * 15) % 90}%`,
                                opacity: 0.15,
                                transform: [
                                    { translateY: floatingTranslate },
                                    { scale: 0.5 + (i % 3) * 0.3 },
                                ],
                            },
                        ]}
                    >
                        <Text style={{ fontSize: 30 }}>
                            {['⭐', '🌙', '💫', '✨', '🎈', '🦋', '🌸', '🍀'][i]}
                        </Text>
                    </Animated.View>
                ))}
            </View>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.exitBtn}>
                    <Ionicons name="home" size={22} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.levelBadge}>
                    <Text style={styles.levelText}>Seviye {currentLevel + 1}</Text>
                </View>

                <View style={styles.progressContainer}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    <Text style={styles.progressText}>{connectedPairs}/{totalPairs}</Text>
                </View>
            </View>

            {/* Main Game Area */}
            <View style={styles.gameArea}>
                {/* Left side - Character instruction (web only) */}
                {isWeb && (
                    <View style={styles.characterPanel}>
                        <View style={styles.characterBubble}>
                            <Text style={styles.characterEmoji}>🐦</Text>
                            <Text style={styles.characterName}>Maviş</Text>
                        </View>
                        <View style={styles.speechBubble}>
                            <Text style={styles.speechText}>
                                Aynı renkteki noktaları birleştir! 🎨
                            </Text>
                        </View>
                    </View>
                )}

                {/* Center - Game Grid */}
                <View
                    ref={gridRef}
                    style={styles.gridContainer}
                    onLayout={(e) => {
                        gridRef.current?.measureInWindow((x, y, width, height) => {
                            setGridLayout({ x, y, width, height });
                        });
                    }}
                >
                    {/* SVG for connections */}
                    <Svg
                        style={StyleSheet.absoluteFill}
                        width={levelConfig.grid_size[1] * CELL_SIZE}
                        height={levelConfig.grid_size[0] * CELL_SIZE}
                    >
                        <Defs>
                            {connections.map((conn, idx) => (
                                <LinearGradient key={`grad-${idx}`} id={`gradient-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                    <Stop offset="0%" stopColor={conn.color} stopOpacity="1" />
                                    <Stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.8" />
                                    <Stop offset="100%" stopColor={conn.color} stopOpacity="1" />
                                </LinearGradient>
                            ))}
                        </Defs>

                        {/* Draw connections */}
                        {connections.map((conn, idx) => {
                            const fromPos = getDotPosition(conn.from);
                            const toPos = getDotPosition(conn.to);
                            return (
                                <React.Fragment key={idx}>
                                    {/* Glow effect */}
                                    <Line
                                        x1={fromPos.x}
                                        y1={fromPos.y}
                                        x2={toPos.x}
                                        y2={toPos.y}
                                        stroke={conn.color}
                                        strokeWidth={12}
                                        strokeLinecap="round"
                                        opacity={0.3}
                                    />
                                    {/* Main line */}
                                    <Line
                                        x1={fromPos.x}
                                        y1={fromPos.y}
                                        x2={toPos.x}
                                        y2={toPos.y}
                                        stroke={`url(#gradient-${idx})`}
                                        strokeWidth={6}
                                        strokeLinecap="round"
                                    />
                                </React.Fragment>
                            );
                        })}
                    </Svg>

                    {/* Dots */}
                    {dots.map(dot => {
                        const pos = getDotPosition(dot);
                        const isSelected = selectedDot?.id === dot.id;
                        const pulseAnim = pulseAnims.current[dot.id] || new Animated.Value(1);

                        return (
                            <Animated.View
                                key={dot.id}
                                style={[
                                    styles.dotContainer,
                                    {
                                        left: pos.x - DOT_SIZE / 2,
                                        top: pos.y - DOT_SIZE / 2,
                                        width: DOT_SIZE,
                                        height: DOT_SIZE,
                                        transform: [{ scale: pulseAnim }],
                                    },
                                ]}
                            >
                                <TouchableOpacity
                                    onPress={() => handleDotPress(dot)}
                                    disabled={dot.connected}
                                    style={[
                                        styles.dot,
                                        {
                                            backgroundColor: dot.color,
                                            width: DOT_SIZE,
                                            height: DOT_SIZE,
                                            borderRadius: DOT_SIZE / 2,
                                            opacity: dot.connected ? 0.5 : 1,
                                        },
                                        isSelected && styles.dotSelected,
                                    ]}
                                    activeOpacity={0.7}
                                >
                                    {/* Inner glow */}
                                    <View style={[styles.dotInnerGlow, { backgroundColor: dot.color }]} />
                                    {/* Highlight */}
                                    <View style={styles.dotHighlight} />
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                </View>

                {/* Right side - Badge Album (web only) */}
                {isWeb && (
                    <View style={styles.badgePanel}>
                        <Text style={styles.badgeTitle}>🏆 Rozetler</Text>
                        <View style={styles.badgeGrid}>
                            {[...Array(6)].map((_, i) => (
                                <View
                                    key={i}
                                    style={[
                                        styles.badgeSlot,
                                        i < currentLevel + 1 && styles.badgeEarned,
                                    ]}
                                >
                                    <Text style={styles.badgeEmoji}>
                                        {i < currentLevel + 1 ? ['⭐', '🌟', '💎'][i] || '🎖️' : '🔒'}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
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
                        <Text style={styles.completeEmoji}>🎉🌈</Text>
                        <Text style={styles.completeTitle}>Tebrikler!</Text>
                        <Text style={styles.completeText}>Tüm renkleri birleştirdin!</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Puan</Text>
                                <Text style={styles.statValue}>{score}</Text>
                            </View>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>Seviye</Text>
                                <Text style={styles.statValue}>{currentLevel + 1}</Text>
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
    backgroundGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#1a1a2e',
        // Gradient effect via linear-gradient would need expo-linear-gradient
    },
    floatingObject: {
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
    levelBadge: {
        backgroundColor: 'rgba(168, 85, 247, 0.3)',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(168, 85, 247, 0.5)',
    },
    levelText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    progressContainer: {
        height: 24,
        width: 100,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    progressFill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: '#6BCB77',
        borderRadius: 12,
    },
    progressText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
    },
    gameArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    characterPanel: {
        width: 150,
        alignItems: 'center',
        marginRight: 30,
    },
    characterBubble: {
        alignItems: 'center',
        marginBottom: 10,
    },
    characterEmoji: {
        fontSize: 50,
    },
    characterName: {
        color: '#4ECDC4',
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 5,
    },
    speechBubble: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 15,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    speechText: {
        color: '#FFF',
        fontSize: 14,
        textAlign: 'center',
    },
    gridContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 24,
        padding: 20,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        position: 'relative',
    },
    badgePanel: {
        width: 150,
        marginLeft: 30,
        alignItems: 'center',
    },
    badgeTitle: {
        color: '#FFD93D',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    badgeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
    },
    badgeSlot: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    badgeEarned: {
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        borderColor: '#FFD700',
    },
    badgeEmoji: {
        fontSize: 24,
    },
    dotContainer: {
        position: 'absolute',
    },
    dot: {
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    dotSelected: {
        borderWidth: 4,
        borderColor: '#FFF',
        transform: [{ scale: 1.1 }],
    },
    dotInnerGlow: {
        position: 'absolute',
        width: '70%',
        height: '70%',
        borderRadius: 100,
        opacity: 0.5,
    },
    dotHighlight: {
        position: 'absolute',
        top: '15%',
        left: '20%',
        width: '30%',
        height: '30%',
        borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    scoreContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 30,
        paddingVertical: 20,
    },
    scoreBox: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 16,
    },
    scoreLabel: {
        fontSize: 12,
        color: '#AAA',
        marginBottom: 4,
    },
    scoreValue: {
        fontSize: 24,
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
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#6BCB77',
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
});
