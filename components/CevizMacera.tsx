import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Audio, AVPlaybackStatus } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
                next: 'choice_a1'
            },
            {
                id: 'A2',
                type: 'image_button',
                image: require('../assets/images/end_a2_badge.png'),
                label: 'Filo\'nun Sırtına Bin',
                next: 'choice_a2'
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
                next: 'choice_b1'
            },
            {
                id: 'B2',
                type: 'image_button',
                image: require('../assets/images/end_b2_badge.png'),
                label: 'Yaprak Kızak Yap',
                next: 'choice_b2'
            }
        ]
    },
    choice_a1: {
        id: 'choice_a1',
        bgImage: require('../assets/images/end_a1_scene.png'),
        text: "Kütükten köprü yapmaya karar verdiler! Peki köprüyü nasıl inşa etsinler?",
        options: [
            {
                id: 'A1_1',
                type: 'image_button',
                image: require('../assets/images/btn_filo.png'),
                label: 'Filo Hortumu İle',
                next: 'end_a1'
            },
            {
                id: 'A1_2',
                type: 'image_button',
                image: require('../assets/images/btn_mavis.png'),
                label: 'İkisi Birlikte',
                next: 'end_a1'
            }
        ]
    },
    choice_a2: {
        id: 'choice_a2',
        bgImage: require('../assets/images/end_a2_scene.png'),
        text: "Filo'nun sırtına binmeye karar verdiler! Peki nasıl binsin Pıtır?",
        options: [
            {
                id: 'A2_1',
                type: 'image_button',
                image: require('../assets/images/btn_filo.png'),
                label: 'Filo Yardım Etsin',
                next: 'end_a2'
            },
            {
                id: 'A2_2',
                type: 'image_button',
                image: require('../assets/images/btn_mavis.png'),
                label: 'Maviş Taşısın',
                next: 'end_a2'
            }
        ]
    },
    choice_b1: {
        id: 'choice_b1',
        bgImage: require('../assets/images/end_b1_scene.png'),
        text: "Kuş arkadaşlarını çağırmaya karar verdiler! Nasıl çağırsınlar?",
        options: [
            {
                id: 'B1_1',
                type: 'image_button',
                image: require('../assets/images/btn_mavis.png'),
                label: 'Maviş Islık Çalsın',
                next: 'end_b1'
            },
            {
                id: 'B1_2',
                type: 'image_button',
                image: require('../assets/images/btn_filo.png'),
                label: 'Filo Ses Yapsın',
                next: 'end_b1'
            }
        ]
    },
    choice_b2: {
        id: 'choice_b2',
        bgImage: require('../assets/images/end_b2_scene.png'),
        text: "Yaprak kızak yapmaya karar verdiler! Hangi yaprakları kullansınlar?",
        options: [
            {
                id: 'B2_1',
                type: 'image_button',
                image: require('../assets/images/btn_mavis.png'),
                label: 'Maviş Bulsun',
                next: 'end_b2'
            },
            {
                id: 'B2_2',
                type: 'image_button',
                image: require('../assets/images/btn_filo.png'),
                label: 'İkisi Birlikte',
                next: 'end_b2'
            }
        ]
    },
    end_a1: {
        id: 'end_a1',
        isFinal: true,
        bgImage: require('../assets/images/end_a1_scene.png'),
        badgeImage: require('../assets/images/end_a1_badge.png'),
        audio: require('../assets/sounds/audio_end_a1.mp3'),
        text: "Filo hortumuyla kütükten köprü yaptı! Pıtır güvenle geçti.",
        analysisTag: 'Fiziksel-Cozum-Kopru'
    },
    end_a2: {
        id: 'end_a2',
        isFinal: true,
        bgImage: require('../assets/images/end_a2_scene.png'),
        badgeImage: require('../assets/images/end_a2_badge.png'),
        audio: require('../assets/sounds/audio_end_a2.mp3'),
        text: "Pıtır, Filo'nun sırtında sudan geçti. Hiç ıslanmadı!",
        analysisTag: 'Fiziksel-Cozum-Destek'
    },
    end_b1: {
        id: 'end_b1',
        isFinal: true,
        bgImage: require('../assets/images/end_b1_scene.png'),
        badgeImage: require('../assets/images/end_b1_badge.png'),
        audio: require('../assets/sounds/audio_end_b1.mp3'),
        text: "Yüzlerce kuş geldi ve her biri bir ceviz taşıdı!",
        analysisTag: 'Sosyal-Cozum-Isbirligi'
    },
    end_b2: {
        id: 'end_b2',
        isFinal: true,
        bgImage: require('../assets/images/end_b2_scene.png'),
        badgeImage: require('../assets/images/end_b2_badge.png'),
        audio: require('../assets/sounds/audio_end_b2.mp3'),
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
    const [viewState, setViewState] = useState<'story' | 'options'>('story');
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
        // Reset state for new node
        setViewState('story');

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
                const { sound } = await Audio.Sound.createAsync(
                    currentNode.audio,
                    { shouldPlay: true },
                    onPlaybackStatusUpdate
                );
                soundRef.current = sound;
                await sound.setVolumeAsync(storyVolume);
            } else {
                // If no audio (like in choice scenes), go directly to options
                if (!currentNode.isFinal) {
                    setViewState('options');
                }
            }
        } catch (error) {
            console.log("Ses çalma hatası:", error);
            // Fallback: if audio fails, show options anyway
            if (!currentNode.isFinal) {
                setViewState('options');
            }
        }
    };

    const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
            if (!currentNode.isFinal) {
                setViewState('options');
            }
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
            <View style={styles.mainContainer}>
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

                <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
                    {viewState === 'story' ? (
                        <View style={styles.storyView}>
                            <Image
                                source={currentNode.bgImage}
                                style={styles.storyImage}
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
                            {currentNode.isFinal && (
                                <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                                    <Ionicons name="refresh" size={40} color="#FFF" />
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <View style={styles.optionsView}>
                            {currentNode.options?.map((opt) => (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={styles.largeOptionButton}
                                    onPress={() => handleOptionClick(opt.next)}
                                    activeOpacity={0.8}
                                >
                                    <Image
                                        source={opt.image}
                                        style={styles.largeOptionImage}
                                        resizeMode="contain"
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </Animated.View>
            </View>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        paddingTop: 20,
    },
    header: {
        width: '90%',
        maxWidth: 800,
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
        zIndex: 100,
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
    contentContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    storyView: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    storyImage: {
        width: '90%',
        height: '80%',
        maxWidth: 800,
        borderRadius: 30,
    },
    badgeWrapper: {
        position: 'absolute',
        bottom: '15%',
        right: '10%',
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
    optionsView: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 50,
        width: '100%',
        height: '100%',
        paddingHorizontal: 20,
    },
    largeOptionButton: {
        width: Platform.OS === 'web' ? 350 : 160,
        height: Platform.OS === 'web' ? 350 : 160,
        borderRadius: 40,
        backgroundColor: '#FFF',
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        borderWidth: 5,
        borderColor: '#FFB300',
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    largeOptionImage: {
        width: '100%',
        height: '100%',
    },
    resetButton: {
        position: 'absolute',
        bottom: 30,
        backgroundColor: '#FF5722',
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        borderColor: '#BF360C',
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    }
});
