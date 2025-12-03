import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DynamicBackground from './DynamicBackground';

// --- TİPLER ---
type StoryNodeId = 'intro' | 'scene_a' | 'scene_b' | 'end_a1' | 'end_a2' | 'end_b1' | 'end_b2';

interface Option {
    id: string;
    imageBtn?: string; // Görsel buton ismi (btn_filo.png gibi)
    textBtn?: string;  // Metin buton yazısı
    nextNode: StoryNodeId;
    label?: string; // Görsel buton altındaki yazı
}

interface StoryNode {
    image: string;
    text: string;
    options?: Option[];
    badge?: string;
    isFinal?: boolean;
    pathTag?: string;
}

// --- GÖRSEL VARLIKLARI (ASSETS) ---
// Kullanıcının belirttiği dosya isimlerine göre eşleştirme.
// Not: Dosyaların assets/images/ klasöründe olduğu varsayılmıştır.
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

// --- SES DOSYALARI (Placeholder) ---
// Kullanıcı bu sefer seslerden bahsetmedi ama önceki istekte vardı.
// Kodun hata vermemesi için ve "önceki versiyonda eksikler oldu" dediği için
// ses mantığını koruyoruz ama strict node yapısına entegre ediyoruz.
const SOUNDS: Record<string, any> = {
    'intro': require('../assets/sounds/audio_intro.mp3'),
    'scene_a': require('../assets/sounds/audio_scene_a.mp3'),
    'scene_b': require('../assets/sounds/audio_scene_b.mp3'),
    'end_a1': require('../assets/sounds/audio_end_a1.mp3'),
    'end_a2': require('../assets/sounds/audio_end_a2.mp3'),
    'end_b1': require('../assets/sounds/audio_end_b1.mp3'),
    'end_b2': require('../assets/sounds/audio_end_b2.mp3'),
};

