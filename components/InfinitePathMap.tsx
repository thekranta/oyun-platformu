/**
 * InfinitePathMap - Sonsuz Öğrenme Yolu
 * Candy Crush tarzı, sonsuz kaydırılabilir öğrenme haritası
 * 
 * Özellikler:
 * - Dikey scroll ile sonsuz kaydırma
 * - Dallanma yolları (Bilişsel Tepe / Yaşam Kasabası)
 * - Sis efekti ile kilitli alanlar
 * - Animasyonlu node'lar
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    ImageBackground,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Arka plan görseli
const pathMapBg = require('../assets/backgrounds/learning_path.png');

// ==================== TYPES ====================

interface PathNode {
    id: string;
    gameId: string;
    name: string;
    emoji: string;
    description: string;
    position: { x: number; y: number }; // Yüzde olarak
    region: 'orman' | 'bilissel' | 'yasam' | 'sualti';
    requires: string[]; // Önceki tamamlanması gereken oyunlar
    color: string;
    branch?: 'left' | 'right' | 'center';
}

interface UserProgress {
    [nodeId: string]: {
        unlocked: boolean;
        completed: boolean;
        stars: number; // 0-3
    };
}

// ==================== NODE DATA ====================

const PATH_NODES: PathNode[] = [
    // ORMAN GİRİŞİ (Başlangıç)
    {
        id: 'mutfak',
        gameId: 'mutfak-dedektifi',
        name: 'Mutfak Dedektifi',
        emoji: '🍳',
        description: 'Meyve ve sebzeleri keşfet!',
        position: { x: 50, y: 92 },
        region: 'orman',
        requires: [], // İlk oyun - her zaman açık
        color: '#FF6B6B',
        branch: 'center',
    },

    // DALLANMA NOKTASI
    {
        id: 'branch-1',
        gameId: '',
        name: 'Yolunu Seç!',
        emoji: '🔀',
        description: 'Hangi maceraya çıkmak istersin?',
        position: { x: 50, y: 80 },
        region: 'orman',
        requires: ['mutfak'],
        color: '#9C27B0',
        branch: 'center',
    },

    // BİLİŞSEL TEPE (Sol Dal)
    {
        id: 'hafiza',
        gameId: 'hafiza',
        name: 'Hafıza Kulesi',
        emoji: '🧠',
        description: 'Çiftleri bul!',
        position: { x: 25, y: 68 },
        region: 'bilissel',
        requires: ['branch-1'],
        color: '#6366F1',
        branch: 'left',
    },
    {
        id: 'uzay',
        gameId: 'uzay-bloklari',
        name: 'Uzay İstasyonu',
        emoji: '🚀',
        description: 'Blokları yerleştir!',
        position: { x: 20, y: 56 },
        region: 'bilissel',
        requires: ['hafiza'],
        color: '#8B5CF6',
        branch: 'left',
    },
    {
        id: 'golge',
        gameId: 'golge-dedektifi',
        name: 'Gölge Atölyesi',
        emoji: '🔍',
        description: 'Gölgeleri eşleştir!',
        position: { x: 28, y: 44 },
        region: 'bilissel',
        requires: ['uzay'],
        color: '#EC4899',
        branch: 'left',
    },
    {
        id: 'sihirli-siseler',
        gameId: 'sihirli-siseler',
        name: 'Sihirli Şişeler',
        emoji: '🧪',
        description: 'Renkleri grupla!',
        position: { x: 22, y: 32 },
        region: 'bilissel',
        requires: ['golge'],
        color: '#10B981',
        branch: 'left',
    },

    // YAŞAM KASABASI (Sağ Dal)
    {
        id: 'aile-sepeti',
        gameId: 'aile-sepeti-macerasi',
        name: 'Aile Sepeti',
        emoji: '🛒',
        description: 'Alışveriş macerası!',
        position: { x: 75, y: 68 },
        region: 'yasam',
        requires: ['branch-1'],
        color: '#F59E0B',
        branch: 'right',
    },
    {
        id: 'adalet',
        gameId: 'adalet-hikayesi',
        name: 'Adalet Hikayesi',
        emoji: '⚖️',
        description: 'Doğru kararlar ver!',
        position: { x: 80, y: 56 },
        region: 'yasam',
        requires: ['aile-sepeti'],
        color: '#EF4444',
        branch: 'right',
    },
    {
        id: 'bunu-soyle',
        gameId: 'bunu-soyle',
        name: 'Bunu Söyle!',
        emoji: '🎤',
        description: 'Kelimeleri söyle!',
        position: { x: 72, y: 44 },
        region: 'yasam',
        requires: ['adalet'],
        color: '#F472B6',
        branch: 'right',
    },
    {
        id: 'kodlama',
        gameId: 'kodlama',
        name: 'Minik Kaşif',
        emoji: '🗺️',
        description: 'Yolunu bul!',
        position: { x: 78, y: 32 },
        region: 'yasam',
        requires: ['bunu-soyle'],
        color: '#06B6D4',
        branch: 'right',
    },

    // BİRLEŞME NOKTASI
    {
        id: 'branch-2',
        gameId: '',
        name: 'Yollar Birleşiyor',
        emoji: '🌟',
        description: 'Her iki yolu da tamamladın!',
        position: { x: 50, y: 22 },
        region: 'sualti',
        requires: ['sihirli-siseler', 'kodlama'], // Her iki dal da tamamlanmalı
        color: '#FFD700',
        branch: 'center',
    },

    // SUALTI DÜNYASI
    {
        id: 'yaratici-cizim',
        gameId: 'yaratici-cizim',
        name: 'Yaratıcı Çizim',
        emoji: '🎨',
        description: 'Hayal et ve çiz!',
        position: { x: 45, y: 12 },
        region: 'sualti',
        requires: ['branch-2'],
        color: '#FF6B6B',
        branch: 'center',
    },
    {
        id: 'yapboz',
        gameId: 'yapboz',
        name: 'Yapboz',
        emoji: '🧩',
        description: 'Parçaları birleştir!',
        position: { x: 55, y: 5 },
        region: 'sualti',
        requires: ['yaratici-cizim'],
        color: '#8B5CF6',
        branch: 'center',
    },
];

// ==================== HELPER FUNCTIONS ====================

const getInitialProgress = (): UserProgress => {
    const progress: UserProgress = {};
    PATH_NODES.forEach(node => {
        progress[node.id] = {
            unlocked: node.requires.length === 0, // İlk oyun açık
            completed: false,
            stars: 0,
        };
    });
    return progress;
};

// ==================== COMPONENTS ====================

interface InfinitePathMapProps {
    onSelectGame: (gameId: string) => void;
    childName: string;
    userEmail?: string;
}

export default function InfinitePathMap({
    onSelectGame,
    childName,
    userEmail
}: InfinitePathMapProps) {
    const [progress, setProgress] = useState<UserProgress>(getInitialProgress);
    const scrollRef = useRef<ScrollView>(null);
    const floatAnim = useRef(new Animated.Value(0)).current;

    // TODO: Supabase'den ilerleme yükle
    useEffect(() => {
        // Soft gating: dallanma noktalarından sonra her iki yol da açık
        // Şimdilik demo amaçlı ilk birkaç oyunu açık yapalım
        setProgress(prev => {
            const updated = { ...prev };
            // Başlangıç oyunu her zaman açık
            updated['mutfak'].unlocked = true;
            // Demo: dallanma noktası açık
            updated['branch-1'].unlocked = true;
            // Demo: her iki dalın başlangıcı açık
            updated['hafiza'].unlocked = true;
            updated['aile-sepeti'].unlocked = true;
            return updated;
        });
    }, []);

    // Yüzen animasyon
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: -6,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    // Oyun seçildiğinde progress güncelle
    const handleSelectNode = (node: PathNode) => {
        if (!progress[node.id]?.unlocked) return;
        if (node.gameId === '') return; // Dallanma noktası

        onSelectGame(node.gameId);
    };

    // Node tamamlandığında sonrakileri aç
    const completeNode = (nodeId: string, stars: number = 1) => {
        setProgress(prev => {
            const updated = { ...prev };
            updated[nodeId] = {
                ...updated[nodeId],
                completed: true,
                stars: Math.max(updated[nodeId]?.stars || 0, stars),
            };

            // Sonraki node'ları aç (soft gating - herhangi bir requirement yeterli)
            PATH_NODES.forEach(node => {
                if (node.requires.includes(nodeId)) {
                    updated[node.id] = {
                        ...updated[node.id],
                        unlocked: true,
                    };
                }
            });

            return updated;
        });
    };

    const mapHeight = SCREEN_HEIGHT * 2.5; // Uzun harita

    return (
        <View style={styles.container}>
            <ImageBackground
                source={pathMapBg}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                {/* Hoş geldin başlığı */}
                <View style={styles.headerContainer}>
                    <Animated.View style={[
                        styles.welcomeBubble,
                        { transform: [{ translateY: floatAnim }] }
                    ]}>
                        <Text style={styles.welcomeEmoji}>🌟</Text>
                        <Text style={styles.welcomeText}>Macera seni bekliyor, {childName}!</Text>
                    </Animated.View>
                </View>

                {/* Harita scroll alanı */}
                <ScrollView
                    ref={scrollRef}
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { height: mapHeight }
                    ]}
                    showsVerticalScrollIndicator={false}
                    bounces={true}
                >
                    {/* SVG Yol çizimi */}
                    <View style={StyleSheet.absoluteFill}>
                        <PathLines nodes={PATH_NODES} progress={progress} mapHeight={mapHeight} />
                    </View>

                    {/* Node'lar */}
                    {PATH_NODES.map(node => (
                        <NodeButton
                            key={node.id}
                            node={node}
                            progress={progress[node.id]}
                            onPress={() => handleSelectNode(node)}
                            mapHeight={mapHeight}
                        />
                    ))}
                </ScrollView>

                {/* Alt navigasyon */}
                <View style={styles.bottomNav}>
                    <View style={styles.progressInfo}>
                        <Text style={styles.progressText}>
                            ⭐ {Object.values(progress).filter(p => p.completed).length} / {PATH_NODES.filter(n => n.gameId !== '').length} Oyun
                        </Text>
                    </View>
                </View>
            </ImageBackground>
        </View>
    );
}

