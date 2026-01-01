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

// ============= HAYVAN ASSET'LERİ =============
interface AnimalAsset {
    id: number;
    name: string;
    source: ImageSourcePropType;
}

const ANIMALS: AnimalAsset[] = [
    { id: 0, name: 'Zürafa', source: require('@/assets/images/animal_giraffe.png') },
    { id: 1, name: 'Fil', source: require('@/assets/images/animal_elephant.png') },
    { id: 2, name: 'Yılan', source: require('@/assets/images/animal_snake.png') },
    { id: 3, name: 'Kuş', source: require('@/assets/images/animal_bird.png') },
    // Ek hayvanlar için meyveleri kullan
    { id: 4, name: 'Elma', source: require('@/assets/images/elma.png') },
    { id: 5, name: 'Kedi', source: require('@/assets/images/kedi.png') },
    { id: 6, name: 'Top', source: require('@/assets/images/top.png') },
    { id: 7, name: 'Ev', source: require('@/assets/images/ev.png') },
];

const { width: screenW, height: screenH } = Dimensions.get('window');
const isSmallScreen = screenH < 700;

// ============= TUR KONFIGÜRASYONU (10 TUR) =============
const getRoundConfig = (round: number) => {
    if (round <= 3) return { itemCount: 3, distractors: 0 };
    if (round <= 7) return { itemCount: 5, distractors: 1 };
    return { itemCount: 6, distractors: 2 };
};

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
    tamamlama_suresi: number;
    nesne_sayisi: number;
    celdirici_sayisi: number;
}

// ============= DRAGGABLE ANIMAL COMPONENT =============
interface DraggableAnimalProps {
    animal: AnimalAsset;
    size: number;
    isMatched: boolean;
    isShaking: boolean;
    shakeAnim: Animated.Value;
    onDrop: (id: number, x: number, y: number) => boolean;
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
            Animated.spring(scale, { toValue: 1.2, friction: 5, useNativeDriver: true }).start();
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
                    friction: 5,
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
                    opacity: isMatched ? 0.3 : 1,
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
            <Image
                source={animal.source}
                style={styles.animalImage}
                resizeMode="contain"
            />
        </Animated.View>
    );
}

