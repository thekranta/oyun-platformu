import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DynamicBackground from './DynamicBackground';

// --- TİPLER VE VERİ YAPISI ---

type StoryNodeId = 'intro' | 'scene_a' | 'scene_b' | 'end_a1' | 'end_a2' | 'end_b1' | 'end_b2';

interface Choice {
    id: string; // Path takibi için (A, B, A1...)
    text: string;
    imgKey?: string; // Buton görseli varsa
    next: StoryNodeId;
}

interface StoryNode {
    id: StoryNodeId;
    text: string;
    imageKey: string; // Sahne görseli
    choices?: Choice[];
    badgeKey?: string; // Ödül rozeti (Sadece finallerde)
    audioKey?: string; // Ses dosyası
}

// --- GÖRSEL VE SES YÖNETİMİ ---
const ASSETS: Record<string, any> = {
    // Sahneler
    'intro_scene': require('../assets/images/intro_scene.png'),
    'scene_a_river': require('../assets/images/scene_a_river.png'),
    'scene_b_thinking': require('../assets/images/scene_b_thinking.png'),
    'end_a1_scene': require('../assets/images/end_a1_scene.png'),
    'end_a2_scene': require('../assets/images/end_a2_scene.png'),
    'end_b1_scene': require('../assets/images/end_b1_scene.png'),
    'end_b2_scene': require('../assets/images/end_b2_scene.png'),

    // Butonlar
    'btn_filo': require('../assets/images/btn_filo.png'),
    'btn_mavis': require('../assets/images/btn_mavis.png'),

    // Rozetler
    'end_a1_badge': require('../assets/images/end_a1_badge.png'),
    'end_a2_badge': require('../assets/images/end_a2_badge.png'),
    'end_b1_badge': require('../assets/images/end_b1_badge.png'),
    'end_b2_badge': require('../assets/images/end_b2_badge.png'),

    // Sesler
    'audio_intro': require('../assets/sounds/audio_intro.mp3'),
    'audio_scene_a': require('../assets/sounds/audio_scene_a.mp3'),
    'audio_scene_b': require('../assets/sounds/audio_scene_b.mp3'),
    'audio_end_a1': require('../assets/sounds/audio_end_a1.mp3'),
    'audio_end_a2': require('../assets/sounds/audio_end_a2.mp3'),
    'audio_end_b1': require('../assets/sounds/audio_end_b1.mp3'),
    'audio_end_b2': require('../assets/sounds/audio_end_b2.mp3'),
};

