import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import DynamicBackground from './DynamicBackground';

// STORY DATA
const storyData = {
    intro: {
        id: 'intro',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_giris_bg_misket_sepet.jpg'),
        text: "Bir zamanlar Kokulu Çayır’da, Misket adında küçük bir tavşan yaşardı. Bugün Aile Buluşması Günü’ydü! Anne Narin, baba Umut ve minik kardeş Pofik ile büyük çınarın altında piknik yapacaklardı. Misket aile sepetini hazırladı: elmalar, havuçlar ve küçük bir aile fotoğraf albümü… Tam yola çıkacakken rüzgâr vuuuu! diye esti, sepetin kapağı tak! diye açıldı. Albüm yuvarlandı ve iki patikanın arasına düştü. Misket heyecanla, “Albümü bulmalıyız! Hep birlikte gitmezsek kaybolabiliriz,” dedi.",
        audio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_giris_narr.mp3'),
        questionAudio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_giris_q.mp3'),
        question: "Sence Misket kimden yardım istesin?",
        options: [
            {
                id: 'A',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim1_icon_togo.png'),
                label: 'Planlı Kaplumbağa Togo',
                next: 'scene_a',
            },
            {
                id: 'B',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim1_icon_bobo.png'),
                label: 'Pratik Kunduz Bobo',
                next: 'scene_b',
            },
        ],
    },
    scene_a: {
        id: 'scene_a',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_yolA_bg_togo_kaygan_tepe.jpg'),
        text: "Togo gözlüğünü düzeltti: “Önce ailece duralım. Kimse tek başına ilerlemesin,” dedi. Sonra yere küçük taşlarla bir işaret yaptı: “Albüm rüzgârla bu yöne gitmiş olabilir. Hep birlikte iz takibi yapalım.” Aile sıraya girdi. Tam yürürken önlerine çiğle ıslanmış kaygan bir tepe çıktı. Ayaklar pıt pıt kayıyordu.",
        audio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_yolA_narr.mp3'),
        questionAudio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_yolA_q.mp3'),
        question: "Sence aile bu tepeden nasıl geçsin?",
        options: [
            {
                id: 'A1',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim2A_icon_ele_ele.png'),
                label: 'El ele tutuşup birlikte çıksınlar',
                next: 'end_a1',
            },
            {
                id: 'A2',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim2A_icon_gorev.png'),
                label: 'Görev paylaşımı yapsınlar',
                next: 'end_a2',
            },
        ],
    },
    scene_b: {
        id: 'scene_b',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_yolB_bg_bobo_yol_ayrimi.jpg'),
        text: "Bobo kuyruğunu şap şap salladı: “Ben çalılıklara bakayım. Albüm rüzgârla oraya sıkışmış olabilir,” dedi. Misket hemen seslendi: “Bobo, lütfen fazla uzaklaşma. Biz ailece birlikte kalmak istiyoruz.” Bobo durdu: “Tamam! O zaman hızlı çözüm bulalım: yol ikiye ayrılıyor. Albüm bir tarafta, sepet bir tarafta kalmasın.”",
        audio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_yolB_narr.mp3'),
        questionAudio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_yolB_q.mp3'),
        question: "Sence aile iki yolu nasıl kontrol etsin?",
        options: [
            {
                id: 'B1',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim2B_icon_ayrilmadan.png'),
                label: 'Aile ayrılmadan birlikte arasın',
                next: 'end_b1',
            },
            {
                id: 'B2',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim2B_icon_isaret.png'),
                label: 'İşaretlerle plan yapıp sırayla kontrol etsin',
                next: 'end_b2',
            },
        ],
    },
    end_a1: {
        id: 'end_a1',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_sonucA1_bg_ele_ele_tepe.jpg'),
        audio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_sonucA1_narr.mp3'),
        text: "Anne Narin, Misket’in patisini tuttu. Baba Umut da Pofik’i yanına aldı. Hep birlikte “Yavaş… şimdi… hop!” dediler. Kaygan tepeyi pıt pıt adımlarla çıktılar. Kimse geride kalmadı. Tepenin sonunda albüm çimenlerin arasında parlıyordu. Aile birbirine sarıldı.\n\nDEGER MESAJI: Aile, aynı yolda birlikte yürüdüğünde güçlü olur. Birbirini bırakmamak aile bütünlüğüdür.",
        analysisTag: 'Sosyal-Isbirligi-Guven',
        next: 'final'
    },
    end_a2: {
        id: 'end_a2',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_sonucA2_bg_gorev_paylasimi.jpg'),
        audio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_sonucA2_narr.mp3'),
        text: "Baba Umut “Ben sepeti taşırım,” dedi. Anne Narin “Ben Pofik’in yanındayım,” dedi. Misket “Ben önden yavaş adımlarla yolu göstereceğim,” dedi. Togo da “Dur–yürü ritmini ben söyleyeceğim,” dedi. Hep birlikte güvenle geçtiler ve albümü birlikte buldular.\n\nDEGER MESAJI: Aile görev paylaşınca hem hızlı hem güvenli ilerler. Herkes katkı verince aile bütünlüğü güçlenir.",
        analysisTag: 'Sosyal-Liderlik-Planlama',
        next: 'final'
    },
    end_b1: {
        id: 'end_b1',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_sonucB1_bg_ayrilmadan_arama.jpg'),
        audio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_sonucB1_narr.mp3'),
        text: "Misket “Biz ayrılmayalım,” dedi. Aile aynı patikadan yürüdü. Albüm bir taşın arkasına sıkışmıştı. Bobo “Buldum!” dedi ve gülümsedi. Hep birlikte sevindiler.\n\nDEGER MESAJI: Aile aynı yerde ve aynı kalpte kalınca güvende hisseder. Birlikte aramak aile bütünlüğünü büyütür.",
        analysisTag: 'Guvenlik-Birliktelik',
        next: 'final'
    },
    end_b2: {
        id: 'end_b2',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_sonucB2_bg_isaretli_plan.jpg'),
        audio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_sonucB2_narr.mp3'),
        text: "Bobo yere küçük dal parçalarıyla oklar yaptı: “Bu oklar ‘aynı hizada kal’ demek,” dedi. Aile ayrılmadan önce sol yanı kontrol etti; sonra birlikte sağ yana geçti. Albüm çiçek demetinin altında çıktı. Misket “Birlikte bulduk!” diye sevindi.\n\nDEGER MESAJI: Aile ayrılmadan plan yaparsa her şey kolaylaşır. Aynı takım olmak aile bütünlüğüdür.",
        analysisTag: 'Bilissel-ProblemCozme-Harita',
        next: 'final'
    },
    final: {
        id: 'final',
        isFinal: true,
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_final_bg_birlikte_aile.jpg'),
        audio: require('../assets/sounds/stories/aile_sepeti_macerasi/s02_final_narr.mp3'),
        text: "Birlikte olunca her şey daha kolay!\nAile bütünlüğü: Birlikte karar vermek, birlikte hareket etmek ve birbirini bırakmamaktır.",
        analysisTag: 'Final',
    }
};

