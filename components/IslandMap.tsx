/**
 * IslandMap - Adacık Haritası Dashboard
 * Ana giriş ekranı için "Yaşayan Dünya" temalı oyun seçim haritası
 * 
 * Bölgeler:
 * - Yaşam Kasabası (alt kısım, yeşil) - Günlük yaşam becerileri
 * - Bilişsel Tepe (üst kısım, kayalık) - Bilişsel gelişim oyunları
 */

import React, { useRef } from 'react';
import {
    Animated,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Bina tanımları
interface Building {
    id: string;
    name: string;
    emoji: string;
    region: 'yasam' | 'bilissel';
    gameId: string;
    description: string;
    position: { x: number; y: number };
    color: string;
    size: 'small' | 'medium' | 'large';
}

const BUILDINGS: Building[] = [
    // Yaşam Kasabası (alt - yeşil bölge)
    {
        id: 'mutfak',
        name: 'Mutfak Dedektifi',
        emoji: '🍳',
        region: 'yasam',
        gameId: 'mutfak-dedektifi',
        description: 'Meyve ve sebzeleri keşfet!',
        position: { x: 15, y: 65 },
        color: '#FF6B6B',
        size: 'large',
    },
    {
        id: 'aile-sepeti',
        name: 'Aile Sepeti',
        emoji: '🛒',
        region: 'yasam',
        gameId: 'aile-sepeti-macerasi',
        description: 'Alışveriş macerası!',
        position: { x: 55, y: 70 },
        color: '#4ECDC4',
        size: 'medium',
    },
    {
        id: 'adalet',
        name: 'Adalet Hikayesi',
        emoji: '⚖️',
        region: 'yasam',
        gameId: 'adalet-hikayesi',
        description: 'Doğru kararlar ver!',
        position: { x: 75, y: 60 },
        color: '#9B59B6',
        size: 'medium',
    },

    // Bilişsel Tepe (üst - kayalık bölge)
    {
        id: 'hafiza',
        name: 'Hafıza Kulesi',
        emoji: '🧠',
        region: 'bilissel',
        gameId: 'hafiza',
        description: 'Çiftleri bul!',
        position: { x: 20, y: 20 },
        color: '#3498DB',
        size: 'large',
    },
    {
        id: 'uzay',
        name: 'Uzay İstasyonu',
        emoji: '🚀',
        region: 'bilissel',
        gameId: 'uzay-bloklari',
        description: 'Blokları yerleştir!',
        position: { x: 50, y: 15 },
        color: '#2C3E50',
        size: 'large',
    },
    {
        id: 'golge',
        name: 'Gölge Atölyesi',
        emoji: '🔍',
        region: 'bilissel',
        gameId: 'golge-dedektifi',
        description: 'Gölgeleri eşleştir!',
        position: { x: 80, y: 25 },
        color: '#E74C3C',
        size: 'medium',
    },
];

interface IslandMapProps {
    onSelectGame: (gameId: string) => void;
    childName: string;
}

export default function IslandMap({ onSelectGame, childName }: IslandMapProps) {
    return (
        <View style={styles.container}>
            {/* Sky gradient */}
            <View style={styles.sky}>
                <Text style={styles.welcomeText}>🌤️ Hoş geldin, {childName}!</Text>
            </View>

            {/* Main Map Area */}
            <ScrollView
                style={styles.mapScrollView}
                contentContainerStyle={styles.mapContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Bilişsel Tepe - Üst bölge (kayalık) */}
                <View style={styles.bilisselTepe}>
                    <View style={styles.regionHeader}>
                        <Text style={styles.regionEmoji}>🏔️</Text>
                        <Text style={styles.regionTitle}>Bilişsel Tepe</Text>
                    </View>
                    <View style={styles.buildingsContainer}>
                        {BUILDINGS.filter(b => b.region === 'bilissel').map(building => (
                            <BuildingCard
                                key={building.id}
                                building={building}
                                onPress={() => onSelectGame(building.gameId)}
                            />
                        ))}
                    </View>
                </View>

                {/* Yaşam Kasabası - Alt bölge (yeşil) */}
                <View style={styles.yasamKasabasi}>
                    <View style={styles.regionHeader}>
                        <Text style={styles.regionEmoji}>🌳</Text>
                        <Text style={styles.regionTitle}>Yaşam Kasabası</Text>
                    </View>
                    <View style={styles.buildingsContainer}>
                        {BUILDINGS.filter(b => b.region === 'yasam').map(building => (
                            <BuildingCard
                                key={building.id}
                                building={building}
                                onPress={() => onSelectGame(building.gameId)}
                            />
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

// Animasyonlu Bina Kartı
interface BuildingCardProps {
    building: Building;
    onPress: () => void;
}

function BuildingCard({ building, onPress }: BuildingCardProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const bounceAnim = useRef(new Animated.Value(0)).current;

    // Zıplama animasyonu (hover/touch)
    const handlePressIn = () => {
        Animated.parallel([
            Animated.spring(scaleAnim, {
                toValue: 1.1,
                friction: 3,
                tension: 200,
                useNativeDriver: true,
            }),
            Animated.sequence([
                Animated.timing(bounceAnim, {
                    toValue: -15,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.spring(bounceAnim, {
                    toValue: 0,
                    friction: 3,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 5,
            useNativeDriver: true,
        }).start();
    };

    const cardSize = building.size === 'large' ? 120 : building.size === 'medium' ? 100 : 80;

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={onPress}
        >
            <Animated.View style={[
                styles.buildingCard,
                {
                    width: cardSize,
                    height: cardSize + 30,
                    backgroundColor: building.color,
                    transform: [
                        { scale: scaleAnim },
                        { translateY: bounceAnim },
                    ],
                },
            ]}>
                {/* Çatı */}
                <View style={[styles.roof, { borderBottomColor: building.color }]} />

                {/* Emoji */}
                <Text style={[styles.buildingEmoji, { fontSize: cardSize * 0.4 }]}>
                    {building.emoji}
                </Text>

                {/* İsim */}
                <View style={styles.nameplate}>
                    <Text style={styles.buildingName} numberOfLines={2}>
                        {building.name}
                    </Text>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#87CEEB', // Gökyüzü mavisi
    },

    // Gökyüzü
    sky: {
        height: 80,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 10,
        backgroundColor: 'linear-gradient(180deg, #87CEEB 0%, #B0E0E6 100%)' as any,
    },
    welcomeText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },

    // Harita
    mapScrollView: {
        flex: 1,
    },
    mapContainer: {
        minHeight: height - 80,
        paddingBottom: 40,
    },

    // Bilişsel Tepe (üst)
    bilisselTepe: {
        minHeight: 280,
        backgroundColor: '#A0522D', // Kahverengi kayalık
        borderBottomLeftRadius: 50,
        borderBottomRightRadius: 50,
        paddingTop: 20,
        paddingHorizontal: 20,
        paddingBottom: 40,
        // Gölge
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },

    // Yaşam Kasabası (alt)
    yasamKasabasi: {
        flex: 1,
        backgroundColor: '#228B22', // Yeşil çimen
        paddingTop: 30,
        paddingHorizontal: 20,
        paddingBottom: 20,
        marginTop: -30,
    },

    // Bölge başlığı
    regionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 10,
    },
    regionEmoji: {
        fontSize: 28,
    },
    regionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },

    // Binalar konteyneri
    buildingsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 20,
    },

    // Bina kartı
    buildingCard: {
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        // Gölge
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 12,
    },
    roof: {
        position: 'absolute',
        top: -15,
        width: 0,
        height: 0,
        borderLeftWidth: 30,
        borderRightWidth: 30,
        borderBottomWidth: 20,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
    buildingEmoji: {
        marginTop: 10,
    },
    nameplate: {
        position: 'absolute',
        bottom: 5,
        left: 5,
        right: 5,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 6,
    },
    buildingName: {
        fontSize: 10,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },
});
