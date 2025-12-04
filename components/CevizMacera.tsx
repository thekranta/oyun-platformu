import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Audio, AVPlaybackStatus } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import DynamicBackground from './DynamicBackground';
import { useSound } from './SoundContext';

// STORY DATA - KEsin Yapı
const storyData = {
    intro: {
        id: 'intro',
        bgImage: require('../assets/images/intro_scene.png'),
        text: "Pıtır o gün çok şanslıydı! Kış uykusu için kocaman bir ceviz çuvalı bulmuştu ama kaldıramıyordu. Üstelik yağmur başladı! Sence kimden yardım istesin?",
        audio: require('../assets/sounds/audio_intro.mp3'),
        questionAudio: require('../assets/sounds/ceviz_macera/question_intro.mp3'),
        options: [
            {
                id: 'A',
                type: 'image_button',
                image: require('../assets/images/btn_filo.png'),
                label: 'Güçlü Fil Filo',
                next: 'scene_a',
                audio: null,
            },
            {
                id: 'B',
                type: 'image_button',
                image: require('../assets/images/btn_mavis.png'),
                label: 'Akıllı Kuş Maviş',
                next: 'scene_b',
                audio: null,
            },
        ],
    },
    scene_a: {
        id: 'scene_a',
        bgImage: require('../assets/images/scene_a_river.png'),
        text: "Filo çuvalı kaldırdı ama dere kenarındaki köprü yıkılmış! Karşıya nasıl geçsinler?",
        audio: require('../assets/sounds/audio_scene_a.mp3'),
        questionAudio: require('../assets/sounds/ceviz_macera/question_scene_a.mp3'),
        options: [
            {
                id: 'A1',
                type: 'image_button',
                image: require('../assets/images/end_a1_badge.png'),
                label: 'Kütükten Köprü Yap',
                next: 'end_a1',
                audio: null,
            },
            {
                id: 'A2',
                type: 'image_button',
                image: require('../assets/images/end_a2_badge.png'),
                label: "Filo'nun Sırtına Bin",
                next: 'end_a2',
                audio: null,
            },
        ],
    },
    scene_b: {
        id: 'scene_b',
        bgImage: require('../assets/images/scene_b_thinking.png'),
        text: "Maviş çuvalı kaldıramaz ama harika bir fikri var! Sence ne yapsınlar?",
        audio: require('../assets/sounds/audio_scene_b.mp3'),
        questionAudio: require('../assets/sounds/ceviz_macera/question_scene_b.mp3'),
        options: [
            {
                id: 'B1',
                type: 'image_button',
                image: require('../assets/images/end_b1_badge.png'),
                label: 'Kuş Arkadaşları Çağır',
                next: 'end_b1',
                audio: null,
            },
            {
                id: 'B2',
                type: 'image_button',
                image: require('../assets/images/end_b2_badge.png'),
                label: 'Yaprak Kızak Yap',
                next: 'end_b2',
                audio: null,
            },
        ],
    },
    end_a1: {
        id: 'end_a1',
        isFinal: true,
        bgImage: require('../assets/images/end_a1_scene.png'),
        badgeImage: require('../assets/images/end_a1_badge.png'),
        audio: require('../assets/sounds/audio_end_a1.mp3'),
        text: "Filo hortumuyla kütükten köprü yaptı! Pıtır güvenle geçti.",
        analysisTag: 'Fiziksel-Cozum-Kopru',
    },
    end_a2: {
        id: 'end_a2',
        isFinal: true,
        bgImage: require('../assets/images/end_a2_scene.png'),
        badgeImage: require('../assets/images/end_a2_badge.png'),
        audio: require('../assets/sounds/audio_end_a2.mp3'),
        text: "Pıtır, Filo'nun sırtında sudan geçti. Hiç ıslanmadı!",
        analysisTag: 'Fiziksel-Cozum-Destek',
    },
    end_b1: {
        id: 'end_b1',
        isFinal: true,
        bgImage: require('../assets/images/end_b1_scene.png'),
        badgeImage: require('../assets/images/end_b1_badge.png'),
        audio: require('../assets/sounds/audio_end_b1.mp3'),
        text: "Yüzlerce kuş geldi ve her biri bir ceviz taşıdı!",
        analysisTag: 'Sosyal-Cozum-Isbirligi',
    },
    end_b2: {
        id: 'end_b2',
        isFinal: true,
        bgImage: require('../assets/images/end_b2_scene.png'),
        badgeImage: require('../assets/images/end_b2_badge.png'),
        audio: require('../assets/sounds/audio_end_b2.mp3'),
        text: "Cevizleri yaprakların üzerine koyup kızak gibi kaydırdılar!",
        analysisTag: 'Bilissel-Cozum-Yaraticilik',
    },
};