// ==================== PATH LINES ====================

interface PathLinesProps {
    nodes: PathNode[];
    progress: UserProgress;
    mapHeight: number;
}

function PathLines({ nodes, progress, mapHeight }: PathLinesProps) {
    const getNodePosition = (node: PathNode) => ({
        x: (node.position.x / 100) * SCREEN_WIDTH,
        y: (node.position.y / 100) * mapHeight,
    });

    // Yol bağlantıları oluştur
    const connections: { from: PathNode; to: PathNode }[] = [];
    nodes.forEach(node => {
        node.requires.forEach(reqId => {
            const fromNode = nodes.find(n => n.id === reqId);
            if (fromNode) {
                connections.push({ from: fromNode, to: node });
            }
        });
    });

    return (
        <Svg width={SCREEN_WIDTH} height={mapHeight} style={StyleSheet.absoluteFill}>
            <Defs>
                <LinearGradient id="pathGradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#FFD700" stopOpacity={0.8} />
                    <Stop offset="100%" stopColor="#FFA500" stopOpacity={0.8} />
                </LinearGradient>
                <LinearGradient id="lockedPathGradient" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#9CA3AF" stopOpacity={0.4} />
                    <Stop offset="100%" stopColor="#6B7280" stopOpacity={0.4} />
                </LinearGradient>
            </Defs>

            {connections.map(({ from, to }, index) => {
                const fromPos = getNodePosition(from);
                const toPos = getNodePosition(to);

                const isUnlocked = progress[to.id]?.unlocked;

                // Bezier curve kontrol noktaları
                const midY = (fromPos.y + toPos.y) / 2;
                const pathD = `M ${fromPos.x} ${fromPos.y} 
                               Q ${fromPos.x} ${midY} ${(fromPos.x + toPos.x) / 2} ${midY}
                               Q ${toPos.x} ${midY} ${toPos.x} ${toPos.y}`;

                return (
                    <Path
                        key={`path-${index}`}
                        d={pathD}
                        stroke={isUnlocked ? "url(#pathGradient)" : "url(#lockedPathGradient)"}
                        strokeWidth={8}
                        fill="none"
                        strokeLinecap="round"
                        strokeDasharray={isUnlocked ? "0" : "15 10"}
                    />
                );
            })}
        </Svg>
    );
}

