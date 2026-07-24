import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    ImageBackground,
    ImageSourcePropType,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import { asset } from '../lib/assetMap';

// ============= CONFIG =============
export interface ShadowDetectiveConfig {
    level: number;
    itemCount?: number;
    hasDistractors?: boolean;
    assets?: {
        objects?: ImageSourcePropType[];
        shadows?: ImageSourcePropType[];
    };
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
    childName?: string;
}

// ============= ASSETS =============
interface AnimalAsset {
    id: string;
    name: string;
    source: ImageSourcePropType;
}

const ANIMALS: AnimalAsset[] = [
    { id: 'horse', name: 'At', source: asset('/images/animal_horse.png') },
    { id: 'elephant', name: 'Fil', source: asset('/images/animal_elephant.png') },
    { id: 'lion', name: 'Aslan', source: asset('/images/animal_lion.png') },
    { id: 'monkey', name: 'Maymun', source: asset('/images/animal_monkey.png') },
    { id: 'giraffe', name: 'Zürafa', source: asset('/images/animal_giraffe.png') },
    { id: 'snake', name: 'Yılan', source: asset('/images/animal_snake.png') },
    { id: 'bird', name: 'Kuş', source: asset('/images/animal_bird.png') },
    { id: 'octopus', name: 'Ahtapot', source: asset('/images/animal_octopus.png') },
    { id: 'crab', name: 'Yengeç', source: asset('/images/animal_crab.png') },
    { id: 'whale', name: 'Balina', source: asset('/images/animal_whale.png') },
    { id: 'turtle', name: 'Kaplumbağa', source: asset('/images/animal_turtle.png') },
];

const { width: screenW, height: screenH } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

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

    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => !isMatched,
        onMoveShouldSetPanResponder: () => !isMatched,
        onPanResponderGrant: () => {
            // @ts-ignore
            pan.setOffset({ x: pan.x._value, y: pan.y._value });
            pan.setValue({ x: 0, y: 0 });
            Animated.spring(scale, { toValue: 1.15, friction: 5, useNativeDriver: false }).start();
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, g) => {
            pan.flattenOffset();
            Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: false }).start();
            if (!onDrop(animal.id, g.moveX, g.moveY)) {
                Animated.spring(pan, { toValue: { x: 0, y: 0 }, friction: 5, useNativeDriver: false }).start();
            }
        },
    }), [isMatched, animal.id, onDrop]);

    return (
        <Animated.View
            style={{
                width: size,
                height: size,
                opacity: isMatched ? 0.25 : 1,
                transform: [
                    { translateX: pan.x },
                    { translateY: pan.y },
                    { scale },
                ],
                zIndex: 10,
            }}
            {...panResponder.panHandlers}
        >
            <Image source={animal.source} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
        </Animated.View>
    );
}

