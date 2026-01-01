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

// ============= CONFIG INTERFACE =============
export interface ShadowDetectiveConfig {
    level: number;                    // 1-5 arası zorluk seviyesi
    itemCount?: number;               // Başlangıç item sayısı (otomatik hesaplanır)
    distractorCount?: number;         // Çeldirici sayısı (otomatik hesaplanır)
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

// ============= ASSET YAPISI =============
interface GameAsset {
    id: number;
    name: string;
    source: ImageSourcePropType;
}

const GAME_ASSETS: GameAsset[] = [
    { id: 0, name: 'Kedi', source: require('@/assets/images/kedi.png') },
    { id: 1, name: 'Ev', source: require('@/assets/images/ev.png') },
    { id: 2, name: 'Araba', source: require('@/assets/images/araba.png') },
    { id: 3, name: 'Top', source: require('@/assets/images/top.png') },
    { id: 4, name: 'Elma', source: require('@/assets/images/elma.png') },
    { id: 5, name: 'Armut', source: require('@/assets/images/armut.png') },
    { id: 6, name: 'Karpuz', source: require('@/assets/images/karpuz.png') },
    { id: 7, name: 'Çilek', source: require('@/assets/images/cilek.png') },
];

const { width: screenW, height: screenH } = Dimensions.get('window');

// ============= LEVEL KONFIGÜRASYONU =============
const getLevelConfig = (level: number) => {
    const configs = [
        { itemCount: 3, distractorCount: 0 },  // Level 1
        { itemCount: 4, distractorCount: 0 },  // Level 2
        { itemCount: 4, distractorCount: 1 },  // Level 3
        { itemCount: 5, distractorCount: 1 },  // Level 4
        { itemCount: 6, distractorCount: 2 },  // Level 5
    ];
    return configs[Math.min(level - 1, configs.length - 1)] || configs[0];
};

// ============= MAIN COMPONENT =============
export default function ShadowDetective({ config, onGameEnd, onExit }: ShadowDetectiveProps) {
    const levelConfig = getLevelConfig(config.level);
    const itemCount = config.itemCount || levelConfig.itemCount;
    const distractorCount = config.distractorCount || levelConfig.distractorCount;

    // Game state
    const [round, setRound] = useState(1);
    const [currentItems, setCurrentItems] = useState<GameAsset[]>([]);
    const [shadowItems, setShadowItems] = useState<GameAsset[]>([]); // Includes distractors
    const [matches, setMatches] = useState<Set<number>>(new Set());
    const [wrongAttempts, setWrongAttempts] = useState(0);
    const [totalMoves, setTotalMoves] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [startTime] = useState(Date.now());
    const [matchStartTime, setMatchStartTime] = useState(Date.now());
    const [matchDurations, setMatchDurations] = useState<number[]>([]);
    const [highlightedShadow, setHighlightedShadow] = useState<number | null>(null);
    const [draggingId, setDraggingId] = useState<number | null>(null);

    // Animation values
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const successAnim = useRef(new Animated.Value(0)).current;
    const confettiAnims = useRef(Array(10).fill(0).map(() => new Animated.Value(0))).current;

    // Shadow positions for drop detection
    const [shadowPositions, setShadowPositions] = useState<{ id: number; x: number; y: number }[]>([]);

    // Pan refs for draggable items
    const panRefs = useRef<Map<number, Animated.ValueXY>>(new Map());

    // Layout calculations
    const isSmallScreen = screenH < 700;
    const itemSize = isSmallScreen ? 60 : 75;
    const shadowSize = isSmallScreen ? 55 : 70;

    // Initialize round
    useEffect(() => {
        initializeRound();
    }, [round]);

    const initializeRound = () => {
        // Select random items for this round
        const shuffled = [...GAME_ASSETS].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(itemCount, GAME_ASSETS.length));

        // Create shadow items with distractors
        let shadows = [...selected];
        if (distractorCount > 0) {
            const remaining = shuffled.filter(a => !selected.includes(a));
            const distractors = remaining.slice(0, Math.min(distractorCount, remaining.length));
            shadows = [...shadows, ...distractors];
        }
        // Shuffle shadows
        shadows = shadows.sort(() => Math.random() - 0.5);

        setCurrentItems(selected);
        setShadowItems(shadows);
        setMatches(new Set());
        setMatchStartTime(Date.now());

        // Initialize pan values
        panRefs.current = new Map();
        selected.forEach(item => {
            panRefs.current.set(item.id, new Animated.ValueXY({ x: 0, y: 0 }));
        });

        // Animate entrance
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
        }).start();
    };

    // Check if round is complete
    useEffect(() => {
        if (matches.size === currentItems.length && currentItems.length > 0) {
            handleRoundComplete();
        }
    }, [matches, currentItems.length]);

    const handleRoundComplete = () => {
        setShowSuccess(true);

        // Success animation
        Animated.sequence([
            Animated.timing(successAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.delay(1000),
            Animated.timing(successAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setShowSuccess(false);
            if (round < 3) {
                setRound(r => r + 1);
            } else {
                // Game complete - send analytics to Supabase
                const duration = Math.floor((Date.now() - startTime) / 1000);
                const avgMatchDuration = matchDurations.length > 0
                    ? Math.round(matchDurations.reduce((a, b) => a + b, 0) / matchDurations.length)
                    : 0;

                onGameEnd('Gölge Dedektifi', duration, totalMoves, wrongAttempts, undefined, {
                    zorlukSeviyesi: config.level,
                    kazanimOdagi: 'Görsel Çözümleme ve Eşleştirme',
                    match_duration_avg: avgMatchDuration,
                    wrong_attempts: wrongAttempts,
                    complexity_level: itemCount,
                    distractor_count: distractorCount,
                });
            }
        });

        // Confetti animation
        confettiAnims.forEach((anim, i) => {
            Animated.sequence([
                Animated.delay(i * 50),
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 800,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start(() => anim.setValue(0));
        });
    };

    const handleMatch = (objectId: number, targetShadowId: number) => {
        const matchDuration = Date.now() - matchStartTime;
        setTotalMoves(m => m + 1);

        if (objectId === targetShadowId) {
            // Correct match
            setMatches(prev => new Set(prev).add(objectId));
            setMatchDurations(prev => [...prev, matchDuration]);
            setHighlightedShadow(null);

            // Success pulse animation
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
            ]).start();
        } else {
            // Wrong match
            setWrongAttempts(e => e + 1);

            // Briefly highlight the correct shadow
            setHighlightedShadow(objectId);
            setTimeout(() => setHighlightedShadow(null), 800);
        }

        setMatchStartTime(Date.now());
    };

    const createPanResponder = (item: GameAsset) => {
        const pan = panRefs.current.get(item.id);
        if (!pan) return null;

        return PanResponder.create({
            onStartShouldSetPanResponder: () => !matches.has(item.id),
            onMoveShouldSetPanResponder: () => !matches.has(item.id),
            onPanResponderGrant: () => {
                setDraggingId(item.id);
                // @ts-ignore
                pan.setOffset({ x: pan.x._value, y: pan.y._value });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
                useNativeDriver: false,
            }),
            onPanResponderRelease: (_, gesture) => {
                pan.flattenOffset();
                setDraggingId(null);

                // Check if dropped on a shadow
                const dropX = gesture.moveX;
                const dropY = gesture.moveY;

                // Find closest shadow
                let matched = false;
                for (const shadowPos of shadowPositions) {
                    const dist = Math.sqrt(
                        Math.pow(dropX - shadowPos.x, 2) + Math.pow(dropY - shadowPos.y, 2)
                    );
                    if (dist < shadowSize) {
                        handleMatch(item.id, shadowPos.id);
                        if (item.id === shadowPos.id) {
                            matched = true;
                        }
                        break;
                    }
                }

                if (!matched) {
                    // Return to original position
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: false,
                        friction: 5,
                    }).start();
                }
            },
        });
    };

    // Register shadow position
    const onShadowLayout = (id: number, event: any) => {
        const { x, y, width, height } = event.nativeEvent.layout;
        // Calculate center position
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        setShadowPositions(prev => {
            const filtered = prev.filter(p => p.id !== id);
            return [...filtered, { id, x: centerX + screenW / 2 + 30, y: centerY + 120 }];
        });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>🔍 Gölge Dedektifi</Text>
                    <Text style={styles.subtitle}>
                        Tur {round}/3 • Seviye {config.level} • {itemCount} nesne
                        {distractorCount > 0 && ` + ${distractorCount} çeldirici`}
                    </Text>
                </View>
                <View style={styles.statsContainer}>
                    <View style={styles.statBadge}>
                        <Text style={styles.statText}>✓ {matches.size}/{currentItems.length}</Text>
                    </View>
                    <View style={[styles.statBadge, { backgroundColor: wrongAttempts > 0 ? '#FF5252' : '#4CAF50' }]}>
                        <Text style={styles.statText}>✗ {wrongAttempts}</Text>
                    </View>
                </View>
            </View>

            {/* Game Area */}
            <View style={styles.gameArea}>
                {/* Objects Column (Left) */}
                <View style={styles.objectsColumn}>
                    <Text style={styles.columnTitle}>🎨 Nesneler</Text>
                    <View style={styles.itemsContainer}>
                        {currentItems.map((item) => {
                            const pan = panRefs.current.get(item.id);
                            const panResponder = createPanResponder(item);
                            const isMatched = matches.has(item.id);
                            const isDragging = draggingId === item.id;

                            if (!pan || !panResponder) return null;

                            return (
                                <Animated.View
                                    key={`object-${item.id}`}
                                    style={[
                                        styles.objectCard,
                                        isMatched && styles.objectCardMatched,
                                        isDragging && styles.objectCardDragging,
                                        {
                                            width: itemSize,
                                            height: itemSize,
                                            transform: [
                                                ...pan.getTranslateTransform(),
                                                { scale: isDragging ? 1.15 : 1 },
                                            ],
                                            zIndex: isDragging ? 100 : 1,
                                            opacity: isMatched ? 0.4 : 1,
                                        },
                                    ]}
                                    {...panResponder.panHandlers}
                                >
                                    <Image
                                        source={item.source}
                                        style={styles.objectImage}
                                        resizeMode="contain"
                                    />
                                    {isMatched && (
                                        <View style={styles.matchedCheck}>
                                            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                                        </View>
                                    )}
                                </Animated.View>
                            );
                        })}
                    </View>
                </View>

                {/* Shadows Column (Right) */}
                <View style={styles.shadowsColumn}>
                    <Text style={styles.columnTitle}>👤 Gölgeler</Text>
                    <View style={styles.itemsContainer}>
                        {shadowItems.map((item, index) => {
                            const isMatched = matches.has(item.id);
                            const isHighlighted = highlightedShadow === item.id;
                            const isDistractor = !currentItems.find(i => i.id === item.id);

                            return (
                                <View
                                    key={`shadow-${item.id}-${index}`}
                                    onLayout={(e) => onShadowLayout(item.id, e)}
                                    style={[
                                        styles.shadowCard,
                                        isMatched && styles.shadowCardMatched,
                                        isHighlighted && styles.shadowCardHighlighted,
                                        isDistractor && styles.shadowCardDistractor,
                                        { width: shadowSize, height: shadowSize },
                                    ]}
                                >
                                    <Image
                                        source={item.source}
                                        style={[
                                            styles.shadowImage,
                                            // CSS Filter simulation - tintColor for black silhouette
                                            { tintColor: isMatched ? '#4CAF50' : '#000000', opacity: isMatched ? 1 : 0.85 },
                                        ]}
                                        resizeMode="contain"
                                    />
                                    {isMatched && (
                                        <View style={styles.shadowMatchedBadge}>
                                            <Ionicons name="checkmark" size={16} color="#fff" />
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>
            </View>

            {/* Success Overlay */}
            {showSuccess && (
                <Animated.View
                    style={[
                        styles.successOverlay,
                        { opacity: successAnim, transform: [{ scale: successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] },
                    ]}
                >
                    <Text style={styles.successEmoji}>🎉</Text>
                    <Text style={styles.successText}>Harika!</Text>
                    {round < 3 && <Text style={styles.successSubtext}>Sonraki tura geçiliyor...</Text>}
                    {round >= 3 && <Text style={styles.successSubtext}>Oyun tamamlandı!</Text>}
                </Animated.View>
            )}

            {/* Confetti */}
            {showSuccess && confettiAnims.map((anim, i) => (
                <Animated.View
                    key={`confetti-${i}`}
                    style={{
                        position: 'absolute',
                        left: Math.random() * screenW,
                        top: -50,
                        transform: [
                            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, screenH + 100] }) },
                            { rotate: anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
                        ],
                        opacity: anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
                    }}
                >
                    <Text style={{ fontSize: 24 }}>{['🌟', '⭐', '✨', '💫', '🎊'][i % 5]}</Text>
                </Animated.View>
            ))}

            {/* Instructions */}
            <View style={styles.instructions}>
                <Ionicons name="hand-left" size={16} color="#1565C0" />
                <Text style={styles.instructionsText}>
                    Nesneyi sürükle ve doğru gölgeye bırak!
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E3F2FD',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'web' ? 20 : 50,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: '#1565C0',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    backButton: {
        padding: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    headerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 12,
        color: '#BBDEFB',
        marginTop: 2,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    statBadge: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
    },
    statText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    },
    gameArea: {
        flex: 1,
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    objectsColumn: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 20,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    shadowsColumn: {
        flex: 1,
        backgroundColor: 'rgba(66, 66, 66, 0.15)',
        borderRadius: 20,
        padding: 12,
    },
    columnTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#1565C0',
        textAlign: 'center',
        marginBottom: 12,
    },
    itemsContainer: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignContent: 'flex-start',
        gap: 10,
    },
    objectCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 8,
        elevation: 4,
        shadowColor: '#1565C0',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        borderWidth: 2,
        borderColor: '#E3F2FD',
    },
    objectCardMatched: {
        borderColor: '#4CAF50',
        backgroundColor: '#E8F5E9',
    },
    objectCardDragging: {
        borderColor: '#FF9800',
        shadowOpacity: 0.4,
        elevation: 10,
    },
    objectImage: {
        width: '100%',
        height: '100%',
    },
    matchedCheck: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#fff',
        borderRadius: 10,
    },
    shadowCard: {
        backgroundColor: '#424242',
        borderRadius: 16,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#616161',
    },
    shadowCardMatched: {
        backgroundColor: '#2E7D32',
        borderColor: '#4CAF50',
    },
    shadowCardHighlighted: {
        borderColor: '#FFD700',
        borderWidth: 3,
        transform: [{ scale: 1.08 }],
    },
    shadowCardDistractor: {
        backgroundColor: '#37474F',
        borderColor: '#546E7A',
    },
    shadowImage: {
        width: '80%',
        height: '80%',
    },
    shadowMatchedBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#4CAF50',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    successOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(21, 101, 192, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200,
    },
    successEmoji: {
        fontSize: 80,
    },
    successText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 16,
    },
    successSubtext: {
        fontSize: 16,
        color: '#BBDEFB',
        marginTop: 8,
    },
    instructions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        gap: 8,
        backgroundColor: 'rgba(255,255,255,0.9)',
        marginHorizontal: 16,
        marginBottom: 16,
        borderRadius: 12,
    },
    instructionsText: {
        fontSize: 14,
        color: '#1565C0',
        fontWeight: '600',
    },
});
