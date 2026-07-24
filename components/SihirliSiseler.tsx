import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    ImageBackground,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import { asset } from '../lib/assetMap';

// Arka plan görseli
const BACKGROUND_IMAGE = asset('/backgrounds/games/sihirli_siseler_bg.png');

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// High-contrast color palette with symbols for accessibility
const LIQUID_COLORS = [
    { main: '#FF3B3B', light: '#FF6B6B', dark: '#CC2222', symbol: '★', name: 'Kırmızı' },  // Bright Red - Star
    { main: '#FFD700', light: '#FFE44D', dark: '#CCB000', symbol: '●', name: 'Sarı' },     // Vivid Yellow - Circle
    { main: '#1E88E5', light: '#64B5F6', dark: '#1565C0', symbol: '▲', name: 'Mavi' },     // Deep Blue - Triangle
    { main: '#4CAF50', light: '#81C784', dark: '#388E3C', symbol: '◆', name: 'Yeşil' },    // Grass Green - Diamond
    { main: '#9C27B0', light: '#BA68C8', dark: '#7B1FA2', symbol: '♦', name: 'Mor' },      // Purple - Diamond Alt
    { main: '#FF9800', light: '#FFB74D', dark: '#F57C00', symbol: '♥', name: 'Turuncu' },  // Orange - Heart
    { main: '#00BCD4', light: '#4DD0E1', dark: '#0097A7', symbol: '✦', name: 'Turkuaz' },  // Cyan - Sparkle
];

// Responsive sizing
const BOTTLE_HEIGHT = isWeb ? Math.min(220, height * 0.32) : 180;
const BOTTLE_WIDTH = isWeb ? Math.min(70, width * 0.08) : 55;
const LAYER_HEIGHT = BOTTLE_HEIGHT / 4.5;
const MAX_LAYERS = 4;

interface Bottle {
    id: number;
    layers: number[]; // Color indices, bottom to top
}

interface GameState {
    bottles: Bottle[];
    selectedBottle: number | null;
    moves: number;
    startTime: number;
    moveHistory: string[];
    undoCount: number;
    isComplete: boolean;
}

interface SihirliSiselerProps {
    childName: string;
    childAge: number;
    email?: string;
    onClose: () => void;
    onGameEnd?: (data: any) => void;
}

// Supabase config
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

