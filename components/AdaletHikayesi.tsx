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

// =======================================
// 📖 ADALET HİKAYESİ (s02) - İnteraktif Hikaye
// Tema: Adalet, Eşitlik ve Paylaşma
// Karakterler: Pofuduk Tavşan, Tombul Ayı, Neşeli Sincap
// =======================================

// STORY DATA - Ormandaki Lezzetli Paylaşım
const storyData: Record<string, StoryNode> = {
    // BÖLÜM 1: GİRİŞ - PART 1 (Karpuz bulunur)
    intro: {
        id: 'intro',
        bgImage: asset('/images/stories/adalet_hikayesi/s02_giris_bg_karpuz.webp'),
        audio: asset('/sounds/stories/adalet_hikayesi/s02_giris_narr.mp3'),
        next: 'intro2', // Otomatik olarak intro2'ye geç
    },

    // BÖLÜM 1: GİRİŞ - PART 2 (Tartışma başlar, seçim yapılır)
    intro2: {
        id: 'intro2',
        bgImage: asset('/images/stories/adalet_hikayesi/s02_giris_bg_tartisma.webp'),
        audio: asset('/sounds/stories/adalet_hikayesi/s02_giris_narr_2.mp3'),
        questionAudio: asset('/sounds/stories/adalet_hikayesi/s02_giris_q.mp3'),
        options: [
            {
                id: 'A',
                type: 'image_button',
                image: asset('/images/stories/adalet_hikayesi/s02_secim1_icon_dilim.webp'),
                next: 'scene_a',
            },
            {
                id: 'B',
                type: 'image_button',
                image: asset('/images/stories/adalet_hikayesi/s02_secim1_icon_baykus.webp'),
                next: 'scene_b',
            },
        ],
    },

    // BÖLÜM 2: GELİŞME - YOL A (Tavşan'ın Çözümü)
    scene_a: {
        id: 'scene_a',
        bgImage: asset('/images/stories/adalet_hikayesi/s02_yola_bg_olcum.webp'),
        audio: asset('/sounds/stories/adalet_hikayesi/s02_yola_narr.mp3'),
        questionAudio: asset('/sounds/stories/adalet_hikayesi/s02_yola_q.mp3'),
        options: [
            {
                id: 'A1',
                type: 'image_button',
                image: asset('/images/stories/adalet_hikayesi/s02_secim2a_icon_esit.webp'),
                next: 'end_a1',
            },
            {
                id: 'A2',
                type: 'image_button',
                image: asset('/images/stories/adalet_hikayesi/s02_secim2a_icon_buyuk.webp'),
                next: 'end_a2',
            },
        ],
    },

    // BÖLÜM 2: GELİŞME - YOL B (Bilge Baykuş'un Öğüdü)
    scene_b: {
        id: 'scene_b',
        bgImage: asset('/images/stories/adalet_hikayesi/s02_yolb_bg_danisma.webp'),
        audio: asset('/sounds/stories/adalet_hikayesi/s02_yolb_narr.mp3'),
        questionAudio: asset('/sounds/stories/adalet_hikayesi/s02_yolb_q.mp3'),
        options: [
            {
                id: 'B1',
                type: 'image_button',
                image: asset('/images/stories/adalet_hikayesi/s02_secim2b_icon_sira.webp'),
                next: 'end_b1',
            },
            {
                id: 'B2',
                type: 'image_button',
                image: asset('/images/stories/adalet_hikayesi/s02_secim2b_icon_secim.webp'),
                next: 'end_b2',
            },
        ],
    },

    // BÖLÜM 3: SONUÇLAR
    // SONUÇ A1 (Tam Eşitlik)
    end_a1: {
        id: 'end_a1',
        bgImage: asset('/images/stories/adalet_hikayesi/s02_sonuca1_bg_mutlu.webp'),
        audio: asset('/sounds/stories/adalet_hikayesi/s02_sonuca1_narr.mp3'),
        next: 'final',
        analysisTag: 'Adalet-Esitlik-KardesPayi',
    },

    // SONUÇ A2 (İhtiyaca Göre Paylaşım)
    end_a2: {
        id: 'end_a2',
        bgImage: asset('/images/stories/adalet_hikayesi/s02_sonuca2_bg_doygun.webp'),
        audio: asset('/sounds/stories/adalet_hikayesi/s02_sonuca2_narr.mp3'),
        next: 'final',
        analysisTag: 'Adalet-IhtiyacaGore-Empati',
    },

    // SONUÇ B1 (Sırayla Yeme)
    end_b1: {
        id: 'end_b1',
        bgImage: asset('/images/stories/adalet_hikayesi/s02_sonucb1_bg_isirik.webp'),
        audio: asset('/sounds/stories/adalet_hikayesi/s02_sonucb1_narr.mp3'),
        next: 'final',
        analysisTag: 'Adalet-SiraBekleme-Sabir',
    },

    // SONUÇ B2 (Kesen Değil Seçen)
    end_b2: {
        id: 'end_b2',
        bgImage: asset('/images/stories/adalet_hikayesi/s02_sonucb2_bg_guven.webp'),
        audio: asset('/sounds/stories/adalet_hikayesi/s02_sonucb2_narr.mp3'),
        next: 'final',
        analysisTag: 'Adalet-Guven-Fedakarlik',
    },

    // ORTAK FİNAL
    final: {
        id: 'final',
        isFinal: true,
        bgImage: asset('/images/stories/adalet_hikayesi/s02_final_ortak_bg_dostluk.webp'),
        audio: asset('/sounds/stories/adalet_hikayesi/s02_final_narr.mp3'),
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
// takılı kalmasın. Final klibi 16,3 sn + yükleme payı + konfeti süresi → 30 sn. Normal akışta endedRef sayesinde no-op.
const FINAL_GUVENLIK_MS = 30000;
const SECIM_BOSLUK = 20;

/**
 * Seçim kartının kenarı (dp): iki kart, kenar boşluklarıyla birlikte seçim alanına sığsın.
 * Eskiden sabit 250 dp idi: dikeyde 2 × (250 + 2×20) = 580 dp sütun; 360x640 telefonda alan ≈ 332x448 dp
 * (kapsayıcı overflow:'hidden') → kartlar ortadan kırpılıyordu.
 *  - dikey: 2 × (k + 40) ≤ alanH ve k + 40 ≤ alanW  → 360x640: (448 − 80) / 2 = 184 dp; 411x686: (494 − 80) / 2 = 207 dp
 *  - yatay: 2 × (k + 40) ≤ alanW ve k + 40 ≤ alanH
 * Alt sınır 100 dp: daha küçük alanda kart okunur kalsın, taşanı seçim alanındaki ScrollView kaydırır.
 */
export function secimKartBoyutu(alanW: number, alanH: number, enBuyuk: number, dikey: boolean): number {
    if (!(alanW > 0) || !(alanH > 0)) return enBuyuk; // alan henüz ölçülmedi
    const dis = SECIM_BOSLUK * 2;
    const sinir = dikey
        ? Math.min(alanW - dis, (alanH - 2 * dis) / 2)
        : Math.min((alanW - 2 * dis) / 2, alanH - dis);
    return Math.max(100, Math.floor(Math.min(enBuyuk, sinir)));
}

interface AdaletHikayesiProps {
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

export default function AdaletHikayesi({ onExit, onGameEnd, userId, userEmail, userAge }: AdaletHikayesiProps) {
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
    // Üst üste playAudio çağrılarında eski sesin sahipsiz kalıp çalmasını / eski geri çağrının yanlış düğüme
    // gitmesini engelleyen nesil sayacı (AileSepetiMacerasi ile aynı desen).
    const playGenRef = useRef(0);

    // Audio State
    const [storyVolume, setStoryVolume] = useState(1.0);
    const soundRef = useRef<Audio.Sound | null>(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    // Final sahnedeki zamanlayicilar; unmount'ta temizlenmezse component gittikten
    // sonra setState ve (bazen ikinci kez) onExit tetikliyordu.
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const currentNode = storyData[currentNodeId as keyof typeof storyData] as StoryNode;
    // Web: çocuk karar verirken sıradaki sahnelerin görsel ve sesleri önceden iner (services/storyPreload.ts).
    useStoryPreload(storyData, currentNodeId);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false; // çıkıştan sonra geç onGameEnd / onExit çağrılmasın
            playGenRef.current++; // yüklenmekte olan sesi ve bekleyen geri çağrıları geçersiz kıl
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
        if (currentNode?.audio) {
            playAudio(currentNode.audio, 'narrative');
        }

        // Final: kayıt burada DEĞİL, anlatım bittikten sonra (onAudioFinish → finishStory).
        // Bitiş olayı hiç gelmezse güvenlik zamanlayıcısı yine tam bir kez kaydeder.
        if (currentNode?.isFinal) {
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
        // Nesil await'ten ÖNCE alınır: stopAudio beklenirken bileşen kapanır ya da yeni çağrı gelirse
        // bu çağrı güncelliğini yitirir ve ses oluşturmaz.
        const gen = ++playGenRef.current;
        await stopAudio();
        if (gen !== playGenRef.current) return;
        if (!audioSource) {
            // Ses dosyası yoksa otomatik ilerleme
            timersRef.current.push(setTimeout(() => { if (gen === playGenRef.current) onAudioFinish(type); }, 1000));
            return;
        }

        try {
            const { sound } = await Audio.Sound.createAsync(playableAudioSource(audioSource), { shouldPlay: true });
            // Yükleme sürerken yeni ses istendi ya da çıkıldıysa bu ses sahipsiz kalıp çalmasın.
            if (gen !== playGenRef.current) {
                sound.unloadAsync().catch(() => { });
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
            // Ses yüklenemezse otomatik ilerleme
            timersRef.current.push(setTimeout(() => { if (gen === playGenRef.current) onAudioFinish(type); }, 1000));
        }
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
                // Final anlatımı bitti: konfeti, sonra sonuç kaydı (tek kez; onExit AYRICA çağrılmaz).
                setShowConfetti(true);
                timersRef.current.push(setTimeout(finishStory, FINAL_KONFETI_MS));
            }
        }
    };

    const handleOptionSelect = (opt: StoryOption) => {
        if (choiceLockRef.current) return; // aynı düğümde ikinci dokunuş yok sayılır
        choiceLockRef.current = true;
        pathRef.current = [...pathRef.current, opt.next];
        // Seçenekler, düğüm efekti çalışana kadar bir kare daha görünmesin (yeni düğümün seçenekleri dahil).
        setPhase('narrative');
        setCurrentNodeId(opt.next);
    };

    const logGameResult = async () => {
        const path = pathRef.current;
        const endTime = Date.now();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);
        const pathString = path.join(' -> ');

        // Seçilen yoldan anlam çıkar
        const getAnalysisSummary = () => {
            if (path.includes('end_a1')) return 'Tam Eşitlik yaklaşımı';
            if (path.includes('end_a2')) return 'İhtiyaca Göre Adalet yaklaşımı';
            if (path.includes('end_b1')) return 'Sıra Bekleme yaklaşımı';
            if (path.includes('end_b2')) return 'Güven ve Fedakarlık yaklaşımı';
            return 'Bilinmeyen';
        };

        // Not: Sonuc kaydi onGameEnd -> saveGameResult uzerinden yapiliyor. Eskiden burada
        // gonderilmeyen (olu) bir logData ve env-var kontrolu vardi; env yoksa erken return
        // onGameEnd'i de atliyordu. Kaldirildi ki sonuc her zaman raporlansin.
        // onGameEnd varsa merkezi kaydetme fonksiyonunu çağır
        // Veriyi 'cizimVerisi' alanına JSON olarak gömüyoruz, böylece admin paneli 'cizim_verisi'nden okuyabilir.
        if (onGameEnd) {
            const analysisData = JSON.stringify({
                secilen_yol: pathString,
                yaklasim: getAnalysisSummary(),
                // NOT: Sosyal-Duygusal hikayeler için hata/süre analizi yapılmaz.
                // Değerlendirme çocuğun yaptığı seçimlere dayanır.
                oyun_turu_aciklama: 'İnteraktif Hikaye - Adalet ve Paylaşım Temalı',
            });

            onGameEnd(
                'adalet-hikayesi',
                durationSeconds,
                path.length,
                0,
                undefined,
                { cizimVerisi: analysisData }
            );
        } else {
            console.warn('onGameEnd prop missing in AdaletHikayesi');
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
                        resizeMode={isPortrait ? "cover" : "contain"}
                        blurRadius={phase === 'choice' ? 3 : 0}
                    />

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

