import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import DynamicBackground from './DynamicBackground';

// =======================================
// 📖 ADALET HİKAYESİ (s02) - İnteraktif Hikaye
// Tema: Adalet, Eşitlik ve Paylaşma
// Karakterler: Pofuduk Tavşan, Tombul Ayı, Neşeli Sincap
// =======================================

// STORY DATA - Ormandaki Lezzetli Paylaşım
const storyData: Record<string, StoryNode> = {
    // BÖLÜM 1: GİRİŞ (Sorun)
    intro: {
        id: 'intro',
        bgImage: require('../assets/images/stories/adalet_hikayesi/s02_giris_bg_karpuz.png'),
        audio: require('../assets/sounds/stories/adalet_hikayesi/s02_giris_narr.mp3'),
        questionAudio: require('../assets/sounds/stories/adalet_hikayesi/s02_giris_q.mp3'),
        options: [
            {
                id: 'A',
                type: 'image_button',
                image: require('../assets/images/stories/adalet_hikayesi/s02_secim1_icon_dilim.png'),
                next: 'scene_a',
            },
            {
                id: 'B',
                type: 'image_button',
                image: require('../assets/images/stories/adalet_hikayesi/s02_secim1_icon_baykus.png'),
                next: 'scene_b',
            },
        ],
    },

    // BÖLÜM 2: GELİŞME - YOL A (Tavşan'ın Çözümü)
    scene_a: {
        id: 'scene_a',
        bgImage: require('../assets/images/stories/adalet_hikayesi/s02_yola_bg_olcum.png'),
        audio: null, // TODO: s02_yola_narr.mp3
        questionAudio: null, // TODO: s02_yola_q.mp3
        options: [
            {
                id: 'A1',
                type: 'image_button',
                image: require('../assets/images/stories/adalet_hikayesi/s02_secim2a_icon_esit.png'),
                next: 'end_a1',
            },
            {
                id: 'A2',
                type: 'image_button',
                image: require('../assets/images/stories/adalet_hikayesi/s02_secim2a_icon_buyuk.png'),
                next: 'end_a2',
            },
        ],
    },

    // BÖLÜM 2: GELİŞME - YOL B (Bilge Baykuş'un Öğüdü)
    scene_b: {
        id: 'scene_b',
        bgImage: require('../assets/images/stories/adalet_hikayesi/s02_yolb_bg_danisma.png'),
        audio: null, // TODO: s02_yolb_narr.mp3
        questionAudio: null, // TODO: s02_yolb_q.mp3
        options: [
            {
                id: 'B1',
                type: 'image_button',
                image: require('../assets/images/stories/adalet_hikayesi/s02_secim2b_icon_sira.png'),
                next: 'end_b1',
            },
            {
                id: 'B2',
                type: 'image_button',
                image: require('../assets/images/stories/adalet_hikayesi/s02_secim2b_icon_secim.png'),
                next: 'end_b2',
            },
        ],
    },

    // BÖLÜM 3: SONUÇLAR
    // SONUÇ A1 (Tam Eşitlik)
    end_a1: {
        id: 'end_a1',
        bgImage: require('../assets/images/stories/adalet_hikayesi/s02_sonuca1_bg_mutlu.png'),
        audio: null, // TODO: s02_sonuca1_narr.mp3
        next: 'final',
        analysisTag: 'Adalet-Esitlik-KardesPayi',
    },

    // SONUÇ A2 (İhtiyaca Göre Paylaşım)
    end_a2: {
        id: 'end_a2',
        bgImage: require('../assets/images/stories/adalet_hikayesi/s02_sonuca2_bg_doygun.png'),
        audio: null, // TODO: s02_sonuca2_narr.mp3
        next: 'final',
        analysisTag: 'Adalet-IhtiyacaGore-Empati',
    },

    // SONUÇ B1 (Sırayla Yeme)
    end_b1: {
        id: 'end_b1',
        bgImage: require('../assets/images/stories/adalet_hikayesi/s02_sonucb1_bg_isirik.png'),
        audio: null, // TODO: s02_sonucb1_narr.mp3
        next: 'final',
        analysisTag: 'Adalet-SiraBekleme-Sabir',
    },

    // SONUÇ B2 (Kesen Değil Seçen)
    end_b2: {
        id: 'end_b2',
        bgImage: require('../assets/images/stories/adalet_hikayesi/s02_sonucb2_bg_guven.png'),
        audio: null, // TODO: s02_sonucb2_narr.mp3
        next: 'final',
        analysisTag: 'Adalet-Guven-Fedakarlik',
    },

    // ORTAK FİNAL
    final: {
        id: 'final',
        isFinal: true,
        bgImage: require('../assets/images/stories/adalet_hikayesi/s02_final_ortak_bg_dostluk.png'),
        audio: null, // TODO: s02_final_narr.mp3
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
            // Ses dosyası yoksa otomatik ilerleme
            setTimeout(() => onAudioFinish(type), 1000);
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
            // Ses yüklenemezse otomatik ilerleme
            setTimeout(() => onAudioFinish(type), 1000);
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

        // Seçilen yoldan anlam çıkar
        const getAnalysisSummary = () => {
            if (path.includes('end_a1')) return 'Tam Eşitlik yaklaşımı';
            if (path.includes('end_a2')) return 'İhtiyaca Göre Adalet yaklaşımı';
            if (path.includes('end_b1')) return 'Sıra Bekleme yaklaşımı';
            if (path.includes('end_b2')) return 'Güven ve Fedakarlık yaklaşımı';
            return 'Bilinmeyen';
        };

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
            kazanim_odagi: 'Sosyal-Duygusal Gelişim - Adalet ve Paylaşım',
            deneme_no: null,
            ekstra_veri: JSON.stringify({
                secilen_yol: pathString,
                yaklasim: getAnalysisSummary()
            }),
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
                        resizeMode={isPortrait ? "cover" : "contain"}
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
        borderColor: '#9C27B0', // Mor - Adalet teması
        position: 'relative'
    },

    backgroundImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        resizeMode: 'contain', // Ensures full image visibility on mobile landscape
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
});
