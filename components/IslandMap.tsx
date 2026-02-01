/**
 * IslandMap - Adacık Haritası Dashboard
 * Ana giriş ekranı için "Yaşayan Dünya" temalı oyun seçim haritası
 * 
 * Güzel bir ada görseli arka planı üzerinde oyun kartları
 */

import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    ImageBackground,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Arka plan görseli
const islandMapBg = require('../assets/backgrounds/island_map.png');

// Bina tanımları
interface Building {
    id: string;
    name: string;
    emoji: string;
    region: 'yasam' | 'bilissel';
    gameId: string;
    description: string;
    color: string;
    gradientColors: string[];
}

const BUILDINGS: Building[] = [
    // Bilişsel Tepe (üst - dağlık bölge)
    {
        id: 'hafiza',
        name: 'Hafıza Kulesi',
        emoji: '🧠',
        region: 'bilissel',
        gameId: 'hafiza',
        description: 'Çiftleri bul!',
        color: '#6366F1',
        gradientColors: ['#818CF8', '#6366F1'],
    },
    {
        id: 'uzay',
        name: 'Uzay İstasyonu',
        emoji: '🚀',
        region: 'bilissel',
        gameId: 'uzay-bloklari',
        description: 'Blokları yerleştir!',
        color: '#8B5CF6',
        gradientColors: ['#A78BFA', '#8B5CF6'],
    },
    {
        id: 'golge',
        name: 'Gölge Atölyesi',
        emoji: '🔍',
        region: 'bilissel',
        gameId: 'golge-dedektifi',
        description: 'Gölgeleri eşleştir!',
        color: '#EC4899',
        gradientColors: ['#F472B6', '#EC4899'],
    },

    // Yaşam Kasabası (alt - yeşil bölge)
    {
        id: 'mutfak',
        name: 'Mutfak Dedektifi',
        emoji: '🍳',
        region: 'yasam',
        gameId: 'mutfak-dedektifi',
        description: 'Meyve ve sebzeleri keşfet!',
        color: '#10B981',
        gradientColors: ['#34D399', '#10B981'],
    },
    {
        id: 'aile-sepeti',
        name: 'Aile Sepeti',
        emoji: '🛒',
        region: 'yasam',
        gameId: 'aile-sepeti-macerasi',
        description: 'Alışveriş macerası!',
        color: '#F59E0B',
        gradientColors: ['#FBBF24', '#F59E0B'],
    },
    {
        id: 'adalet',
        name: 'Adalet Hikayesi',
        emoji: '⚖️',
        region: 'yasam',
        gameId: 'adalet-hikayesi',
        description: 'Doğru kararlar ver!',
        color: '#EF4444',
        gradientColors: ['#F87171', '#EF4444'],
    },
];

interface IslandMapProps {
    onSelectGame: (gameId: string) => void;
    childName: string;
}

