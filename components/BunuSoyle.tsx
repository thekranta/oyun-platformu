import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, ImageBackground, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import ProgressBar from './ProgressBar';
import { useSound } from './SoundContext';
import { asset } from '../lib/assetMap';

// Arka plan görseli
const BACKGROUND_IMAGE = asset('/backgrounds/games/bunu_soyle_bg.webp');

// Aşama Verileri
const STAGES = [
    { id: 1, image: asset('/images/elma.webp'), word: 'Elma' },
    { id: 2, image: asset('/images/araba.webp'), word: 'Araba' },
    { id: 3, image: asset('/images/kedi.webp'), word: 'Kedi' },
    { id: 4, image: asset('/images/top.webp'), word: 'Top' },
    { id: 5, image: asset('/images/ev.webp'), word: 'Ev' },
];

interface BunuSoyleProps {
    onGameEnd: (oyunAdi: string, sure: number, finalHamle: number, finalHata: number, algilananKelime?: string, extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string }) => void;
    onExit: () => void;
}

// Interface for tracking pronunciation results per stage
interface StageResult {
    stage: number;
    expected: string;
    transcribed: string;
    isCorrect: boolean;
    timestamp: number;
}

export default function BunuSoyle({ onGameEnd, onExit }: BunuSoyleProps) {
    const { stopSound, playSound } = useSound();
    const [currentStage, setCurrentStage] = useState(0);
    const [gameReady, setGameReady] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState('Kayıt Hazır');
    const [startTime] = useState(Date.now());
    const [, setMoves] = useState(0);
    const [, setErrors] = useState(0);
    // handleNextStage setTimeout'tan cagrildigi icin final onGameEnd moves/errors'i eski
    // closure'dan okur ve son asamayi saymaz. Guncel degerleri bu ref'lerden aliyoruz.
    const movesRef = useRef(0);
    const errorsRef = useRef(0);
    const [allTranscripts, setAllTranscripts] = useState<string[]>([]);
    const [stageResults, setStageResults] = useState<StageResult[]>([]);
    const [permissionResponse, requestPermission] = Audio.usePermissions();

    // Recording Ref: Asenkron işlemlerde state'in güncel olmama sorununu çözmek için
    const recordingRef = useRef<Audio.Recording | null>(null);
    // Bas-konus yaris kosulu: async startRecording bitmeden onPressOut gelirse durdurma
    // istegini bekletiyoruz; kayit olusunca hemen durduruluyor (yetim kayit/hayalet
    // "dinliyor" durumunu engeller).
    const startingRef = useRef(false);
    const pendingStopRef = useRef(false);

    const [audioLevels, setAudioLevels] = useState<number[]>([0, 0, 0, 0, 0]);
    const [maxAudioLevel, setMaxAudioLevel] = useState(-160);

    // Animasyon değerleri
    const barAnims = useRef([
        new Animated.Value(10),
        new Animated.Value(10),
        new Animated.Value(10),
        new Animated.Value(10),
        new Animated.Value(10)
    ]).current;

    const currentItem = STAGES[currentStage];

    // İzin kontrolü
    useEffect(() => {
        (async () => {
            if (!permissionResponse) {
                await requestPermission();
            }
        })();
    }, []);

    // Aşama değiştiğinde: Her zaman kullanıcının basılı tutmasını bekle (push-to-talk)
    useEffect(() => {
        let isMounted = true;

        const initStage = async () => {
            // Önceki kaydı temizle
            await stopRecording(false);

            // PUSH-TO-TALK: Her aşamada kullanıcının mikrofona basılı tutmasını bekle
            if (isMounted) {
                setRecordingStatus('Basılı Tut ve Söyle 🎤');
            }
        };

        initStage();

        return () => {
            isMounted = false;
            // Cleanup sırasında asenkron durdurma yapıyoruz ama await edemeyiz
            // Bu yüzden best-effort durdurma yapıyoruz
            if (recordingRef.current) {
                recordingRef.current.stopAndUnloadAsync().catch(() => { });
                recordingRef.current = null;
            }
            // Çıkışta müziği tekrar başlat (eğer durdurulmuşsa)
            playSound('background');
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStage]);

    // Ses seviyesi görselleştirmesi
    useEffect(() => {
        if (isRecording) {
            const animations = barAnims.map((anim, index) => {
                const targetHeight = 20 + (audioLevels[index] * 100) + (Math.random() * 30);
                return Animated.timing(anim, {
                    toValue: Math.min(targetHeight, 120),
                    duration: 100,
                    useNativeDriver: false,
                });
            });
            Animated.parallel(animations).start();
        } else {
            const animations = barAnims.map(anim =>
                Animated.timing(anim, {
                    toValue: 10,
                    duration: 200,
                    useNativeDriver: false,
                })
            );
            Animated.parallel(animations).start();
        }
    }, [audioLevels, isRecording]);

    const startRecording = async () => {
        startingRef.current = true;
        pendingStopRef.current = false;
        try {
            // Kayıt başlarken arka plan müziğini durdur
            await stopSound('background');

            console.log('🎙️ Kayıt başlatılıyor...');
            console.log('İzin durumu:', permissionResponse?.status);

            // Mevcut kayıt varsa temizle
            if (recordingRef.current) {
                try {
                    await recordingRef.current.stopAndUnloadAsync();
                } catch (e) {
                    // Zaten durmuşsa sorun yok
                }
                recordingRef.current = null;
            }

            if (permissionResponse?.status !== 'granted') {
                console.log('⚠️ Mikrofon izni yok, izin isteniyor...');
                const newPermission = await requestPermission();
                console.log('Yeni izin durumu:', newPermission?.status);
                if (newPermission?.status !== 'granted') {
                    setRecordingStatus('Mikrofon İzni Gerekli 🎤');
                    setIsRecording(false);
                    return;
                }
            }

            await Audio.setAudioModeAsync({
                allowsRecordingIOS: true,
                playsInSilentModeIOS: true,
            });

            const recordingOptions = {
                ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
                isMeteringEnabled: true,
            };

            console.log('📝 Audio.Recording.createAsync çağrılıyor...');
            const { recording: newRecording } = await Audio.Recording.createAsync(
                recordingOptions,
                (status) => {
                    if (status.isRecording) {
                        let metering = status.metering;

                        // WEB SİMÜLASYONU
                        if (Platform.OS === 'web' || metering === undefined) {
                            metering = -40 + Math.random() * 30;
                        }

                        const level = Math.max(0, (metering + 160) / 160);
                        setMaxAudioLevel(prev => Math.max(prev, metering));

                        setAudioLevels([
                            level * 0.8,
                            level * 1.2,
                            level * 1.5,
                            level * 1.2,
                            level * 0.8
                        ]);
                    }
                },
                100
            );

            console.log('✅ Kayıt başarıyla oluşturuldu');
            recordingRef.current = newRecording;
            setIsRecording(true);
            setRecordingStatus('SİSTEM DİNLİYOR...');
            setMaxAudioLevel(-160);

            // Push-to-talk: Otomatik durma yok, kullanıcı bıraktığında duracak
            startingRef.current = false;
            // Kayit olusurken kullanici parmagini kaldirdiysa hemen durdur
            if (pendingStopRef.current) {
                pendingStopRef.current = false;
                stopRecording(true);
            }
        } catch (err) {
            console.error('⚠️ Kayıt başlatılamadı:', err);
            // Hata olsa bile kullanıcıya tekrar deneme şansı ver
            startingRef.current = false;
            pendingStopRef.current = false;
            setIsRecording(false);
            setRecordingStatus('Basılı Tut ve Söyle 🔴');
        }
    };

    const stopRecording = async (shouldAnalyze = true) => {
        console.log('🛑 stopRecording çağrıldı. Analiz:', shouldAnalyze);

        // Kayit henuz olusuyorsa durdurmayi beklet; startRecording bitince otomatik durur.
        if (startingRef.current) {
            pendingStopRef.current = true;
            return;
        }

        let audioUri: string | null = null;

        try {
            if (recordingRef.current) {
                // USER REQUEST: Önce durdur, sonra URI al
                console.log('🛑 Kayıt durduruluyor...');

                const stopPromise = recordingRef.current.stopAndUnloadAsync();
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Stop timeout')), 1000)
                );

                await Promise.race([stopPromise, timeoutPromise]);

                // URI'yi durdurduktan SONRA al
                audioUri = recordingRef.current.getURI();
                console.log("✅ Kayıt Durduruldu. URI:", audioUri);

                recordingRef.current = null;
            }
        } catch (error) {
            console.log("Durdurma hatası (handle edildi):", error);
            recordingRef.current = null;
        }

        setIsRecording(false);

        // Kayıt bitince arka plan müziğini tekrar başlat
        playSound('background');

        if (shouldAnalyze && audioUri) {
            setRecordingStatus('Analiz Ediliyor...');
            analyzeSpeech(currentItem.word, audioUri);
        } else if (shouldAnalyze && !audioUri) {
            console.log('⚠️ Audio URI bulunamadı (null), analiz atlanıyor');

            if (Platform.OS === 'web') {
                console.log('🌐 Web için ek kontrol: URI null geldi.');
            }

            setRecordingStatus('Ses Dosyası Hatası ⚠️');
            setTimeout(() => handleNextStage(), 2000);
        }
    };


    const analyzeSpeech = async (beklenenKelime: string, audioUri: string) => {
        // SESSİZLİK KONTROLÜ
        console.log("Maksimum Ses Seviyesi:", maxAudioLevel);

        if (maxAudioLevel < -50) {
            setRecordingStatus('Ses Algılanmadı 🔇');
            errorsRef.current += 1; setErrors(e => e + 1);
            setAllTranscripts(prev => [...prev, "(Sessiz)"]);
            movesRef.current += 1; setMoves(m => m + 1);

            // Record silent result
            const silentResult: StageResult = {
                stage: currentStage + 1,
                expected: beklenenKelime,
                transcribed: "(Sessiz)",
                isCorrect: false,
                timestamp: Date.now()
            };
            const updatedResults = [...stageResults, silentResult];
            setStageResults(updatedResults);

            // Otomatik olarak bir sonraki aşamaya geç
            setTimeout(() => {
                handleNextStage(updatedResults);
            }, 2000);
            return;
        }

        try {
            // Platform-specific audio blob handling
            let audioBlob: Blob;

            if (Platform.OS === 'web') {
                // WEB: fetch ile blob al
                console.log('🌐 Web platformu tespit edildi, fetch kullanılıyor...');
                const response = await fetch(audioUri);
                audioBlob = await response.blob();
            } else {
                // MOBILE: expo-file-system ile base64 oku ve blob'a çevir
                console.log('📱 Mobil platform tespit edildi, FileSystem kullanılıyor...');
                const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
                    encoding: 'base64',
                });
                // Base64'ü Blob'a çevir
                const byteCharacters = atob(base64Audio);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                audioBlob = new Blob([byteArray], { type: 'audio/webm' });
            }

            // OpenAI Whisper API çağrısı
            const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
            if (!apiKey) {
                throw new Error('OpenAI API key bulunamadı. Lütfen .env dosyasına EXPO_PUBLIC_OPENAI_API_KEY ekleyin.');
            }

            console.log('🎤 OpenAI Whisper API çağrılıyor...');

            // FormData oluştur
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.webm');
            formData.append('model', 'whisper-1');
            formData.append('language', 'tr');

            // API çağrısı için AbortController ile timeout ekle
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 saniye timeout

            try {
                const response = await fetch(
                    'https://api.openai.com/v1/audio/transcriptions',
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`,
                        },
                        body: formData,
                        signal: controller.signal
                    }
                );
                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Whisper API Hata Yanıtı:', errorText);
                    throw new Error(`Whisper API hatası: ${response.status}`);
                }

                const data = await response.json();
                console.log('📥 Whisper API Yanıtı:', data);

                // Transcript'i çıkar
                let transcript = data.text || '';

                if (!transcript) {
                    transcript = '(Anlaşılamadı)';
                }

                console.log('✅ Algılanan kelime:', transcript);
                setAllTranscripts(prev => [...prev, transcript]);

                const temizlenenTranscript = transcript.toLowerCase().trim().replace(/[.,!?]/g, '');
                const temizlenenBeklenen = beklenenKelime.toLowerCase().trim();

                // Karşılaştırma - kelime içeriyor mu kontrol et (daha esnek)
                const isCorrect = temizlenenTranscript === temizlenenBeklenen ||
                    temizlenenTranscript.includes(temizlenenBeklenen);

                // Her durumda hareketi kaydet
                movesRef.current += 1; setMoves(m => m + 1);

                // Stage result kaydet
                const stageResult: StageResult = {
                    stage: currentStage + 1,
                    expected: beklenenKelime,
                    transcribed: transcript,
                    isCorrect: isCorrect,
                    timestamp: Date.now()
                };
                const updatedResults = [...stageResults, stageResult];
                setStageResults(updatedResults);

                if (isCorrect) {
                    // Doğru cevap - hata yok
                    setRecordingStatus('Harika! 🎉');
                    setTimeout(() => handleNextStage(updatedResults), 2000);
                } else {
                    // Yanlış cevap - hata kaydet ve yine de devam et
                    errorsRef.current += 1; setErrors(e => e + 1);
                    setRecordingStatus(`"${transcript}" 😊`);
                    // Otomatik olarak bir sonraki aşamaya geç
                    setTimeout(() => handleNextStage(updatedResults), 2000);
                }
            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('API isteği zaman aşımına uğradı');
                }
                throw fetchError;
            }
        } catch (error) {
            console.error('⚠️ Whisper API hatası:', error);
            // Hata durumunda bile kaydet ve devam et
            setAllTranscripts(prev => [...prev, '(API Hatası)']);

            const errorResult: StageResult = {
                stage: currentStage + 1,
                expected: beklenenKelime,
                transcribed: "(API Hatası)",
                isCorrect: false,
                timestamp: Date.now()
            };
            const updatedResults = [...stageResults, errorResult];
            setStageResults(updatedResults);

            errorsRef.current += 1; setErrors(e => e + 1);
            movesRef.current += 1; setMoves(m => m + 1);
            setRecordingStatus('API Hatası ⚠️');
            setTimeout(() => handleNextStage(updatedResults), 2000);
        }
    };


    const handleNextStage = (latestResults?: StageResult[]) => {
        // Use provided results or fall back to state (for non-analysis calls)
        const resultsToUse = latestResults || stageResults;

        if (currentStage < STAGES.length - 1) {
            setCurrentStage(prev => prev + 1);
        } else {
            const duration = Math.floor((Date.now() - startTime) / 1000);

            // Hesaplamalar
            const totalCorrect = resultsToUse.filter(r => r.isCorrect).length;
            const accuracy = resultsToUse.length > 0
                ? Math.round((totalCorrect / resultsToUse.length) * 100 * 100) / 100
                : 0;

            // Yapılandırılmış JSON olarak sonuçları gönder
            const pronunciationData = JSON.stringify({
                results: resultsToUse,
                totalCorrect: totalCorrect,
                totalStages: STAGES.length,
                accuracy: accuracy
            });

            console.log('📊 Telaffuz Analizi:', pronunciationData);

            onGameEnd('bunu-soyle', duration, movesRef.current, errorsRef.current, pronunciationData, {
                zorlukSeviyesi: currentStage + 1,
                kazanimOdagi: 'Dil Gelişimi ve Sözel İfade',
            });
        }
    };

    return (
        <ImageBackground source={BACKGROUND_IMAGE} style={styles.bgContainer} resizeMode="cover">
            <View style={styles.darkOverlay} />
            <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                <Ionicons name="arrow-back" size={28} color="#333" />
            </TouchableOpacity>
            <View style={styles.topBar}>
                <ProgressBar current={currentStage + 1} total={STAGES.length} />
            </View>

            <View style={styles.container}>
                <Text style={styles.title}>Bunu Söyle! 🎙️</Text>
                <Text style={styles.subtitle}>Resimdeki nedir?</Text>

                <View style={styles.card}>
                    <View style={styles.imageContainer}>
                        <Image source={currentItem.image} style={styles.image} resizeMode="contain" />
                    </View>
                    <Text style={styles.targetWord}>{currentItem.word}</Text>
                </View>

                <View style={styles.controlsContainer}>
                    {isRecording ? (
                        <TouchableOpacity
                            style={styles.recordingFeedback}
                            onPressOut={() => stopRecording(true)}
                            activeOpacity={0.9}
                        >
                            <Text style={styles.promptText}>ŞİMDİ SÖYLE: {currentItem.word}</Text>
                            <View style={styles.visualizerContainer}>
                                <View style={styles.barsContainer}>
                                    {barAnims.map((anim, index) => (
                                        <Animated.View
                                            key={index}
                                            style={[
                                                styles.visualizerBar,
                                                { height: anim }
                                            ]}
                                        />
                                    ))}
                                </View>
                                <Text style={styles.listeningText}>🔴 DİNLİYOR... (Bırak = Gönder)</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.recordButton}
                            onPressIn={startRecording}
                            onPressOut={() => stopRecording(true)}
                            activeOpacity={0.7}
                            delayPressIn={0}
                        >
                            <Ionicons name="mic" size={50} color="white" />
                            <Text style={styles.holdToRecordText}>BASILI TUT</Text>
                        </TouchableOpacity>
                    )}

                    <Text style={[
                        styles.statusText,
                        isRecording && styles.statusRecording,
                        recordingStatus === 'Analiz Ediliyor...' && styles.statusProcessing,
                        recordingStatus === 'Harika! 🎉' && styles.statusSuccess,
                        recordingStatus === 'Tekrar Dene 😊' && styles.statusError,
                        recordingStatus === 'Ses Algılanmadı 🔇' && styles.statusError
                    ]}>
                        {recordingStatus}
                    </Text>
                </View>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    message="Gördüğün resmin adını yüksek sesle söyle!"
                    countdownSeconds={5}
                    onComplete={() => setGameReady(true)}
                />
            )}
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    bgContainer: { flex: 1 },
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    exitBtn: {
        position: 'absolute',
        top: 50,
        left: 16,
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    topBar: {
        width: '100%',
        paddingTop: 40,
        paddingBottom: 10,
        backgroundColor: 'rgba(255,255,255,0.8)',
        zIndex: 10,
    },
    container: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 20,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 18,
        color: '#555',
        marginBottom: 30,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 25,
        padding: 20,
        alignItems: 'center',
        width: '90%',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        marginBottom: 30,
    },
    imageContainer: {
        width: 180,
        height: 180,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: '#F5F5F5',
        borderRadius: 20,
        overflow: 'hidden',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    targetWord: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#34495E',
        letterSpacing: 1,
    },
    controlsContainer: {
        alignItems: 'center',
        width: '100%',
        height: 200,
        justifyContent: 'flex-start',
    },
    recordButton: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#E74C3C',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#E74C3C',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        marginBottom: 20,
        borderWidth: 4,
        borderColor: 'white',
    },
    recordingFeedback: {
        alignItems: 'center',
        width: '100%',
    },
    promptText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#E74C3C',
        marginBottom: 20,
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    waitingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 120,
        marginBottom: 10,
    },
    waitingText: {
        fontSize: 22,
        fontWeight: '600',
        color: '#95A5A6',
        letterSpacing: 1,
    },
    visualizerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 120,
        marginBottom: 10,
    },
    barsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        height: 80,
        marginBottom: 10,
        gap: 8,
    },
    visualizerBar: {
        width: 12,
        backgroundColor: '#E74C3C',
        borderRadius: 6,
    },
    listeningText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#E74C3C',
        letterSpacing: 1,
    },
    statusText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#7F8C8D',
        textAlign: 'center',
    },
    statusRecording: { color: '#E74C3C', fontWeight: 'bold' },
    statusProcessing: { color: '#F39C12', fontWeight: 'bold' },
    statusSuccess: { color: '#2ECC71', fontWeight: 'bold' },
    statusError: { color: '#E74C3C', fontWeight: 'bold' },
    holdToRecordText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 4,
        letterSpacing: 1,
    }
});

