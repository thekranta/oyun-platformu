/**
 * Mutfak Dedektifi - Eşleştirme ve Sınıflandırma Oyunu
 * Soft-UI Sevimli 3D Stil - 3-6 Yaş Hedef Kitle (Okul Öncesi - Okuma Yazma Bilmiyor)
 * Dokunarak seçim mekanikli - Sesli yönlendirme ile
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Image,
    ImageBackground,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { supabase } from '../lib/supabase';
import { speak } from '../services/speechService';
import CountdownOverlay from './CountdownOverlay';
import { asset } from '../lib/assetMap';

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
    { id: 'meyve', category: 'meyve', name: 'Meyve Sepeti', emoji: '🍎', color: '#FFB6C1', icon: '🪤' },
    { id: 'sebze', category: 'sebze', name: 'Sebze Kasası', emoji: '🥕', color: '#98D8AA', icon: '📦' },
];

// Sepet ve kasa görselleri
const BASKET_IMAGES = {
    meyve: asset('/images/mutfak/meyve_sepeti.webp'),
    sebze: asset('/images/mutfak/sebze_kasasi.webp'),
};

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
        extraData?: { zorlukSeviyesi?: number; kazanimOdagi?: string; cognitive_speed_score?: number; round_history?: any }
    ) => void;
    onExit?: () => void;
    childName?: string;
    userId?: string;
}

// Modul seviyesinde: bilesen govde icinde tanimlaninca her render'da yeni kimlik alip
// unmount/remount oluyor (scaleAnim/bounce sifirlaniyor). Disari alindi, gerekli degerler
// prop olarak geciyor.
function SelectableItem({ item, isPlaced, isSelected, onTap }: {
    item: FoodItem;
    isPlaced: boolean;
    isSelected: boolean;
    onTap: (item: FoodItem) => void;
}) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // Bounce animation when selected
    useEffect(() => {
        if (isSelected) {
            const loop = Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, { toValue: 1.15, duration: 300, useNativeDriver: true }),
                    Animated.timing(scaleAnim, { toValue: 1.05, duration: 300, useNativeDriver: true }),
                ])
            );
            loop.start();
            return () => loop.stop();
        } else {
            scaleAnim.setValue(1);
        }
    }, [isSelected, scaleAnim]);

    if (isPlaced) return null;

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onTap(item)}
            style={{ userSelect: 'none' } as any}
        >
            <Animated.View
                style={[
                    styles.foodItem,
                    isSelected && styles.selectedItem,
                    { transform: [{ scale: scaleAnim }] },
                ]}
            >
                <Text style={[styles.foodEmoji, { userSelect: 'none' } as any]}>{item.emoji}</Text>
            </Animated.View>
        </TouchableOpacity>
    );
}

export default function MutfakDedektifi({ onGameEnd, onExit, childName = 'Şefim', userId }: Props) {
    const [gameReady, setGameReady] = useState(false);
    const [level, setLevel] = useState(1);
    const [initialLevel, setInitialLevel] = useState(1); // For session persistence
    const [foods, setFoods] = useState<FoodItem[]>([]);
    const [placedItems, setPlacedItems] = useState<Set<string>>(new Set());
    const [errors, setErrors] = useState(0);
    const [totalErrors, setTotalErrors] = useState(0);
    const [moves, setMoves] = useState(0);
    const [showScaffolding, setShowScaffolding] = useState(false);
    const [showWin, setShowWin] = useState(false);
    const [gameComplete, setGameComplete] = useState(false);
    const [startTime] = useState(Date.now());
    const [levelStartTime, setLevelStartTime] = useState(Date.now());
    const [dragLogs, setDragLogs] = useState<DragLog[]>([]);
    const [mavisMessage, setMavisMessage] = useState('🍎🥕');
    const [levelTimes, setLevelTimes] = useState<number[]>([]); // Track time for each level
    const introMessage = 'Meyveleri sepete, sebzeleri kasaya koy. Bir yiyeceğe dokun, sonra nereye gideceğine dokun!';
    const fullIntroMessage = childName ? `Merhaba ${childName}! ${introMessage}` : introMessage;

    // Floating animations for decorations
    const floatAnim1 = useRef(new Animated.Value(0)).current;
    const floatAnim2 = useRef(new Animated.Value(0)).current;
    const mavisFloat = useRef(new Animated.Value(0)).current;

    // Selection state (tap to select, then tap target)
    const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
    const [selectionStartTime, setSelectionStartTime] = useState<number>(0);

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

    // Check previous session for initial level (DDA persistence)
    useEffect(() => {
        const checkPreviousSession = async () => {
            if (!userId) return;
            try {
                const { data } = await supabase
                    .from('oyun_skorlari')
                    .select('piramit_verisi')
                    .eq('user_id', userId)
                    .eq('oyun_adi', 'Mutfak Dedektifi')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (data && data.length > 0 && data[0].piramit_verisi) {
                    const prevData = JSON.parse(data[0].piramit_verisi);
                    // If child completed Level 1 under 20 seconds, start at Level 2
                    if (prevData.level1Time && prevData.level1Time < 20 && prevData.finalLevel >= 1) {
                        setLevel(2);
                        setInitialLevel(2);
                        setMavisMessage('Süpersin! Bugün Seviye 2\'den başlıyoruz! 🚀');
                    }
                }
            } catch (e) {
                console.error('Previous session check error:', e);
            }
        };
        checkPreviousSession();
    }, [userId]);

    // Initialize first level
    useEffect(() => {
        if (gameReady) {
            setFoods(generateLevel(level));
            setLevelStartTime(Date.now());
        }
    }, [gameReady, generateLevel, level]);

    // ============== TAP SELECTION HANDLING ==============
    const handleItemTap = (item: FoodItem) => {
        if (placedItems.has(item.id)) return;

        if (selectedItem?.id === item.id) {
            // Deselect if tapping same item
            setSelectedItem(null);
            setMavisMessage('🍎🥕');
        } else {
            // Select new item
            setSelectedItem(item);
            setSelectionStartTime(Date.now());
            // Sadece emoji göster, ses komutu yok
            setMavisMessage(`${item.emoji} 👆`);
        }
    };

    const handleTargetTap = async (target: TargetArea) => {
        if (!selectedItem) {
            // No item selected - sessiz, sadece görsel geri bildirim
            setMavisMessage('👇 Önce bir yiyecek seç!');
            return;
        }

        const selectionDuration = Date.now() - selectionStartTime;
        const isCorrect = selectedItem.category === target.category;

        // Log the action
        const log: DragLog = {
            itemId: selectedItem.id,
            targetId: target.id,
            correct: isCorrect,
            dragDuration: selectionDuration,
            timestamp: Date.now(),
        };
        setDragLogs(prev => [...prev, log]);

        if (isCorrect) {
            // Correct placement - sessiz, sadece görsel geri bildirim
            setPlacedItems(prev => new Set([...prev, selectedItem.id]));
            setMoves(m => m + 1);
            setMavisMessage('🎉 ✨');

            // Check if level complete
            const remainingItems = foods.filter(f => !placedItems.has(f.id) && f.id !== selectedItem.id);
            if (remainingItems.length === 0) {
                setSelectedItem(null);
                handleLevelComplete();
            } else {
                setSelectedItem(null);
            }
        } else {
            // Wrong placement - sessiz, sadece görsel geri bildirim
            setErrors(e => e + 1);
            setTotalErrors(e => e + 1);
            setMoves(m => m + 1);
            setMavisMessage('🤔 Tekrar dene!');

            // Keep item selected so child can try again
            // Scaffolding kaldırıldı - kopya vermiyoruz
        }
    };
    // Seviye 1 kalibrasyon tekrar sayaci. Sinir olmadan, iyi performans gostermeyen
    // cocuk seviye 1'de sonsuza kadar takilir kalir ve oyun hic bitmezdi.
    const retryCountRef = useRef(0);

    // ============== LEVEL COMPLETION ==============
    const handleLevelComplete = async () => {
        const levelTime = (Date.now() - levelStartTime) / 1000;

        // Track level times for DDA score calculation
        setLevelTimes(prev => [...prev, levelTime]);

        setShowWin(true);
        confettiRef.current?.start();
        setMavisMessage('\ud83c\udf89 \ud83c\udfc6 \u2728');
        // Sesli kutlama kaldırıldı

        // DDA Logic - Level 1: Under 20 seconds → Level up for next session
        const shouldLevelUp = errors === 0 && levelTime < 20;

        setTimeout(() => {
            setShowWin(false);

            if (level >= 5 || (!shouldLevelUp && level > 1)) {
                endGame(levelTime);
            } else if (shouldLevelUp) {
                const newLevel = level + 1;
                setLevel(newLevel);
                setFoods(generateLevel(newLevel));
                setPlacedItems(new Set());
                setErrors(0);
                setLevelStartTime(Date.now());
                setMavisMessage(`Seviye ${newLevel}! 🚀`);
            } else if (retryCountRef.current >= 1) {
                // Seviye 1'de bir tekrar hakki verildi; yine yeterli degilse oyunu bitir
                // (aksi halde ayni seviye sonsuza kadar yeniden uretilirdi).
                endGame(levelTime);
            } else {
                retryCountRef.current += 1;
                setFoods(generateLevel(level));
                setPlacedItems(new Set());
                setErrors(0);
                setLevelStartTime(Date.now());
                setMavisMessage('Tekrar deneyelim! 💪');
            }
        }, 2000);
    };

    // ============== DYNAMIC DIFFICULTY SCORE CALCULATION ==============
    const calculateDynamicDifficultyScore = (finalLevel: number, totalErr: number, avgTime: number, level1Time: number): number => {
        // Score 0-100 based on performance
        // Level contribution: 20 points per level (max 100 at level 5)
        const levelScore = Math.min(finalLevel * 20, 100);

        // Error penalty: -5 points per error (max -50)
        const errorPenalty = Math.min(totalErr * 5, 50);

        // Speed bonus: +10 if average time per level < 15s, +20 if < 10s
        let speedBonus = 0;
        if (avgTime < 10) speedBonus = 20;
        else if (avgTime < 15) speedBonus = 10;

        // Level 1 time bonus: +10 if under 20 seconds
        const level1Bonus = level1Time < 20 ? 10 : 0;

        return Math.max(0, Math.min(100, levelScore - errorPenalty + speedBonus + level1Bonus));
    };

    const endGame = async (lastLevelTime?: number) => {
        setGameComplete(true);
        const totalTime = Math.round((Date.now() - startTime) / 1000);

        // Calculate average level time
        const allLevelTimes = lastLevelTime ? [...levelTimes, lastLevelTime] : levelTimes;
        const avgLevelTime = allLevelTimes.length > 0
            ? allLevelTimes.reduce((a, b) => a + b, 0) / allLevelTimes.length
            : 0;
        const level1Time = allLevelTimes[0] || 999;

        // Calculate Dynamic Difficulty Score (0-100)
        const dynamicDifficultyScore = calculateDynamicDifficultyScore(level, totalErrors, avgLevelTime, level1Time);

        // Tek kayit yolu: onGameEnd -> saveGameResult (oyun_turu semasi). Onceki dogrudan
        // supabase.insert (oyun_adi/piramit_verisi semasi) her oyunda ikinci bir satir
        // yaziyor ve rapor sayimlarini sisiriyordu. Direct insert'e ozel veriler burada
        // korunuyor: DDA skoru -> cognitive_speed_score, ayrintili analitik -> round_history.
        onGameEnd('Mutfak Dedektifi', totalTime, moves, totalErrors, undefined, {
            zorlukSeviyesi: level,
            kazanimOdagi: 'Sınıflandırma ve Kategorileme',
            cognitive_speed_score: dynamicDifficultyScore,
            round_history: {
                finalLevel: level,
                initialLevel: initialLevel,
                dynamic_difficulty_score: dynamicDifficultyScore,
                level1Time: level1Time,
                averageLevelTime: Math.round(avgLevelTime * 10) / 10,
                levelTimes: allLevelTimes.map(t => Math.round(t * 10) / 10),
                dragLogs: dragLogs,
                averageDragTime: dragLogs.length > 0
                    ? Math.round(dragLogs.reduce((a, b) => a + b.dragDuration, 0) / dragLogs.length)
                    : 0,
                scaffoldingUsed: showScaffolding,
            },
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

    // ============== SELECTABLE ITEM COMPONENT (Tap-based for preschoolers) ==============
    // ============== RENDER ==============
    return (
        <View style={styles.container}>
            {/* Kitchen Background */}
            <ImageBackground
                source={asset('/images/mutfak/background.webp')}
                style={styles.background}
                resizeMode="cover"
            >
                {/* Dark overlay to make game elements more visible */}
                <View style={styles.darkOverlay} />

                {/* Countdown Overlay */}
                {!gameReady && (
                    <CountdownOverlay
                        message={introMessage}
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
                        source={asset('/images/mutfak/mavis_chef.webp')}
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
                        <View style={styles.headerLeft}>
                            <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                                <Ionicons name="home" size={22} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.repeatBtn} onPress={() => speak(fullIntroMessage)}>
                                <Ionicons name="volume-high" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.levelBadge}>
                            <Text style={styles.levelEmoji}>⭐</Text>
                            <Text style={styles.levelText}>Seviye {level}</Text>
                        </View>

                        {/* Empty space to balance header - counters removed for preschoolers */}
                        <View style={{ width: 44 }} />
                    </View>

                    {/* Target Areas - Yeni sepet görselleri ile */}
                    <View style={styles.targetsContainer}>
                        {TARGET_AREAS.map(target => (
                            <TouchableOpacity
                                key={target.id}
                                activeOpacity={0.85}
                                onPress={() => handleTargetTap(target)}
                                style={{ userSelect: 'none' } as any}
                            >
                                <View
                                    ref={ref => { targetRefs.current[target.id] = ref; }}
                                    style={[
                                        styles.targetArea,
                                        { backgroundColor: target.color },
                                    ]}
                                    onLayout={() => measureTargets()}
                                >
                                    {/* Sepet/Kasa görseli */}
                                    <Image
                                        source={BASKET_IMAGES[target.category]}
                                        style={styles.basketImage}
                                        resizeMode="contain"
                                    />

                                    {/* Placed items in container */}
                                    <View style={styles.placedItemsRow}>
                                        {foods.filter(f => f.category === target.category && placedItems.has(f.id)).map(f => (
                                            <Text key={f.id} style={[styles.placedEmoji, { userSelect: 'none' } as any]}>{f.emoji}</Text>
                                        ))}
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Food Items Grid */}
                    <View style={styles.foodsContainer}>
                        <View style={styles.foodsGrid}>
                            {foods.map(food => (
                                <SelectableItem
                                    key={food.id}
                                    item={food}
                                    isPlaced={placedItems.has(food.id)}
                                    isSelected={selectedItem?.id === food.id}
                                    onTap={handleItemTap}
                                />
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
        width: '100%',
        height: '100%',
    },
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    exitBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    repeatBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
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
    basketImage: {
        width: 80,
        height: 60,
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
    selectedItem: {
        borderColor: '#FFD700',
        borderWidth: 4,
        shadowColor: '#FFD700',
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 10,
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