type StoryOption = {
    id: string;
    type: string;
    image: any;
    label: string;
    next: string;
    audio: any;
};

type StoryNode = {
    id: string;
    bgImage: any;
    text: string;
    audio: any;
    questionAudio?: any;
    isFinal?: boolean;
    badgeImage?: any;
    analysisTag?: string;
    options?: StoryOption[];
};

interface CevizMaceraProps {
    onExit: () => void;
    userId?: string;
    userEmail?: string;
    userAge?: number;
}

export default function CevizMacera({ onExit, userId, userEmail, userAge }: CevizMaceraProps) {
    const { width, height } = useWindowDimensions();
    const isPortrait = height > width;
    const isMobile = width < 768;

    const [currentNodeId, setCurrentNodeId] = useState<string>('intro');
    const [viewState, setViewState] = useState<'story' | 'options'>('story');
    const [startTime] = useState<number>(Date.now());
    const [isLogging, setIsLogging] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const { playSound } = useSound();
    const [storyVolume, setStoryVolume] = useState(1.0);
    const soundRef = useRef<Audio.Sound | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const currentNode = storyData[currentNodeId as keyof typeof storyData] as StoryNode;

    useEffect(() => {
        playSound('background');
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
        setViewState('story');
        setShowConfetti(false);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
        playSceneAudio();
        if (currentNode.isFinal && !isLogging) {
            logGameResult(currentNode.analysisTag || 'Unknown');
        }
    }, [currentNodeId]);

    // New effect to handle viewState changes for question audio
    useEffect(() => {
        if (viewState === 'options' && currentNode.questionAudio) {
            playQuestionAudio();
        }
    }, [viewState]);

    const playSceneAudio = async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }
            if (currentNode.audio) {
                const { sound } = await Audio.Sound.createAsync(currentNode.audio, { shouldPlay: true }, onPlaybackStatusUpdate);
                soundRef.current = sound;
                await sound.setVolumeAsync(storyVolume);
            } else if (!currentNode.isFinal) {
                setViewState('options');
            }
        } catch (e) {
            console.log('Ses çalma hatası:', e);
            if (!currentNode.isFinal) setViewState('options');
        }
    };

    const playQuestionAudio = async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }
            const { sound } = await Audio.Sound.createAsync(currentNode.questionAudio, { shouldPlay: true });
            soundRef.current = sound;
            await sound.setVolumeAsync(storyVolume);
        } catch (e) {
            console.warn('Soru sesi çalma hatası:', e);
        }
    };

    const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
            if (!currentNode.isFinal) {
                setViewState('options');
            } else {
                setShowConfetti(true);
                setTimeout(() => onExit(), 4000);
            }
        }
    };

    const handleOptionSelect = async (opt: StoryOption) => {
        if (opt.audio) {
            try {
                const { sound } = await Audio.Sound.createAsync(opt.audio);
                await sound.setRateAsync(0.8, false);
                await sound.playAsync();
                setTimeout(() => sound.unloadAsync(), 2000);
            } catch (e) {
                console.warn('Ses çalma hatası', e);
            }
        }
        setCurrentNodeId(opt.next);
    };

    const handleReset = () => {
        setCurrentNodeId('intro');
        setIsLogging(false);
        setShowConfetti(false);
    };

    const logGameResult = async (analysisTag: string) => {
        setIsLogging(true);
        const endTime = Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);
        const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
        if (!SUPABASE_URL || !SUPABASE_KEY) return;
        const logData = {
            ogrenci_adi: userId || 'Misafir',
            ogrenci_yasi: userAge || 0,
            oyun_turu: 'ceviz_macera',
            hamle_sayisi: 1,
            hata_sayisi: 0,
            sure: durationSeconds,
            yapay_zeka_yorumu: analysisTag,
            email: userEmail,
        };
        try {
            await fetch(`${SUPABASE_URL}/rest/v1/oyun_skorlari`, {
                method: 'POST',
                headers: {
                    apikey: SUPABASE_KEY,
                    Authorization: `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    Prefer: 'return=minimal',
                },
                body: JSON.stringify(logData),
            });
        } catch (e) {
            console.error('Log hatası:', e);
        }
    };

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
                            <Image source={currentNode.bgImage} style={styles.storyImage} resizeMode="contain" />
                            {currentNode.isFinal && currentNode.badgeImage && (
                                <View style={styles.badgeWrapper}>
                                    <Image source={currentNode.badgeImage} style={styles.badgeImage} resizeMode="contain" />
                                </View>
                            )}
                            {showConfetti && (
                                <View style={styles.congratsOverlay}>
                                    <Text style={styles.congratsText}>TEBRİKLER!</Text>
                                    <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} fadeOut={true} />
                                </View>
                            )}
                            {currentNode.isFinal && !showConfetti && (
                                <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                                    <Ionicons name="refresh" size={40} color="#FFF" />
                                </TouchableOpacity>
                            )}
                        </View>
                    ) : (
                        <View style={[styles.optionsView, { flexDirection: isPortrait && isMobile ? 'column' : 'row', gap: isPortrait && isMobile ? 20 : 50 }]}>
                            {currentNode.options?.map((opt) => (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={[styles.largeOptionButton, {
                                        width: isMobile ? (isPortrait ? 180 : 200) : 400,
                                        height: isMobile ? (isPortrait ? 180 : 200) : 400
                                    }]}
                                    onPress={() => handleOptionSelect(opt)}
                                    activeOpacity={0.8}
                                >
                                    <Image source={opt.image} style={styles.largeOptionImage} resizeMode="contain" />
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
    mainContainer: { flex: 1, width: '100%', alignItems: 'center', paddingTop: 20 },
    header: { width: '90%', maxWidth: 800, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#5D4037', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, marginBottom: 20, borderWidth: 2, borderColor: '#8D6E63', elevation: 5, zIndex: 100 },
    headerTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', letterSpacing: 1 },
    volumeControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 25, paddingHorizontal: 10 },
    contentContainer: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
    storyView: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', position: 'relative' },
    storyImage: { width: '90%', height: '80%', maxWidth: 800, borderRadius: 30 },
    badgeWrapper: { position: 'absolute', bottom: '15%', right: '10%', zIndex: 10, shadowColor: '#FFD700', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 20, elevation: 15 },
    badgeImage: { width: 150, height: 150 },
    optionsView: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 50, width: '100%', height: '100%', paddingHorizontal: 20 },
    largeOptionButton: {
        width: Platform.OS === 'web' ? 400 : 200,
        height: Platform.OS === 'web' ? 400 : 200,
        alignItems: 'center',
        justifyContent: 'center',
    },
    largeOptionImage: { width: '100%', height: '100%' },
    resetButton: { position: 'absolute', bottom: 30, backgroundColor: '#FF5722', width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#BF360C', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 5 },
    congratsOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
    congratsText: { fontSize: 60, fontWeight: 'bold', color: '#FFD700', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10, marginBottom: 50 },
});
