import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DynamicBackground from './DynamicBackground';
import { useSound } from './SoundContext';

// STORY DATA - KEsin Yapı
const storyData = {
    intro: {
        id: 'intro',
        bgImage: require('../assets/images/intro_scene.png'),
        text: "Pıtır o gün çok şanslıydı! Kış uykusu için kocaman bir ceviz çuvalı bulmuştu ama kaldıramıyordu. Üstelik yağmur başladı! Sence kimden yardım istesin?",
        audio: require('../assets/sounds/audio_intro.mp3'),
        options: [
            {
                id: 'A',
                type: 'image_button',
                image: require('../assets/images/btn_filo.png'),
                label: 'Güçlü Fil Filo',
                next: 'scene_a'
            },
            {
                id: 'B',
                type: 'image_button',
                image: require('../assets/images/btn_mavis.png'),
                label: 'Akıllı Kuş Maviş',
                next: 'scene_b'
            }
        ]
    },
    scene_a: {
        id: 'scene_a',
        bgImage: require('../assets/images/scene_a_river.png'),
        text: "Filo çuvalı kaldırdı ama dere kenarındaki köprü yıkılmış! Karşıya nasıl geçsinler?",
        audio: require('../assets/sounds/audio_scene_a.mp3'),
        options: [
            {
                id: 'A1',
                type: 'image_button',
                image: require('../assets/images/end_a1_badge.png'),
                label: 'Kütükten Köprü Yap',
                next: 'end_a1'
            },
            {
                id: 'A2',
                type: 'image_button',
                image: require('../assets/images/end_a2_badge.png'),
                label: 'Filo\'nun Sırtına Bin',
                next: 'end_a2'
            }
        ]
    },
    scene_b: {
        id: 'scene_b',
        bgImage: require('../assets/images/scene_b_thinking.png'),
        text: "Maviş çuvalı kaldıramaz ama harika bir fikri var! Sence ne yapsınlar?",
        audio: require('../assets/sounds/audio_scene_b.mp3'),
        options: [
            {
                id: 'B1',
                type: 'image_button',
                image: require('../assets/images/end_b1_badge.png'),
                label: 'Kuş Arkadaşları Çağır',
                next: 'end_b1'
            },
            {
                id: 'B2',
                type: 'image_button',
                image: require('../assets/images/end_b2_badge.png'),
                label: 'Yaprak Kızak Yap',
                next: 'end_b2'
            }
        ]
    },
    end_a1: {
        id: 'end_a1',
        isFinal: true,
        bgImage: require('../assets/images/end_a1_scene.png'),
        badgeImage: require('../assets/images/end_a1_badge.png'),
        text: "Filo hortumuyla kütükten köprü yaptı! Pıtır güvenle geçti.",
        analysisTag: 'Fiziksel-Cozum-Kopru'
    },
    end_a2: {
        id: 'end_a2',
        isFinal: true,
        bgImage: require('../assets/images/end_a2_scene.png'),
        badgeImage: require('../assets/images/end_a2_badge.png'),
        text: "Pıtır, Filo'nun sırtında sudan geçti. Hiç ıslanmadı!",
        analysisTag: 'Fiziksel-Cozum-Destek'
    },
    end_b1: {
        id: 'end_b1',
        isFinal: true,
        bgImage: require('../assets/images/end_b1_scene.png'),
        badgeImage: require('../assets/images/end_b1_badge.png'),
        text: "Yüzlerce kuş geldi ve her biri bir ceviz taşıdı!",
        analysisTag: 'Sosyal-Cozum-Isbirligi'
    },
    end_b2: {
        id: 'end_b2',
        isFinal: true,
        bgImage: require('../assets/images/end_b2_scene.png'),
        badgeImage: require('../assets/images/end_b2_badge.png'),
        text: "Cevizleri yaprakların üzerine koyup kızak gibi kaydırdılar!",
        analysisTag: 'Bilissel-Cozum-Yaraticilik'
    }
};

interface CevizMaceraProps {
    onExit: () => void;
    userId?: string;
    userEmail?: string;
    userAge?: number;
}

