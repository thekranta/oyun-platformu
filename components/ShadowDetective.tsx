import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    ImageSourcePropType,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// ============= CONFIG =============
export interface ShadowDetectiveConfig {
    level: number;
}

interface ShadowDetectiveProps {
    config: ShadowDetectiveConfig;
    onGameEnd: (
        oyunAdi: string,
        sure: number,
        hamle: number,
        hata: number,
        cizimVerisi?: any,
        ekstraVeri?: any
    ) => void;
    onExit: () => void;
}

// ============= ASSETS =============
interface AnimalAsset {
    id: string;
    name: string;
    source: ImageSourcePropType;
    color: string;
}

const ANIMALS: AnimalAsset[] = [
    { id: 'horse', name: 'At', source: require('@/assets/images/animal_horse.png'), color: '#8D6E63' },
    { id: 'elephant', name: 'Fil', source: require('@/assets/images/animal_elephant.png'), color: '#78909C' },
    { id: 'lion', name: 'Aslan', source: require('@/assets/images/animal_lion.png'), color: '#FFB74D' },
    { id: 'monkey', name: 'Maymun', source: require('@/assets/images/animal_monkey.png'), color: '#A1887F' },
    { id: 'giraffe', name: 'Zürafa', source: require('@/assets/images/animal_giraffe.png'), color: '#FFF176' },
    { id: 'snake', name: 'Yılan', source: require('@/assets/images/animal_snake.png'), color: '#81C784' },
    { id: 'bird', name: 'Kuş', source: require('@/assets/images/animal_bird.png'), color: '#FF8A65' },
    { id: 'octopus', name: 'Ahtapot', source: require('@/assets/images/animal_octopus.png'), color: '#CE93D8' },
    { id: 'crab', name: 'Yengeç', source: require('@/assets/images/animal_crab.png'), color: '#EF5350' },
    { id: 'whale', name: 'Balina', source: require('@/assets/images/animal_whale.png'), color: '#64B5F6' },
    { id: 'turtle', name: 'Kaplumbağa', source: require('@/assets/images/animal_turtle.png'), color: '#4DB6AC' },
];

const { width: screenW, height: screenH } = Dimensions.get('window');

// ============= TUR CONFIG =============
const ROUND_CONFIGS = [
    { count: 3, distractors: 0 },
    { count: 3, distractors: 0 },
    { count: 4, distractors: 0 },
    { count: 4, distractors: 0 },
    { count: 4, distractors: 1 },
    { count: 4, distractors: 1 },
    { count: 5, distractors: 1 },
    { count: 5, distractors: 1 },
    { count: 6, distractors: 2 },
    { count: 6, distractors: 2 },
];

const MOTIVATION = [
    { round: 3, emoji: '🌟', text: 'Harikasın!' },
    { round: 6, emoji: '⚡', text: 'Süper Hızlı!' },
    { round: 9, emoji: '🏆', text: 'Şampiyon!' },
];

// ============= DRAGGABLE =============
function DraggableAnimal({ animal, size, isMatched, onDrop }: {
    animal: AnimalAsset;
    size: number;
    isMatched: boolean;
    onDrop: (id: string, x: number, y: number) => boolean;
}) {
    const pan = useRef(new Animated.ValueXY()).current;
    const scale = useRef(new Animated.Value(1)).current;
    const bounce = useRef(new Animated.Value(0)).current;

    // Idle bounce animation
    useEffect(() => {
        if (!isMatched) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(bounce, { toValue: -5, duration: 800, useNativeDriver: true }),
                    Animated.timing(bounce, { toValue: 5, duration: 800, useNativeDriver: true }),
                ])
            ).start();
        }
        return () => bounce.stopAnimation();
    }, [isMatched]);

    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => !isMatched,
        onMoveShouldSetPanResponder: () => !isMatched,
        onPanResponderGrant: () => {
            // @ts-ignore
            pan.setOffset({ x: pan.x._value, y: pan.y._value });
            pan.setValue({ x: 0, y: 0 });
            Animated.spring(scale, { toValue: 1.25, friction: 4, useNativeDriver: true }).start();
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, g) => {
            pan.flattenOffset();
            Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
            if (!onDrop(animal.id, g.moveX, g.moveY)) {
                Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: false }).start();
            }
        },
    }), [isMatched, animal.id, onDrop]);

    return (
        <Animated.View
            style={[
                styles.animalCard,
                {
                    width: size,
                    height: size,
                    backgroundColor: animal.color,
                    opacity: isMatched ? 0.3 : 1,
                    transform: [
                        { translateX: pan.x },
                        { translateY: pan.y },
                        { translateY: bounce },
                        { scale },
                    ],
                },
            ]}
            {...panResponder.panHandlers}
        >
            <Image source={animal.source} style={styles.animalImg} resizeMode="contain" />
            {!isMatched && <Text style={styles.animalName}>{animal.name}</Text>}
        </Animated.View>
    );
}