// ==================== NODE BUTTON ====================

interface NodeButtonProps {
    node: PathNode;
    progress?: {
        unlocked: boolean;
        completed: boolean;
        stars: number;
    };
    onPress: () => void;
    mapHeight: number;
}

function NodeButton({ node, progress, onPress, mapHeight }: NodeButtonProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const pulseAnim = useRef(new Animated.Value(0)).current;
    const isUnlocked = progress?.unlocked ?? false;
    const isCompleted = progress?.completed ?? false;
    const stars = progress?.stars ?? 0;
    const isBranchPoint = node.gameId === '';

    // Açık node'lar için parıldama animasyonu
    useEffect(() => {
        if (isUnlocked && !isCompleted) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [isUnlocked, isCompleted]);

    const handlePressIn = () => {
        if (!isUnlocked) return;
        Animated.spring(scaleAnim, {
            toValue: 1.15,
            friction: 3,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
        }).start();
    };

    const nodeSize = isBranchPoint ? 70 : 80;
    const left = (node.position.x / 100) * SCREEN_WIDTH - nodeSize / 2;
    const top = (node.position.y / 100) * mapHeight - nodeSize / 2;

    const pulseScale = pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.08],
    });

    return (
        <TouchableOpacity
            activeOpacity={isUnlocked ? 0.8 : 1}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={isUnlocked ? onPress : undefined}
            style={[
                styles.nodeContainer,
                {
                    left,
                    top,
                    width: nodeSize,
                    height: nodeSize + 25,
                },
            ]}
        >
            <Animated.View
                style={[
                    styles.nodeButton,
                    isBranchPoint && styles.branchNode,
                    {
                        width: nodeSize,
                        height: nodeSize,
                        backgroundColor: isUnlocked ? node.color : '#6B7280',
                        transform: [
                            { scale: Animated.multiply(scaleAnim, pulseScale) },
                        ],
                        opacity: isUnlocked ? 1 : 0.5,
                    },
                ]}
            >
                {/* Parıldama efekti */}
                {isUnlocked && !isCompleted && (
                    <View style={styles.glowRing} />
                )}

                {/* Tamamlandı rozeti */}
                {isCompleted && (
                    <View style={styles.completedBadge}>
                        <Text style={styles.completedCheck}>✓</Text>
                    </View>
                )}

                {/* Kilitli ikonu */}
                {!isUnlocked && (
                    <View style={styles.lockOverlay}>
                        <Ionicons name="lock-closed" size={24} color="rgba(255,255,255,0.8)" />
                    </View>
                )}

                {/* Emoji */}
                <Text style={[styles.nodeEmoji, !isUnlocked && styles.lockedEmoji]}>
                    {node.emoji}
                </Text>
            </Animated.View>

            {/* İsim */}
            <View style={[
                styles.nodeName,
                !isUnlocked && styles.lockedName,
            ]}>
                <Text style={styles.nodeNameText} numberOfLines={2}>
                    {node.name}
                </Text>
            </View>

            {/* Yıldızlar */}
            {isCompleted && stars > 0 && (
                <View style={styles.starsContainer}>
                    {[1, 2, 3].map(i => (
                        <Text key={i} style={styles.starIcon}>
                            {i <= stars ? '⭐' : '☆'}
                        </Text>
                    ))}
                </View>
            )}
        </TouchableOpacity>
    );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },

    // Header
    headerContainer: {
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 15,
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    welcomeBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    welcomeEmoji: {
        fontSize: 22,
    },
    welcomeText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },

    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        position: 'relative',
    },

    // Bottom Nav
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        alignItems: 'center',
    },
    progressInfo: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    progressText: {
        color: '#FFD700',
        fontSize: 16,
        fontWeight: '700',
    },

    // Node
    nodeContainer: {
        position: 'absolute',
        alignItems: 'center',
    },
    nodeButton: {
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 12,
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    branchNode: {
        borderRadius: 35,
        borderWidth: 4,
        borderColor: '#FFD700',
    },
    glowRing: {
        position: 'absolute',
        width: '120%',
        height: '120%',
        borderRadius: 50,
        borderWidth: 3,
        borderColor: '#FFD700',
        opacity: 0.5,
    },
    completedBadge: {
        position: 'absolute',
        top: -5,
        right: -5,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#10B981',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    completedCheck: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    lockOverlay: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    nodeEmoji: {
        fontSize: 32,
    },
    lockedEmoji: {
        opacity: 0.3,
    },
    nodeName: {
        marginTop: 4,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        maxWidth: 90,
    },
    lockedName: {
        backgroundColor: 'rgba(156,163,175,0.6)',
    },
    nodeNameText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
    },
    starsContainer: {
        flexDirection: 'row',
        marginTop: 2,
    },
    starIcon: {
        fontSize: 12,
    },
});
