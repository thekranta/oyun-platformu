import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import DynamicBackground from './DynamicBackground';

// STORY DATA (Text removed from UI, kept in data for reference if needed, but logic driven by ID)
const storyData = {
    intro: {
        id: 'intro',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_giris_bg_misket_sepet.jpg'),
        audio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_giris_narr.mp3'),
        questionAudio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_giris_q.mp3'),
        options: [
            {
                id: 'A',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim1_icon_togo.png'),
                next: 'scene_a',
            },
            {
                id: 'B',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim1_icon_bobo.png'),
                next: 'scene_b',
            },
        ],
    },
    scene_a: {
        id: 'scene_a',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_yolA_bg_togo_kaygan_tepe.jpg'),
        audio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_yolA_narr.mp3'),
        questionAudio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_yolA_q.mp3'),
        options: [
            {
                id: 'A1',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim2A_icon_ele_ele.png'),
                next: 'end_a1',
            },
            {
                id: 'A2',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim2A_icon_gorev.png'),
                next: 'end_a2',
            },
        ],
    },
    scene_b: {
        id: 'scene_b',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_yolB_bg_bobo_yol_ayrimi.jpg'),
        audio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_yolB_narr.mp3'),
        questionAudio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_yolB_q.mp3'),
        options: [
            {
                id: 'B1',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim2B_icon_ayrilmadan.png'),
                next: 'end_b1',
            },
            {
                id: 'B2',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim2B_icon_isaret.png'),
                next: 'end_b2',
            },
        ],
    },
    end_a1: {
        id: 'end_a1',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_sonucA1_bg_ele_ele_tepe.jpg'),
        audio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_sonucA1_narr.mp3'),
        next: 'final',
        analysisTag: 'Sosyal-Isbirligi-Guven',
    },
    end_a2: {
        id: 'end_a2',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_sonucA2_bg_gorev_paylasimi.jpg'),
        audio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_sonucA2_narr.mp3'),
        next: 'final',
        analysisTag: 'Sosyal-Liderlik-Planlama',
    },
    end_b1: {
        id: 'end_b1',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_sonucB1_bg_ayrilmadan_arama.jpg'),
        audio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_sonucB1_narr.mp3'),
        next: 'final',
        analysisTag: 'Guvenlik-Birliktelik',
    },
    end_b2: {
        id: 'end_b2',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_sonucB2_bg_isaretli_plan.jpg'),
        audio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_sonucB2_narr.mp3'),
        next: 'final',
        analysisTag: 'Bilissel-ProblemCozme-Harita',
    },
    final: {
        id: 'final',
        isFinal: true,
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_final_bg_birlikte_aile.jpg'),
        audio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_final_narr.mp3'),
        analysisTag: 'Final',
    }
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

interface AileSepetiMacerasiProps {
    onExit: () => void;
    userId?: string;
    userEmail?: string;
    userAge?: number;
}

export default function AileSepetiMacerasi({ onExit, userId, userEmail, userAge }: AileSepetiMacerasiProps) {
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
        playAudio(currentNode.audio, 'narrative');

        if (currentNode.isFinal && !isLogging) {
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
            // If no audio, simulate finish after 1s? Or just wait? 
            // For now, let's assume all nodes have audio as requested.
            // If no audio, we might get stuck, so simple manual fallback could be nice, 
            // but user explicitly asked to remove buttons.
            return;
        }

        try {
            const { sound } = await Audio.Sound.createAsync(audioSource, { shouldPlay: true });
            soundRef.current = sound;
            await sound.setVolumeAsync(storyVolume);

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish) {
                    // Slight delay to avoid instant cut
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
                // Narrative finished -> Go to question
                setPhase('choice');
                if (currentNode.questionAudio) {
                    playAudio(currentNode.questionAudio, 'question');
                }
            } else if (currentNode.next) {
                // Linear flow -> Go to next scene (auto)
                setCurrentNodeId(currentNode.next);
            } else if (currentNode.isFinal) {
                // Final scene finished -> Wait 2s then Confetti + Exit
                setTimeout(() => {
                    setShowConfetti(true);
                    setTimeout(onExit, 4000); // Wait for confetti to fall a bit
                }, 2000);
            }
        }
        // If type === 'question', do nothing. Wait for user input.
    };

    const handleOptionSelect = (opt: StoryOption) => {
        setPath(prev => [...prev, opt.next]); // Track path
        setCurrentNodeId(opt.next);
    };

    const logGameResult = async () => {
        setIsLogging(true);
        const endTime = Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);
        const durationMs = endTime - startTime;
        const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
        const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

        if (!SUPABASE_URL || !SUPABASE_KEY) return;

        // Build path string like "intro -> scene_a -> end_a1 -> final"
        const pathString = path.join(' -> ');

        // Generate AI comment using Gemini
        let aiComment: string | null = null;
        if (GEMINI_API_KEY) {
            try {
                const prompt = `Bu bir okul öncesi değerler hikâyesi. Değer: Aile bütünlüğü. Çocuk şu yolu seçti: ${pathString}. Süre: ${durationMs} ms.
Bu seçimlere dayanarak ebeveyne yönelik 4-6 cümlelik kısa bir yorum yaz.
Yargılayıcı olma. Klinik tanı yok. Sadece gözleme dayalı, olumlu ve geliştirici dil kullan.
Ebeveyne soru sorma. Sadece yorum yap ve önerilerde bulun.
Sonuna 2 ev içi mini etkinlik önerisi ekle.
Yorumun en sonuna "ChildhoodTech Ekibi" yazarak bitir.`;

                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY.trim()}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.candidates && data.candidates.length > 0) {
                        aiComment = data.candidates[0].content.parts[0].text;
                    }
                }
            } catch (e) {
                console.error('Gemini API hatası:', e);
            }
        }

        const logData = {
            ogrenci_adi: userId || 'Misafir',
            ogrenci_yasi: userAge || 0,
            oyun_turu: 'aile_sepeti_macerasi',
            hamle_sayisi: path.length,
            hata_sayisi: 0,
            sure: durationSeconds,
            yapay_zeka_yorumu: aiComment || `Seçilen yol: ${pathString}`,
            email: userEmail,
            zorluk_seviyesi: null,
            kazanim_odagi: 'Sosyal-Duygusal Gelişim',
            deneme_no: null,
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
            console.log('✅ Oyun sonucu ve AI yorumu kaydedildi.');
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

                    {/* Only show choices logic, no text overlay */}
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
        backgroundColor: 'rgba(0,0,0,0.3)' // Slight dim for better visibility of icons
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
        borderColor: '#FF9800'
    },
    largeOptionImage: {
        width: '100%',
        height: '100%',
    },

    confettiContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999
    }
});