// ============= MAIN =============
export default function ShadowDetective({ config, onGameEnd, onExit, childName = 'Dedektif' }: ShadowDetectiveProps) {
    const TOTAL = 10;
    const [round, setRound] = useState(1);
    const [animals, setAnimals] = useState<AnimalAsset[]>([]);
    const [shadows, setShadows] = useState<AnimalAsset[]>([]);
    const [matched, setMatched] = useState<Set<string>>(new Set());
    const [errors, setErrors] = useState(0);
    const [, setTotalErrors] = useState(0);
    const [, setMoves] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showMotivation, setShowMotivation] = useState<{ emoji: string; text: string } | null>(null);
    const [gameStart] = useState(Date.now());
    const [roundStart, setRoundStart] = useState(Date.now());
    const [, setRoundData] = useState<any[]>([]);
    // finishGame completeRound'un setTimeout'undan cagrilir ve state'i eski closure'dan
    // okur; son turun verisi/hamlesi/hatasi eksik gider. Guncel degerler bu ref'lerden.
    const movesRef = useRef(0);
    const totalErrorsRef = useRef(0);
    const roundDataRef = useRef<any[]>([]);
    const [gameReady, setGameReady] = useState(false);

    const successScale = useRef(new Animated.Value(0)).current;
    const shadowRefs = useRef<Map<string, { x: number; y: number; w: number; h: number }>>(new Map());

    const cfg = ROUND_CONFIGS[round - 1] || ROUND_CONFIGS[0];

    // Responsive boyutlandırma
    const totalItems = cfg.count + cfg.distractors;
    const getItemSize = () => {
        if (isWeb) {
            if (totalItems <= 4) return 100;
            if (totalItems <= 6) return 85;
            return 75;
        } else {
            const maxPerRow = 3;
            const availableWidth = (screenW / 2) - 30;
            const maxSize = Math.floor(availableWidth / Math.min(totalItems, maxPerRow)) - 8;
            return Math.min(Math.max(maxSize, 55), 90);
        }
    };

    const itemSize = getItemSize();
    const shadowSize = itemSize * 0.95;

    useEffect(() => { if (gameReady) initRound(); }, [round, gameReady]);

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
        const roundEntry = { tur: round, hata: errors, sure: dur };
        roundDataRef.current = [...roundDataRef.current, roundEntry];
        setRoundData(prev => [...prev, roundEntry]);

        const mot = MOTIVATION.find(m => m.round === round);
        if (mot) {
            setShowMotivation(mot);
            setTimeout(() => setShowMotivation(null), 2000);
        }

        setShowSuccess(true);
        Animated.spring(successScale, { toValue: 1, friction: 4, useNativeDriver: false }).start();

        setTimeout(() => {
            successScale.setValue(0);
            setShowSuccess(false);
            if (round < TOTAL) setRound(r => r + 1);
            else finishGame();
        }, mot ? 2500 : 1200);
    };

    const finishGame = () => {
        const dur = Math.floor((Date.now() - gameStart) / 1000);
        onGameEnd('Gölge Dedektifi', dur, movesRef.current, totalErrorsRef.current, undefined, {
            zorlukSeviyesi: config.level,
            kazanimOdagi: 'Görsel Çözümleme',
            tur_verisi: roundDataRef.current,
        });
    };

    const handleDrop = useCallback((id: string, x: number, y: number): boolean => {
        movesRef.current += 1;
        setMoves(m => m + 1);
        for (const [sid, layout] of shadowRefs.current.entries()) {
            if (x >= layout.x && x <= layout.x + layout.w && y >= layout.y && y <= layout.y + layout.h) {
                if (id === sid) {
                    setMatched(prev => new Set(prev).add(id));
                    return true;
                } else {
                    setErrors(e => e + 1);
                    totalErrorsRef.current += 1;
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
        <ImageBackground
            source={asset('/backgrounds/games/golge_bg.png')}
            style={styles.container}
            imageStyle={styles.bgImage}
        >
            {/* Countdown Overlay */}
            {!gameReady && (
                <CountdownOverlay
                    message="Gölge Dedektifi oyununa hoş geldin! Hayvanları gölgeleriyle eşleştir!"
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => setGameReady(true)}
                />
            )}
            {/* Blur overlay */}
            <View style={styles.blurOverlay} />

            {/* Header - Sadece geri butonu ve tur */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.exitBtn}>
                    <Ionicons name="home" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.roundText}>🔍 Tur {round}/{TOTAL}</Text>
                <View style={{ width: 36 }} />
            </View>

            {/* Progress */}
            <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(round / TOTAL) * 100}%` }]} />
            </View>

            {/* Game Area */}
            <View style={styles.gameArea}>
                {/* Hayvanlar */}
                <View style={styles.column}>
                    <View style={styles.itemsWrap}>
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

                {/* Ok */}
                <Text style={styles.arrow}>→</Text>

                {/* Gölgeler */}
                <View style={styles.column}>
                    <View style={styles.itemsWrap}>
                        {shadows.map((s, i) => (
                            <View
                                key={`s-${s.id}-${i}-${round}`}
                                ref={r => onShadowLayout(s.id, r)}
                                style={[
                                    styles.shadowSlot,
                                    { width: shadowSize, height: shadowSize },
                                    matched.has(s.id) && styles.shadowMatched,
                                ]}
                            >
                                <Image
                                    source={s.source}
                                    style={[
                                        styles.shadowImg,
                                        { tintColor: matched.has(s.id) ? '#2E7D32' : '#000' },
                                    ]}
                                    resizeMode="contain"
                                />
                            </View>
                        ))}
                    </View>
                </View>
            </View>

            {/* Success */}
            {showSuccess && (
                <Animated.View style={[styles.successBox, { transform: [{ scale: successScale }] }]}>
                    <Text style={{ fontSize: 40 }}>🎉</Text>
                    <Text style={styles.successText}>Tur {round} Tamam!</Text>
                </Animated.View>
            )}

            {/* Motivation */}
            {showMotivation && (
                <View style={styles.motivationBox}>
                    <Text style={{ fontSize: 60 }}>{showMotivation.emoji}</Text>
                    <Text style={styles.motivationText}>{showMotivation.text}</Text>
                </View>
            )}
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    bgImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    blurOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.15)',
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'web' ? 12 : 48,
        paddingHorizontal: 15,
        paddingBottom: 8,
        zIndex: 20,
    },
    exitBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 15 },
    roundText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        backgroundColor: 'rgba(0,0,0,0.35)',
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 20,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },

    progressBar: { height: 4, backgroundColor: 'rgba(0,0,0,0.2)', marginHorizontal: 15, borderRadius: 2 },
    progressFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 2 },

    gameArea: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
    },
    column: { flex: 1 },
    itemsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignContent: 'center',
        gap: 6,
        padding: 4,
    },
    arrow: { fontSize: 28, color: '#fff', marginHorizontal: 5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },

    shadowSlot: {
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        borderStyle: 'dashed',
    },
    shadowMatched: {
        backgroundColor: 'rgba(76,175,80,0.35)',
        borderColor: '#4CAF50',
        borderStyle: 'solid',
    },
    shadowImg: { width: '80%', height: '80%', opacity: 0.65 },

    successBox: {
        position: 'absolute',
        top: '38%',
        left: '22%',
        right: '22%',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        elevation: 15,
        zIndex: 100,
    },
    successText: { fontSize: 18, fontWeight: 'bold', color: '#4CAF50', marginTop: 5 },

    motivationBox: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,193,7,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200,
    },
    motivationText: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 10 },
});
