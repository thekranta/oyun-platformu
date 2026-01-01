import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    ImageSourcePropType,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Config Interface
export interface ShadowDetectiveConfig {
    level: number;
    itemCount: number;
    hasDistractors: boolean;
    assets: {
        objects: ImageSourcePropType[];
        shadows: ImageSourcePropType[];
    };
    timeLimit?: number;
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

// Varsayılan asset'ler - meyveler
const DEFAULT_ASSETS = {
    objects: [
        require('@/assets/images/elma.png'),
        require('@/assets/images/armut.png'),
        require('@/assets/images/karpuz.png'),
        require('@/assets/images/cilek.png'),
        require('@/assets/images/kiraz.png'),
        require('@/assets/images/uzum.png'),
        require('@/assets/images/domates.png'),
        require('@/assets/images/avokado.png'),
    ],
    shadows: [
        require('@/assets/images/elma.png'),
        require('@/assets/images/armut.png'),
        require('@/assets/images/karpuz.png'),
        require('@/assets/images/cilek.png'),
        require('@/assets/images/kiraz.png'),
        require('@/assets/images/uzum.png'),
        require('@/assets/images/domates.png'),
        require('@/assets/images/avokado.png'),
    ],
};

const { width: screenW, height: screenH } = Dimensions.get('window');

export default function ShadowDetective({ config, onGameEnd, onExit }: ShadowDetectiveProps) {
    // Game state
    const [round, setRound] = useState(1);
    const [itemCount, setItemCount] = useState(config.itemCount || 3);
    const [currentItems, setCurrentItems] = useState<number[]>([]);
    const [matches, setMatches] = useState<Set<number>>(new Set());
    const [errors, setErrors] = useState(0);
    const [totalMoves, setTotalMoves] = useState(0);
    const [streak, setStreak] = useState(0); // Ardışık hatasız tur
    const [scaffoldingActive, setScaffoldingActive] = useState(false);
    const [highlightedShadow, setHighlightedShadow] = useState<number | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [startTime] = useState(Date.now());
    const [roundErrors, setRoundErrors] = useState(0);
    const [decisionTimes, setDecisionTimes] = useState<number[]>([]);
    const [moveStartTime, setMoveStartTime] = useState(Date.now());

    // Assets
    const assets = config.assets?.objects?.length > 0 ? config.assets : DEFAULT_ASSETS;

    // Pan refs for draggable items
    const panRefs = useRef<Animated.ValueXY[]>([]);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

    // Layout calculations
    const itemSize = Math.min(80, (screenW - 60) / 5);
    const shadowSize = itemSize * 0.9;

    // Initialize round
    useEffect(() => {
        initializeRound();
    }, [round, itemCount]);

    const initializeRound = () => {
        // Select random items for this round
        const availableIndices = Array.from({ length: assets.objects.length }, (_, i) => i);
        const shuffled = availableIndices.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(itemCount, assets.objects.length));

        setCurrentItems(selected);
        setMatches(new Set());
        setRoundErrors(0);
        setMoveStartTime(Date.now());
        setGameStarted(true);

        // Initialize pan values
        panRefs.current = selected.map(() => new Animated.ValueXY({ x: 0, y: 0 }));
    };

    // Check if round is complete
    useEffect(() => {
        if (gameStarted && matches.size === currentItems.length && currentItems.length > 0) {
            handleRoundComplete();
        }
    }, [matches]);

    const handleRoundComplete = () => {
        setShowSuccess(true);

        // Update streak and adaptive difficulty
        if (roundErrors === 0) {
            const newStreak = streak + 1;
            setStreak(newStreak);

            // Art arda 2 hatasız tur = itemCount artır
            if (newStreak >= 2 && itemCount < 6) {
                setItemCount(prev => prev + 1);
                setStreak(0);
            }
            setScaffoldingActive(false);
        } else if (roundErrors >= 3) {
            // 3+ hata = scaffolding aktif
            setScaffoldingActive(true);
            setStreak(0);
        }

        setTimeout(() => {
            setShowSuccess(false);
            if (round < 5) {
                setRound(r => r + 1);
            } else {
                // Game complete
                const duration = Math.floor((Date.now() - startTime) / 1000);
                const avgDecisionTime = decisionTimes.length > 0
                    ? decisionTimes.reduce((a, b) => a + b, 0) / decisionTimes.length
                    : 0;

                onGameEnd('Gölge Dedektifi', duration, totalMoves, errors, undefined, {
                    zorlukSeviyesi: config.level || 1,
                    kazanimOdagi: 'Görsel Çözümleme',
                    avgDecisionTime: Math.round(avgDecisionTime),
                    finalItemCount: itemCount,
                });
            }
        }, 1500);
    };

