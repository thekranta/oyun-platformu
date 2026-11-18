import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import DynamicBackground from './DynamicBackground';
import { asset } from '../lib/assetMap';
import { useStoryPreload } from '../hooks/useStoryPreload';
import { playableAudioSource } from '../services/storyPreload';

// STORY DATA (Text removed from UI, kept in data for reference if needed, but logic driven by ID)
const storyData = {
    intro: {
        id: 'intro',
        bgImage: asset('/images/stories/aile_sepeti_macerasi/s02_giris_bg_misket_sepet.webp'),
        audio: asset('/sounds/stories/aile_sepeti_macerasi/s02_giris_narr.mp3'),
        questionAudio: asset('/sounds/stories/aile_sepeti_macerasi/s02_giris_q.mp3'),
        options: [
            {
                id: 'A',
                type: 'image_button',
                image: asset('/images/stories/aile_sepeti_macerasi/s02_secim1_icon_togo.webp'),
                next: 'scene_a',
            },
            {
                id: 'B',
                type: 'image_button',
                image: asset('/images/stories/aile_sepeti_macerasi/s02_secim1_icon_bobo.webp'),
                next: 'scene_b',
            },
        ],
    },
    scene_a: {
        id: 'scene_a',
        bgImage: asset('/images/stories/aile_sepeti_macerasi/s02_yolA_bg_togo_kaygan_tepe.webp'),
        audio: asset('/sounds/stories/aile_sepeti_macerasi/s02_yolA_narr.mp3'),
        questionAudio: asset('/sounds/stories/aile_sepeti_macerasi/s02_yolA_q.mp3'),
        options: [
            {
                id: 'A1',
                type: 'image_button',
                image: asset('/images/stories/aile_sepeti_macerasi/s02_secim2A_icon_ele_ele.webp'),
                next: 'end_a1',
            },
            {
                id: 'A2',
                type: 'image_button',
                image: asset('/images/stories/aile_sepeti_macerasi/s02_secim2A_icon_gorev.webp'),
                next: 'end_a2',
            },
        ],
    },
    scene_b: {
        id: 'scene_b',
        bgImage: asset('/images/stories/aile_sepeti_macerasi/s02_yolB_bg_bobo_yol_ayrimi.webp'),
        audio: asset('/sounds/stories/aile_sepeti_macerasi/s02_yolB_narr.mp3'),
        questionAudio: asset('/sounds/stories/aile_sepeti_macerasi/s02_yolB_q.mp3'),
        options: [
            {
                id: 'B1',
                type: 'image_button',
                image: asset('/images/stories/aile_sepeti_macerasi/s02_secim2B_icon_ayrilmadan.webp'),
                next: 'end_b1',
            },
            {
                id: 'B2',
                type: 'image_button',
                image: asset('/images/stories/aile_sepeti_macerasi/s02_secim2B_icon_isaret.webp'),
                next: 'end_b2',
            },
        ],
    },
    end_a1: {
        id: 'end_a1',
        bgImage: asset('/images/stories/aile_sepeti_macerasi/s02_sonucA1_bg_ele_ele_tepe.webp'),
        audio: asset('/sounds/stories/aile_sepeti_macerasi/s02_sonucA1_narr.mp3'),
        next: 'final',
        analysisTag: 'Sosyal-Isbirligi-Guven',
    },
    end_a2: {
        id: 'end_a2',
        bgImage: asset('/images/stories/aile_sepeti_macerasi/s02_sonucA2_bg_gorev_paylasimi.webp'),
        audio: asset('/sounds/stories/aile_sepeti_macerasi/s02_sonucA2_narr.mp3'),
        next: 'final',
        analysisTag: 'Sosyal-Liderlik-Planlama',
    },
    end_b1: {
        id: 'end_b1',
        bgImage: asset('/images/stories/aile_sepeti_macerasi/s02_sonucB1_bg_ayrilmadan_arama.webp'),
        audio: asset('/sounds/stories/aile_sepeti_macerasi/s02_sonucB1_narr.mp3'),
        next: 'final',
        analysisTag: 'Guvenlik-Birliktelik',
    },
    end_b2: {
        id: 'end_b2',
        bgImage: asset('/images/stories/aile_sepeti_macerasi/s02_sonucB2_bg_isaretli_plan.webp'),
        audio: asset('/sounds/stories/aile_sepeti_macerasi/s02_sonucB2_narr.mp3'),
        next: 'final',
        analysisTag: 'Bilissel-ProblemCozme-Harita',
    },
    final: {
        id: 'final',
        isFinal: true,
        bgImage: asset('/images/stories/aile_sepeti_macerasi/s02_final_bg_birlikte_aile.webp'),
        audio: asset('/sounds/stories/aile_sepeti_macerasi/s02_final_narr.mp3'),
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

// Final sahnesi: anlatım bitince konfeti, FINAL_KONFETI_MS sonra sonuç kaydı (onGameEnd → sonuç ekranı).
// Eskiden onGameEnd final düğüme GİRER GİRMEZ çağrılıyordu; ana ekran hemen sonuç ekranına geçtiği için
// final anlatımı (s02_final_narr.mp3) ve görseli hiç oynamıyordu.
const FINAL_KONFETI_MS = 2600;
// Güvenlik süresi: ses yüklenip bitiş olayı hiç gelmezse (web otomatik oynatma engeli, bozuk ağ) çocuk finalde
// takılı kalmasın. Final klibi 9,9 sn + yükleme payı + konfeti süresi → 30 sn. Normal akışta endedRef sayesinde no-op.
const FINAL_GUVENLIK_MS = 30000;
const SECIM_BOSLUK = 20;

/**
 * Seçim kartının kenarı (dp): iki kart, kenar boşluklarıyla birlikte seçim alanına sığsın.
 * Eskiden sabit 250 dp idi: dikeyde 2 × (250 + 2×20) = 580 dp sütun; 360x640 telefonda alan ≈ 332x448 dp
 * (kapsayıcı overflow:'hidden') → kartlar ortadan kırpılıyordu.
 *  - dikey: 2 × (k + 40) ≤ alanH ve k + 40 ≤ alanW  → 360x640: (448 − 80) / 2 = 184 dp; 411x686: (494 − 80) / 2 = 207 dp
 *  - yatay: 2 × (k + 40) ≤ alanW ve k + 40 ≤ alanH
 * Alt sınır 100 dp: daha küçük alanda kart okunur kalsın, taşanı seçim alanındaki ScrollView kaydırır.
 * (AdaletHikayesi'nde aynısı var; birini ötekine import etmek iki hikâyenin tembel parçalarını birleştirirdi.)
 */
export function secimKartBoyutu(alanW: number, alanH: number, enBuyuk: number, dikey: boolean): number {
    if (!(alanW > 0) || !(alanH > 0)) return enBuyuk; // alan henüz ölçülmedi
    const dis = SECIM_BOSLUK * 2;
    const sinir = dikey
        ? Math.min(alanW - dis, (alanH - 2 * dis) / 2)
        : Math.min((alanW - 2 * dis) / 2, alanH - dis);
    return Math.max(100, Math.floor(Math.min(enBuyuk, sinir)));
}

interface AileSepetiMacerasiProps {
    onExit: () => void;
    onGameEnd?: (
        oyunAdi: string,
        sure: number,
        hamle: number,
        hata: number,
        cizimVerisi?: any,
        ekstraVeri?: any
    ) => void;
    userId?: string;
    userEmail?: string;
    userAge?: number;
}

export default function AileSepetiMacerasi({ onExit, onGameEnd, userId, userEmail, userAge }: AileSepetiMacerasiProps) {
    const { width, height } = useWindowDimensions();
    const isPortrait = height > width;
    const isMobile = width < 768;

    const [currentNodeId, setCurrentNodeId] = useState<string>('intro');
    const [phase, setPhase] = useState<'narrative' | 'choice'>('narrative');
    // Yol ref'te tutulur: sonuç kaydı zamanlayıcıdan / ses geri çağrısından yapılıyor, state o render'ın
    // kapanışında bayat kalırdı. Ekranda gösterilmediği için state'e gerek yok.
    const pathRef = useRef<string[]>(['intro']);

    const [startTime] = useState<number>(Date.now());
    const [showConfetti, setShowConfetti] = useState(false);
    // Seçim alanının ölçüsü (overlayContainer onLayout) → kart boyutu buna göre hesaplanır.
    const [secimAlani, setSecimAlani] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

    // Bitiş bayrakları (memory: onGameEnd oyunu bitirir; tek kez, en sonda). isLogging state'i zamanlayıcı
    // kapanışında bayat kaldığı için çift çağrıya karşı yetersizdi.
    const endedRef = useRef(false);
    const finalReachedRef = useRef(false);
    const mountedRef = useRef(true);
    // Düğüm başına seçim kilidi: aynı karede iki dokunuş (iki parmak) yola iki seçim yazıyor,
    // secilen_yol ve hamle sayısı AI analizine bozuk gidiyordu. Yeni düğüme geçince açılır.
    const choiceLockRef = useRef(false);

    // Audio State
    const [storyVolume, setStoryVolume] = useState(1.0);
    const soundRef = useRef<Audio.Sound | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    // Ust uste playAudio cagrilarinda eski ses callback'inin yanlis dugume gitmesini
    // engellemek icin nesil (generation) sayaci.
    const playGenRef = useRef(0);
    // Final sahnedeki zamanlayicilar; unmount'ta temizlenmezse component gittikten
    // sonra setState/onExit tetikliyordu.
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const currentNode = storyData[currentNodeId as keyof typeof storyData] as StoryNode;
    // Web: çocuk karar verirken sıradaki sahnelerin görsel ve sesleri önceden iner (services/storyPreload.ts).
    useStoryPreload(storyData, currentNodeId);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false; // çıkıştan sonra geç onGameEnd / onExit çağrılmasın
            // eslint-disable-next-line react-hooks/exhaustive-deps
            playGenRef.current++; // bekleyen ses callback'lerini gecersiz kil
            stopAudio();
            // eslint-disable-next-line react-hooks/exhaustive-deps
            timersRef.current.forEach(clearTimeout);
        };
    }, []);

    useEffect(() => {
        if (soundRef.current) {
            soundRef.current.setVolumeAsync(storyVolume);
        }
    }, [storyVolume]);

    // On Node Change
    useEffect(() => {
        choiceLockRef.current = false; // yeni düğüm: seçim kilidi açılır
        setPhase('narrative');
        setShowConfetti(false);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

        // Auto-play narrator
        playAudio(currentNode.audio, 'narrative');

        // Final: kayıt burada DEĞİL, anlatım bittikten sonra (onAudioFinish → finishStory).
        // Bitiş olayı hiç gelmezse güvenlik zamanlayıcısı yine tam bir kez kaydeder.
        if (currentNode.isFinal) {
            finalReachedRef.current = true;
            timersRef.current.push(setTimeout(finishStory, FINAL_GUVENLIK_MS));
        }
    }, [currentNodeId]);

    const stopAudio = async () => {
        if (soundRef.current) {
            const s = soundRef.current;
            soundRef.current = null;
            try {
                await s.stopAsync();
                await s.unloadAsync();
            } catch (e) { }
        }
    };

    const playAudio = async (audioSource: any, type: 'narrative' | 'question') => {
        // Bu cagrinin nesli; daha yeni bir playAudio gelirse bu callback gecersiz olur.
        // Nesil await'ten ÖNCE alınır: eskiden stopAudio beklenirken bileşen kapanırsa (unmount nesli artırır)
        // bu çağrı sonradan yeni nesli alıp sesi çıkıştan sonra da çalabiliyordu.
        const gen = ++playGenRef.current;
        await stopAudio();
        if (gen !== playGenRef.current) return;
        if (!audioSource) {
            // Ses yoksa hikayeyi kilitleme: anlatida ilerlemeyi tetikle.
            onAudioFinish(type);
            return;
        }

        try {
            const { sound } = await Audio.Sound.createAsync(playableAudioSource(audioSource), { shouldPlay: true });
            // Daha yeni bir playAudio araya girdiyse bu ses'i sahiplenme (orphan) ve dokun.
            if (gen !== playGenRef.current) {
                await sound.unloadAsync();
                return;
            }
            soundRef.current = sound;
            await sound.setVolumeAsync(storyVolume);

            sound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded && status.didJustFinish && gen === playGenRef.current) {
                    onAudioFinish(type);
                }
            });
        } catch (e) {
            console.log('Audio playback error:', e);
            // Ses yuklenemezse hikaye donmasin: guncel nesilse ilerlemeyi tetikle.
            if (gen === playGenRef.current) onAudioFinish(type);
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
                // Final anlatımı bitti: konfeti, sonra sonuç kaydı (tek kez; onExit AYRICA çağrılmaz).
                setShowConfetti(true);
                timersRef.current.push(setTimeout(finishStory, FINAL_KONFETI_MS));
            }
        }
        // If type === 'question', do nothing. Wait for user input.
    };

    // Hikâyeyi bitir: onGameEnd TEK KEZ ve en sonda (sonuç ekranı); onGameEnd yoksa menüye dön.
    // Eskiden final anlatımı bitince ayrıca onExit de çağrılıyordu; ikisi art arda çalışınca ekran
    // sonuç <-> menü arasında sıçrardı. Bileşen kapandıktan sonra (çıkış) hiçbir şey çağrılmaz.
    const finishStory = () => {
        if (endedRef.current || !mountedRef.current) return;
        endedRef.current = true;
        if (onGameEnd) logGameResult();
        else onExit();
    };

    // Çıkış düğmesi: final sahnesine ulaşıldıysa hikâye tamamlanmıştır; sonuç kaybolmasın diye çıkış
    // kaydı tam bir kez yapar (finishStory). Finalden önce çıkılırsa eskisi gibi menüye döner.
    const handleExit = () => {
        if (finalReachedRef.current && !endedRef.current && onGameEnd) {
            finishStory();
            return;
        }
        onExit();
    };

    const handleOptionSelect = (opt: StoryOption) => {
        if (choiceLockRef.current) return; // aynı düğümde ikinci dokunuş yok sayılır
        choiceLockRef.current = true;
        pathRef.current = [...pathRef.current, opt.next]; // Track path
        // Seçenekler, düğüm efekti çalışana kadar bir kare daha görünmesin (yeni düğümün seçenekleri dahil).
        setPhase('narrative');
        setCurrentNodeId(opt.next);
    };

    const logGameResult = async () => {
        const path = pathRef.current;
        const endTime = Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);

        // Build path string like "intro -> scene_a -> end_a1 -> final"
        const pathString = path.join(' -> ');

        // Not: Sonuc kaydi onGameEnd -> saveGameResult uzerinden yapiliyor. Eskiden burada
        // gonderilmeyen (olu) bir logData ve env-var kontrolu vardi; env yoksa erken return
        // onGameEnd'i de atliyordu. Kaldirildi ki sonuc her zaman raporlansin.
        if (onGameEnd) {
            const analysisData = JSON.stringify({
                secilen_yol: pathString,
                maarif_kazanim: 'Sosyal-Duygusal Gelişim: Aile bağları, işbirliği ve problem çözme becerilerini geliştirir',
            });

            onGameEnd(
                'aile-sepeti',
                durationSeconds,
                path.length,
                0,
                undefined,
                { cizimVerisi: analysisData }
            );
        }
    };

    // Kart kenarı seçim alanına göre hesaplanır (bkz. secimKartBoyutu); kare kart + resizeMode contain → resim orantılı.
    const kartBoyutu = secimKartBoyutu(secimAlani.w, secimAlani.h, isMobile ? 250 : 350, isPortrait);

    const renderChoices = () => (
        <View style={styles.choicesContainer}>
            {/* Yedek: alan alt sınırın da altındaysa kırpılmak yerine kayar; kısa içerik ortalı kalır. */}
            <ScrollView style={{ flex: 1, alignSelf: 'stretch' }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}>
                <View style={[styles.optionsRow, {
                    flexDirection: isPortrait ? 'column' : 'row',
                }]}>
                    {currentNode.options?.map((opt) => (
                        <TouchableOpacity
                            key={opt.id}
                            style={[styles.largeOptionButton, {
                                width: kartBoyutu,
                                height: kartBoyutu,
                                margin: SECIM_BOSLUK
                            }]}
                            onPress={() => handleOptionSelect(opt)}
                            activeOpacity={0.8}
                        >
                            <Image source={opt.image} style={styles.largeOptionImage} resizeMode="contain" />
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );

    return (
        <DynamicBackground onExit={handleExit}>
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
                    <View
                        style={styles.overlayContainer}
                        onLayout={(e) => {
                            const { width: w, height: h } = e.nativeEvent.layout;
                            setSecimAlani((a) => (a.w === w && a.h === h ? a : { w, h }));
                        }}
                    >
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

