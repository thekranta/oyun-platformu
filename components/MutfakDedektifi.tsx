/**
 * Mutfak Dedektifi - Eşleştirme ve Sınıflandırma Oyunu
 * DDA (Dynamic Difficulty Adjustment) ile sürükle-bırak mekanikli
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { supabase } from '../lib/supabase';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';

const { width, height } = Dimensions.get('window');

// ============== TYPES ==============
interface FoodItem {
    id: string;
    name: string;
    emoji: string;
    category: 'meyve' | 'sebze' | 'sut' | 'et';
    isDistractor?: boolean;
}

interface TargetArea {
    id: string;
    category: 'meyve' | 'sebze' | 'sut' | 'et';
    name: string;
    emoji: string;
    color: string;
}

interface DragLog {
    itemId: string;
    targetId: string;
    correct: boolean;
    dragDuration: number;
    timestamp: number;
}

// ============== GAME DATA ==============
const ALL_FOODS: FoodItem[] = [
    // Meyveler
    { id: 'elma', name: 'Elma', emoji: '🍎', category: 'meyve' },
    { id: 'muz', name: 'Muz', emoji: '🍌', category: 'meyve' },
    { id: 'portakal', name: 'Portakal', emoji: '🍊', category: 'meyve' },
    { id: 'uzum', name: 'Üzüm', emoji: '🍇', category: 'meyve' },
    { id: 'cilek', name: 'Çilek', emoji: '🍓', category: 'meyve' },
    { id: 'karpuz', name: 'Karpuz', emoji: '🍉', category: 'meyve' },
    // Sebzeler
    { id: 'havuc', name: 'Havuç', emoji: '🥕', category: 'sebze' },
    { id: 'brokoli', name: 'Brokoli', emoji: '🥦', category: 'sebze' },
    { id: 'domates', name: 'Domates', emoji: '🍅', category: 'sebze' },
    { id: 'salatalik', name: 'Salatalık', emoji: '🥒', category: 'sebze' },
    { id: 'patates', name: 'Patates', emoji: '🥔', category: 'sebze' },
    { id: 'misir', name: 'Mısır', emoji: '🌽', category: 'sebze' },
    // Süt Ürünleri
    { id: 'sut', name: 'Süt', emoji: '🥛', category: 'sut' },
    { id: 'peynir', name: 'Peynir', emoji: '🧀', category: 'sut' },
    { id: 'yoğurt', name: 'Yoğurt', emoji: '🥣', category: 'sut' },
    { id: 'tereyagi', name: 'Tereyağı', emoji: '🧈', category: 'sut' },
    // Et Ürünleri
    { id: 'tavuk', name: 'Tavuk', emoji: '🍗', category: 'et' },
    { id: 'balik', name: 'Balık', emoji: '🐟', category: 'et' },
    { id: 'yumurta', name: 'Yumurta', emoji: '🥚', category: 'et' },
    { id: 'sosis', name: 'Sosis', emoji: '🌭', category: 'et' },
];

const TARGET_AREAS: TargetArea[] = [
    { id: 'meyve', category: 'meyve', name: 'Meyveler', emoji: '🍎', color: '#FF6B6B' },
    { id: 'sebze', category: 'sebze', name: 'Sebzeler', emoji: '🥕', color: '#4ECDC4' },
    { id: 'sut', category: 'sut', name: 'Süt Ürünleri', emoji: '🥛', color: '#45B7D1' },
    { id: 'et', category: 'et', name: 'Et & Protein', emoji: '🍗', color: '#F9CA24' },
];

// ============== COMPONENT ==============
interface Props {
    onGameEnd: (
        oyunAdi: string,
        sure: number,
        hamle: number,
        hata: number,
        algilananKelime?: string,
        extraData?: { zorlukSeviyesi?: number; kazanimOdagi?: string }
    ) => void;
    onExit?: () => void;
    childName?: string;
    userId?: string;
}

export default function MutfakDedektifi({ onGameEnd, onExit, childName = 'Şef', userId }: Props) {
    const [gameReady, setGameReady] = useState(false);
    const [level, setLevel] = useState(1);
    const [foods, setFoods] = useState<FoodItem[]>([]);
    const [placedItems, setPlacedItems] = useState<Set<string>>(new Set());
    const [errors, setErrors] = useState(0);
    const [totalErrors, setTotalErrors] = useState(0);
    const [moves, setMoves] = useState(0);
    const [showScaffolding, setShowScaffolding] = useState(false);
    const [highlightTarget, setHighlightTarget] = useState<string | null>(null);
    const [showWin, setShowWin] = useState(false);
    const [gameComplete, setGameComplete] = useState(false);
    const [startTime] = useState(Date.now());
    const [levelStartTime, setLevelStartTime] = useState(Date.now());
    const [dragLogs, setDragLogs] = useState<DragLog[]>([]);

    // Dragging state
    const [draggingItem, setDraggingItem] = useState<FoodItem | null>(null);
    const [dragStartTime, setDragStartTime] = useState<number>(0);
    const dragPosition = useRef(new Animated.ValueXY()).current;
    const dragScale = useRef(new Animated.Value(1)).current;

    // Target area positions (will be measured)
    const targetRefs = useRef<{ [key: string]: View | null }>({});
    const [targetLayouts, setTargetLayouts] = useState<{ [key: string]: { x: number; y: number; width: number; height: number } }>({});

    const confettiRef = useRef<ConfettiCannon>(null);

    // ============== LEVEL GENERATION ==============
    const generateLevel = useCallback((lvl: number) => {
        const itemCount = Math.min(3 + lvl - 1, 6); // 3, 4, 5, 6
        const hasDistractor = lvl >= 2;

        // Select random foods from different categories
        const categories: ('meyve' | 'sebze' | 'sut' | 'et')[] = ['meyve', 'sebze', 'sut', 'et'];
        const selectedFoods: FoodItem[] = [];

        // Ensure at least one from each used category
        const usedCategories = categories.slice(0, Math.min(lvl + 1, 4));

        for (const cat of usedCategories) {
            const catFoods = ALL_FOODS.filter(f => f.category === cat);
            const randomFood = catFoods[Math.floor(Math.random() * catFoods.length)];
            if (randomFood && selectedFoods.length < itemCount) {
                selectedFoods.push({ ...randomFood });
            }
        }

        // Fill remaining slots with random foods
        while (selectedFoods.length < itemCount) {
            const remaining = ALL_FOODS.filter(f => !selectedFoods.find(sf => sf.id === f.id));
            const randomFood = remaining[Math.floor(Math.random() * remaining.length)];
            if (randomFood) {
                selectedFoods.push({ ...randomFood });
            }
        }

        // Add distractor in higher levels
        if (hasDistractor && selectedFoods.length < 7) {
            const remaining = ALL_FOODS.filter(f => !selectedFoods.find(sf => sf.id === f.id));
            const distractor = remaining[Math.floor(Math.random() * remaining.length)];
            if (distractor) {
                selectedFoods.push({ ...distractor, isDistractor: true });
            }
        }

        // Shuffle
        return selectedFoods.sort(() => Math.random() - 0.5);
    }, []);

    // Initialize first level
    useEffect(() => {
        if (gameReady) {
            setFoods(generateLevel(1));
            setLevelStartTime(Date.now());
        }
    }, [gameReady, generateLevel]);

    // ============== DRAG HANDLING ==============
    const checkDropTarget = (x: number, y: number): TargetArea | null => {
        for (const [id, layout] of Object.entries(targetLayouts)) {
            if (
                x >= layout.x &&
                x <= layout.x + layout.width &&
                y >= layout.y &&
                y <= layout.y + layout.height
            ) {
                return TARGET_AREAS.find(t => t.id === id) || null;
            }
        }
        return null;
    };

    const handleDragStart = (item: FoodItem) => {
        setDraggingItem(item);
        setDragStartTime(Date.now());

        // Scale up animation
        Animated.spring(dragScale, {
            toValue: 1.3,
            friction: 5,
            useNativeDriver: true,
        }).start();
    };

    const handleDragMove = (gestureState: { dx: number; dy: number; moveX: number; moveY: number }) => {
        dragPosition.setValue({ x: gestureState.dx, y: gestureState.dy });

        // Check if over a target
        const target = checkDropTarget(gestureState.moveX, gestureState.moveY);
        if (target) {
            setHighlightTarget(target.id);
        } else {
            setHighlightTarget(null);
        }
    };

    const handleDragEnd = async (gestureState: { moveX: number; moveY: number }) => {
        if (!draggingItem) return;

        const dragDuration = Date.now() - dragStartTime;
        const target = checkDropTarget(gestureState.moveX, gestureState.moveY);

        // Reset animations
        Animated.parallel([
            Animated.spring(dragPosition, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: true,
            }),
            Animated.spring(dragScale, {
                toValue: 1,
                useNativeDriver: true,
            }),
        ]).start();

        setHighlightTarget(null);

        if (target) {
            const isCorrect = draggingItem.category === target.category;

            // Log the drag
            const log: DragLog = {
                itemId: draggingItem.id,
                targetId: target.id,
                correct: isCorrect,
                dragDuration,
                timestamp: Date.now(),
            };
            setDragLogs(prev => [...prev, log]);

            if (isCorrect) {
                // Correct placement
                setPlacedItems(prev => new Set([...prev, draggingItem.id]));
                setMoves(m => m + 1);

                // Check if level complete
                const remainingItems = foods.filter(f => !placedItems.has(f.id) && f.id !== draggingItem.id && !f.isDistractor);
                if (remainingItems.length === 0) {
                    handleLevelComplete();
                }
            } else {
                // Wrong placement
                setErrors(e => e + 1);
                setTotalErrors(e => e + 1);
                setMoves(m => m + 1);

                // Enable scaffolding after 2 errors
                if (errors + 1 >= 2) {
                    setShowScaffolding(true);
                }
            }
        }

        setDraggingItem(null);
    };

    // ============== LEVEL COMPLETION ==============
    const handleLevelComplete = async () => {
        const levelTime = (Date.now() - levelStartTime) / 1000;

        setShowWin(true);
        confettiRef.current?.start();

        // DDA Logic
        const shouldLevelUp = errors === 0 && levelTime < 15;

        setTimeout(() => {
            setShowWin(false);

            if (level >= 5 || (!shouldLevelUp && level > 1)) {
                // Game complete
                endGame();
            } else if (shouldLevelUp) {
                // Level up
                const newLevel = level + 1;
                setLevel(newLevel);
                setFoods(generateLevel(newLevel));
                setPlacedItems(new Set());
                setErrors(0);
                setShowScaffolding(false);
                setLevelStartTime(Date.now());
            } else {
                // Repeat same level with scaffolding
                setFoods(generateLevel(level));
                setPlacedItems(new Set());
                setErrors(0);
                setShowScaffolding(true);
                setLevelStartTime(Date.now());
            }
        }, 2000);
    };

    const endGame = async () => {
        setGameComplete(true);
        const totalTime = Math.round((Date.now() - startTime) / 1000);

        // Save to Supabase
        if (userId) {
            try {
                await supabase.from('oyun_skorlari').insert({
                    user_id: userId,
                    oyun_adi: 'Mutfak Dedektifi',
                    sure: totalTime,
                    hamle_sayisi: moves,
                    hata_sayisi: totalErrors,
                    piramit_tamamlandi: true,
                    piramit_verisi: JSON.stringify({
                        finalLevel: level,
                        dragLogs: dragLogs,
                        averageDragTime: dragLogs.length > 0
                            ? dragLogs.reduce((a, b) => a + b.dragDuration, 0) / dragLogs.length
                            : 0,
                    }),
                });
            } catch (e) {
                console.error('Score save error:', e);
            }
        }

        onGameEnd('Mutfak Dedektifi', totalTime, moves, totalErrors, undefined, {
            zorlukSeviyesi: level,
            kazanimOdagi: 'Sınıflandırma ve Kategorileme',
        });
    };

    // ============== MEASURE TARGET LAYOUTS ==============
    const measureTargets = () => {
        const newLayouts: typeof targetLayouts = {};

        Object.entries(targetRefs.current).forEach(([id, ref]) => {
            if (ref) {
                ref.measureInWindow((x, y, w, h) => {
                    newLayouts[id] = { x, y, width: w, height: h };
                    setTargetLayouts(prev => ({ ...prev, [id]: { x, y, width: w, height: h } }));
                });
            }
        });
    };

    useEffect(() => {
        if (gameReady) {
            setTimeout(measureTargets, 500);
        }
    }, [gameReady, level]);

    // ============== DRAGGABLE ITEM ==============
    const DraggableItem = ({ item }: { item: FoodItem }) => {
        const isPlaced = placedItems.has(item.id);
        const isDragging = draggingItem?.id === item.id;

        const pan = useRef(new Animated.ValueXY()).current;
        const scale = useRef(new Animated.Value(1)).current;

        const panResponder = useRef(
            PanResponder.create({
                onStartShouldSetPanResponder: () => !isPlaced,
                onMoveShouldSetPanResponder: () => !isPlaced,
                onPanResponderGrant: () => {
                    handleDragStart(item);
                    Animated.spring(scale, {
                        toValue: 1.3,
                        friction: 5,
                        useNativeDriver: true,
                    }).start();
                },
                onPanResponderMove: (_, gestureState) => {
                    pan.setValue({ x: gestureState.dx, y: gestureState.dy });
                    handleDragMove(gestureState);
                },
                onPanResponderRelease: (_, gestureState) => {
                    handleDragEnd(gestureState);
                    Animated.parallel([
                        Animated.spring(pan, {
                            toValue: { x: 0, y: 0 },
                            useNativeDriver: true,
                        }),
                        Animated.spring(scale, {
                            toValue: 1,
                            useNativeDriver: true,
                        }),
                    ]).start();
                },
            })
        ).current;

        if (isPlaced) return null;

        return (
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.foodItem,
                    {
                        transform: [
                            { translateX: pan.x },
                            { translateY: pan.y },
                            { scale },
                        ],
                        zIndex: isDragging ? 100 : 1,
                    },
                ]}
            >
                <Text style={styles.foodEmoji}>{item.emoji}</Text>
                <Text style={styles.foodName}>{item.name}</Text>
                {showScaffolding && (
                    <View style={[styles.scaffoldHint, { backgroundColor: TARGET_AREAS.find(t => t.category === item.category)?.color }]}>
                        <Text style={styles.scaffoldText}>
                            {TARGET_AREAS.find(t => t.category === item.category)?.emoji}
                        </Text>
                    </View>
                )}
            </Animated.View>
        );
    };

    // ============== RENDER ==============
    const activeTargets = TARGET_AREAS.slice(0, Math.min(level + 1, 4));

    return (
        <DynamicBackground>
            {/* Countdown Overlay */}
            {!gameReady && (
                <CountdownOverlay
                    message="Mutfak Dedektifi oyununa hoş geldin! Yiyecekleri doğru kategorilere yerleştir!"
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => setGameReady(true)}
                />
            )}

            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>

                    <View style={styles.levelBadge}>
                        <Text style={styles.levelText}>Seviye {level}</Text>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                            <Text style={styles.statText}>{placedItems.size}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="close-circle" size={20} color="#F44336" />
                            <Text style={styles.statText}>{errors}</Text>
                        </View>
                    </View>
                </View>

                {/* Target Areas */}
                <View style={styles.targetsContainer}>
                    {activeTargets.map(target => (
                        <View
                            key={target.id}
                            ref={ref => { targetRefs.current[target.id] = ref; }}
                            style={[
                                styles.targetArea,
                                { backgroundColor: target.color },
                                highlightTarget === target.id && styles.targetHighlight,
                                showScaffolding && styles.targetScaffold,
                            ]}
                            onLayout={() => measureTargets()}
                        >
                            <Text style={styles.targetEmoji}>{target.emoji}</Text>
                            <Text style={styles.targetName}>{target.name}</Text>

                            {/* Placed items */}
                            <View style={styles.placedItems}>
                                {foods.filter(f => f.category === target.category && placedItems.has(f.id)).map(f => (
                                    <Text key={f.id} style={styles.placedEmoji}>{f.emoji}</Text>
                                ))}
                            </View>
                        </View>
                    ))}
                </View>

                {/* Food Items */}
                <View style={styles.foodsContainer}>
                    <Text style={styles.instructionText}>
                        {showScaffolding ? '💡 İpucu: Renkli noktalar yardımcı olsun!' : '👆 Yiyecekleri sürükle ve bırak!'}
                    </Text>
                    <View style={styles.foodsGrid}>
                        {foods.map(food => (
                            <DraggableItem key={food.id} item={food} />
                        ))}
                    </View>
                </View>

                {/* Win Overlay */}
                {showWin && (
                    <View style={styles.winOverlay}>
                        <Text style={styles.winEmoji}>🎉</Text>
                        <Text style={styles.winText}>Harika!</Text>
                    </View>
                )}

                {/* Game Complete */}
                {gameComplete && (
                    <View style={styles.completeOverlay}>
                        <Text style={styles.completeEmoji}>🏆</Text>
                        <Text style={styles.completeText}>Tebrikler!</Text>
                        <Text style={styles.completeStats}>
                            Seviye: {level} | Hamle: {moves} | Hata: {totalErrors}
                        </Text>
                    </View>
                )}
            </View>

            <ConfettiCannon
                ref={confettiRef}
                count={80}
                origin={{ x: width / 2, y: 0 }}
                autoStart={false}
                fadeOut
            />
        </DynamicBackground>
    );
}

