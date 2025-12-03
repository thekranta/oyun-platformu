import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import DynamicBackground from './DynamicBackground';
import { useSound } from './SoundContext';

// --- TİPLER ---
type StoryNodeId = 'intro' | 'scene_a' | 'scene_b' | 'end_a1' | 'end_a2' | 'end_b1' | 'end_b2';

interface Option {
    id: string;
    imageBtn: string;
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
            { id: 'A1', imageBtn: 'end_a1_scene.png', nextNode: 'end_a1' },
            { id: 'A2', imageBtn: 'end_a2_scene.png', nextNode: 'end_a2' }
        ]
    },
    scene_b: {
        image: 'scene_b_thinking.png',
        options: [
            { id: 'B1', imageBtn: 'end_b1_scene.png', nextNode: 'end_b1' },
            { id: 'B2', imageBtn: 'end_b2_scene.png', nextNode: 'end_b2' }
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

    // Ses Kontrolleri
    const { stopSound } = useSound(); // Global sesi durdurmak için
    const [storyVolume, setStoryVolume] = useState(1.0);
    const soundRef = useRef<Audio.Sound | null>(null);

    // Animasyon Değerleri
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Konfeti
    const confettiRef = useRef<ConfettiCannon>(null);

    const currentNode = storyNodes[currentNodeId];
    const isWeb = Platform.OS === 'web';

    // 1. Başlangıçta Arka Plan Müziğini Durdur
    useEffect(() => {
        stopSound('background');

        return () => {
            // Çıkışta temizlik
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    // 2. Ses Seviyesi Değişince Uygula
    useEffect(() => {
        if (soundRef.current) {
            soundRef.current.setVolumeAsync(storyVolume);
        }
    }, [storyVolume]);

    // 3. Sahne Değişimi Mantığı
    useEffect(() => {
        // Animasyon
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        // Ses Çalma
        playSceneAudio(currentNodeId);

        // Final İşlemleri
        if (currentNode.isFinal) {
            if (confettiRef.current) {
                confettiRef.current.start();
            }
            if (!isLogging) {
                logGameResult(currentNode.pathTag || 'Unknown');
            }
        }
    }, [currentNodeId]);

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
                await sound.setVolumeAsync(storyVolume);
                await sound.playAsync();
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
            const logData = {
                ogrenci_adi: userId || 'Misafir',
                ogrenci_yasi: 0,
                oyun_turu: 'ceviz_macera',
                hamle_sayisi: 1,
                hata_sayisi: 0,
                sure: durationSeconds,
                yapay_zeka_yorumu: pathTag,
                email: userEmail
            };

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

                    {/* HEADER & SES KONTROLÜ */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>CEVİZ MACERASI</Text>

                        <View style={styles.volumeControl}>
                            <Ionicons name="volume-low" size={24} color="white" />
                            <Slider
                                style={{ width: 120, height: 40 }}
                                minimumValue={0}
                                maximumValue={1}
                                value={storyVolume}
                                onValueChange={setStoryVolume}
                                minimumTrackTintColor="#FFFFFF"
                                maximumTrackTintColor="#000000"
                                thumbTintColor="#FFFFFF"
                            />
                            <Ionicons name="volume-high" size={24} color="white" />
                        </View>
                    </View>

                    {/* SAHNE KARTI */}
                    <View style={styles.card}>

                        {/* GÖRSEL ALANI */}
                        <View style={[
                            styles.imageContainer,
                            currentNode.isFinal && styles.finalImageContainer // Finalde daha büyük
                        ]}>
                            <Image
                                source={ASSETS[currentNode.image]}
                                style={styles.mainImage}
                                resizeMode="contain" // Kırpılmayı önlemek için contain
                            />

                            {/* FINAL BADGE (Animasyonsuz, sabit ve net) */}
                            {currentNode.isFinal && currentNode.badge && (
                                <View style={styles.badgeWrapper}>
                                    <Image
                                        source={ASSETS[currentNode.badge]}
                                        style={styles.badgeImage}
                                        resizeMode="contain"
                                    />
                                </View>
                            )}
                        </View>

                        {/* SEÇENEKLER */}
                        <View style={styles.optionsContainer}>
                            {currentNode.isFinal ? (
                                <View style={{ width: '100%', alignItems: 'center' }}>
                                    <ConfettiCannon
                                        count={200}
                                        origin={{ x: -10, y: 0 }}
                                        autoStart={true}
                                        ref={confettiRef}
                                        fadeOut={true}
                                    />
                                    <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                                        <Text style={styles.resetButtonText}>TEKRAR OYNA</Text>
                                    </TouchableOpacity>
                                </View>
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
                                                resizeMode="contain" // Görselin tamamı görünsün
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
        maxWidth: 900,
        alignItems: 'center',
    },
    header: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#5D4037',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#8D6E63',
        elevation: 5,
        flexWrap: 'wrap',
        gap: 10
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    volumeControl: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 25,
        paddingHorizontal: 10,
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
        height: Platform.OS === 'web' ? 400 : 300,
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
    finalImageContainer: {
        height: Platform.OS === 'web' ? 550 : 400, // Finalde daha büyük alan
    },
    mainImage: {
        width: '100%',
        height: '100%',
    },
    badgeWrapper: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 10,
        shadowColor: "#FFD700",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 15,
    },
    badgeImage: {
        width: 150,
        height: 150,
    },
    optionsContainer: {
        width: '100%',
        alignItems: 'center',
    },
    choicesRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        flexWrap: 'wrap',
    },
    imageOptionButton: {
        width: Platform.OS === 'web' ? 300 : 160, // Genişlik arttırıldı
        height: Platform.OS === 'web' ? 200 : 120, // Yükseklik ayarlandı (Dikdörtgen)
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        borderWidth: 3,
        borderColor: '#FFB300',
        backgroundColor: '#FFF',
    },
    optionImage: {
        width: '100%',
        height: '100%',
    },
    resetButton: {
        backgroundColor: '#FF5722',
        paddingVertical: 15,
        paddingHorizontal: 40,
        borderRadius: 30,
        alignItems: 'center',
        borderBottomWidth: 5,
        borderBottomColor: '#BF360C',
        elevation: 5,
        marginTop: 20
    },
    resetButtonText: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: 'bold',
    }
});