// ============= MAIN =============
export default function ShadowDetective({ config, onGameEnd, onExit }: ShadowDetectiveProps) {
    const TOTAL = 10;
    const [round, setRound] = useState(1);
    const [animals, setAnimals] = useState<AnimalAsset[]>([]);
    const [shadows, setShadows] = useState<AnimalAsset[]>([]);
    const [matched, setMatched] = useState<Set<string>>(new Set());
    const [errors, setErrors] = useState(0);
    const [totalErrors, setTotalErrors] = useState(0);
    const [moves, setMoves] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showMotivation, setShowMotivation] = useState<{ emoji: string; text: string } | null>(null);
    const [gameStart] = useState(Date.now());
    const [roundStart, setRoundStart] = useState(Date.now());
    const [roundData, setRoundData] = useState<any[]>([]);

    const successScale = useRef(new Animated.Value(0)).current;
    const shadowRefs = useRef<Map<string, { x: number; y: number; w: number; h: number }>>(new Map());

    const cfg = ROUND_CONFIGS[round - 1] || ROUND_CONFIGS[0];
    const itemSize = Math.min(screenW * 0.22, 120);
    const shadowSize = itemSize * 0.9;

    useEffect(() => { initRound(); }, [round]);

    const initRound = () => {
        const shuffled = [...ANIMALS].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, cfg.count);
        let shadowList = [...selected];
        if (cfg.distractors > 0) {
            const extra = shuffled.filter(a => !selected.find(s => s.id === a.id)).slice(0, cfg.distractors);
            shadowList = [...shadowList, ...extra].sort(() => Math.random() - 0.5);
        }
        setAnimals(selected);
        setShadows(shadowList);
        setMatched(new Set());
        setErrors(0);
        setRoundStart(Date.now());
        shadowRefs.current.clear();
    };

    useEffect(() => {
        if (matched.size === animals.length && animals.length > 0) completeRound();
    }, [matched, animals.length]);

    const completeRound = () => {
        const dur = Math.floor((Date.now() - roundStart) / 1000);
        setRoundData(prev => [...prev, { tur: round, hata: errors, sure: dur }]);

        const mot = MOTIVATION.find(m => m.round === round);
        if (mot) {
            setShowMotivation(mot);
            setTimeout(() => setShowMotivation(null), 2000);
        }

        setShowSuccess(true);
        Animated.spring(successScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();

        setTimeout(() => {
            successScale.setValue(0);
            setShowSuccess(false);
            if (round < TOTAL) setRound(r => r + 1);
            else finishGame();
        }, mot ? 2500 : 1200);
    };

    const finishGame = () => {
        const dur = Math.floor((Date.now() - gameStart) / 1000);
        onGameEnd('Gölge Dedektifi', dur, moves, totalErrors, undefined, {
            zorlukSeviyesi: config.level,
            kazanimOdagi: 'Görsel Çözümleme',
            tur_verisi: roundData,
        });
    };

    const handleDrop = useCallback((id: string, x: number, y: number): boolean => {
        setMoves(m => m + 1);
        for (const [sid, layout] of shadowRefs.current.entries()) {
            if (x >= layout.x && x <= layout.x + layout.w && y >= layout.y && y <= layout.y + layout.h) {
                if (id === sid) {
                    setMatched(prev => new Set(prev).add(id));
                    return true;
                } else {
                    setErrors(e => e + 1);
                    setTotalErrors(e => e + 1);
                    return false;
                }
            }
        }
        return false;
    }, []);

    const onShadowLayout = (id: string, ref: View | null) => {
        if (!ref) return;
        ref.measure((x, y, w, h, px, py) => {
            shadowRefs.current.set(id, { x: px, y: py, w, h });
        });
    };

    return (
        <View style={styles.container}>
            {/* Colorful Background */}
            <View style={styles.bgTop} />
            <View style={styles.bgBottom} />

            {/* Decorations */}
            <View style={[styles.cloud, { left: 20, top: 80 }]} />
            <View style={[styles.cloud, { right: 30, top: 120 }]} />
            <View style={[styles.sun, { right: 20, top: 40 }]} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.exitBtn}>
                    <Ionicons name="home" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.roundBadge}>
                    <Text style={styles.roundText}>🔍 Tur {round}/{TOTAL}</Text>
                </View>
                <View style={styles.errorBadge}>
                    <Text style={styles.errorText}>❌ {errors}</Text>
                </View>
            </View>

            {/* Progress Stars */}
            <View style={styles.starsRow}>
                {Array(TOTAL).fill(0).map((_, i) => (
                    <Text key={i} style={[styles.star, i < round && styles.starActive]}>
                        {i < round ? '⭐' : '☆'}
                    </Text>
                ))}
            </View>

            {/* Main Game Area */}
            <View style={styles.gameContainer}>
                {/* Animals Side */}
                <View style={styles.side}>
                    <Text style={styles.sideTitle}>🎨 Renkli</Text>
                    <View style={styles.itemsGrid}>
                        {animals.map(a => (
                            <DraggableAnimal
                                key={`a-${a.id}-${round}`}
                                animal={a}
                                size={itemSize}
                                isMatched={matched.has(a.id)}
                                onDrop={handleDrop}
                            />
                        ))}
                    </View>
                </View>

                {/* Arrow */}
                <View style={styles.arrowContainer}>
                    <Text style={styles.arrow}>➡️</Text>
                </View>

                {/* Shadows Side */}
                <View style={styles.side}>
                    <Text style={styles.sideTitle}>👤 Gölge</Text>
                    <View style={styles.itemsGrid}>
                        {shadows.map((s, i) => (
                            <View
                                key={`s-${s.id}-${i}-${round}`}
                                ref={r => onShadowLayout(s.id, r)}
                                style={[
                                    styles.shadowCard,
                                    { width: shadowSize, height: shadowSize },
                                    matched.has(s.id) && styles.shadowMatched,
                                ]}
                            >
                                <Image
                                    source={s.source}
                                    style={[styles.shadowImg, { tintColor: matched.has(s.id) ? '#4CAF50' : '#1a1a1a' }]}
                                    resizeMode="contain"
                                />
                                {matched.has(s.id) && <Text style={styles.checkMark}>✅</Text>}
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            {/* Instructions */}
            <View style={styles.instructionBar}>
                <Text style={styles.instructionText}>👆 Hayvanı sürükle → Gölgesine bırak!</Text>
            </View>

            {/* Success Popup */}
            {showSuccess && (
                <Animated.View style={[styles.successPopup, { transform: [{ scale: successScale }] }]}>
                    <Text style={styles.successEmoji}>🎉</Text>
                    <Text style={styles.successText}>Tur {round} Tamam!</Text>
                </Animated.View>
            )}

            {/* Motivation Overlay */}
            {showMotivation && (
                <View style={styles.motivationOverlay}>
                    <Text style={styles.motivationEmoji}>{showMotivation.emoji}</Text>
                    <Text style={styles.motivationText}>{showMotivation.text}</Text>
                    <View style={styles.starsExplosion}>
                        {['⭐', '✨', '🌟', '💫', '⭐', '✨'].map((s, i) => (
                            <Animated.Text key={i} style={[styles.explodeStar, { left: 30 + i * 45, top: 20 + (i % 2) * 60 }]}>
                                {s}
                            </Animated.Text>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    bgTop: { position: 'absolute', top: 0, left: 0, right: 0, height: '60%', backgroundColor: '#87CEEB' },
    bgBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%', backgroundColor: '#90EE90', borderTopLeftRadius: 50, borderTopRightRadius: 50 },
    cloud: { position: 'absolute', width: 70, height: 30, backgroundColor: '#fff', borderRadius: 20, opacity: 0.8 },
    sun: { position: 'absolute', width: 50, height: 50, backgroundColor: '#FFD700', borderRadius: 25 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'web' ? 15 : 50,
        paddingHorizontal: 15,
        paddingBottom: 10,
        zIndex: 10,
    },
    exitBtn: { padding: 10, backgroundColor: '#FF6B6B', borderRadius: 20 },
    roundBadge: { backgroundColor: '#4ECDC4', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
    roundText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    errorBadge: { backgroundColor: '#FFE66D', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
    errorText: { fontSize: 14, fontWeight: 'bold', color: '#333' },

    starsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 8,
    },
    star: { fontSize: 18, color: '#ccc' },
    starActive: { color: '#FFD700' },

    gameContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    side: { flex: 1, alignItems: 'center' },
    sideTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 15 },
    itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },

    arrowContainer: { paddingHorizontal: 10 },
    arrow: { fontSize: 30 },

    animalCard: {
        borderRadius: 20,
        padding: 8,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    animalImg: { width: '75%', height: '65%' },
    animalName: { fontSize: 11, fontWeight: 'bold', color: '#fff', marginTop: 3, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },

    shadowCard: {
        backgroundColor: 'rgba(50,50,50,0.15)',
        borderRadius: 20,
        borderWidth: 3,
        borderColor: 'rgba(0,0,0,0.2)',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    shadowMatched: { backgroundColor: 'rgba(76,175,80,0.3)', borderColor: '#4CAF50', borderStyle: 'solid' },
    shadowImg: { width: '70%', height: '70%', opacity: 0.7 },
    checkMark: { position: 'absolute', fontSize: 24 },

    instructionBar: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        marginHorizontal: 20,
        marginBottom: 15,
        paddingVertical: 12,
        borderRadius: 25,
        alignItems: 'center',
    },
    instructionText: { fontSize: 15, fontWeight: '600', color: '#333' },

    successPopup: {
        position: 'absolute',
        top: '35%',
        left: '20%',
        right: '20%',
        backgroundColor: '#fff',
        borderRadius: 25,
        padding: 25,
        alignItems: 'center',
        elevation: 20,
        zIndex: 100,
    },
    successEmoji: { fontSize: 50 },
    successText: { fontSize: 22, fontWeight: 'bold', color: '#4CAF50', marginTop: 8 },

    motivationOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,193,7,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200,
    },
    motivationEmoji: { fontSize: 80 },
    motivationText: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginTop: 15, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 5 },
    starsExplosion: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    explodeStar: { position: 'absolute', fontSize: 35 },
});
