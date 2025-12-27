import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import DynamicBackground from './DynamicBackground';
import { useSound } from './SoundContext';

// STORY DATA
const storyData = {
    intro: {
        id: 'intro',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_giris_bg_misket_sepet.jpg'),
        text: "Bir zamanlar Kokulu Çayır’da, Misket adında küçük bir tavşan yaşardı. Bugün Aile Buluşması Günü’ydü! Anne Narin, baba Umut ve minik kardeş Pofik ile büyük çınarın altında piknik yapacaklardı. Misket aile sepetini hazırladı: elmalar, havuçlar ve küçük bir aile fotoğraf albümü… Tam yola çıkacakken rüzgâr vuuuu! diye esti, sepetin kapağı tak! diye açıldı. Albüm yuvarlandı ve iki patikanın arasına düştü. Misket heyecanla, “Albümü bulmalıyız! Hep birlikte gitmezsek kaybolabiliriz,” dedi.",
        audio: null,
        question: "Sence Misket kimden yardım istesin?",
        options: [
            {
                id: 'A',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim1_icon_togo.png'),
                label: 'Planlı Kaplumbağa Togo',
                next: 'scene_a',
                audio: null,
            },
            {
                id: 'B',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim1_icon_bobo.png'),
                label: 'Pratik Kunduz Bobo',
                next: 'scene_b',
                audio: null,
            },
        ],
    },
    scene_a: {
        id: 'scene_a',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_yolA_bg_togo_kaygan_tepe.jpg'),
        text: "Togo gözlüğünü düzeltti: “Önce ailece duralım. Kimse tek başına ilerlemesin,” dedi. Sonra yere küçük taşlarla bir işaret yaptı: “Albüm rüzgârla bu yöne gitmiş olabilir. Hep birlikte iz takibi yapalım.” Aile sıraya girdi. Tam yürürken önlerine çiğle ıslanmış kaygan bir tepe çıktı. Ayaklar pıt pıt kayıyordu.",
        audio: null,
        question: "Sence aile bu tepeden nasıl geçsin?",
        options: [
            {
                id: 'A1',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim2A_icon_ele_ele.png'),
                label: 'El ele tutuşup birlikte çıksınlar',
                next: 'end_a1',
                audio: null,
            },
            {
                id: 'A2',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim2A_icon_gorev.png'),
                label: 'Görev paylaşımı yapsınlar',
                next: 'end_a2',
                audio: null,
            },
        ],
    },
    scene_b: {
        id: 'scene_b',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_yolB_bg_bobo_yol_ayrimi.jpg'),
        text: "Bobo kuyruğunu şap şap salladı: “Ben çalılıklara bakayım. Albüm rüzgârla oraya sıkışmış olabilir,” dedi. Misket hemen seslendi: “Bobo, lütfen fazla uzaklaşma. Biz ailece birlikte kalmak istiyoruz.” Bobo durdu: “Tamam! O zaman hızlı çözüm bulalım: yol ikiye ayrılıyor. Albüm bir tarafta, sepet bir tarafta kalmasın.”",
        audio: null,
        question: "Sence aile iki yolu nasıl kontrol etsin?",
        options: [
            {
                id: 'B1',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim2B_icon_ayrilmadan.png'),
                label: 'Aile ayrılmadan birlikte arasın',
                next: 'end_b1',
                audio: null,
            },
            {
                id: 'B2',
                type: 'image_button',
                image: require('../assets/images/stories/aile_sepeti_macerasi/s02_secim2B_icon_isaret.png'),
                label: 'İşaretlerle plan yapıp sırayla kontrol etsin',
                next: 'end_b2',
                audio: null,
            },
        ],
    },
    end_a1: {
        id: 'end_a1',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_sonucA1_bg_ele_ele_tepe.jpg'),
        audio: null,
        text: "Anne Narin, Misket’in patisini tuttu. Baba Umut da Pofik’i yanına aldı. Hep birlikte “Yavaş… şimdi… hop!” dediler. Kaygan tepeyi pıt pıt adımlarla çıktılar. Kimse geride kalmadı. Tepenin sonunda albüm çimenlerin arasında parlıyordu. Aile birbirine sarıldı.\n\nDEGER MESAJI: Aile, aynı yolda birlikte yürüdüğünde güçlü olur. Birbirini bırakmamak aile bütünlüğüdür.",
        analysisTag: 'Sosyal-Isbirligi-Guven',
        next: 'final'
    },
    end_a2: {
        id: 'end_a2',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_sonucA2_bg_gorev_paylasimi.jpg'),
        audio: null,
        text: "Baba Umut “Ben sepeti taşırım,” dedi. Anne Narin “Ben Pofik’in yanındayım,” dedi. Misket “Ben önden yavaş adımlarla yolu göstereceğim,” dedi. Togo da “Dur–yürü ritmini ben söyleyeceğim,” dedi. Hep birlikte güvenle geçtiler ve albümü birlikte buldular.\n\nDEGER MESAJI: Aile görev paylaşınca hem hızlı hem güvenli ilerler. Herkes katkı verince aile bütünlüğü güçlenir.",
        analysisTag: 'Sosyal-Liderlik-Planlama',
        next: 'final'
    },
    end_b1: {
        id: 'end_b1',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_sonucB1_bg_ayrilmadan_arama.jpg'),
        audio: null,
        text: "Misket “Biz ayrılmayalım,” dedi. Aile aynı patikadan yürüdü. Albüm bir taşın arkasına sıkışmıştı. Bobo “Buldum!” dedi ve gülümsedi. Hep birlikte sevindiler.\n\nDEGER MESAJI: Aile aynı yerde ve aynı kalpte kalınca güvende hisseder. Birlikte aramak aile bütünlüğünü büyütür.",
        analysisTag: 'Guvenlik-Birliktelik',
        next: 'final'
    },
    end_b2: {
        id: 'end_b2',
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_sonucB2_bg_isaretli_plan.jpg'),
        audio: null,
        text: "Bobo yere küçük dal parçalarıyla oklar yaptı: “Bu oklar ‘aynı hizada kal’ demek,” dedi. Aile ayrılmadan önce sol yanı kontrol etti; sonra birlikte sağ yana geçti. Albüm çiçek demetinin altında çıktı. Misket “Birlikte bulduk!” diye sevindi.\n\nDEGER MESAJI: Aile ayrılmadan plan yaparsa her şey kolaylaşır. Aynı takım olmak aile bütünlüğüdür.",
        analysisTag: 'Bilissel-ProblemCozme-Harita',
        next: 'final'
    },
    final: {
        id: 'final',
        isFinal: true,
        bgImage: require('../assets/images/stories/aile_sepeti_macerasi/s02_final_bg_birlikte_aile.jpg'),
        audio: null,
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
    audio: any;
};

type StoryNode = {
    id: string;
    bgImage: any;
    text: string;
    audio: any;
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
    // 'narrative': show text + arrow button
    // 'choice': show options (if any)
    const [phase, setPhase] = useState<'narrative' | 'choice'>('narrative');

    const [startTime] = useState<number>(Date.now());
    const [isLogging, setIsLogging] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const { playSound } = useSound();
    const [storyVolume, setStoryVolume] = useState(1.0);
    const soundRef = useRef<Audio.Sound | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const currentNode = storyData[currentNodeId as keyof typeof storyData] as StoryNode;

    useEffect(() => {
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

    // When node changes, reset to narrative phase and play audio
    useEffect(() => {
        setPhase('narrative');
        setShowConfetti(false);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

        playSceneAudio();

        if (currentNode.isFinal && !isLogging) {
            logGameResult(currentNode.analysisTag || 'Unknown');
        }
    }, [currentNodeId]);

    const playSceneAudio = async () => {
        try {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }
            if (currentNode.audio) {
                const { sound } = await Audio.Sound.createAsync(currentNode.audio, { shouldPlay: true });
                soundRef.current = sound;
                await sound.setVolumeAsync(storyVolume);
            }
        } catch (e) {
            console.log('Ses çalma hatası:', e);
        }
    };

    // Called when user clicks the "Next" (arrow) button
    const handleNext = () => {
        // Stop current audio logic if needed, or let it play
        // If there are options, go to choice phase
        if (currentNode.options && currentNode.options.length > 0) {
            setPhase('choice');
        } else if (currentNode.next) {
            // Direct transition (e.g. result -> final)
            setCurrentNodeId(currentNode.next);
        } else if (currentNode.isFinal) {
            // Final scene -> maybe exit or show confetti?
            setShowConfetti(true);
        }
    };

    const handleOptionSelect = async (opt: StoryOption) => {
        if (opt.audio) {
            try {
                const { sound } = await Audio.Sound.createAsync(opt.audio);
                await sound.setRateAsync(1.0, false);
                await sound.playAsync();
                // optional: wait for sound?
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
        setPhase('narrative');
    };

    const logGameResult = async (analysisTag: string) => {
        setIsLogging(true);
        const endTime = Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);
        const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
        const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;

        if (!SUPABASE_URL || !SUPABASE_KEY) {
            console.error('Supabase URL veya Key eksik!');
            return;
        }

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
            console.log('✅ Oyun sonucu başarıyla kaydedildi.');
        } catch (e) {
            console.error('Log hatası:', e);
        }
    };

    const renderNarrative = () => (
        <View style={styles.textBoxContainer}>
            <View style={styles.textWrapper}>
                <Text style={styles.storyText}>{currentNode.text}</Text>
            </View>

            {/* Arrow Button to proceed */}
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
            {currentNode.question && (
                <View style={styles.questionBox}>
                    <Text style={styles.questionText}>{currentNode.question}</Text>
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
                    {/* Background Image Layer */}
                    <Animated.Image
                        source={currentNode.bgImage}
                        style={[styles.backgroundImage, { opacity: fadeAnim }]}
                        resizeMode="cover"
                        blurRadius={phase === 'choice' ? 5 : 0} // Optional blur effect during choice
                    />

                    {/* Overlay Layer */}
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
        position: 'relative' // For absolute positioning children
    },

    // Background fills the container
    backgroundImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
    },

    // Overlay sits on top of background
    overlayContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'flex-end', // Text at bottom usually? Or center? Let's try bottom for text, center for options
        alignItems: 'center',
        padding: 20,
        backgroundColor: 'rgba(0,0,0,0.1)' // Slight tint
    },

    // Text Box Styling
    textBoxContainer: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 20,
    },
    textWrapper: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 20,
        borderRadius: 20,
        borderWidth: 3,
        borderColor: '#FF9800',
        width: '90%',
        marginBottom: 20,
    },
    storyText: {
        fontSize: 22,
        color: '#3E2723',
        textAlign: 'center',
        lineHeight: 32,
        fontWeight: '600'
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

    // Choice Styling
    choicesContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)' // Darker overlay for focus
    },
    questionBox: {
        backgroundColor: '#FFF',
        padding: 15,
        borderRadius: 15,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: '#FF9800'
    },
    questionText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#E65100',
        textAlign: 'center'
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