// ============= MAIN COMPONENT =============
export default function ShadowDetective({ config, onGameEnd, onExit }: ShadowDetectiveProps) {
    const TOTAL_ROUNDS = 10;
    const MAX_ERRORS_PER_ROUND = 5;
    const ROUND_TIMEOUT_MS = 120000; // 2 dakika

    // State
    const [round, setRound] = useState(1);
    const [animals, setAnimals] = useState<AnimalAsset[]>([]);
    const [shadows, setShadows] = useState<AnimalAsset[]>([]);
    const [matched, setMatched] = useState<Set<number>>(new Set());
    const [roundErrors, setRoundErrors] = useState(0);
    const [totalErrors, setTotalErrors] = useState(0);
    const [totalMoves, setTotalMoves] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showMotivation, setShowMotivation] = useState<{ emoji: string; message: string } | null>(null);
    const [showEarlyExit, setShowEarlyExit] = useState(false);
    const [gameStartTime] = useState(Date.now());
    const [roundStartTime, setRoundStartTime] = useState(Date.now());
    const [shakeId, setShakeId] = useState<number | null>(null);
    const [roundDataList, setRoundDataList] = useState<RoundData[]>([]);

    // Animation refs
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const successScale = useRef(new Animated.Value(0)).current;
    const starAnims = useRef(Array(8).fill(0).map(() => new Animated.Value(0))).current;

    // Shadow positions
    const shadowLayoutsRef = useRef<Map<number, { x: number; y: number; w: number; h: number }>>(new Map());

    // Timeout ref
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Item size
    const itemSize = isSmallScreen ? 90 : 120;
    const shadowSize = isSmallScreen ? 85 : 115;

    // Current round config
    const roundConfig = getRoundConfig(round);

    // Initialize round
    useEffect(() => {
        initRound();
        startRoundTimer();
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [round]);

    const startRoundTimer = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            handleEarlyExit('timeout');
        }, ROUND_TIMEOUT_MS);
    };

    const initRound = () => {
        const shuffled = [...ANIMALS].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(roundConfig.itemCount, ANIMALS.length));

        let shadowList = [...selected];
        if (roundConfig.distractors > 0) {
            const remaining = shuffled.filter(a => !selected.includes(a));
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

    // Check for max errors
    useEffect(() => {
        if (roundErrors >= MAX_ERRORS_PER_ROUND) {
            handleEarlyExit('errors');
        }
    }, [roundErrors]);

    const handleEarlyExit = (reason: 'errors' | 'timeout') => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setShowEarlyExit(true);

        setTimeout(() => {
            finishGame();
        }, 2500);
    };

    const handleRoundComplete = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Kaydet tur verisini
        const roundDuration = Math.floor((Date.now() - roundStartTime) / 1000);
        const newRoundData: RoundData = {
            tur_no: round,
            hata_sayisi: roundErrors,
            tamamlama_suresi: roundDuration,
            nesne_sayisi: roundConfig.itemCount,
            celdirici_sayisi: roundConfig.distractors,
        };
        setRoundDataList(prev => [...prev, newRoundData]);

        // Motivasyon mesajı kontrol
        const motivation = MOTIVATION_MESSAGES.find(m => m.round === round);
        if (motivation) {
            setShowMotivation(motivation);
            animateStars();
            setTimeout(() => setShowMotivation(null), 2000);
        }

        setShowSuccess(true);
        Animated.spring(successScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();

        setTimeout(() => {
            successScale.setValue(0);
            setShowSuccess(false);

            if (round < TOTAL_ROUNDS) {
                setRound(r => r + 1);
            } else {
                finishGame();
            }
        }, motivation ? 2500 : 1500);
    };

    const animateStars = () => {
        starAnims.forEach((anim, i) => {
            Animated.sequence([
                Animated.delay(i * 80),
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 600,
                    easing: Easing.out(Easing.back(2)),
                    useNativeDriver: true,
                }),
            ]).start(() => anim.setValue(0));
        });
    };

    const finishGame = () => {
        const totalDuration = Math.floor((Date.now() - gameStartTime) / 1000);

        // Analiz için tur bazlı rapor hazırla
        const turRaporu = roundDataList.map(r => ({
            tur: r.tur_no,
            hata: r.hata_sayisi,
            sure: r.tamamlama_suresi,
            zorluk: `${r.nesne_sayisi} nesne, ${r.celdirici_sayisi} çeldirici`,
        }));

        // Performans analizi
        let analizNotlari: string[] = [];

        // 8. turdan sonra yavaşlama kontrolü
        const sonTurlar = roundDataList.filter(r => r.tur_no >= 8);
        const ilkTurlar = roundDataList.filter(r => r.tur_no <= 3);
        if (sonTurlar.length > 0 && ilkTurlar.length > 0) {
            const sonOrt = sonTurlar.reduce((a, b) => a + b.tamamlama_suresi, 0) / sonTurlar.length;
            const ilkOrt = ilkTurlar.reduce((a, b) => a + b.tamamlama_suresi, 0) / ilkTurlar.length;
            if (sonOrt > ilkOrt * 1.5) {
                analizNotlari.push('Öğrenci 8. turdan itibaren yavaşlamaya başladı - çalışan bellek yükü artıyor olabilir.');
            }
        }

        // Hata oranı değişimi
        const ilkHatalar = ilkTurlar.reduce((a, b) => a + b.hata_sayisi, 0);
        const sonHatalar = sonTurlar.reduce((a, b) => a + b.hata_sayisi, 0);
        if (sonHatalar <= ilkHatalar && sonTurlar.length > 0) {
            analizNotlari.push('Zorluk arttıkça hata oranı değişmedi - görsel tarama kapasitesi güçlü.');
        } else if (sonHatalar > ilkHatalar * 2) {
            analizNotlari.push('Nesne sayısı arttıkça hata oranı yükseldi - görsel tarama kapasitesinin sınırlılığı.');
        }

        onGameEnd('Gölge Dedektifi', totalDuration, totalMoves, totalErrors, undefined, {
            zorlukSeviyesi: config.level,
            kazanimOdagi: 'Görsel Çözümleme ve Eşleştirme',
            tamamlanan_tur: round,
            toplam_tur: TOTAL_ROUNDS,
            tur_bazli_veri: turRaporu,
            analiz_notlari: analizNotlari,
        });
    };

    const triggerShake = (id: number) => {
        setShakeId(id);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start(() => setShakeId(null));
    };

    const handleDrop = useCallback((animalId: number, dropX: number, dropY: number): boolean => {
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

    const onShadowLayout = (id: number, ref: View | null) => {
        if (!ref) return;
        ref.measure((x, y, w, h, pageX, pageY) => {
            shadowLayoutsRef.current.set(id, { x: pageX, y: pageY, w, h });
        });
    };

    return (
        <View style={styles.container}>
            {/* Background */}
            <View style={styles.bgGradient}>
                <View style={styles.bgTree1} />
                <View style={styles.bgTree2} />
                <View style={styles.bgGrass} />
            </View>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>🔍 Gölge Dedektifi</Text>
                    <Text style={styles.subtitle}>Tur {round}/{TOTAL_ROUNDS}</Text>
                </View>
                <View style={styles.stats}>
                    <View style={[styles.statBadge, { backgroundColor: '#4CAF50' }]}>
                        <Text style={styles.statText}>✓ {matched.size}/{animals.length}</Text>
                    </View>
                    <View style={[styles.statBadge, { backgroundColor: roundErrors > 0 ? '#FF5252' : '#78909C' }]}>
                        <Text style={styles.statText}>✗ {roundErrors}</Text>
                    </View>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${(round / TOTAL_ROUNDS) * 100}%` }]} />
            </View>

            {/* Game Area */}
            <View style={styles.gameArea}>
                {/* Animals (Left) */}
                <View style={styles.animalsArea}>
                    <View style={styles.itemsWrap}>
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
                </View>

                {/* Shadows (Right) */}
                <View style={styles.shadowsArea}>
                    <View style={styles.itemsWrap}>
                        {shadows.map((shadow, idx) => (
                            <View
                                key={`shadow-${shadow.id}-${idx}-${round}`}
                                ref={ref => onShadowLayout(shadow.id, ref)}
                                style={[
                                    styles.shadowItem,
                                    { width: shadowSize, height: shadowSize },
                                    matched.has(shadow.id) && styles.shadowMatched,
                                ]}
                            >
                                <Image
                                    source={shadow.source}
                                    style={[
                                        styles.shadowImage,
                                        { tintColor: matched.has(shadow.id) ? '#4CAF50' : '#000', opacity: matched.has(shadow.id) ? 1 : 0.6 },
                                    ]}
                                    resizeMode="contain"
                                />
                                {matched.has(shadow.id) && (
                                    <View style={styles.matchBadge}>
                                        <Ionicons name="checkmark" size={14} color="#fff" />
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            {/* Success Overlay */}
            {showSuccess && (
                <Animated.View style={[styles.successOverlay, { transform: [{ scale: successScale }] }]}>
                    <Text style={styles.successEmoji}>🎉</Text>
                    <Text style={styles.successTitle}>Tur {round} Tamamlandı!</Text>
                </Animated.View>
            )}

            {/* Motivation Overlay */}
            {showMotivation && (
                <View style={styles.motivationOverlay}>
                    <Text style={styles.motivationEmoji}>{showMotivation.emoji}</Text>
                    <Text style={styles.motivationText}>{showMotivation.message}</Text>
                    {/* Stars */}
                    {starAnims.map((anim, i) => (
                        <Animated.Text
                            key={`star-${i}`}
                            style={{
                                position: 'absolute',
                                fontSize: 30,
                                left: 50 + (i % 4) * 60,
                                top: 20 + Math.floor(i / 4) * 80,
                                transform: [
                                    { scale: anim },
                                    { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
                                ],
                                opacity: anim,
                            }}
                        >
                            ⭐
                        </Animated.Text>
                    ))}
                </View>
            )}

            {/* Early Exit Overlay */}
            {showEarlyExit && (
                <View style={styles.earlyExitOverlay}>
                    <Text style={styles.earlyExitEmoji}>🌙</Text>
                    <Text style={styles.earlyExitTitle}>Bugünlük Bu Kadar!</Text>
                    <Text style={styles.earlyExitSub}>{round} tur tamamladın. Harika iş!</Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#A8D5BA',
    },
    bgGradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#C8E6C9',
    },
    bgTree1: {
        position: 'absolute',
        left: 15,
        bottom: 0,
        width: 50,
        height: 150,
        backgroundColor: '#81C784',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
    },
    bgTree2: {
        position: 'absolute',
        right: 20,
        bottom: 0,
        width: 40,
        height: 120,
        backgroundColor: '#66BB6A',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    bgGrass: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
        backgroundColor: '#4CAF50',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'web' ? 12 : 45,
        paddingHorizontal: 12,
        paddingBottom: 8,
        backgroundColor: 'rgba(93, 64, 55, 0.9)',
        zIndex: 10,
    },
    backBtn: {
        padding: 6,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 11,
        color: '#D7CCC8',
    },
    stats: {
        flexDirection: 'row',
        gap: 5,
    },
    statBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    statText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    progressContainer: {
        height: 4,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#4CAF50',
    },
    gameArea: {
        flex: 1,
        flexDirection: 'row',
        padding: 10,
        zIndex: 5,
    },
    animalsArea: {
        flex: 1,
        marginRight: 5,
    },
    shadowsArea: {
        flex: 1,
        marginLeft: 5,
    },
    itemsWrap: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignContent: 'center',
        gap: 8,
    },
    animalItem: {
        backgroundColor: 'transparent',
    },
    animalImage: {
        width: '100%',
        height: '100%',
    },
    shadowItem: {
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 14,
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shadowMatched: {
        backgroundColor: 'rgba(76, 175, 80, 0.3)',
    },
    shadowImage: {
        width: '85%',
        height: '85%',
    },
    matchBadge: {
        position: 'absolute',
        top: -3,
        right: -3,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
    },
    successOverlay: {
        position: 'absolute',
        top: '35%',
        left: '20%',
        right: '20%',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        zIndex: 200,
        elevation: 20,
    },
    successEmoji: {
        fontSize: 50,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginTop: 8,
    },
    motivationOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 193, 7, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 300,
    },
    motivationEmoji: {
        fontSize: 80,
    },
    motivationText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 15,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
    },
    earlyExitOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(103, 58, 183, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 300,
    },
    earlyExitEmoji: {
        fontSize: 70,
    },
    earlyExitTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 15,
    },
    earlyExitSub: {
        fontSize: 16,
        color: '#E1BEE7',
        marginTop: 8,
    },
});
