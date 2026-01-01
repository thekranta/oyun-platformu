import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
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

// ============= ASSET GRUPLARI =============
interface AnimalAsset {
    id: string;
    name: string;
    source: ImageSourcePropType;
    group: 'farm' | 'jungle' | 'sea';
}

// FARM Grubu (Kara hayvanları)
const FARM_ANIMALS: AnimalAsset[] = [
    { id: 'horse', name: 'At', source: require('@/assets/images/animal_horse.png'), group: 'farm' },
    { id: 'elephant', name: 'Fil', source: require('@/assets/images/animal_elephant.png'), group: 'farm' },
    { id: 'lion', name: 'Aslan', source: require('@/assets/images/animal_lion.png'), group: 'farm' },
    { id: 'monkey', name: 'Maymun', source: require('@/assets/images/animal_monkey.png'), group: 'farm' },
];

// JUNGLE Grubu
const JUNGLE_ANIMALS: AnimalAsset[] = [
    { id: 'giraffe', name: 'Zürafa', source: require('@/assets/images/animal_giraffe.png'), group: 'jungle' },
    { id: 'snake', name: 'Yılan', source: require('@/assets/images/animal_snake.png'), group: 'jungle' },
    { id: 'bird', name: 'Kuş', source: require('@/assets/images/animal_bird.png'), group: 'jungle' },
    { id: 'lion2', name: 'Aslan', source: require('@/assets/images/animal_lion.png'), group: 'jungle' },
    { id: 'monkey2', name: 'Maymun', source: require('@/assets/images/animal_monkey.png'), group: 'jungle' },
    { id: 'elephant2', name: 'Fil', source: require('@/assets/images/animal_elephant.png'), group: 'jungle' },
];

// SEA Grubu
const SEA_ANIMALS: AnimalAsset[] = [
    { id: 'octopus', name: 'Ahtapot', source: require('@/assets/images/animal_octopus.png'), group: 'sea' },
    { id: 'crab', name: 'Yengeç', source: require('@/assets/images/animal_crab.png'), group: 'sea' },
    { id: 'whale', name: 'Balina', source: require('@/assets/images/animal_whale.png'), group: 'sea' },
    { id: 'turtle', name: 'Kaplumbağa', source: require('@/assets/images/animal_turtle.png'), group: 'sea' },
];

// Tüm hayvanlar
const ALL_ANIMALS = [...FARM_ANIMALS, ...JUNGLE_ANIMALS.slice(0, 4), ...SEA_ANIMALS];

const { width: screenW, height: screenH } = Dimensions.get('window');
const isSmallScreen = screenH < 700;

// ============= TUR KONFIGÜRASYONU (10 TUR) =============
interface RoundConfig {
    group: 'farm' | 'jungle' | 'sea' | 'all';
    itemCount: number;
    distractors: number;
    label: string;
}

const ROUND_CONFIGS: RoundConfig[] = [
    // Tur 1-2: Isınma - farm
    { group: 'farm', itemCount: 3, distractors: 0, label: 'Isınma' },
    { group: 'farm', itemCount: 3, distractors: 0, label: 'Isınma' },
    // Tur 3-4: Gelişim - jungle
    { group: 'jungle', itemCount: 4, distractors: 0, label: 'Gelişim' },
    { group: 'jungle', itemCount: 4, distractors: 0, label: 'Gelişim' },
    // Tur 5-6: Dikkat - sea + çeldirici
    { group: 'sea', itemCount: 4, distractors: 1, label: 'Dikkat' },
    { group: 'sea', itemCount: 4, distractors: 1, label: 'Dikkat' },
    // Tur 7-8: Karmaşıklık - karma
    { group: 'all', itemCount: 5, distractors: 1, label: 'Karmaşıklık' },
    { group: 'all', itemCount: 5, distractors: 1, label: 'Karmaşıklık' },
    // Tur 9-10: Zirve - karma + 2 çeldirici
    { group: 'all', itemCount: 6, distractors: 2, label: 'Zirve' },
    { group: 'all', itemCount: 6, distractors: 2, label: 'Zirve' },
];

// ============= MOTİVASYON MESAJLARI =============
const MOTIVATION_MESSAGES = [
    { round: 3, emoji: '🌟', message: 'Harikasın!' },
    { round: 6, emoji: '⚡', message: 'Çok Hızlısın!' },
    { round: 9, emoji: '🏆', message: 'Süpersin!' },
];