type StoryOption = {
    id: string;
    type: string;
    image: any;
    label: string;
    next: string;
};

type StoryNode = {
    id: string;
    bgImage: any;
    text: string;
    audio: any;
    questionAudio?: any;
    question?: string;
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
        playAudio(currentNode.audio);

        if (currentNode.isFinal && !isLogging) {
            logGameResult(currentNode.analysisTag || 'Unknown');
        }
    }, [currentNodeId]);

    const stopAudio = async () => {
        if (soundRef.current) {
            try {
                await soundRef.current.unloadAsync();
            } catch (e) { }
            soundRef.current = null;
        }
    };

    const playAudio = async (audioSource: any) => {
        await stopAudio();
        if (!audioSource) return;

        try {
            const { sound } = await Audio.Sound.createAsync(audioSource, { shouldPlay: true });
            soundRef.current = sound;
            await sound.setVolumeAsync(storyVolume);
        } catch (e) {
            console.log('Audio playback error:', e);
        }
    };

    const handleNext = () => {
        if (currentNode.options && currentNode.options.length > 0) {
            setPhase('choice');
        } else if (currentNode.next) {
            setCurrentNodeId(currentNode.next);
        } else if (currentNode.isFinal) {
            setShowConfetti(true);
        }
    };

    const handleOptionSelect = (opt: StoryOption) => {
        setCurrentNodeId(opt.next);
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
            oyun_turu: 'aile_sepeti_macerasi',
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

    const renderNarrative = () => (
        <View style={styles.textBoxContainer}>
            <View style={styles.textWrapper}>
                <Text style={styles.storyText}>{currentNode.text}</Text>

                {currentNode.audio && (
                    <TouchableOpacity style={styles.speakButton} onPress={() => playAudio(currentNode.audio)}>
                        <Ionicons name="volume-medium" size={32} color="#FFF" />
                    </TouchableOpacity>
                )}
            </View>

            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Ionicons name="arrow-forward-circle" size={60} color="#FF9800" />
            </TouchableOpacity>

            {currentNode.isFinal && (
                <TouchableOpacity style={styles.resetButton} onPress={onExit}>
                    <Text style={styles.resetButtonText}>Tamamla</Text>
                    <Ionicons name="checkmark-circle" size={40} color="#FFF" />
                </TouchableOpacity>
            )}
        </View>
    );

    const renderChoices = () => (
        <View style={styles.choicesContainer}>
            {(currentNode.question || currentNode.questionAudio) && (
                <View style={styles.questionBox}>
                    <Text style={styles.questionText}>{currentNode.question}</Text>
                    {currentNode.questionAudio && (
                        <TouchableOpacity style={styles.questionSpeakButton} onPress={() => playAudio(currentNode.questionAudio)}>
                            <Ionicons name="help-circle" size={30} color="#FFF" />
                            <Text style={styles.questionSpeakText}>Soruyu Dinle</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            <ScrollView
                contentContainerStyle={[styles.optionsScroll, {
                    flexDirection: isPortrait ? 'column' : 'row',
                }]}
                showsVerticalScrollIndicator={false}
            >
                {currentNode.options?.map((opt) => (
                    <TouchableOpacity
                        key={opt.id}
                        style={[styles.largeOptionButton, {
                            width: isMobile ? 250 : 300,
                            height: isMobile ? 250 : 300,
                            margin: 15
                        }]}
                        onPress={() => handleOptionSelect(opt)}
                        activeOpacity={0.8}
                    >
                        <Image source={opt.image} style={styles.largeOptionImage} resizeMode="contain" />
                        <View style={styles.labelContainer}>
                            <Text style={styles.labelText}>{opt.label}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    return (
        <DynamicBackground onExit={onExit}>
            <View style={styles.mainContainer}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>AİLE SEPETİ MACERASI</Text>
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
                        blurRadius={phase === 'choice' ? 5 : 0}
                    />

                    <View style={styles.overlayContainer}>
                        {phase === 'narrative' ? renderNarrative() : renderChoices()}
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
    header: { width: '90%', maxWidth: 800, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#5D4037', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, marginBottom: 10, borderWidth: 2, borderColor: '#8D6E63', elevation: 5, zIndex: 100 },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', letterSpacing: 1 },
    volumeControl: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 25, paddingHorizontal: 10 },

    contentContainer: {
        flex: 1,
        width: '95%',
        maxWidth: 1000,
        backgroundColor: '#FFF',
        borderRadius: 30,
        overflow: 'hidden',
        marginBottom: 20,
        borderWidth: 5,
        borderColor: '#8D6E63',
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
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.1)'
    },

    textBoxContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    textWrapper: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 20,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: '#FF9800',
        width: '90%',
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    storyText: {
        flex: 1,
        fontSize: 20,
        color: '#3E2723',
        textAlign: 'center',
        lineHeight: 30,
        fontWeight: '600',
        marginRight: 10
    },
    speakButton: {
        backgroundColor: '#FF9800',
        padding: 10,
        borderRadius: 25,
        elevation: 3
    },
    nextButton: {
        backgroundColor: '#FFF',
        borderRadius: 50,
        elevation: 5,
    },
    resetButton: {
        marginTop: 20,
        backgroundColor: '#4CAF50',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 30,
        elevation: 5
    },
    resetButtonText: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
        marginRight: 10
    },

    choicesContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)'
    },
    questionBox: {
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 15,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#FF9800',
        alignItems: 'center'
    },
    questionText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#E65100',
        textAlign: 'center',
        marginBottom: 10
    },
    questionSpeakButton: {
        flexDirection: 'row',
        backgroundColor: '#FF5722',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        alignItems: 'center'
    },
    questionSpeakText: {
        color: '#FFF',
        fontWeight: 'bold',
        marginLeft: 5
    },
    optionsScroll: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 20
    },
    largeOptionButton: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    largeOptionImage: {
        width: '80%',
        height: '80%',
        marginBottom: 10
    },
    labelContainer: {
        backgroundColor: '#FF9800',
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 15,
        width: '100%',
        alignItems: 'center'
    },
    labelText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 18,
        textAlign: 'center'
    },

    confettiContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 999
    }
});
