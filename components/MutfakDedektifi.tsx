/**
 * Mutfak Dedektifi - Eşleştirme ve Sınıflandırma Oyunu
 * Soft-UI Sevimli 3D Stil - 3-6 Yaş Hedef Kitle
 * DDA (Dynamic Difficulty Adjustment) ile sürükle-bırak mekanikli
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    ImageBackground,
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

const { width, height } = Dimensions.get('window');

// ============== TYPES ==============
interface FoodItem {
    id: string;
    name: string;
    emoji: string;
    category: 'meyve' | 'sebze';
    isDistractor?: boolean;
}

interface TargetArea {
    id: string;
    category: 'meyve' | 'sebze';
    name: string;
    emoji: string;
    color: string;
    icon: string;
}

interface DragLog {
    itemId: string;
    targetId: string;
    correct: boolean;
    dragDuration: number;
    timestamp: number;
}

// ============== GAME DATA - Soft-UI 3D Style ==============
const ALL_FOODS: FoodItem[] = [
    // Meyveler (10 Adet)
    { id: 'elma', name: 'Elma', emoji: '🍎', category: 'meyve' },
    { id: 'muz', name: 'Muz', emoji: '🍌', category: 'meyve' },
    { id: 'cilek', name: 'Çilek', emoji: '🍓', category: 'meyve' },
    { id: 'portakal', name: 'Portakal', emoji: '🍊', category: 'meyve' },
    { id: 'uzum', name: 'Üzüm', emoji: '🍇', category: 'meyve' },
    { id: 'karpuz', name: 'Karpuz', emoji: '🍉', category: 'meyve' },
    { id: 'armut', name: 'Armut', emoji: '🍐', category: 'meyve' },
    { id: 'kiraz', name: 'Kiraz', emoji: '🍒', category: 'meyve' },
    { id: 'ananas', name: 'Ananas', emoji: '🍍', category: 'meyve' },
    { id: 'kivi', name: 'Kivi', emoji: '🥝', category: 'meyve' },
    // Sebzeler (10 Adet)
    { id: 'havuc', name: 'Havuç', emoji: '🥕', category: 'sebze' },
    { id: 'brokoli', name: 'Brokoli', emoji: '🥦', category: 'sebze' },
    { id: 'domates', name: 'Domates', emoji: '🍅', category: 'sebze' }, // Çeldirici!
    { id: 'salatalik', name: 'Salatalık', emoji: '🥒', category: 'sebze' },
    { id: 'patates', name: 'Patates', emoji: '🥔', category: 'sebze' },
    { id: 'sogan', name: 'Soğan', emoji: '🧅', category: 'sebze' },
    { id: 'misir', name: 'Mısır', emoji: '🌽', category: 'sebze' },
    { id: 'patlican', name: 'Patlıcan', emoji: '🍆', category: 'sebze' },
    { id: 'biber', name: 'Biber', emoji: '🌶️', category: 'sebze' },
    { id: 'mantar', name: 'Mantar', emoji: '🍄', category: 'sebze' },
];

const TARGET_AREAS: TargetArea[] = [
    { id: 'meyve', category: 'meyve', name: 'Meyve Sepeti', emoji: '🍎', color: '#FFB6C1', icon: '🧺' },
    { id: 'sebze', category: 'sebze', name: 'Sebze Kasası', emoji: '🥕', color: '#98D8AA', icon: '📦' },
];

// Pastel color palette for Soft-UI
const PASTEL_COLORS = {
    cream: '#FFF8E7',
    mint: '#B8E8C0',
    peach: '#FFCDB2',
    lavender: '#E2D1F9',
    skyBlue: '#B8D4E3',
    softPink: '#FFD6E0',
    softYellow: '#FFF3B8',
    softGreen: '#C8E6C9',
};

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

export default function MutfakDedektifi({ onGameEnd, onExit, childName = 'Şefim', userId }: Props) {
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
    const [mavisMessage, setMavisMessage] = useState('Merhaba! Yiyecekleri doğru yere koy! 🍎🥕');

    // Floating animations for decorations
    const floatAnim1 = useRef(new Animated.Value(0)).current;
    const floatAnim2 = useRef(new Animated.Value(0)).current;
    const mavisFloat = useRef(new Animated.Value(0)).current;

    // Dragging state
    const [draggingItem, setDraggingItem] = useState<FoodItem | null>(null);
    const [dragStartTime, setDragStartTime] = useState<number>(0);

    // Target area positions
    const targetRefs = useRef<{ [key: string]: View | null }>({});
    const [targetLayouts, setTargetLayouts] = useState<{ [key: string]: { x: number; y: number; width: number; height: number } }>({});

    const confettiRef = useRef<ConfettiCannon>(null);

    // ============== FLOATING ANIMATIONS ==============
    useEffect(() => {
        // Floating animation for decorations
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim1, { toValue: 10, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(floatAnim1, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim2, { toValue: -8, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(floatAnim2, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        ).start();

        // Maviş character animation
        Animated.loop(
            Animated.sequence([
                Animated.timing(mavisFloat, { toValue: -5, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(mavisFloat, { toValue: 5, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // ============== LEVEL GENERATION ==============
    const generateLevel = useCallback((lvl: number) => {
        const itemCount = Math.min(3 + lvl - 1, 6); // 3, 4, 5, 6
        const hasDistractor = lvl >= 2;

        const selectedFoods: FoodItem[] = [];

        // Select items from both categories
        const meyveler = ALL_FOODS.filter(f => f.category === 'meyve').sort(() => Math.random() - 0.5);
        const sebzeler = ALL_FOODS.filter(f => f.category === 'sebze').sort(() => Math.random() - 0.5);

        const halfCount = Math.floor(itemCount / 2);
        selectedFoods.push(...meyveler.slice(0, halfCount));
        selectedFoods.push(...sebzeler.slice(0, itemCount - halfCount));

        // Add Domates as distractor (looks like fruit but is vegetable!)
        if (hasDistractor && !selectedFoods.find(f => f.id === 'domates')) {
            const domates = ALL_FOODS.find(f => f.id === 'domates');
            if (domates) {
                selectedFoods.push({ ...domates, isDistractor: true });
            }
        }

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
            if (layout && x >= layout.x && x <= layout.x + layout.width && y >= layout.y && y <= layout.y + layout.height) {
                return TARGET_AREAS.find(t => t.id === id) || null;
            }
        }
        return null;
    };

    const handleDragStart = (item: FoodItem) => {
        setDraggingItem(item);
        setDragStartTime(Date.now());
        setMavisMessage(`${item.name}... Nereye gidecek acaba? 🤔`);
    };

    const handleDragMove = (gestureState: { moveX: number; moveY: number }) => {
        const target = checkDropTarget(gestureState.moveX, gestureState.moveY);
        setHighlightTarget(target?.id || null);
    };

    const handleDragEnd = async (item: FoodItem, gestureState: { moveX: number; moveY: number }) => {
        const dragDuration = Date.now() - dragStartTime;
        const target = checkDropTarget(gestureState.moveX, gestureState.moveY);

        setHighlightTarget(null);
        setDraggingItem(null);

        if (target) {
            const isCorrect = item.category === target.category;

            // Log the drag
            const log: DragLog = {
                itemId: item.id,
                targetId: target.id,
                correct: isCorrect,
                dragDuration,
                timestamp: Date.now(),
            };
            setDragLogs(prev => [...prev, log]);

            if (isCorrect) {
                // Correct placement
                setPlacedItems(prev => new Set([...prev, item.id]));
                setMoves(m => m + 1);
                setMavisMessage(`Aferin! ${item.name} doğru yere gitti! 🎉`);

                // Check if level complete
                const remainingItems = foods.filter(f => !placedItems.has(f.id) && f.id !== item.id);
                if (remainingItems.length === 0) {
                    handleLevelComplete();
                }
            } else {
                // Wrong placement
                setErrors(e => e + 1);
                setTotalErrors(e => e + 1);
                setMoves(m => m + 1);
                setMavisMessage(`Hmm... ${item.name} oraya ait değil. Tekrar dene! 💪`);

                // Enable scaffolding after 2 errors
                if (errors + 1 >= 2) {
                    setShowScaffolding(true);
                    setMavisMessage('Renkli ipuçlarına bak! Yardımcı olsunlar! 💡');
                }
            }
        }
    };

    // ============== LEVEL COMPLETION ==============
    const handleLevelComplete = async () => {
        const levelTime = (Date.now() - levelStartTime) / 1000;

        setShowWin(true);
        confettiRef.current?.start();
        setMavisMessage('Muhteşem! Tüm yiyecekleri buldun! 🏆');

        // DDA Logic
        const shouldLevelUp = errors === 0 && levelTime < 15;

        setTimeout(() => {
            setShowWin(false);

            if (level >= 5 || (!shouldLevelUp && level > 1)) {
                endGame();
            } else if (shouldLevelUp) {
                const newLevel = level + 1;
                setLevel(newLevel);
                setFoods(generateLevel(newLevel));
                setPlacedItems(new Set());
                setErrors(0);
                setShowScaffolding(false);
                setLevelStartTime(Date.now());
                setMavisMessage(`Seviye ${newLevel}! Daha fazla yiyecek! 🚀`);
            } else {
                setFoods(generateLevel(level));
                setPlacedItems(new Set());
                setErrors(0);
                setShowScaffolding(true);
                setLevelStartTime(Date.now());
                setMavisMessage('Bu sefer yardımcı ipuçları var! 💡');
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
                            ? Math.round(dragLogs.reduce((a, b) => a + b.dragDuration, 0) / dragLogs.length)
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
        Object.entries(targetRefs.current).forEach(([id, ref]) => {
            if (ref) {
                ref.measureInWindow((x, y, w, h) => {
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

    // ============== DRAGGABLE ITEM COMPONENT ==============
    const DraggableItem = ({ item }: { item: FoodItem }) => {
        const isPlaced = placedItems.has(item.id);
        const isDragging = draggingItem?.id === item.id;

        const pan = useRef(new Animated.ValueXY()).current;
        const scale = useRef(new Animated.Value(1)).current;
        const glow = useRef(new Animated.Value(0)).current;

        const panResponder = useRef(
            PanResponder.create({
                onStartShouldSetPanResponder: () => !isPlaced,
                onMoveShouldSetPanResponder: () => !isPlaced,
                onPanResponderGrant: () => {
                    handleDragStart(item);
                    // Scale up and glow
                    Animated.parallel([
                        Animated.spring(scale, { toValue: 1.2, friction: 5, useNativeDriver: true }),
                        Animated.timing(glow, { toValue: 1, duration: 200, useNativeDriver: true }),
                    ]).start();
                },
                onPanResponderMove: (_, gestureState) => {
                    pan.setValue({ x: gestureState.dx, y: gestureState.dy });
                    handleDragMove(gestureState);
                },
                onPanResponderRelease: (_, gestureState) => {
                    handleDragEnd(item, gestureState);
                    Animated.parallel([
                        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }),
                        Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
                        Animated.timing(glow, { toValue: 0, duration: 200, useNativeDriver: true }),
                    ]).start();
                },
            })
        ).current;

        if (isPlaced) return null;

        const scaffoldColor = item.category === 'meyve' ? PASTEL_COLORS.softPink : PASTEL_COLORS.softGreen;

        return (
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.foodItem,
                    showScaffolding && { borderColor: scaffoldColor, borderWidth: 4 },
                    {
                        transform: [
                            { translateX: pan.x },
                            { translateY: pan.y },
                            { scale },
                        ],
                        zIndex: isDragging ? 100 : 1,
                        shadowOpacity: isDragging ? 0.4 : 0.2,
                    },
                ]}
            >
                <Text style={styles.foodEmoji}>{item.emoji}</Text>
                <Text style={styles.foodName}>{item.name}</Text>
                {showScaffolding && (
                    <View style={[styles.scaffoldDot, { backgroundColor: scaffoldColor }]} />
                )}
            </Animated.View>
        );
    };

    // ============== RENDER ==============
    return (
        <View style={styles.container}>
            {/* Kitchen Background */}
            <ImageBackground
                source={require('@/assets/images/mutfak/background.png')}
                style={styles.background}
                resizeMode="cover"
            >
                {/* Countdown Overlay */}
                {!gameReady && (
                    <CountdownOverlay
                        message="Mutfak Dedektifi oyununa hoş geldin! Yiyecekleri doğru sepetlere yerleştir!"
                        childName={childName}
                        countdownSeconds={5}
                        onComplete={() => setGameReady(true)}
                    />
                )}

                {/* Floating Decorations - Left Side */}
                <Animated.View style={[styles.floatingLeft, { transform: [{ translateY: floatAnim1 }] }]}>
                    <Text style={styles.floatingEmoji}>🍳</Text>
                    <Text style={[styles.floatingEmoji, { marginTop: 20 }]}>🥄</Text>
                </Animated.View>

                {/* Floating Decorations - Right Side */}
                <Animated.View style={[styles.floatingRight, { transform: [{ translateY: floatAnim2 }] }]}>
                    <Text style={styles.floatingEmoji}>🧂</Text>
                    <Text style={[styles.floatingEmoji, { marginTop: 20 }]}>🍴</Text>
                </Animated.View>

                {/* Maviş Character - Left */}
                <Animated.View style={[styles.mavisContainer, { transform: [{ translateY: mavisFloat }] }]}>
                    <Image
                        source={require('@/assets/images/mutfak/mavis_chef.png')}
                        style={styles.mavisImage}
                        resizeMode="contain"
                    />
                    <View style={styles.mavisSpeechBubble}>
                        <Text style={styles.mavisText}>{mavisMessage}</Text>
                    </View>
                </Animated.View>

                {/* Main Game Content */}
                <View style={styles.gameContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                            <Ionicons name="home" size={22} color="#fff" />
                        </TouchableOpacity>

                        <View style={styles.levelBadge}>
                            <Text style={styles.levelEmoji}>⭐</Text>
                            <Text style={styles.levelText}>Seviye {level}</Text>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statBadge}>
                                <Text style={styles.statEmoji}>✅</Text>
                                <Text style={styles.statText}>{placedItems.size}</Text>
                            </View>
                            <View style={[styles.statBadge, { backgroundColor: PASTEL_COLORS.softPink }]}>
                                <Text style={styles.statEmoji}>❌</Text>
                                <Text style={styles.statText}>{errors}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Target Areas - Soft-UI Containers */}
                    <View style={styles.targetsContainer}>
                        {TARGET_AREAS.map(target => (
                            <View
                                key={target.id}
                                ref={ref => { targetRefs.current[target.id] = ref; }}
                                style={[
                                    styles.targetArea,
                                    { backgroundColor: target.color },
                                    highlightTarget === target.id && styles.targetHighlight,
                                ]}
                                onLayout={() => measureTargets()}
                            >
                                <Text style={styles.targetIcon}>{target.icon}</Text>
                                <Text style={styles.targetName}>{target.name}</Text>

                                {/* Placed items in container */}
                                <View style={styles.placedItemsRow}>
                                    {foods.filter(f => f.category === target.category && placedItems.has(f.id)).map(f => (
                                        <Text key={f.id} style={styles.placedEmoji}>{f.emoji}</Text>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* Food Items Grid */}
                    <View style={styles.foodsContainer}>
                        <View style={styles.foodsGrid}>
                            {foods.map(food => (
                                <DraggableItem key={food.id} item={food} />
                            ))}
                        </View>
                    </View>
                </View>

                {/* Win Overlay */}
                {showWin && (
                    <View style={styles.winOverlay}>
                        <Text style={styles.winEmoji}>🎉</Text>
                        <Text style={styles.winText}>Süpersin!</Text>
                    </View>
                )}

                {/* Game Complete */}
                {gameComplete && (
                    <View style={styles.completeOverlay}>
                        <Text style={styles.completeEmoji}>🏆</Text>
                        <Text style={styles.completeTitle}>Tebrikler!</Text>
                        <Text style={styles.completeText}>Tüm seviyeleri tamamladın!</Text>
                        <View style={styles.completeStats}>
                            <Text style={styles.completeStatText}>⭐ Seviye: {level}</Text>
                            <Text style={styles.completeStatText}>✅ Doğru: {moves - totalErrors}</Text>
                            <Text style={styles.completeStatText}>❌ Hata: {totalErrors}</Text>
                        </View>
                    </View>
                )}
            </ImageBackground>

            <ConfettiCannon
                ref={confettiRef}
                count={80}
                origin={{ x: width / 2, y: 0 }}
                autoStart={false}
                fadeOut
            />
        </View>
    );
}

// ============== STYLES - Soft-UI 3D ==============
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    background: {
        flex: 1,
    },

    // Floating Decorations
    floatingLeft: {
        position: 'absolute',
        left: 10,
        top: height * 0.3,
        alignItems: 'center',
        opacity: 0.8,
    },
    floatingRight: {
        position: 'absolute',
        right: 10,
        top: height * 0.35,
        alignItems: 'center',
        opacity: 0.8,
    },
    floatingEmoji: {
        fontSize: 32,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
    },

    // Maviş Character
    mavisContainer: {
        position: 'absolute',
        left: 5,
        bottom: height * 0.15,
        alignItems: 'center',
        width: 100,
    },
    mavisImage: {
        width: 70,
        height: 70,
    },
    mavisSpeechBubble: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 8,
        marginTop: 5,
        maxWidth: 120,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    mavisText: {
        fontSize: 10,
        color: '#555',
        textAlign: 'center',
        fontWeight: '500',
    },

    // Game Content
    gameContent: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingHorizontal: 15,
        marginLeft: 80, // Space for Maviş
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    exitBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FF6B6B',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    levelBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFE082',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    levelEmoji: {
        fontSize: 18,
        marginRight: 6,
    },
    levelText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#5D4037',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: PASTEL_COLORS.softGreen,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14,
        gap: 4,
    },
    statEmoji: {
        fontSize: 14,
    },
    statText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },

    // Target Areas - Soft-UI Containers
    targetsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 15,
        marginBottom: 20,
    },
    targetArea: {
        flex: 1,
        maxWidth: 160,
        minHeight: 130,
        borderRadius: 24,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    targetHighlight: {
        transform: [{ scale: 1.08 }],
        borderColor: '#FFD700',
        borderWidth: 4,
        shadowOpacity: 0.3,
    },
    targetIcon: {
        fontSize: 40,
    },
    targetName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#5D4037',
        marginTop: 4,
    },
    placedItemsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginTop: 8,
        gap: 4,
    },
    placedEmoji: {
        fontSize: 22,
    },

    // Food Items - Soft-UI Playdough Style
    foodsContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    foodsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    foodItem: {
        width: 75,
        height: 85,
        backgroundColor: '#fff',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.8)',
    },
    foodEmoji: {
        fontSize: 36,
    },
    foodName: {
        fontSize: 11,
        fontWeight: '600',
        color: '#5D4037',
        marginTop: 4,
    },
    scaffoldDot: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#fff',
    },

    // Overlays
    winOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.92)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    winEmoji: {
        fontSize: 90,
    },
    winText: {
        fontSize: 38,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginTop: 10,
    },
    completeOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 215, 0, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    completeEmoji: {
        fontSize: 100,
    },
    completeTitle: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#5D4037',
        marginTop: 15,
    },
    completeText: {
        fontSize: 18,
        color: '#5D4037',
        marginTop: 5,
    },
    completeStats: {
        marginTop: 20,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderRadius: 20,
        padding: 15,
        gap: 8,
    },
    completeStatText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#5D4037',
    },
});