    const handleMatch = (objectIndex: number, shadowIndex: number) => {
        const decisionTime = Date.now() - moveStartTime;
        setDecisionTimes(prev => [...prev, decisionTime]);
        setTotalMoves(m => m + 1);

        if (objectIndex === shadowIndex) {
            // Correct match
            setMatches(prev => new Set(prev).add(objectIndex));
            setHighlightedShadow(null);
        } else {
            // Wrong match
            setErrors(e => e + 1);
            setRoundErrors(e => e + 1);

            // Scaffolding: highlight correct shadow
            if (scaffoldingActive) {
                setHighlightedShadow(objectIndex);
                setTimeout(() => setHighlightedShadow(null), 1000);
            }
        }

        setMoveStartTime(Date.now());
    };

    const createPanResponder = (index: number, objectId: number) => {
        const pan = panRefs.current[index];
        if (!pan) return null;

        return PanResponder.create({
            onStartShouldSetPanResponder: () => !matches.has(objectId),
            onMoveShouldSetPanResponder: () => !matches.has(objectId),
            onPanResponderGrant: () => {
                setDraggingIndex(index);
                // @ts-ignore
                pan.setOffset({ x: pan.x._value, y: pan.y._value });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
                useNativeDriver: false,
            }),
            onPanResponderRelease: (_, gesture) => {
                pan.flattenOffset();
                setDraggingIndex(null);

                // Check if dropped on a shadow
                const dropX = gesture.moveX;
                const dropY = gesture.moveY;

                // Shadow area is on the right side
                const shadowAreaStart = screenW / 2 + 20;

                if (dropX > shadowAreaStart) {
                    // Find which shadow was dropped on
                    const shadowY = 150; // Header offset
                    const shadowSpacing = shadowSize + 15;
                    const droppedShadowIndex = Math.floor((dropY - shadowY) / shadowSpacing);

                    if (droppedShadowIndex >= 0 && droppedShadowIndex < currentItems.length) {
                        const targetObjectId = currentItems[droppedShadowIndex];
                        handleMatch(objectId, targetObjectId);

                        if (objectId === targetObjectId) {
                            // Snap to position (matched)
                            return;
                        }
                    }
                }

                // Return to original position
                Animated.spring(pan, {
                    toValue: { x: 0, y: 0 },
                    useNativeDriver: false,
                }).start();
            },
        });
    };

    // Shuffle items for display
    const shuffledIndices = [...Array(currentItems.length).keys()].sort(() => Math.random() - 0.5);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.title}>🔍 Gölge Dedektifi</Text>
                    <Text style={styles.subtitle}>Tur {round}/5 • Seviye {config.level || 1}</Text>
                </View>
                <View style={styles.statsContainer}>
                    <View style={styles.statBadge}>
                        <Text style={styles.statText}>✓ {matches.size}/{currentItems.length}</Text>
                    </View>
                    <View style={[styles.statBadge, { backgroundColor: errors > 0 ? '#FF5252' : '#4CAF50' }]}>
                        <Text style={styles.statText}>✗ {errors}</Text>
                    </View>
                </View>
            </View>

            {/* Scaffolding indicator */}
            {scaffoldingActive && (
                <View style={styles.scaffoldingBanner}>
                    <Ionicons name="bulb" size={16} color="#FF9800" />
                    <Text style={styles.scaffoldingText}>İpucu modu aktif</Text>
                </View>
            )}

            {/* Game Area */}
            <View style={styles.gameArea}>
                {/* Objects Column (Left) */}
                <View style={styles.objectsColumn}>
                    <Text style={styles.columnTitle}>Nesneler</Text>
                    <ScrollView contentContainerStyle={styles.itemsContainer}>
                        {currentItems.map((objectId, index) => {
                            const pan = panRefs.current[index];
                            const panResponder = createPanResponder(index, objectId);
                            const isMatched = matches.has(objectId);

                            if (!pan || !panResponder) return null;

                            return (
                                <Animated.View
                                    key={`object-${objectId}-${index}`}
                                    style={[
                                        styles.objectCard,
                                        scaffoldingActive && styles.objectCardScaffolding,
                                        isMatched && styles.objectCardMatched,
                                        {
                                            width: itemSize,
                                            height: itemSize,
                                            transform: pan.getTranslateTransform(),
                                            zIndex: draggingIndex === index ? 100 : 1,
                                        },
                                    ]}
                                    {...panResponder.panHandlers}
                                >
                                    <Image
                                        source={assets.objects[objectId]}
                                        style={[styles.objectImage, isMatched && { opacity: 0.3 }]}
                                        resizeMode="contain"
                                    />
                                </Animated.View>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Shadows Column (Right) */}
                <View style={styles.shadowsColumn}>
                    <Text style={styles.columnTitle}>Gölgeler</Text>
                    <ScrollView contentContainerStyle={styles.itemsContainer}>
                        {currentItems.map((objectId, index) => {
                            const isMatched = matches.has(objectId);
                            const isHighlighted = highlightedShadow === objectId;

                            return (
                                <View
                                    key={`shadow-${objectId}-${index}`}
                                    style={[
                                        styles.shadowCard,
                                        isMatched && styles.shadowCardMatched,
                                        isHighlighted && styles.shadowCardHighlighted,
                                        { width: shadowSize, height: shadowSize },
                                    ]}
                                >
                                    <Image
                                        source={assets.shadows[objectId]}
                                        style={[
                                            styles.shadowImage,
                                            { tintColor: isMatched ? '#4CAF50' : '#000' },
                                        ]}
                                        resizeMode="contain"
                                    />
                                    {isMatched && (
                                        <View style={styles.matchedBadge}>
                                            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>

            {/* Success Overlay */}
            {showSuccess && (
                <View style={styles.successOverlay}>
                    <Text style={styles.successEmoji}>🎉</Text>
                    <Text style={styles.successText}>Harika!</Text>
                    {round < 5 && <Text style={styles.successSubtext}>Sonraki tura geçiliyor...</Text>}
                </View>
            )}

            {/* Instructions */}
            <View style={styles.instructions}>
                <Text style={styles.instructionsText}>
                    👆 Nesneyi sürükle ve doğru gölgeye bırak!
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
        paddingTop: 50,
        paddingHorizontal: 16,
        paddingBottom: 16,
        backgroundColor: '#1565C0',
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
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
        fontSize: 13,
        color: '#BBDEFB',
        marginTop: 2,
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    statBadge: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    scaffoldingBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF3E0',
        paddingVertical: 6,
        gap: 6,
    },
    scaffoldingText: {
        color: '#E65100',
        fontSize: 12,
        fontWeight: '600',
    },
    gameArea: {
        flex: 1,
        flexDirection: 'row',
        padding: 16,
    },
    objectsColumn: {
        flex: 1,
        marginRight: 8,
    },
    shadowsColumn: {
        flex: 1,
        marginLeft: 8,
        backgroundColor: 'rgba(66, 66, 66, 0.1)',
        borderRadius: 16,
        padding: 8,
    },
    columnTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1565C0',
        textAlign: 'center',
        marginBottom: 12,
    },
    itemsContainer: {
        alignItems: 'center',
        gap: 12,
    },
    objectCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 8,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
    },
    objectCardScaffolding: {
        borderWidth: 3,
        borderColor: '#FFD700',
    },
    objectCardMatched: {
        opacity: 0.5,
        backgroundColor: '#E8F5E9',
    },
    objectImage: {
        width: '100%',
        height: '100%',
    },
    shadowCard: {
        backgroundColor: '#424242',
        borderRadius: 16,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    shadowCardMatched: {
        backgroundColor: '#2E7D32',
    },
    shadowCardHighlighted: {
        borderWidth: 3,
        borderColor: '#FFD700',
        transform: [{ scale: 1.05 }],
    },
    shadowImage: {
        width: '80%',
        height: '80%',
    },
    matchedBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    successOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200,
    },
    successEmoji: {
        fontSize: 80,
    },
    successText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 16,
    },
    successSubtext: {
        fontSize: 16,
        color: '#ccc',
        marginTop: 8,
    },
    instructions: {
        padding: 16,
        alignItems: 'center',
    },
    instructionsText: {
        fontSize: 14,
        color: '#1565C0',
        fontWeight: '500',
    },
});