// ============= TUR VERİSİ =============
interface RoundData {
    tur_no: number;
    hata_sayisi: number;
    sure: number;
    grup: string;
    nesne_sayisi: number;
}

// ============= DRAGGABLE ANIMAL =============
interface DraggableAnimalProps {
    animal: AnimalAsset;
    size: number;
    isMatched: boolean;
    isShaking: boolean;
    shakeAnim: Animated.Value;
    onDrop: (id: string, x: number, y: number) => boolean;
}

function DraggableAnimal({ animal, size, isMatched, isShaking, shakeAnim, onDrop }: DraggableAnimalProps) {
    const pan = useRef(new Animated.ValueXY()).current;
    const scale = useRef(new Animated.Value(1)).current;

    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => !isMatched,
        onMoveShouldSetPanResponder: () => !isMatched,
        onPanResponderGrant: () => {
            pan.setOffset({
                // @ts-ignore
                x: pan.x._value,
                // @ts-ignore
                y: pan.y._value,
            });
            pan.setValue({ x: 0, y: 0 });
            Animated.spring(scale, { toValue: 1.15, friction: 5, useNativeDriver: true }).start();
        },
        onPanResponderMove: Animated.event(
            [null, { dx: pan.x, dy: pan.y }],
            { useNativeDriver: false }
        ),
        onPanResponderRelease: (_, gesture) => {
            pan.flattenOffset();
            Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();

            const success = onDrop(animal.id, gesture.moveX, gesture.moveY);

            if (!success) {
                Animated.spring(pan, {
                    toValue: { x: 0, y: 0 },
                    friction: 6,
                    useNativeDriver: false,
                }).start();
            }
        },
    }), [isMatched, animal.id, onDrop]);

    return (
        <Animated.View
            style={[
                styles.animalItem,
                {
                    width: size,
                    height: size,
                    opacity: isMatched ? 0.25 : 1,
                    transform: [
                        { translateX: pan.x },
                        { translateY: pan.y },
                        { scale: scale },
                        { translateX: isShaking ? shakeAnim : 0 },
                    ],
                    zIndex: isShaking ? 100 : 1,
                },
            ]}
            {...panResponder.panHandlers}
        >
            <Image source={animal.source} style={styles.animalImage} resizeMode="contain" />
        </Animated.View>
    );
}

