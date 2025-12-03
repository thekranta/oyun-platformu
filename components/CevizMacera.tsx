import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DynamicBackground from './DynamicBackground';
import { useSound } from './SoundContext';

// --- TİPLER ---
type StoryNodeId = 'intro' | 'scene_a' | 'scene_b' | 'end_a1' | 'end_a2' | 'end_b1' | 'end_b2';

interface Option {
    id: string;
    imageBtn: string; // Artık zorunlu ve görsel ismi
    nextNode: StoryNodeId;
}

interface StoryNode {
    image: string;
    options?: Option[];
    badge?: string;
    isFinal?: boolean;
    pathTag?: string;
}

// --- GÖRSEL VARLIKLARI (ASSETS) ---
const ASSETS: Record<string, any> = {
    'game_cover.png': require('../assets/images/game_cover.png'),
    'intro_scene.png': require('../assets/images/intro_scene.png'),
    'btn_filo.png': require('../assets/images/btn_filo.png'),
    'btn_mavis.png': require('../assets/images/btn_mavis.png'),
    'scene_a_river.png': require('../assets/images/scene_a_river.png'),
    'scene_b_thinking.png': require('../assets/images/scene_b_thinking.png'),
    'end_a1_scene.png': require('../assets/images/end_a1_scene.png'),
    'end_a1_badge.png': require('../assets/images/end_a1_badge.png'),
    'end_a2_scene.png': require('../assets/images/end_a2_scene.png'),
    'end_a2_badge.png': require('../assets/images/end_a2_badge.png'),
    'end_b1_scene.png': require('../assets/images/end_b1_scene.png'),
    'end_b1_badge.png': require('../assets/images/end_b1_badge.png'),
    'end_b2_scene.png': require('../assets/images/end_b2_scene.png'),
    'end_b2_badge.png': require('../assets/images/end_b2_badge.png'),
};

// --- SES DOSYALARI ---
const SOUNDS: Record<string, any> = {
    'intro': require('../assets/sounds/audio_intro.mp3'),
    'scene_a': require('../assets/sounds/audio_scene_a.mp3'),
    'scene_b': require('../assets/sounds/audio_scene_b.mp3'),
    'end_a1': require('../assets/sounds/audio_end_a1.mp3'),
    'end_a2': require('../assets/sounds/audio_end_a2.mp3'),
    'end_b1': require('../assets/sounds/audio_end_b1.mp3'),
    'end_b2': require('../assets/sounds/audio_end_b2.mp3'),
};

// --- HİKAYE VERİSİ ---
const storyNodes: Record<StoryNodeId, StoryNode> = {
    intro: {
        image: 'intro_scene.png',
        options: [
            { id: 'A', imageBtn: 'btn_filo.png', nextNode: 'scene_a' },
            { id: 'B', imageBtn: 'btn_mavis.png', nextNode: 'scene_b' }
        ]
    },
    scene_a: {
        image: 'scene_a_river.png',
        options: [
            // Metin yerine görsel kullanıyoruz: Sonuç sahnelerinin görselleri ipucu olarak
            { id: 'A1', imageBtn: 'end_a1_scene.png', nextNode: 'end_a1' }, // Köprü
            { id: 'A2', imageBtn: 'end_a2_scene.png', nextNode: 'end_a2' }  // Sırt
        ]
    },
    scene_b: {
        image: 'scene_b_thinking.png',
        options: [
            { id: 'B1', imageBtn: 'end_b1_scene.png', nextNode: 'end_b1' }, // Kuşlar
            { id: 'B2', imageBtn: 'end_b2_scene.png', nextNode: 'end_b2' }  // Yaprak
        ]
    },
    end_a1: {
        image: 'end_a1_scene.png',
        badge: 'end_a1_badge.png',
        isFinal: true,
        pathTag: 'Fiziksel-Cozum-Kopru'
    },
    end_a2: {
        image: 'end_a2_scene.png',
        badge: 'end_a2_badge.png',
        isFinal: true,
        pathTag: 'Fiziksel-Cozum-Destek'
    },
    end_b1: {
        image: 'end_b1_scene.png',
        badge: 'end_b1_badge.png',
        isFinal: true,
        pathTag: 'Sosyal-Cozum-Isbirligi'
    },
    end_b2: {
        image: 'end_b2_scene.png',
        badge: 'end_b2_badge.png',
        isFinal: true,
        pathTag: 'Bilissel-Cozum-Yaraticilik'
    }
};

