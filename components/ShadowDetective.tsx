import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
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
];

const { width: screenW, height: screenH } = Dimensions.get('window');
const isSmallScreen = screenH < 700;

// ============= LEVEL CONFIG =============
const getLevelConfig = (level: number) => {
    const configs = [
        { itemCount: 2, distractors: 0 },  // Level 1
        { itemCount: 3, distractors: 0 },  // Level 2
        { itemCount: 3, distractors: 1 },  // Level 3
        { itemCount: 4, distractors: 0 },  // Level 4
        { itemCount: 4, distractors: 1 },  // Level 5
    ];
    return configs[Math.min(level - 1, configs.length - 1)] || configs[0];
};

// ============= MAIN COMPONENT =============
export default function ShadowDetective({ config, onGameEnd, onExit }: ShadowDetectiveProps) {
    const levelConfig = getLevelConfig(config.level);
    const itemCount = levelConfig.itemCount;
    const distractorCount = levelConfig.distractors;

    // State
    const [round, setRound] = useState(1);
    const [animals, setAnimals] = useState<AnimalAsset[]>([]);
    const [shadows, setShadows] = useState<AnimalAsset[]>([]);
    const [matched, setMatched] = useState<Set<number>>(new Set());
    const [errors, setErrors] = useState(0);
    const [moves, setMoves] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [startTime] = useState(Date.now());
    const [shakeId, setShakeId] = useState<number | null>(null);

    // Animation refs
    const panRefs = useRef<Map<number, Animated.ValueXY>>(new Map());
    const scaleRefs = useRef<Map<number, Animated.Value>>(new Map());
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const successScale = useRef(new Animated.Value(0)).current;
    const confettiAnims = useRef(Array(12).fill(0).map(() => new Animated.Value(0))).current;

    // Shadow positions for hit detection
    const [shadowLayouts, setShadowLayouts] = useState<Map<number, { x: number; y: number; w: number; h: number }>>(new Map());

    // Item size
    const itemSize = isSmallScreen ? 70 : 90;
    const shadowSize = isSmallScreen ? 65 : 85;

    // Initialize round
    useEffect(() => {
        initRound();
    }, [round]);

    const initRound = () => {
        const shuffled = [...ANIMALS].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(itemCount, ANIMALS.length));

        // Add distractors to shadows
        let shadowList = [...selected];
        if (distractorCount > 0) {
            const remaining = shuffled.filter(a => !selected.includes(a));
            shadowList = [...shadowList, ...remaining.slice(0, distractorCount)];
        }
        shadowList = shadowList.sort(() => Math.random() - 0.5);

        setAnimals(selected);
        setShadows(shadowList);
        setMatched(new Set());

        // Init pan values
        panRefs.current.clear();
        scaleRefs.current.clear();
        selected.forEach(a => {
            panRefs.current.set(a.id, new Animated.ValueXY({ x: 0, y: 0 }));
            scaleRefs.current.set(a.id, new Animated.Value(1));
        });
    };

    // Check round complete
    useEffect(() => {
        if (matched.size === animals.length && animals.length > 0) {
            handleRoundComplete();
        }
    }, [matched, animals.length]);

    const handleRoundComplete = () => {
        setShowSuccess(true);

        // Success animation
        Animated.spring(successScale, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
        }).start();

        // Confetti
        confettiAnims.forEach((anim, i) => {
            Animated.sequence([
                Animated.delay(i * 40),
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
            ]).start(() => anim.setValue(0));
        });

        setTimeout(() => {
            successScale.setValue(0);
            setShowSuccess(false);

            if (round < 3) {
                setRound(r => r + 1);
            } else {
                // Game over - save to Supabase
                const duration = Math.floor((Date.now() - startTime) / 1000);
                onGameEnd('Gölge Dedektifi', duration, moves, errors, undefined, {
                    zorlukSeviyesi: config.level,
                    kazanimOdagi: 'Görsel Çözümleme',
                    complexity_level: itemCount,
                    distractor_count: distractorCount,
                });
            }
        }, 1800);
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

    const handleDrop = (animalId: number, dropX: number, dropY: number) => {
        setMoves(m => m + 1);

        // Check against shadow layouts
        for (const [shadowId, layout] of shadowLayouts.entries()) {
            const inX = dropX >= layout.x && dropX <= layout.x + layout.w;
            const inY = dropY >= layout.y && dropY <= layout.y + layout.h;

            if (inX && inY) {
                if (animalId === shadowId) {
                    // Correct match!
                    setMatched(prev => new Set(prev).add(animalId));
                    return true;
                } else {
                    // Wrong match
                    setErrors(e => e + 1);
                    triggerShake(animalId);
                    return false;
                }
            }
        }
        return false;
    };

    const createPanResponder = (animal: AnimalAsset) => {
        const pan = panRefs.current.get(animal.id);
        const scale = scaleRefs.current.get(animal.id);
        if (!pan || !scale) return null;

        return PanResponder.create({
            onStartShouldSetPanResponder: () => !matched.has(animal.id),
            onMoveShouldSetPanResponder: () => !matched.has(animal.id),
            onPanResponderGrant: () => {
                // @ts-ignore
                pan.setOffset({ x: pan.x._value, y: pan.y._value });
                pan.setValue({ x: 0, y: 0 });
                Animated.spring(scale, { toValue: 1.2, friction: 5, useNativeDriver: true }).start();
            },
            onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
                useNativeDriver: false,
            }),
            onPanResponderRelease: (_, gesture) => {
                pan.flattenOffset();
                Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();

                const success = handleDrop(animal.id, gesture.moveX, gesture.moveY);

                if (!success) {
                    // Return to original
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        friction: 5,
                        useNativeDriver: false,
                    }).start();
                }
            },
        });
    };

    const onShadowLayout = (id: number, e: any) => {
        e.target.measure((x: number, y: number, w: number, h: number, pageX: number, pageY: number) => {
            setShadowLayouts(prev => new Map(prev).set(id, { x: pageX, y: pageY, w, h }));
        });
    };

    return (
        <View style={styles.container}>
            {/* Pastel Nature Background */}
            <View style={styles.bgGradient}>
                <View style={styles.bgTree1} />
                <View style={styles.bgTree2} />
                <View style={styles.bgCloud1} />
                <View style={styles.bgCloud2} />
                <View style={styles.bgGrass} />
            </View>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>🔍 Gölge Dedektifi</Text>
                    <Text style={styles.subtitle}>Tur {round}/3 • Seviye {config.level}</Text>
                </View>
                <View style={styles.stats}>
                    <View style={[styles.statBadge, { backgroundColor: '#4CAF50' }]}>
                        <Text style={styles.statText}>✓ {matched.size}/{animals.length}</Text>
                    </View>
                    <View style={[styles.statBadge, { backgroundColor: errors > 0 ? '#FF5252' : '#78909C' }]}>
                        <Text style={styles.statText}>✗ {errors}</Text>
                    </View>
                </View>
            </View>

            {/* Game Area */}
            <View style={styles.gameArea}>
                {/* Animals (Left) */}
                <View style={styles.animalsArea}>
                    <Text style={styles.areaLabel}>🦒 Hayvanlar</Text>
                    <View style={styles.itemsWrap}>
                        {animals.map(animal => {
                            const pan = panRefs.current.get(animal.id);
                            const scale = scaleRefs.current.get(animal.id);
                            const responder = createPanResponder(animal);
                            const isMatched = matched.has(animal.id);
                            const isShaking = shakeId === animal.id;

                            if (!pan || !scale || !responder) return null;

                            return (
                                <Animated.View
                                    key={`animal-${animal.id}`}
                                    style={[
                                        styles.animalItem,
                                        {
                                            width: itemSize,
                                            height: itemSize,
                                            opacity: isMatched ? 0.3 : 1,
                                            transform: [
                                                ...pan.getTranslateTransform(),
                                                { scale },
                                                { translateX: isShaking ? shakeAnim : 0 },
                                            ],
                                            zIndex: isShaking ? 100 : 1,
                                        },
                                    ]}
                                    {...responder.panHandlers}
                                >
                                    <Image
                                        source={animal.source}
                                        style={styles.animalImage}
                                        resizeMode="contain"
                                    />
                                </Animated.View>
                            );
                        })}
                    </View>
                </View>

                {/* Shadows (Right) */}
                <View style={styles.shadowsArea}>
                    <Text style={styles.areaLabel}>👤 Gölgeler</Text>
                    <View style={styles.itemsWrap}>
                        {shadows.map((shadow, idx) => {
                            const isMatched = matched.has(shadow.id);

                            return (
                                <View
                                    key={`shadow-${shadow.id}-${idx}`}
                                    ref={ref => ref && !isMatched && onShadowLayout(shadow.id, { target: ref })}
                                    style={[
                                        styles.shadowItem,
                                        { width: shadowSize, height: shadowSize },
                                        isMatched && styles.shadowMatched,
                                    ]}
                                >
                                    <Image
                                        source={shadow.source}
                                        style={[
                                            styles.shadowImage,
                                            // Programatic shadow: brightness(0) = black, opacity
                                            { tintColor: isMatched ? '#4CAF50' : '#000', opacity: isMatched ? 1 : 0.6 },
                                        ]}
                                        resizeMode="contain"
                                    />
                                    {isMatched && (
                                        <View style={styles.matchBadge}>
                                            <Ionicons name="checkmark" size={14} color="#fff" />
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>
            </View>

            {/* Instructions */}
            <View style={styles.instructions}>
                <Ionicons name="hand-left-outline" size={18} color="#5D4037" />
                <Text style={styles.instructionsText}>Hayvanı sürükle, gölgesine bırak!</Text>
            </View>

            {/* Success Overlay */}
            {showSuccess && (
                <Animated.View style={[styles.successOverlay, { transform: [{ scale: successScale }] }]}>
                    <Text style={styles.successEmoji}>🎉</Text>
                    <Text style={styles.successTitle}>Harika!</Text>
                    <Text style={styles.successSub}>{round < 3 ? 'Sonraki tura geçiliyor...' : 'Oyun bitti!'}</Text>
                </Animated.View>
            )}

            {/* Confetti */}
            {showSuccess && confettiAnims.map((anim, i) => (
                <Animated.View
                    key={`c-${i}`}
                    style={{
                        position: 'absolute',
                        left: 20 + (i * (screenW - 40) / 12),
                        top: -40,
                        transform: [
                            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, screenH + 80] }) },
                            { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 + i * 30}deg`] }) },
                        ],
                        opacity: anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
                    }}
                >
                    <Text style={{ fontSize: 22 }}>{['🌟', '⭐', '✨', '💚', '🎊', '🌈'][i % 6]}</Text>
                </Animated.View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#A8D5BA', // Pastel yeşil
    },
    // Background elements
    bgGradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#C8E6C9',
    },
    bgTree1: {
        position: 'absolute',
        left: 20,
        bottom: 0,
        width: 60,
        height: 180,
        backgroundColor: '#81C784',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
    },
    bgTree2: {
        position: 'absolute',
        right: 30,
        bottom: 0,
        width: 50,
        height: 140,
        backgroundColor: '#66BB6A',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
    },
    bgCloud1: {
        position: 'absolute',
        top: 60,
        left: 40,
        width: 80,
        height: 35,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 20,
    },
    bgCloud2: {
        position: 'absolute',
        top: 90,
        right: 50,
        width: 60,
        height: 28,
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderRadius: 15,
    },
    bgGrass: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 50,
        backgroundColor: '#4CAF50',
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'web' ? 16 : 50,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: 'rgba(93, 64, 55, 0.9)',
        zIndex: 10,
    },
    backBtn: {
        padding: 8,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 12,
        color: '#D7CCC8',
    },
    stats: {
        flexDirection: 'row',
        gap: 6,
    },
    statBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    statText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    // Game Area
    gameArea: {
        flex: 1,
        flexDirection: 'row',
        padding: 16,
        zIndex: 5,
    },
    animalsArea: {
        flex: 1,
        marginRight: 8,
    },
    shadowsArea: {
        flex: 1,
        marginLeft: 8,
    },
    areaLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#5D4037',
        textAlign: 'center',
        marginBottom: 12,
        backgroundColor: 'rgba(255,255,255,0.7)',
        paddingVertical: 6,
        borderRadius: 12,
    },
    itemsWrap: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignContent: 'center',
        gap: 12,
    },
    // Animal items - NO white box
    animalItem: {
        backgroundColor: 'transparent',
    },
    animalImage: {
        width: '100%',
        height: '100%',
    },
    // Shadow items - transparent
    shadowItem: {
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: 16,
        padding: 6,
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
        top: -4,
        right: -4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Instructions
    instructions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.85)',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 16,
        zIndex: 10,
    },
    instructionsText: {
        fontSize: 14,
        color: '#5D4037',
        fontWeight: '600',
    },
    // Success
    successOverlay: {
        position: 'absolute',
        top: '30%',
        left: '15%',
        right: '15%',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        zIndex: 200,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 20,
    },
    successEmoji: {
        fontSize: 60,
    },
    successTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#4CAF50',
        marginTop: 10,
    },
    successSub: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
});