export default function CevizMacera({ onExit, userId, userEmail, userAge }: CevizMaceraProps) {
    const [currentNodeId, setCurrentNodeId] = useState<string>('intro');
    const [startTime] = useState<number>(Date.now());
    const [isLogging, setIsLogging] = useState(false);

    const { stopSound } = useSound();
    const [storyVolume, setStoryVolume] = useState(1.0);
    const soundRef = useRef<Audio.Sound | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const badgeBounce = useRef(new Animated.Value(0)).current;

    const currentNode = storyData[currentNodeId as keyof typeof storyData];

    useEffect(() => {
        stopSound('background');
        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    useEffect(() => {
        if (soundRef.current) {
            soundRef.current.setVolumeAsync(storyVolume);
        }
    }, [storyVolume]);

    useEffect(() => {
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
        }).start();

        playSceneAudio();

        if (currentNode.isFinal) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(badgeBounce, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(badgeBounce, {
                        toValue: 0,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            if (!isLogging) {
                logGameResult(currentNode.analysisTag || 'Unknown');
            }
        }
    }, [currentNodeId]);

    const playSceneAudio = async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }

            if (currentNode.audio) {
                const { sound } = await Audio.Sound.createAsync(currentNode.audio);
                soundRef.current = sound;
                await sound.setVolumeAsync(storyVolume);
                await sound.playAsync();
            }
        } catch (error) {
            console.log("Ses çalma hatası:", error);
        }
    };

    const handleOptionClick = (nextNodeId: string) => {
        setCurrentNodeId(nextNodeId);
    };

    const handleReset = () => {
        setCurrentNodeId('intro');
        setIsLogging(false);
    };

    const logGameResult = async (analysisTag: string) => {
        setIsLogging(true);
        const endTime = Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);

        const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

        if (!SUPABASE_URL || !SUPABASE_KEY) return;

        try {
            const logData = {
                ogrenci_adi: userId || 'Misafir',
                ogrenci_yasi: userAge || 0,
                oyun_turu: 'ceviz_macera',
                hamle_sayisi: 1,
                hata_sayisi: 0,
                sure: durationSeconds,
                yapay_zeka_yorumu: analysisTag,
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

    const badgeScale = badgeBounce.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.15]
    });

    return (
        <DynamicBackground onExit={onExit}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>CEVIZ MACERASI</Text>

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

                    <View style={styles.card}>

                        <View style={styles.imageContainer}>
                            <Image
                                source={currentNode.bgImage}
                                style={styles.mainImage}
                                resizeMode="contain"
                            />

                            {currentNode.isFinal && currentNode.badgeImage && (
                                <Animated.View style={[styles.badgeWrapper, { transform: [{ scale: badgeScale }] }]}>
                                    <Image
                                        source={currentNode.badgeImage}
                                        style={styles.badgeImage}
                                        resizeMode="contain"
                                    />
                                </Animated.View>
                            )}
                        </View>

                        <Text style={styles.storyText}>{currentNode.text}</Text>

                        <View style={styles.optionsContainer}>
                            {currentNode.isFinal ? (
                                <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                                    <Text style={styles.resetButtonText}>TEKRAR OYNA</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.choicesRow}>
                                    {currentNode.options?.map((opt) => {
                                        if (opt.type === 'image_button') {
                                            return (
                                                <TouchableOpacity
                                                    key={opt.id}
                                                    style={styles.imageOptionButton}
                                                    onPress={() => handleOptionClick(opt.next)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Image
                                                        source={opt.image}
                                                        style={styles.optionImage}
                                                        resizeMode="contain"
                                                    />
                                                </TouchableOpacity>
                                            );
                                        } else {
                                            return (
                                                <TouchableOpacity
                                                    key={opt.id}
                                                    style={styles.textOptionButton}
                                                    onPress={() => handleOptionClick(opt.next)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.textOptionLabel}>{opt.label}</Text>
                                                </TouchableOpacity>
                                            );
                                        }
                                    })}
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
        height: Platform.OS === 'web' ? 450 : 350,
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
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
        width: 120,
        height: 120,
    },
    storyText: {
        fontSize: 18,
        lineHeight: 26,
        color: '#333',
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 10,
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
        width: Platform.OS === 'web' ? 280 : 150,
        height: Platform.OS === 'web' ? 180 : 100,
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
    textOptionButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 15,
        borderBottomWidth: 4,
        borderBottomColor: '#2E7D32',
        elevation: 5,
        minWidth: 200,
    },
    textOptionLabel: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
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