// --- COMPONENT ---

interface CevizMaceraProps {
    onExit: () => void;
    userId?: string;
    userEmail?: string;
}

export default function CevizMacera({ onExit, userId, userEmail }: CevizMaceraProps) {
    const [currentNodeId, setCurrentNodeId] = useState<StoryNodeId>('intro');
    const [startTime] = useState<number>(Date.now());
    const [isLogging, setIsLogging] = useState(false);

    // Global ses kontrolü
    const { isMuted, toggleMute } = useSound();

    // Yerel ses referansı (Hikaye anlatımı için)
    const soundRef = useRef<Audio.Sound | null>(null);

    // Animasyon Değerleri
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const badgeScaleAnim = useRef(new Animated.Value(0)).current;
    const badgeGlowAnim = useRef(new Animated.Value(1)).current;

    const currentNode = storyNodes[currentNodeId];
    const { width } = Dimensions.get('window');
    const isWeb = Platform.OS === 'web';

    // Mute durumu değiştiğinde sesi yönet
    useEffect(() => {
        if (soundRef.current) {
            if (isMuted) {
                soundRef.current.pauseAsync();
            } else {
                soundRef.current.playAsync();
            }
        }
    }, [isMuted]);

    // Sahne Değişimi Efektleri
    useEffect(() => {
        // 1. Sahne Geçiş Animasyonu
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        // 2. Ses Çalma
        playSceneAudio(currentNodeId);

        // 3. Final Ekranı Animasyonları ve Loglama
        if (currentNode.isFinal) {
            // Badge Animasyonu
            badgeScaleAnim.setValue(0);
            Animated.spring(badgeScaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
                delay: 500
            }).start();

            // Badge Glow
            Animated.loop(
                Animated.sequence([
                    Animated.timing(badgeGlowAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
                    Animated.timing(badgeGlowAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
                ])
            ).start();

            // Loglama
            if (!isLogging) {
                logGameResult(currentNode.pathTag || 'Unknown');
            }
        }
    }, [currentNodeId]);

    // Component Unmount Temizliği
    useEffect(() => {
        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    const playSceneAudio = async (nodeId: string) => {
        try {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }

            const soundSource = SOUNDS[nodeId];
            if (soundSource) {
                const { sound } = await Audio.Sound.createAsync(soundSource);
                soundRef.current = sound;

                if (!isMuted) {
                    await sound.playAsync();
                }
            }
        } catch (error) {
            console.log("Ses çalma hatası:", error);
        }
    };

    const handleOptionClick = (option: Option) => {
        setCurrentNodeId(option.nextNode);
    };

    const handleReset = () => {
        setCurrentNodeId('intro');
        setIsLogging(false);
    };

    const logGameResult = async (pathTag: string) => {
        setIsLogging(true);
        const endTime = Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);

        const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

        if (!SUPABASE_URL || !SUPABASE_KEY) return;

        try {
            // Admin panelinde görünmesi için 'oyun_skorlari' tablosunu kullanıyoruz
            const logData = {
                ogrenci_adi: userId || 'Misafir',
                ogrenci_yasi: 0, // Varsayılan
                oyun_turu: 'ceviz_macera', // Admin panelinde bu isimle görünecek
                hamle_sayisi: 1, // Sembolik
                hata_sayisi: 0, // İstenen kural
                sure: durationSeconds,
                yapay_zeka_yorumu: pathTag, // Yol bilgisini buraya kaydediyoruz ki admin panelinde görünsün
                email: userEmail
            };

            console.log("📤 Supabase Log (oyun_skorlari):", logData);

            await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(logData)
            });
        } catch (error) {
            console.error("Log hatası:", error);
        }
    };

    return (
        <DynamicBackground onExit={onExit}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

                    {/* HEADER */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>CEVİZ MACERASI</Text>
                        <TouchableOpacity onPress={toggleMute} style={styles.soundButton}>
                            <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={32} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* SAHNE KARTI */}
                    <View style={styles.card}>

                        {/* GÖRSEL ALANI */}
                        <View style={styles.imageContainer}>
                            <Image
                                source={ASSETS[currentNode.image]}
                                style={styles.mainImage}
                                resizeMode="cover"
                            />

                            {/* FINAL BADGE */}
                            {currentNode.isFinal && currentNode.badge && (
                                <Animated.View style={[
                                    styles.badgeWrapper,
                                    {
                                        transform: [
                                            { scale: badgeScaleAnim },
                                            { scale: badgeGlowAnim }
                                        ]
                                    }
                                ]}>
                                    <Image
                                        source={ASSETS[currentNode.badge]}
                                        style={styles.badgeImage}
                                        resizeMode="contain"
                                    />
                                </Animated.View>
                            )}
                        </View>

                        {/* SEÇENEKLER (GÖRSEL BUTONLAR) */}
                        <View style={styles.optionsContainer}>
                            {currentNode.isFinal ? (
                                <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                                    <Text style={styles.resetButtonText}>TEKRAR OYNA</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.choicesRow}>
                                    {currentNode.options?.map((opt) => (
                                        <TouchableOpacity
                                            key={opt.id}
                                            style={styles.imageOptionButton}
                                            onPress={() => handleOptionClick(opt)}
                                            activeOpacity={0.8}
                                        >
                                            <Image
                                                source={ASSETS[opt.imageBtn]}
                                                style={styles.optionImage}
                                                resizeMode="cover"
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                    </View>
                </Animated.View>
            </ScrollView>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        paddingVertical: 20,
        paddingHorizontal: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    container: {
        width: '100%',
        maxWidth: 800, // Web için genişletildi
        alignItems: 'center',
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#5D4037',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#8D6E63',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 5,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 28,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    soundButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 10,
        borderRadius: 50,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 30,
        padding: 20,
        width: '100%',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
        borderWidth: 4,
        borderColor: '#EFEBE9',
    },
    imageContainer: {
        width: '100%',
        height: Platform.OS === 'web' ? 400 : 300, // Web'de daha büyük
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 30,
        backgroundColor: '#F5F5F5',
        borderWidth: 2,
        borderColor: '#D7CCC8',
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainImage: {
        width: '100%',
        height: '100%',
    },
    badgeWrapper: {
        position: 'absolute',
        zIndex: 10,
        shadowColor: "#FFD700",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 15,
    },
    badgeImage: {
        width: 250, // Rozet büyütüldü
        height: 250,
    },
    optionsContainer: {
        width: '100%',
        alignItems: 'center',
    },
    choicesRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 30, // Seçenekler arası boşluk arttırıldı
        flexWrap: 'wrap',
    },
    imageOptionButton: {
        width: Platform.OS === 'web' ? 250 : 160, // Butonlar büyütüldü
        height: Platform.OS === 'web' ? 250 : 160,
        borderRadius: 25,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        borderWidth: 4,
        borderColor: '#FFB300', // Altın çerçeve
        backgroundColor: '#FFF8E1',
    },
    optionImage: {
        width: '100%',
        height: '100%',
    },
    resetButton: {
        backgroundColor: '#FF5722',
        paddingVertical: 20,
        paddingHorizontal: 40,
        borderRadius: 30,
        alignItems: 'center',
        borderBottomWidth: 6,
        borderBottomColor: '#BF360C',
        elevation: 5,
    },
    resetButtonText: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
    }
});