const STORY_NODES: Record<StoryNodeId, StoryNode> = {
    intro: {
        id: 'intro',
        text: "Pıtır o gün çok şanslıydı! Ormanın derinliklerinde kış uykusu için kocaman bir ceviz çuvalı bulmuştu. Ama çuval o kadar ağırdı ki kıpırdatamadı. Üstelik yağmur başladı! Pıtır'ın yardıma ihtiyacı var. Sence kimden yardım istesin?",
        imageKey: 'intro_scene',
        audioKey: 'audio_intro',
        choices: [
            { id: 'A', text: "Güçlü Fil Filo", imgKey: 'btn_filo', next: 'scene_a' },
            { id: 'B', text: "Akıllı Kuş Maviş", imgKey: 'btn_mavis', next: 'scene_b' }
        ]
    },
    scene_a: {
        id: 'scene_a',
        text: "Filo hortumuyla çuvalı kaldırdı ama önlerine şırıl şırıl akan kocaman bir dere çıktı! Köprü yıkılmıştı. Filo durdu ve düşündü. Sence derenin karşısına nasıl geçmeliler?",
        imageKey: 'scene_a_river',
        audioKey: 'audio_scene_a',
        choices: [
            { id: 'A1', text: "Kütükten Köprü Yap 🪵", next: 'end_a1' },
            { id: 'A2', text: "Filo'nun Sırtına Bin 🐘", next: 'end_a2' }
        ]
    },
    scene_b: {
        id: 'scene_b',
        text: "Maviş, 'Ben o çuvalı kaldıramam Pıtır, ben çok küçüğüm. Ama harika bir fikrim var!' dedi. Sence Maviş nasıl bir çözüm buldu?",
        imageKey: 'scene_b_thinking',
        audioKey: 'audio_scene_b',
        choices: [
            { id: 'B1', text: "Kuş Arkadaşları Çağır 🕊️", next: 'end_b1' },
            { id: 'B2', text: "Yaprak Kızak Yap 🍃", next: 'end_b2' }
        ]
    },
    end_a1: {
        id: 'end_a1',
        text: "Filo hemen oradaki devrilmiş kütüğü uzattı ve harika bir köprü oldu! Pıtır, 'Teşekkür ederim Filo' dedi. Anlamıştı ki; işler ne kadar zor olursa olsun, arkadaşlar el ele verince her şey kolaylaşır.",
        imageKey: 'end_a1_scene',
        badgeKey: 'end_a1_badge',
        audioKey: 'audio_end_a1'
    },
    end_a2: {
        id: 'end_a2',
        text: "Filo, 'Atla sırtıma!' dedi. Pıtır, ceviz çuvalıyla birlikte Filo’nun sırtında sudan geçti ve hiç ıslanmadı! Anlamıştı ki; işler ne kadar zor olursa olsun, arkadaşlar el ele verince her şey kolaylaşır.",
        imageKey: 'end_a2_scene',
        badgeKey: 'end_a2_badge',
        audioKey: 'audio_end_a2'
    },
    end_b1: {
        id: 'end_b1',
        text: "Maviş bir ıslık çaldı, gökyüzü kuşlarla doldu! Her kuş bir ceviz taşıdı ve çuval saniyeler içinde bitti. Anlamıştı ki; işler ne kadar zor olursa olsun, arkadaşlar el ele verince her şey kolaylaşır.",
        imageKey: 'end_b1_scene',
        badgeKey: 'end_b1_badge',
        audioKey: 'audio_end_b1'
    },
    end_b2: {
        id: 'end_b2',
        text: "Cevizleri büyük yaprakların üzerine koyup kızak gibi kaydırdılar. Hem yorulmadılar hem çok eğlendiler! Anlamıştı ki; işler ne kadar zor olursa olsun, arkadaşlar el ele verince her şey kolaylaşır.",
        imageKey: 'end_b2_scene',
        badgeKey: 'end_b2_badge',
        audioKey: 'audio_end_b2'
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
    const [pathTaken, setPathTaken] = useState<string[]>([]);
    const [startTime] = useState<number>(Date.now());
    const [isLogging, setIsLogging] = useState(false);

    // Audio Ref
    const soundRef = useRef<Audio.Sound | null>(null);

    // Animasyonlar
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const badgeScaleAnim = useRef(new Animated.Value(0)).current;
    const badgeRotateAnim = useRef(new Animated.Value(0)).current;

    const currentNode = STORY_NODES[currentNodeId];
    const isEnding = !!currentNode.badgeKey;

    // Sahne geçişi ve Ses Yönetimi
    useEffect(() => {
        let isMounted = true;

        const playSceneAudio = async () => {
            try {
                // Önceki sesi durdur ve unload et
                if (soundRef.current) {
                    await soundRef.current.unloadAsync();
                    soundRef.current = null;
                }

                // Yeni sesi yükle ve çal
                if (currentNode.audioKey && isMounted) {
                    console.log(`🔊 Ses yükleniyor: ${currentNode.audioKey}`);
                    const { sound } = await Audio.Sound.createAsync(
                        ASSETS[currentNode.audioKey],
                        { shouldPlay: true }
                    );
                    soundRef.current = sound;
                }
            } catch (error) {
                console.error("Ses çalma hatası:", error);
            }
        };

        // Animasyonu başlat
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start();

        // Sesi çal
        playSceneAudio();

        // Bitiş ekranı animasyonları ve loglama
        if (isEnding) {
            // Rozet animasyonu
            badgeScaleAnim.setValue(0);
            badgeRotateAnim.setValue(0);

            Animated.sequence([
                Animated.delay(300),
                Animated.spring(badgeScaleAnim, {
                    toValue: 1,
                    friction: 5,
                    tension: 40,
                    useNativeDriver: true
                }),
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(badgeRotateAnim, { toValue: 1, duration: 100, useNativeDriver: true, easing: Easing.linear }),
                        Animated.timing(badgeRotateAnim, { toValue: -1, duration: 100, useNativeDriver: true, easing: Easing.linear }),
                        Animated.timing(badgeRotateAnim, { toValue: 0, duration: 100, useNativeDriver: true, easing: Easing.linear }),
                        Animated.delay(2000)
                    ])
                )
            ]).start();

            if (!isLogging) {
                logGameResult();
            }
        }

        return () => {
            isMounted = false;
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, [currentNodeId]);

    // Component unmount olduğunda sesi temizle
    useEffect(() => {
        return () => {
            if (soundRef.current) {
                soundRef.current.unloadAsync();
            }
        };
    }, []);

    const handleChoice = (choice: Choice) => {
        setPathTaken(prev => [...prev, choice.id]);
        setCurrentNodeId(choice.next);
    };

    const handleReset = () => {
        setCurrentNodeId('intro');
        setPathTaken([]);
        setIsLogging(false);
    };

    const logGameResult = async () => {
        setIsLogging(true);
        const endTime = Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);
        const pathString = pathTaken.join('-');

        const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

        if (!SUPABASE_URL || !SUPABASE_KEY) return;

        try {
            const logData = {
                ogrenci_adi: userId || 'Misafir',
                game_name: 'ceviz_macera',
                path_taken: pathString,
                completed_at: new Date().toISOString(),
                sure: durationSeconds,
                email: userEmail
            };

            console.log("📤 Oyun Logu:", logData);

            await fetch(`${SUPABASE_URL}/rest/v1/game_logs`, {
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

    // Badge rotasyon interpolasyonu
    const spin = badgeRotateAnim.interpolate({
        inputRange: [-1, 1],
        outputRange: ['-10deg', '10deg']
    });

    return (
        <DynamicBackground onExit={onExit}>
            <ScrollView contentContainerStyle={styles.container}>

                <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim }]}>

                    {/* Başlık */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>🌰 Ceviz Macerası</Text>
                    </View>

                    {/* Ana Sahne Kartı */}
                    <View style={styles.card}>

                        {/* Sahne Görseli */}
                        <View style={styles.sceneContainer}>
                            <Image
                                source={ASSETS[currentNode.imageKey]}
                                style={styles.sceneImage}
                                resizeMode="cover"
                            />

                            {/* Bitiş Rozeti (Overlay) */}
                            {isEnding && currentNode.badgeKey && (
                                <Animated.View style={[styles.badgeContainer, { transform: [{ scale: badgeScaleAnim }, { rotate: spin }] }]}>
                                    <Image
                                        source={ASSETS[currentNode.badgeKey]}
                                        style={styles.badgeImage}
                                        resizeMode="contain"
                                    />
                                    <Text style={styles.congratsText}>TEBRİKLER!</Text>
                                </Animated.View>
                            )}
                        </View>

                        {/* Hikaye Metni */}
                        <Text style={styles.storyText}>
                            {currentNode.text}
                        </Text>

                        {/* Seçenekler veya Reset */}
                        <View style={styles.choicesContainer}>
                            {isEnding ? (
                                <TouchableOpacity
                                    style={[styles.button, styles.resetButton]}
                                    onPress={handleReset}
                                >
                                    <Text style={styles.buttonText}>🔄 Tekrar Oyna</Text>
                                </TouchableOpacity>
                            ) : (
                                currentNode.choices?.map((choice, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.button,
                                            choice.imgKey ? styles.imageButton : (index === 0 ? styles.buttonOptionA : styles.buttonOptionB)
                                        ]}
                                        onPress={() => handleChoice(choice)}
                                    >
                                        {choice.imgKey ? (
                                            <View style={styles.imageButtonContent}>
                                                <Image source={ASSETS[choice.imgKey]} style={styles.btnImage} resizeMode="contain" />
                                                <Text style={styles.imageButtonText}>{choice.text}</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.buttonText}>{choice.text}</Text>
                                        )}
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </View>

                </Animated.View>

            </ScrollView>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        alignItems: 'center',
        padding: 20,
        paddingTop: 40,
    },
    contentWrapper: {
        width: '100%',
        alignItems: 'center',
    },
    header: {
        marginBottom: 15,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 25,
        paddingVertical: 12,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#8D6E63',
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#5D4037',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 30,
        padding: 20,
        width: '100%',
        maxWidth: 600,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 10,
        borderWidth: 3,
        borderColor: '#D7CCC8',
    },
    sceneContainer: {
        width: '100%',
        height: 280,
        backgroundColor: '#EFEBE9',
        borderRadius: 20,
        marginBottom: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#8D6E63',
        position: 'relative',
    },
    sceneImage: {
        width: '100%',
        height: '100%',
    },
    badgeContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 15,
        borderRadius: 100,
        width: 200,
        height: 200,
        shadowColor: "#FFD700",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 15,
    },
    badgeImage: {
        width: 120,
        height: 120,
        marginBottom: 5,
    },
    congratsText: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FF6F00',
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    storyText: {
        fontSize: 22,
        color: '#4E342E',
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 32,
        fontWeight: '600',
        paddingHorizontal: 10,
    },
    choicesContainer: {
        width: '100%',
        gap: 15,
    },
    button: {
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 3.5,
        elevation: 5,
    },
    buttonOptionA: {
        backgroundColor: '#66BB6A', // Yeşil
        borderBottomWidth: 4,
        borderBottomColor: '#388E3C',
    },
    buttonOptionB: {
        backgroundColor: '#42A5F5', // Mavi
        borderBottomWidth: 4,
        borderBottomColor: '#1976D2',
    },
    imageButton: {
        backgroundColor: '#FFF8E1',
        borderWidth: 2,
        borderColor: '#FFB300',
        paddingVertical: 10,
    },
    imageButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 15,
    },
    btnImage: {
        width: 60,
        height: 60,
    },
    imageButtonText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#5D4037',
    },
    resetButton: {
        backgroundColor: '#FF7043', // Turuncu
        borderBottomWidth: 4,
        borderBottomColor: '#D84315',
    },
    buttonText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
    }
});