// ============= MAIN COMPONENT =============
export default function ShadowDetective({ config, onGameEnd, onExit }: ShadowDetectiveProps) {
    const TOTAL_ROUNDS = 10;

    // State
    const [round, setRound] = useState(1);
    const [animals, setAnimals] = useState<AnimalAsset[]>([]);
    const [shadows, setShadows] = useState<AnimalAsset[]>([]);
    const [matched, setMatched] = useState<Set<string>>(new Set());
    const [roundErrors, setRoundErrors] = useState(0);
    const [totalErrors, setTotalErrors] = useState(0);
    const [totalMoves, setTotalMoves] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showMotivation, setShowMotivation] = useState<{ emoji: string; message: string } | null>(null);
    const [gameStartTime] = useState(Date.now());
    const [roundStartTime, setRoundStartTime] = useState(Date.now());
    const [shakeId, setShakeId] = useState<string | null>(null);
    const [roundDataList, setRoundDataList] = useState<RoundData[]>([]);
    const [gameComplete, setGameComplete] = useState(false);

    // Refs
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const successScale = useRef(new Animated.Value(0)).current;
    const starAnims = useRef(Array(10).fill(0).map(() => new Animated.Value(0))).current;
    const shadowLayoutsRef = useRef<Map<string, { x: number; y: number; w: number; h: number }>>(new Map());

    // Sizes
    const itemSize = isSmallScreen ? 85 : 110;
    const shadowSize = isSmallScreen ? 80 : 105;

    // Current config
    const roundConfig = ROUND_CONFIGS[round - 1] || ROUND_CONFIGS[0];

    // Get animals for group
    const getAnimalsForGroup = (group: 'farm' | 'jungle' | 'sea' | 'all') => {
        switch (group) {
            case 'farm': return [...FARM_ANIMALS];
            case 'jungle': return [...JUNGLE_ANIMALS];
            case 'sea': return [...SEA_ANIMALS];
            case 'all': return [...ALL_ANIMALS];
        }
    };

    // Init round
    useEffect(() => {
        initRound();
    }, [round]);

    const initRound = () => {
        const pool = getAnimalsForGroup(roundConfig.group).sort(() => Math.random() - 0.5);
        const selected = pool.slice(0, Math.min(roundConfig.itemCount, pool.length));

        let shadowList = [...selected];
        if (roundConfig.distractors > 0) {
            const remaining = pool.filter(a => !selected.find(s => s.id === a.id));
            shadowList = [...shadowList, ...remaining.slice(0, roundConfig.distractors)];
        }
        shadowList = shadowList.sort(() => Math.random() - 0.5);

        setAnimals(selected);
        setShadows(shadowList);
        setMatched(new Set());
        setRoundErrors(0);
        setRoundStartTime(Date.now());
        shadowLayoutsRef.current.clear();
    };

    // Check round complete
    useEffect(() => {
        if (matched.size === animals.length && animals.length > 0) {
            handleRoundComplete();
        }
    }, [matched, animals.length]);

    const handleRoundComplete = () => {
        // Save round data
        const roundDuration = Math.floor((Date.now() - roundStartTime) / 1000);
        const newData: RoundData = {
            tur_no: round,
            hata_sayisi: roundErrors,
            sure: roundDuration,
            grup: roundConfig.group,
            nesne_sayisi: roundConfig.itemCount,
        };
        setRoundDataList(prev => [...prev, newData]);

        // Check motivation
        const motivation = MOTIVATION_MESSAGES.find(m => m.round === round);
        if (motivation) {
            setShowMotivation(motivation);
            animateStars();
            setTimeout(() => setShowMotivation(null), 2200);
        }

        setShowSuccess(true);
        Animated.spring(successScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();

        setTimeout(() => {
            successScale.setValue(0);
            setShowSuccess(false);

            if (round < TOTAL_ROUNDS) {
                setRound(r => r + 1);
            } else {
                setGameComplete(true);
                finishGame();
            }
        }, motivation ? 2500 : 1200);
    };

    const animateStars = () => {
        starAnims.forEach((anim, i) => {
            Animated.sequence([
                Animated.delay(i * 60),
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 500,
                    easing: Easing.out(Easing.back(2)),
                    useNativeDriver: true,
                }),
            ]).start(() => anim.setValue(0));
        });
    };

    const finishGame = () => {
        const totalDuration = Math.floor((Date.now() - gameStartTime) / 1000);

        // Tur bazlı rapor
        const turRaporu = roundDataList.map(r => ({
            tur: r.tur_no,
            hata: r.hata_sayisi,
            sure: r.sure,
            grup: r.grup,
        }));

        onGameEnd('Gölge Dedektifi', totalDuration, totalMoves, totalErrors, undefined, {
            zorlukSeviyesi: config.level,
            kazanimOdagi: 'Görsel Çözümleme ve Eşleştirme',
            tamamlanan_tur: round,
            toplam_tur: TOTAL_ROUNDS,
            tur_bazli_veri: turRaporu,
        });
    };

    const triggerShake = (id: string) => {
        setShakeId(id);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 12, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -12, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 12, duration: 40, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start(() => setShakeId(null));
    };

    const handleDrop = useCallback((animalId: string, dropX: number, dropY: number): boolean => {
        setTotalMoves(m => m + 1);

        for (const [shadowId, layout] of shadowLayoutsRef.current.entries()) {
            const inX = dropX >= layout.x && dropX <= layout.x + layout.w;
            const inY = dropY >= layout.y && dropY <= layout.y + layout.h;

            if (inX && inY) {
                if (animalId === shadowId) {
                    setMatched(prev => new Set(prev).add(animalId));
                    return true;
                } else {
                    setRoundErrors(e => e + 1);
                    setTotalErrors(e => e + 1);
                    triggerShake(animalId);
                    return false;
                }
            }
        }
        return false;
    }, []);

    const onShadowLayout = (id: string, ref: View | null) => {
        if (!ref) return;
        ref.measure((x, y, w, h, pageX, pageY) => {
            shadowLayoutsRef.current.set(id, { x: pageX, y: pageY, w, h });
        });
    };

    return (
        <View style={styles.container}>
            {/* Pastel Background */}
            <View style={styles.bg}>
                <View style={styles.sky} />
                <View style={styles.hills} />
                <View style={styles.grass} />
            </View>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.backBtn}>
                    <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                    <Text style={styles.title}>Tur {round}/{TOTAL_ROUNDS}</Text>
                    <Text style={styles.subtitle}>{roundConfig.label}</Text>
                </View>
                <View style={styles.headerStats}>
                    <Text style={styles.statText}>✗ {roundErrors}</Text>
                </View>
            </View>

            {/* Progress */}
            <View style={styles.progressWrap}>
                <View style={[styles.progressBar, { width: `${(round / TOTAL_ROUNDS) * 100}%` }]} />
            </View>

            {/* Game Area */}
            <View style={styles.gameArea}>
                {/* Animals */}
                <View style={styles.column}>
                    {animals.map(animal => (
                        <DraggableAnimal
                            key={`animal-${animal.id}-${round}`}
                            animal={animal}
                            size={itemSize}
                            isMatched={matched.has(animal.id)}
                            isShaking={shakeId === animal.id}
                            shakeAnim={shakeAnim}
                            onDrop={handleDrop}
                        />
                    ))}
                </View>

                {/* Shadows */}
                <View style={styles.column}>
                    {shadows.map((shadow, idx) => (
                        <View
                            key={`shadow-${shadow.id}-${idx}-${round}`}
                            ref={ref => onShadowLayout(shadow.id, ref)}
                            style={[
                                styles.shadowSlot,
                                { width: shadowSize, height: shadowSize },
                                matched.has(shadow.id) && styles.shadowMatched,
                            ]}
                        >
                            <Image
                                source={shadow.source}
                                style={[
                                    styles.shadowImage,
                                    { tintColor: matched.has(shadow.id) ? '#2E7D32' : '#000', opacity: matched.has(shadow.id) ? 1 : 0.55 },
                                ]}
                                resizeMode="contain"
                            />
                        </View>
                    ))}
                </View>
            </View>

            {/* Success */}
            {showSuccess && (
                <Animated.View style={[styles.successBox, { transform: [{ scale: successScale }] }]}>
                    <Text style={styles.successEmoji}>✅</Text>
                    <Text style={styles.successText}>Tur {round} Tamam!</Text>
                </Animated.View>
            )}

            {/* Motivation */}
            {showMotivation && (
                <View style={styles.motivationOverlay}>
                    <Text style={styles.motivationEmoji}>{showMotivation.emoji}</Text>
                    <Text style={styles.motivationText}>{showMotivation.message}</Text>
                    {starAnims.map((anim, i) => (
                        <Animated.Text
                            key={`star-${i}`}
                            style={{
                                position: 'absolute',
                                fontSize: 28,
                                left: 30 + (i % 5) * 55,
                                top: 60 + Math.floor(i / 5) * 100,
                                transform: [{ scale: anim }, { rotate: `${i * 36}deg` }],
                                opacity: anim,
                            }}
                        >
                            ⭐
                        </Animated.Text>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    bg: { ...StyleSheet.absoluteFillObject },
    sky: { flex: 1, backgroundColor: '#B3E5FC' },
    hills: { height: 80, backgroundColor: '#81C784', borderTopLeftRadius: 100, borderTopRightRadius: 100 },
    grass: { height: 40, backgroundColor: '#4CAF50' },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'web' ? 10 : 45,
        paddingHorizontal: 12,
        paddingBottom: 8,
        backgroundColor: 'rgba(55,71,79,0.85)',
        zIndex: 20,
    },
    backBtn: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' },
    headerCenter: { flex: 1, alignItems: 'center' },
    title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    subtitle: { fontSize: 11, color: '#B0BEC5' },
    headerStats: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#FF5252', borderRadius: 10 },
    statText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    progressWrap: { position: 'absolute', top: Platform.OS === 'web' ? 60 : 95, left: 0, right: 0, height: 3, backgroundColor: 'rgba(0,0,0,0.1)', zIndex: 15 },
    progressBar: { height: '100%', backgroundColor: '#4CAF50' },
    gameArea: {
        flex: 1,
        flexDirection: 'row',
        paddingTop: Platform.OS === 'web' ? 70 : 105,
        paddingHorizontal: 10,
        paddingBottom: 10,
    },
    column: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignContent: 'center',
        gap: 10,
    },
    animalItem: { backgroundColor: 'transparent' },
    animalImage: { width: '100%', height: '100%' },
    shadowSlot: {
        backgroundColor: 'rgba(0,0,0,0.08)',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shadowMatched: { backgroundColor: 'rgba(76,175,80,0.25)' },
    shadowImage: { width: '80%', height: '80%' },
    successBox: {
        position: 'absolute',
        top: '40%',
        left: '25%',
        right: '25%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        elevation: 10,
        zIndex: 100,
    },
    successEmoji: { fontSize: 40 },
    successText: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50', marginTop: 5 },
    motivationOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,193,7,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200,
    },
    motivationEmoji: { fontSize: 70 },
    motivationText: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 10 },
});