// --- HİKAYE VERİSİ (STORY NODES) ---
const storyNodes: Record<StoryNodeId, StoryNode> = {
    intro: {
        image: 'intro_scene.png',
        text: "Pıtır o gün çok şanslıydı! Ormanın derinliklerinde kış uykusu için kocaman bir ceviz çuvalı bulmuştu. Ama çuval o kadar ağırdı ki kıpırdatamadı. Üstelik yağmur başladı! Pıtır'ın yardıma ihtiyacı var. Sence kimden yardım istesin?",
        options: [
            { id: 'A', imageBtn: 'btn_filo.png', nextNode: 'scene_a', label: 'Güçlü Fil Filo' },
            { id: 'B', imageBtn: 'btn_mavis.png', nextNode: 'scene_b', label: 'Akıllı Kuş Maviş' }
        ]
    },
    scene_a: {
        image: 'scene_a_river.png',
        text: "Filo hortumuyla çuvalı kaldırdı ama önlerine şırıl şırıl akan kocaman bir dere çıktı! Köprü yıkılmıştı. Filo durdu ve düşündü. Sence derenin karşısına nasıl geçmeliler?",
        options: [
            { id: 'A1', textBtn: 'Kütükten Köprü Yap', nextNode: 'end_a1' },
            { id: 'A2', textBtn: 'Filo\'nun Sırtına Bin', nextNode: 'end_a2' }
        ]
    },
    scene_b: {
        image: 'scene_b_thinking.png',
        text: "Maviş, 'Ben o çuvalı kaldıramam Pıtır, ben çok küçüğüm. Ama harika bir fikrim var!' dedi. Sence Maviş nasıl bir çözüm buldu?",
        options: [
            { id: 'B1', textBtn: 'Kuş Arkadaşları Çağır', nextNode: 'end_b1' },
            { id: 'B2', textBtn: 'Yaprak Kızak Yap', nextNode: 'end_b2' }
        ]
    },
    end_a1: {
        image: 'end_a1_scene.png',
        badge: 'end_a1_badge.png',
        text: "Filo hemen oradaki devrilmiş kütüğü uzattı ve harika bir köprü oldu! Pıtır, 'Teşekkür ederim Filo' dedi. Anlamıştı ki; işler ne kadar zor olursa olsun, arkadaşlar el ele verince her şey kolaylaşır.",
        isFinal: true,
        pathTag: 'Fiziksel-Cozum-Kopru'
    },
    end_a2: {
        image: 'end_a2_scene.png',
        badge: 'end_a2_badge.png',
        text: "Filo, 'Atla sırtıma!' dedi. Pıtır, ceviz çuvalıyla birlikte Filo’nun sırtında sudan geçti ve hiç ıslanmadı! Anlamıştı ki; işler ne kadar zor olursa olsun, arkadaşlar el ele verince her şey kolaylaşır.",
        isFinal: true,
        pathTag: 'Fiziksel-Cozum-Destek'
    },
    end_b1: {
        image: 'end_b1_scene.png',
        badge: 'end_b1_badge.png',
        text: "Maviş bir ıslık çaldı, gökyüzü kuşlarla doldu! Her kuş bir ceviz taşıdı ve çuval saniyeler içinde bitti. Anlamıştı ki; işler ne kadar zor olursa olsun, arkadaşlar el ele verince her şey kolaylaşır.",
        isFinal: true,
        pathTag: 'Sosyal-Cozum-Isbirligi'
    },
    end_b2: {
        image: 'end_b2_scene.png',
        badge: 'end_b2_badge.png',
        text: "Cevizleri büyük yaprakların üzerine koyup kızak gibi kaydırdılar. Hem yorulmadılar hem çok eğlendiler! Anlamıştı ki; işler ne kadar zor olursa olsun, arkadaşlar el ele verince her şey kolaylaşır.",
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
    const [isLogging, setIsLogging] = useState(false);
    const soundRef = useRef<Audio.Sound | null>(null);

    // Animasyon Değerleri
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const badgeScaleAnim = useRef(new Animated.Value(0)).current;
    const badgeGlowAnim = useRef(new Animated.Value(1)).current;

    const currentNode = storyNodes[currentNodeId];
    const { width } = Dimensions.get('window');

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
            // Badge Animasyonu (Zoom In)
            badgeScaleAnim.setValue(0);
            Animated.spring(badgeScaleAnim, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: true,
                delay: 500
            }).start();

            // Badge Glow (Nefes Alma Efekti)
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
                await sound.playAsync();
            }
        } catch (error) {
            console.log("Ses çalma hatası (dosya eksik olabilir):", error);
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
        const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

        if (!SUPABASE_URL || !SUPABASE_KEY) return;

        try {
            const logData = {
                ogrenci_adi: userId || 'Misafir',
                game_name: 'ceviz_macera',

                // İSTENEN FORMAT:
                error_count: 0,
                score: 100,
                custom_data: pathTag, // 'Fiziksel-Cozum-Kopru' vb.

                completed_at: new Date().toISOString(),
                email: userEmail
            };

            console.log("📤 Supabase Log:", logData);

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

    return (
        <DynamicBackground onExit={onExit}>
            <ScrollView contentContainerStyle={styles.scrollContainer}>
                <Animated.View style={[styles.container, { opacity: fadeAnim }]}>

                    {/* BAŞLIK */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>CEVİZ MACERASI</Text>
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

                            {/* FINAL BADGE (Overlay) */}
                            {currentNode.isFinal && currentNode.badge && (
                                <Animated.View style={[
                                    styles.badgeWrapper,
                                    {
                                        transform: [
                                            { scale: badgeScaleAnim },
                                            { scale: badgeGlowAnim } // Glow efekti için scale manipülasyonu
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

                        {/* METİN ALANI */}
                        <Text style={styles.storyText}>
                            {currentNode.text}
                        </Text>

                        {/* BUTONLAR */}
                        <View style={styles.optionsContainer}>
                            {currentNode.isFinal ? (
                                <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                                    <Text style={styles.resetButtonText}>TEKRAR OYNA</Text>
                                </TouchableOpacity>
                            ) : (
                                currentNode.options?.map((opt) => (
                                    <TouchableOpacity
                                        key={opt.id}
                                        style={[
                                            styles.optionButton,
                                            opt.imageBtn ? styles.imageOptionButton : styles.textOptionButton
                                        ]}
                                        onPress={() => handleOptionClick(opt)}
                                        activeOpacity={0.8}
                                    >
                                        {opt.imageBtn ? (
                                            // RESİMLİ BUTON (Intro için)
                                            <View style={styles.imageBtnContent}>
                                                <Image
                                                    source={ASSETS[opt.imageBtn]}
                                                    style={styles.btnImage}
                                                    resizeMode="contain"
                                                />
                                                {opt.label && <Text style={styles.imageBtnLabel}>{opt.label}</Text>}
                                            </View>
                                        ) : (
                                            // METİN BUTON (Ara sahneler için)
                                            <Text style={styles.textBtnLabel}>{opt.textBtn}</Text>
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
    scrollContainer: {
        flexGrow: 1,
        paddingVertical: 20,
        paddingHorizontal: 15,
        alignItems: 'center',
    },
    container: {
        width: '100%',
        maxWidth: 600,
        alignItems: 'center',
    },
    header: {
        backgroundColor: '#5D4037',
        paddingVertical: 10,
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
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 1,
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
        height: 300,
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
        zIndex: 10,
        shadowColor: "#FFD700",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 15,
    },
    badgeImage: {
        width: 180,
        height: 180,
    },
    storyText: {
        fontSize: 20,
        color: '#3E2723',
        textAlign: 'center',
        lineHeight: 30,
        marginBottom: 30,
        fontWeight: '600',
        paddingHorizontal: 5,
    },
    optionsContainer: {
        width: '100%',
        gap: 15,
    },
    optionButton: {
        borderRadius: 20,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    imageOptionButton: {
        backgroundColor: '#FFF8E1',
        borderWidth: 2,
        borderColor: '#FFB300',
        padding: 15,
    },
    textOptionButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderBottomWidth: 5,
        borderBottomColor: '#2E7D32',
    },
    imageBtnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 15,
    },
    btnImage: {
        width: 70,
        height: 70,
    },
    imageBtnLabel: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#5D4037',
        flex: 1,
    },
    textBtnLabel: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
    },
    resetButton: {
        backgroundColor: '#FF5722',
        paddingVertical: 15,
        borderRadius: 25,
        width: '100%',
        alignItems: 'center',
        borderBottomWidth: 5,
        borderBottomColor: '#BF360C',
    },
    resetButtonText: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: 'bold',
    }
});
