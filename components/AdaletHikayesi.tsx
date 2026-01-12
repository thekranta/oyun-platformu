import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import DynamicBackground from './DynamicBackground';

// =======================================
// 📖 ADALET HİKAYESİ - İnteraktif Hikaye
// Değer: Adalet (Sosyal-Duygusal Gelişim)
// =======================================

// STORY DATA - Hikaye ve görseller buraya eklenecek
// TODO: Kullanıcı görseller ve sesleri sağlayacak
const storyData: Record<string, StoryNode> = {
    // Placeholder intro sahnesi - gerçek verilerle değiştirilecek
    intro: {
        id: 'intro',
        // bgImage: require('../assets/images/stories/adalet_hikayesi/intro_bg.jpg'),
        // audio: require('../assets/sounds/stories/adalet_hikayesi/intro_narr.mp3'),
        // questionAudio: require('../assets/sounds/stories/adalet_hikayesi/intro_q.mp3'),
        bgImage: null, // Placeholder - kullanıcı sağlayacak
        audio: null,
        questionAudio: null,
        options: [
            // {
            //     id: 'A',
            //     type: 'image_button',
            //     image: require('../assets/images/stories/adalet_hikayesi/option_a_icon.png'),
            //     next: 'scene_a',
            // },
            // {
            //     id: 'B',
            //     type: 'image_button',
            //     image: require('../assets/images/stories/adalet_hikayesi/option_b_icon.png'),
            //     next: 'scene_b',
            // },
        ],
    },
    // TODO: Daha fazla sahne eklenecek (scene_a, scene_b, end_a1, end_a2, end_b1, end_b2, final)
};

type StoryOption = {
    id: string;
    type: string;
    image: any;
    next: string;
};

type StoryNode = {
    id: string;
    bgImage: any;
    audio: any;
    questionAudio?: any;
    isFinal?: boolean;
    analysisTag?: string;
    options?: StoryOption[];
    next?: string;
};

interface AdaletHikayesiProps {
    onExit: () => void;
    userId?: string;
    userEmail?: string;
    userAge?: number;
}