export default function IslandMap({ onSelectGame, childName }: IslandMapProps) {
    const floatAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Sürekli yukarı-aşağı hareket animasyonu
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: -8,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 2000,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <View style={styles.container}>
            <ImageBackground
                source={islandMapBg}
                style={styles.backgroundImage}
                resizeMode="cover"
            >
                {/* Üst overlay - hoş geldin mesajı */}
                <View style={styles.welcomeContainer}>
                    <Animated.View style={[
                        styles.welcomeBubble,
                        { transform: [{ translateY: floatAnim }] }
                    ]}>
                        <Text style={styles.welcomeEmoji}>🌈</Text>
                        <Text style={styles.welcomeText}>Hoş geldin, {childName}!</Text>
                    </Animated.View>
                </View>

                {/* Oyun Kartları Scroll Alanı */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Bilişsel Tepe Bölümü */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionBadge}>
                                <Text style={styles.sectionEmoji}>🏔️</Text>
                                <Text style={styles.sectionTitle}>Bilişsel Tepe</Text>
                            </View>
                        </View>
                        <View style={styles.cardsRow}>
                            {BUILDINGS.filter(b => b.region === 'bilissel').map((building, index) => (
                                <GameCard
                                    key={building.id}
                                    building={building}
                                    onPress={() => onSelectGame(building.gameId)}
                                    delay={index * 100}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Yaşam Kasabası Bölümü */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionBadge}>
                                <Text style={styles.sectionEmoji}>🌳</Text>
                                <Text style={styles.sectionTitle}>Yaşam Kasabası</Text>
                            </View>
                        </View>
                        <View style={styles.cardsRow}>
                            {BUILDINGS.filter(b => b.region === 'yasam').map((building, index) => (
                                <GameCard
                                    key={building.id}
                                    building={building}
                                    onPress={() => onSelectGame(building.gameId)}
                                    delay={index * 100 + 300}
                                />
                            ))}
                        </View>
                    </View>
                </ScrollView>
            </ImageBackground>
        </View>
    );
}

// Oyun Kartı Bileşeni
interface GameCardProps {
    building: Building;
    onPress: () => void;
    delay: number;
}

function GameCard({ building, onPress, delay }: GameCardProps) {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const bounceAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Giriş animasyonu
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 6,
            tension: 120,
            delay: delay,
            useNativeDriver: true,
        }).start();
    }, []);

    const handlePressIn = () => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1.08,
                friction: 3,
                tension: 300,
                useNativeDriver: true,
            }),
            Animated.timing(bounceAnim, {
                toValue: -10,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handlePressOut = () => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 4,
                useNativeDriver: true,
            }),
            Animated.spring(bounceAnim, {
                toValue: 0,
                friction: 3,
                useNativeDriver: true,
            }),
        ]).start();
    };

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}
            style={styles.cardTouchable}
        >
            <Animated.View
                style={[
                    styles.gameCard,
                    {
                        transform: [
                            { scale: scaleAnim },
                            { translateY: bounceAnim },
                        ],
                    },
                ]}
            >
                {/* Kart Arka Planı - Glassmorphism */}
                <View style={[styles.cardBackground, { backgroundColor: building.color }]}>
                    {/* Üst parlak efekt */}
                    <View style={styles.cardShine} />

                    {/* Emoji */}
                    <View style={styles.iconContainer}>
                        <Text style={styles.gameEmoji}>{building.emoji}</Text>
                    </View>

                    {/* İsim Plakası */}
                    <View style={styles.namePlate}>
                        <Text style={styles.gameName} numberOfLines={2}>
                            {building.name}
                        </Text>
                    </View>

                    {/* Alt dekoratif çizgi */}
                    <View style={[styles.cardAccent, { backgroundColor: 'rgba(255,255,255,0.3)' }]} />
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },

    // Hoş geldin
    welcomeContainer: {
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 10,
        alignItems: 'center',
    },
    welcomeBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 30,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    welcomeEmoji: {
        fontSize: 24,
    },
    welcomeText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },

    // Scroll
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 40,
    },

    // Bölüm
    section: {
        marginBottom: 25,
    },
    sectionHeader: {
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
    },
    sectionEmoji: {
        fontSize: 22,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },

    // Kart satırı
    cardsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
    },

    // Oyun kartı
    cardTouchable: {
        marginBottom: 5,
    },
    gameCard: {
        width: isWeb ? 140 : width * 0.28,
        minWidth: 110,
        maxWidth: 150,
    },
    cardBackground: {
        borderRadius: 20,
        padding: 12,
        alignItems: 'center',
        overflow: 'hidden',
        // Gölge
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 12,
    },
    cardShine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '40%',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },

    // İkon
    iconContainer: {
        width: 70,
        height: 70,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        marginTop: 5,
    },
    gameIcon: {
        width: 50,
        height: 50,
    },
    gameEmoji: {
        fontSize: 36,
    },

    // İsim plakası
    namePlate: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 10,
        width: '100%',
        marginBottom: 5,
    },
    gameName: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        lineHeight: 15,
    },

    // Alt aksan
    cardAccent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
});