export default function SihirliSiseler({ childName, childAge, email, onClose, onGameEnd }: SihirliSiselerProps) {
    const [gameState, setGameState] = useState<GameState>({
        bottles: [],
        selectedBottle: null,
        moves: 0,
        startTime: Date.now(),
        moveHistory: [],
        undoCount: 0,
        isComplete: false,
    });
    const [showCelebration, setShowCelebration] = useState(false);
    const [confettiPieces, setConfettiPieces] = useState<any[]>([]);
    const [completedBottles, setCompletedBottles] = useState(0); // Track for interactive elements
    const [gameReady, setGameReady] = useState(false);

    // Animations
    const pourAnim = useRef(new Animated.Value(0)).current;
    const selectedGlow = useRef(new Animated.Value(0)).current;
    const selectedGlowLoopRef = useRef<Animated.CompositeAnimation | null>(null);
    const celebrateScale = useRef(new Animated.Value(0)).current;
    const bottleAnims = useRef<Animated.Value[]>([]);

    // Sound refs
    const pourSound = useRef<Audio.Sound | null>(null);
    const completeSound = useRef<Audio.Sound | null>(null);
    const winSound = useRef<Audio.Sound | null>(null);

    // Get difficulty based on age
    const getDifficulty = useCallback(() => {
        if (childAge <= 42) return { bottles: 4, colors: 2, empty: 1 };
        if (childAge <= 54) return { bottles: 5, colors: 3, empty: 1 };
        if (childAge <= 66) return { bottles: 6, colors: 4, empty: 2 };
        return { bottles: 7, colors: 5, empty: 2 };
    }, [childAge]);

    // Initialize game
    const initializeGame = useCallback(() => {
        // Her renk tam olarak bir siseyi doldurur (colors*MAX_LAYERS katman). Dolu sise
        // sayisi renk sayisina esittir; toplam = colors + empty. Eskiden filledBottles
        // bottleCount-empty ile hesaplaniyordu ve renk sayisini asinca fazladan bos sise
        // olusuyordu (ilan edilenden kolay oyun).
        const { colors, empty } = getDifficulty();
        const filledBottles = colors;

        // Create layers for each color
        const allLayers: number[] = [];
        for (let color = 0; color < colors; color++) {
            for (let i = 0; i < MAX_LAYERS; i++) {
                allLayers.push(color);
            }
        }

        // Shuffle layers
        for (let i = allLayers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allLayers[i], allLayers[j]] = [allLayers[j], allLayers[i]];
        }

        // Distribute to bottles
        const bottles: Bottle[] = [];
        for (let i = 0; i < filledBottles; i++) {
            bottles.push({
                id: i,
                layers: allLayers.slice(i * MAX_LAYERS, (i + 1) * MAX_LAYERS),
            });
        }

        // Add empty bottles
        for (let i = 0; i < empty; i++) {
            bottles.push({
                id: filledBottles + i,
                layers: [],
            });
        }

        // Initialize bottle animations
        bottleAnims.current = bottles.map(() => new Animated.Value(0));

        setGameState({
            bottles,
            selectedBottle: null,
            moves: 0,
            startTime: Date.now(),
            moveHistory: [],
            undoCount: 0,
            isComplete: false,
        });
        setShowCelebration(false);
    }, [getDifficulty]);

    useEffect(() => {
        initializeGame();
        loadSounds();
        return () => {
            // Cleanup sounds synchronously
            unloadSounds();
        };
    }, [initializeGame]);

    // Unmount'ta secili sise glow loop'unu durdur
    useEffect(() => () => {
         
        selectedGlowLoopRef.current?.stop();
    }, []);

    // Sound functions
    const loadSounds = async () => {
        try {
            // We'll use placeholder since actual sound files may not exist
            // In production, load actual sound files
        } catch (e) {
            console.log('Sound loading skipped');
        }
    };

    const unloadSounds = async () => {
        if (pourSound.current) await pourSound.current.unloadAsync();
        if (completeSound.current) await completeSound.current.unloadAsync();
        if (winSound.current) await winSound.current.unloadAsync();
    };

    const playSound = async (type: 'pour' | 'complete' | 'win') => {
        // Sound playback placeholder
        // In production, implement actual sound playing
    };

    // Check if a bottle is complete (all same color)
    const isBottleComplete = (bottle: Bottle): boolean => {
        if (bottle.layers.length !== MAX_LAYERS) return false;
        return bottle.layers.every(layer => layer === bottle.layers[0]);
    };

    // Check if game is won
    const checkWin = (bottles: Bottle[]): boolean => {
        return bottles.every(bottle =>
            bottle.layers.length === 0 || isBottleComplete(bottle)
        );
    };

    // Handle bottle tap
    const handleBottleTap = (bottleIndex: number) => {
        if (gameState.isComplete) return;

        const { selectedBottle, bottles } = gameState;

        if (selectedBottle === null) {
            // Select bottle if it has layers
            if (bottles[bottleIndex].layers.length > 0) {
                setGameState(prev => ({ ...prev, selectedBottle: bottleIndex }));

                // Glow animation
                const glowLoop = Animated.loop(
                    Animated.sequence([
                        Animated.timing(selectedGlow, { toValue: 1, duration: 500, useNativeDriver: true }),
                        Animated.timing(selectedGlow, { toValue: 0.5, duration: 500, useNativeDriver: true }),
                    ])
                );
                selectedGlowLoopRef.current = glowLoop;
                glowLoop.start();
            }
        } else if (selectedBottle === bottleIndex) {
            // Deselect
            setGameState(prev => ({ ...prev, selectedBottle: null }));
            selectedGlow.stopAnimation();
            selectedGlow.setValue(0);
        } else {
            // Try to pour
            const sourceBottle = bottles[selectedBottle];
            const targetBottle = bottles[bottleIndex];

            const canPour =
                targetBottle.layers.length < MAX_LAYERS &&
                (targetBottle.layers.length === 0 ||
                    targetBottle.layers[targetBottle.layers.length - 1] === sourceBottle.layers[sourceBottle.layers.length - 1]);

            if (canPour) {
                // Pour animation
                animatePour(selectedBottle, bottleIndex);

                // Update game state
                const newBottles = [...bottles];
                const topColor = sourceBottle.layers[sourceBottle.layers.length - 1];

                // Count consecutive same-color layers from top
                let pourCount = 0;
                for (let i = sourceBottle.layers.length - 1; i >= 0; i--) {
                    if (sourceBottle.layers[i] === topColor &&
                        targetBottle.layers.length + pourCount < MAX_LAYERS) {
                        pourCount++;
                    } else {
                        break;
                    }
                }

                // Transfer layers
                const pouredLayers = newBottles[selectedBottle].layers.splice(-pourCount);
                newBottles[bottleIndex].layers.push(...pouredLayers);

                const newMoves = gameState.moves + 1;
                const newHistory = [...gameState.moveHistory, `${selectedBottle}->${bottleIndex}`];

                // Check for completed bottle and update count
                if (isBottleComplete(newBottles[bottleIndex])) {
                    playSound('complete');
                    animateBottleComplete(bottleIndex);
                    // Update completed bottles count for interactive elements
                    const totalCompleted = newBottles.filter(b => isBottleComplete(b)).length;
                    setCompletedBottles(totalCompleted);
                }

                // Check for win
                const won = checkWin(newBottles);

                setGameState(prev => ({
                    ...prev,
                    bottles: newBottles,
                    selectedBottle: null,
                    moves: newMoves,
                    moveHistory: newHistory,
                    isComplete: won,
                }));

                selectedGlow.stopAnimation();
                selectedGlow.setValue(0);

                if (won) {
                    handleWin(newMoves, newHistory);
                }

                playSound('pour');
            } else {
                // Invalid move - deselect
                setGameState(prev => ({ ...prev, selectedBottle: null }));
                selectedGlow.stopAnimation();
                selectedGlow.setValue(0);
            }
        }
    };

    // Pour animation
    const animatePour = (from: number, to: number) => {
        pourAnim.setValue(0);
        Animated.timing(pourAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    };

    // Bottle complete animation
    const animateBottleComplete = (bottleIndex: number) => {
        if (bottleAnims.current[bottleIndex]) {
            Animated.sequence([
                Animated.timing(bottleAnims.current[bottleIndex], {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(bottleAnims.current[bottleIndex], {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    };

    // Handle win
    const handleWin = async (moves: number, history: string[]) => {
        playSound('win');
        setShowCelebration(true);

        // Celebration animation
        Animated.spring(celebrateScale, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
        }).start();

        // Generate confetti
        const pieces = Array.from({ length: 50 }, (_, i) => ({
            id: i,
            x: Math.random() * width,
            y: -20,
            color: LIQUID_COLORS[i % LIQUID_COLORS.length].main,
            rotation: Math.random() * 360,
            scale: 0.5 + Math.random() * 0.5,
        }));
        setConfettiPieces(pieces);

        // Calculate response time
        const responseTime = Date.now() - gameState.startTime;
        const { colors } = getDifficulty();

        // Determine strategy
        const avgMoveTime = responseTime / moves;
        const strategy = avgMoveTime > 5000 ? 'methodical' : 'trial_error';

        // Save to Supabase - include all required fields
        const difficulty = getDifficulty();
        const gameData = {
            ogrenci_adi: childName,
            email: email || '',
            yas: childAge,
            oyun_turu: 'sihirli-siseler',
            sure: Math.round(responseTime / 1000), // Duration in seconds
            hata_sayisi: 0, // No errors in this game type
            correct_answers: difficulty.colors, // Number of completed bottles
            response_time: responseTime, // Total time in ms
            cognitive_speed_score: Math.max(0, 100 - Math.round(moves / difficulty.colors * 10)), // Score based on efficiency
            zorluk_seviyesi: difficulty.bottles, // Difficulty level = number of bottles
            round_history: JSON.stringify({
                strategy,
                total_moves: moves,
                undo_count: gameState.undoCount,
                move_sequence: history,
                difficulty: difficulty,
                avg_move_time_ms: Math.round(avgMoveTime),
            }),
        };

        try {
            await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                },
                body: JSON.stringify(gameData),
            });
            console.log('✅ Game saved to Supabase');
        } catch (error) {
            console.error('Failed to save game:', error);
        }

        onGameEnd?.(gameData);
    };

    // Render a single bottle
    const renderBottle = (bottle: Bottle, index: number) => {
        const isSelected = gameState.selectedBottle === index;
        const isComplete = isBottleComplete(bottle);

        const bottleScale = bottleAnims.current[index]?.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.1],
        }) || 1;

        return (
            <TouchableOpacity
                key={bottle.id}
                onPress={() => handleBottleTap(index)}
                activeOpacity={0.8}
            >
                <Animated.View
                    style={[
                        styles.bottle,
                        isSelected && styles.bottleSelected,
                        isComplete && styles.bottleComplete,
                        {
                            transform: [{ scale: bottleScale }],
                            shadowOpacity: isSelected ? 0.6 : 0.3,
                        },
                    ]}
                >
                    {/* Bottle neck */}
                    <View style={styles.bottleNeck} />

                    {/* Bottle body with layers */}
                    <View style={styles.bottleBody}>
                        {/* Glass reflection */}
                        <View style={styles.glassReflection} />

                        {/* Liquid layers */}
                        {bottle.layers.map((colorIndex, layerIndex) => (
                            <Animated.View
                                key={layerIndex}
                                style={[
                                    styles.liquidLayer,
                                    {
                                        backgroundColor: LIQUID_COLORS[colorIndex].main,
                                        bottom: layerIndex * LAYER_HEIGHT,
                                        borderTopLeftRadius: layerIndex === bottle.layers.length - 1 ? 8 : 0,
                                        borderTopRightRadius: layerIndex === bottle.layers.length - 1 ? 8 : 0,
                                        height: LAYER_HEIGHT,
                                    },
                                ]}
                            >
                                {/* Liquid shine */}
                                <View style={[styles.liquidShine, { backgroundColor: LIQUID_COLORS[colorIndex].light }]} />

                                {/* Symbol for colorblind accessibility */}
                                <Text style={styles.layerSymbol}>{LIQUID_COLORS[colorIndex].symbol}</Text>

                                {/* Separator line between layers */}
                                {layerIndex < bottle.layers.length - 1 && (
                                    <View style={styles.layerSeparator} />
                                )}
                            </Animated.View>
                        ))}

                        {/* Bubbles for complete bottles */}
                        {isComplete && (
                            <View style={styles.bubbleContainer}>
                                {[...Array(5)].map((_, i) => (
                                    <Animated.View
                                        key={i}
                                        style={[
                                            styles.bubble,
                                            {
                                                left: 10 + Math.random() * 25,
                                                bottom: 20 + Math.random() * 100,
                                                width: 4 + Math.random() * 8,
                                                height: 4 + Math.random() * 8,
                                            },
                                        ]}
                                    />
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Selection glow */}
                    {isSelected && (
                        <Animated.View
                            style={[
                                styles.selectionGlow,
                                { opacity: selectedGlow },
                            ]}
                        />
                    )}
                </Animated.View>
            </TouchableOpacity>
        );
    };

    return (
        <ImageBackground source={BACKGROUND_IMAGE} style={styles.container} resizeMode="cover">
            <View style={styles.darkOverlay} />
            {/* Countdown Overlay */}
            {!gameReady && (
                <CountdownOverlay
                    message="Sihirli Şişeler oyununa hoş geldin! Aynı renk sıvıları birleştir!"
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => setGameReady(true)}
                />
            )}
            <View style={styles.background}>
                {/* Gradient-like Lab Atmosphere */}
                <View style={styles.labGradient} />

                {/* Lab Equipment Decorations */}
                <View style={[styles.labDecor, { left: 20, top: height * 0.15 }]}>
                    <Text style={styles.labDekorEmoji}>🔬</Text>
                </View>
                <View style={[styles.labDecor, { right: 20, top: height * 0.2 }]}>
                    <Text style={styles.labDekorEmoji}>⚗️</Text>
                </View>
                <View style={[styles.labDecor, { left: 30, bottom: height * 0.25 }]}>
                    <Text style={styles.labDekorEmoji}>🧬</Text>
                </View>
                <View style={[styles.labDecor, { right: 30, bottom: height * 0.3 }]}>
                    <Text style={styles.labDekorEmoji}>💡</Text>
                </View>

                {/* Bubbles floating in background */}
                {[...Array(8)].map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.bgBubble,
                            {
                                left: `${10 + (i * 12)}%`,
                                top: `${20 + (i % 3) * 25}%`,
                                width: 10 + (i % 4) * 8,
                                height: 10 + (i % 4) * 8,
                                opacity: 0.3 + (i % 3) * 0.1,
                            },
                        ]}
                    />
                ))}
            </View>

            {/* Left Side Interactive Character - Pıtır */}
            {isWeb && (
                <View style={styles.leftCharacter}>
                    <Text style={[
                        styles.characterEmoji,
                        completedBottles > 0 && styles.characterHappy,
                    ]}>
                        🐥
                    </Text>

                    {completedBottles > 0 && (
                        <View style={styles.speechBubble}>
                            <Text style={styles.speechText}>
                                {completedBottles === 1 ? 'Harika!' : completedBottles >= 2 ? 'Süpersin!' : '👍'}
                            </Text>
                        </View>
                    )}
                    {/* Glowing lamp that reacts to progress */}
                    <View style={[
                        styles.reactiveLamp,
                        { backgroundColor: completedBottles > 0 ? '#FFD700' : '#555' },
                        completedBottles > 2 && styles.lampGlowing,
                    ]}>
                        <Text style={styles.lampEmoji}>💡</Text>
                    </View>
                </View>
            )}

            {/* Right Side Interactive Character - Filo */}
            {isWeb && (
                <View style={styles.rightCharacter}>
                    <Text style={[
                        styles.characterEmoji,
                        completedBottles > 1 && styles.characterHappy,
                    ]}>
                        🐸
                    </Text>

                    {completedBottles > 1 && (
                        <View style={styles.speechBubble}>
                            <Text style={styles.speechText}>
                                {completedBottles >= 3 ? 'Dahisin!' : 'Çok iyi! 🎉'}
                            </Text>
                        </View>
                    )}
                    {/* Progress indicator */}
                    <View style={styles.progressMeter}>
                        <View style={[styles.progressFill, { height: `${Math.min(completedBottles * 25, 100)}%` }]} />
                    </View>
                </View>
            )}

            {/* Header - simplified */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>🧪 Sihirli Şişeler</Text>
                <TouchableOpacity onPress={initializeGame} style={styles.restartIconButton}>
                    <Ionicons name="refresh" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Bottles Grid - Centered with responsive gap */}
            <View style={styles.bottlesContainer}>
                <View style={[styles.bottlesGrid, isWeb && styles.bottlesGridWeb]}>
                    {gameState.bottles.map((bottle, index) => renderBottle(bottle, index))}
                </View>
            </View>


            {/* Celebration Overlay */}
            {showCelebration && (
                <View style={styles.celebrationOverlay}>
                    {/* Confetti */}
                    {confettiPieces.map(piece => (
                        <Animated.View
                            key={piece.id}
                            style={[
                                styles.confetti,
                                {
                                    left: piece.x,
                                    top: piece.y + (Date.now() % 1000) * 0.5,
                                    backgroundColor: piece.color,
                                    transform: [
                                        { rotate: `${piece.rotation}deg` },
                                        { scale: piece.scale },
                                    ],
                                },
                            ]}
                        />
                    ))}

                    {/* Win message */}
                    <Animated.View
                        style={[
                            styles.winCard,
                            { transform: [{ scale: celebrateScale }] },
                        ]}
                    >
                        <Text style={styles.winEmoji}>🏆</Text>
                        <Text style={styles.winTitle}>{childName}, Harika Bir Kimyagersin!</Text>
                        <Text style={styles.winStats}>
                            🎯 {gameState.moves} hamlede tamamladın!
                        </Text>
                        <TouchableOpacity
                            style={styles.playAgainButton}
                            onPress={() => {
                                setShowCelebration(false);
                                initializeGame();
                            }}
                        >
                            <Text style={styles.playAgainText}>Tekrar Oyna 🔄</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.exitButton}
                            onPress={onClose}
                        >
                            <Text style={styles.exitText}>Ana Menü 🏠</Text>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            )}
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    background: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    bgCircle1: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(156, 204, 101, 0.3)',
        top: -100,
        right: -50,
    },
    bgCircle2: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(129, 199, 132, 0.3)',
        bottom: 100,
        left: -50,
    },
    bgCircle3: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(165, 214, 167, 0.4)',
        top: height / 2,
        right: -30,
    },
    // Lab-themed background styles
    labGradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#E3F2FD',
    },
    labDecor: {
        position: 'absolute',
        zIndex: 1,
    },
    labDekorEmoji: {
        fontSize: 40,
        opacity: 0.3,
    },
    bgBubble: {
        position: 'absolute',
        backgroundColor: 'rgba(100, 181, 246, 0.3)',
        borderRadius: 50,
    },
    // Interactive character styles
    leftCharacter: {
        position: 'absolute',
        left: 20,
        top: height * 0.35,
        alignItems: 'center',
        zIndex: 10,
    },
    rightCharacter: {
        position: 'absolute',
        right: 20,
        top: height * 0.35,
        alignItems: 'center',
        zIndex: 10,
    },
    characterEmoji: {
        fontSize: 60,
    },
    characterHappy: {
        transform: [{ scale: 1.2 }],
    },
    characterName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginTop: 5,
    },
    speechBubble: {
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    speechText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    reactiveLamp: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginTop: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lampGlowing: {
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
    },
    lampEmoji: {
        fontSize: 20,
    },
    progressMeter: {
        width: 30,
        height: 80,
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 15,
        marginTop: 10,
        overflow: 'hidden',
        justifyContent: 'flex-end',
    },
    progressFill: {
        width: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 15,
    },
    bottlesGridWeb: {
        gap: 25,
        maxWidth: 700,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 15,
        backgroundColor: '#4CAF50',
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    closeButton: {
        padding: 8,
    },
    restartIconButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    statsContainer: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    statsText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    instructions: {
        textAlign: 'center',
        fontSize: 18,
        color: '#2E7D32',
        marginTop: 20,
        fontWeight: '500',
    },
    bottlesContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    bottlesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 15,
    },
    bottle: {
        width: BOTTLE_WIDTH,
        height: BOTTLE_HEIGHT,
        alignItems: 'center',
        marginHorizontal: 8,
        marginVertical: 10,
    },
    bottleNeck: {
        width: 30,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.1)',
        borderBottomWidth: 0,
    },
    bottleBody: {
        width: BOTTLE_WIDTH,
        height: BOTTLE_HEIGHT - 25,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 12,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.9)',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    glassReflection: {
        position: 'absolute',
        left: 5,
        top: 10,
        width: 8,
        height: '60%',
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 4,
        zIndex: 10,
    },
    liquidLayer: {
        position: 'absolute',
        left: 3,
        right: 3,
        height: LAYER_HEIGHT,
    },
    liquidShine: {
        position: 'absolute',
        left: 5,
        top: 5,
        width: 15,
        height: 8,
        borderRadius: 4,
        opacity: 0.5,
    },
    layerSymbol: {
        position: 'absolute',
        right: 8,
        top: '50%',
        marginTop: -8,
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    layerSeparator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    bottleSelected: {
        transform: [{ scale: 1.05 }],
    },
    bottleComplete: {
        borderColor: '#FFD700',
        shadowColor: '#FFD700',
        shadowOpacity: 0.5,
    },
    selectionGlow: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,215,0,0.3)',
        borderRadius: 15,
    },
    bubbleContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    bubble: {
        position: 'absolute',
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderRadius: 10,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingBottom: 40,
        gap: 15,
    },
    restartButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF7043',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 8,
        shadowColor: '#FF7043',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    celebrationOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    confetti: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 2,
    },
    winCard: {
        backgroundColor: '#fff',
        borderRadius: 30,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 15,
        maxWidth: width - 60,
    },
    winEmoji: {
        fontSize: 80,
        marginBottom: 10,
    },
    winTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2E7D32',
        textAlign: 'center',
        marginBottom: 10,
    },
    winStats: {
        fontSize: 18,
        color: '#666',
        marginBottom: 25,
    },
    playAgainButton: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 30,
        marginBottom: 12,
    },
    playAgainText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    exitButton: {
        backgroundColor: '#FF7043',
        paddingHorizontal: 40,
        paddingVertical: 12,
        borderRadius: 25,
    },
    exitText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