export default function AdaletHikayesi({ onExit, userId, userEmail, userAge }: AdaletHikayesiProps) {
    const { width, height } = useWindowDimensions();
    const isPortrait = height > width;
    const isMobile = width < 768;

    const [currentNodeId, setCurrentNodeId] = useState<string>('intro');
    const [phase, setPhase] = useState<'narrative' | 'choice'>('narrative');
    const [path, setPath] = useState<string[]>(['intro']); // Track user path

    const [startTime] = useState<number>(Date.now());
    const [isLogging, setIsLogging] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Audio State
    const [storyVolume, setStoryVolume] = useState(1.0);
    const soundRef = useRef<Audio.Sound | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const currentNode = storyData[currentNodeId as keyof typeof storyData] as StoryNode;

    useEffect(() => {
        return () => {
            stopAudio();
        };
    }, []);

    useEffect(() => {
        if (soundRef.current) {
            soundRef.current.setVolumeAsync(storyVolume);
        }
    }, [storyVolume]);

    // On Node Change
    useEffect(() => {
        setPhase('narrative');
        setShowConfetti(false);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

        // Auto-play narrator
        if (currentNode?.audio) {
            playAudio(currentNode.audio, 'narrative');
        }

        if (currentNode?.isFinal && !isLogging) {
            logGameResult();
        }
    }, [currentNodeId]);

    const stopAudio = async () => {
        if (soundRef.current) {
            try {
                await soundRef.current.stopAsync();
                await soundRef.current.unloadAsync();
            } catch (e) { }
            soundRef.current = null;
        }
    };

    const playAudio = async (audioSource: any, type: 'narrative' | 'question') => {
        await stopAudio();
        if (!audioSource) {
            return;
        }

        try {
            const { sound } = await Audio.Sound.createAsync(audioSource, { shouldPlay: true });
            soundRef.current = sound;
            await sound.setVolumeAsync(storyVolume);

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    onAudioFinish(type);
                }
            });
        } catch (e) {
            console.log('Audio playback error:', e);
        }
    };

    const onAudioFinish = async (type: 'narrative' | 'question') => {
        if (type === 'narrative') {
            if (currentNode.options && currentNode.options.length > 0) {
                setPhase('choice');
                if (currentNode.questionAudio) {
                    playAudio(currentNode.questionAudio, 'question');
                }
            } else if (currentNode.next) {
                setCurrentNodeId(currentNode.next);
            } else if (currentNode.isFinal) {
                setTimeout(() => {
                    setShowConfetti(true);
                    setTimeout(onExit, 4000);
                }, 2000);
            }
        }
    };

    const handleOptionSelect = (opt: StoryOption) => {
        setPath(prev => [...prev, opt.next]);
        setCurrentNodeId(opt.next);
    };

    const logGameResult = async () => {
        setIsLogging(true);
        const endTime = Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);
        const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

        if (!SUPABASE_URL || !SUPABASE_KEY) return;

        const pathString = path.join(' -> ');

        const logData = {
            ogrenci_adi: userId || 'Misafir',
            ogrenci_yasi: userAge || 0,
            oyun_turu: 'adalet-hikayesi',
            hamle_sayisi: path.length,
            hata_sayisi: 0,
            sure: durationSeconds,
            yapay_zeka_yorumu: null,
            email: userEmail,
            zorluk_seviyesi: null,
            kazanim_odagi: 'Sosyal-Duygusal Gelişim - Adalet',
            deneme_no: null,
            ekstra_veri: JSON.stringify({ secilen_yol: pathString }),
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
            console.log('✅ Adalet Hikayesi sonucu kaydedildi.');
        } catch (e) {
            console.error('Log hatası:', e);
        }
    };

    const renderChoices = () => (
        <View style={styles.choicesContainer}>
            <View style={[styles.optionsRow, {
                flexDirection: isPortrait ? 'column' : 'row',
            }]}>
                {currentNode.options?.map((opt) => (
                    <TouchableOpacity
                        key={opt.id}
                        style={[styles.largeOptionButton, {
                            width: isMobile ? 250 : 350,
                            height: isMobile ? 250 : 350,
                            margin: 20
                        }]}
                        onPress={() => handleOptionSelect(opt)}
                        activeOpacity={0.8}
                    >
                        <Image source={opt.image} style={styles.largeOptionImage} resizeMode="contain" />
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    // Placeholder görüntüsü - assetler eklenince kaldırılacak
    if (!currentNode?.bgImage) {
        return (
            <DynamicBackground onExit={onExit}>
                <View style={styles.placeholderContainer}>
                    <Text style={styles.placeholderEmoji}>⚖️</Text>
                    <Text style={styles.placeholderTitle}>Adalet Hikayesi</Text>
                    <Text style={styles.placeholderSubtitle}>Hazırlanıyor...</Text>
                    <Text style={styles.placeholderInfo}>
                        Bu interaktif hikaye için görsel ve ses dosyaları bekleniyor.
                    </Text>
                    <TouchableOpacity style={styles.exitButton} onPress={onExit}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                        <Text style={styles.exitButtonText}>Menüye Dön</Text>
                    </TouchableOpacity>
                </View>
            </DynamicBackground>
        );
    }

    return (
        <DynamicBackground onExit={onExit}>
            <View style={styles.mainContainer}>
                {/* Header - Minimal, just volume */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}></Text>
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

                {/* Content */}
                <View style={styles.contentContainer}>
                    <Animated.Image
                        source={currentNode.bgImage}
                        style={[styles.backgroundImage, { opacity: fadeAnim }]}
                        resizeMode="cover"
                        blurRadius={phase === 'choice' ? 3 : 0}
                    />

                    <View style={styles.overlayContainer}>
                        {phase === 'choice' && renderChoices()}
                    </View>

                    {showConfetti && (
                        <View style={styles.confettiContainer} pointerEvents="none">
                            <ConfettiCannon count={200} origin={{ x: -10, y: 0 }} fadeOut={true} />
                        </View>
                    )}
                </View>
            </View>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, width: '100%', alignItems: 'center', paddingTop: 20 },
    header: { width: '90%', maxWidth: 800, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 10, zIndex: 100 },
    headerTitle: { color: 'transparent' },
    volumeControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 25, paddingHorizontal: 10 },

    contentContainer: {
        flex: 1,
        width: '95%',
        maxWidth: 1000,
        backgroundColor: '#000',
        borderRadius: 30,
        overflow: 'hidden',
        marginBottom: 20,
        borderWidth: 5,
        borderColor: '#5D4037',
        position: 'relative'
    },

    backgroundImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
    },

    overlayContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },

    choicesContainer: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)'
    },
    optionsRow: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    largeOptionButton: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 30,
        padding: 15,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        borderWidth: 4,
        borderColor: '#9C27B0' // Mor - Adalet teması
    },
    largeOptionImage: {
        width: '100%',
        height: '100%',
    },

    confettiContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999
    },

    // Placeholder styles
    placeholderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    placeholderEmoji: {
        fontSize: 80,
        marginBottom: 20,
    },
    placeholderTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 5,
    },
    placeholderSubtitle: {
        fontSize: 18,
        color: '#FFD54F',
        marginBottom: 20,
    },
    placeholderInfo: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        maxWidth: 400,
        marginBottom: 30,
    },
    exitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(156, 39, 176, 0.8)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 10,
    },
    exitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