// ============== STYLES ==============
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingHorizontal: 15,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    exitBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EF5350',
        justifyContent: 'center',
        alignItems: 'center',
    },
    levelBadge: {
        backgroundColor: '#7C4DFF',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
    },
    levelText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 15,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    targetsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 20,
    },
    targetArea: {
        width: (width - 50) / 2,
        minHeight: 120,
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'transparent',
    },
    targetHighlight: {
        borderColor: '#FFD700',
        transform: [{ scale: 1.05 }],
    },
    targetScaffold: {
        borderWidth: 4,
        borderStyle: 'dashed',
    },
    targetEmoji: {
        fontSize: 36,
    },
    targetName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 4,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    placedItems: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 8,
        gap: 4,
    },
    placedEmoji: {
        fontSize: 24,
    },
    foodsContainer: {
        flex: 1,
        alignItems: 'center',
    },
    instructionText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 15,
        textAlign: 'center',
    },
    foodsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    foodItem: {
        width: 80,
        height: 90,
        backgroundColor: '#fff',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    foodEmoji: {
        fontSize: 36,
    },
    foodName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
        marginTop: 4,
    },
    scaffoldHint: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scaffoldText: {
        fontSize: 12,
    },
    winOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    winEmoji: {
        fontSize: 80,
    },
    winText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginTop: 10,
    },
    completeOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(124, 77, 255, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    completeEmoji: {
        fontSize: 100,
    },
    completeText: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 15,
    },
    completeStats: {
        fontSize: 18,
        color: '#fff',
        marginTop: 10,
        opacity: 0.9,
    },
});
