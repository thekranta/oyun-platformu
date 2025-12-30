import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DynamicBackground from './DynamicBackground';
import ProgressBar from './ProgressBar';
import { useSound } from './SoundContext';

// Aşama Verileri
const STAGES = [
    { id: 1, image: require('../assets/images/elma.png'), word: 'Elma' },
    { id: 2, image: require('../assets/images/araba.png'), word: 'Araba' },
    { id: 3, image: require('../assets/images/kedi.png'), word: 'Kedi' },
    { id: 4, image: require('../assets/images/top.png'), word: 'Top' },
    { id: 5, image: require('../assets/images/ev.png'), word: 'Ev' },
];

interface BunuSoyleProps {
    onGameEnd: (oyunAdi: string, sure: number, finalHamle: number, finalHata: number, algilananKelime?: string, extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string }) => void;
    onExit: () => void;
}

export default function BunuSoyle({ onGameEnd, onExit }: BunuSoyleProps) {
    const { stopSound, playSound } = useSound();
    const [currentStage, setCurrentStage] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState('Kayıt Hazır');
    const [startTime] = useState(Date.now());
    const [moves, setMoves] = useState(0);
    const [errors, setErrors] = useState(0);
    const [allTranscripts, setAllTranscripts] = useState<string[]>([]);
    const [permissionResponse, requestPermission] = Audio.usePermissions();

    // Recording Ref: Asenkron işlemlerde state'in güncel olmama sorununu çözmek için
    const recordingRef = useRef<Audio.Recording | null>(null);

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

    const autoStopTimer = useRef<NodeJS.Timeout | null>(null);
    const currentItem = STAGES[currentStage];

    // İzin kontrolü
    useEffect(() => {
        (async () => {
            if (!permissionResponse) {
                await requestPermission();
            }
        })();
    }, []);

    // Aşama değiştiğinde otomatik başlat
    useEffect(() => {
        let isMounted = true;

        const initStage = async () => {
            // Önceki kaydı temizle
            await stopRecording(false);

            if (isMounted) {
                // Kısa bir gecikme ile yeni kaydı başlat (Race condition önlemek için)
                setTimeout(() => {
                    if (isMounted) startRecording();
                }, 500);
            }
        };

        initStage();

        return () => {
            isMounted = false;
            if (autoStopTimer.current) clearTimeout(autoStopTimer.current);
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
                console.log('❌ Mikrofon izni yok, izin isteniyor...');
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

            if (autoStopTimer.current) clearTimeout(autoStopTimer.current);
            autoStopTimer.current = setTimeout(() => {
                stopRecording(true);
            }, 3000) as unknown as NodeJS.Timeout;

        } catch (err) {
            console.error('❌ Kayıt başlatılamadı:', err);
            // Hata olsa bile kullanıcıya tekrar deneme şansı ver
            setIsRecording(false);
            setRecordingStatus('Mikrofona Dokun 🔴');
        }
    };

    const stopRecording = async (shouldAnalyze = true) => {
        console.log('🛑 stopRecording çağrıldı. Analiz:', shouldAnalyze);
        if (autoStopTimer.current) clearTimeout(autoStopTimer.current);

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

    const handleRetry = () => {
        startRecording();
    };

    const analyzeSpeech = async (beklenenKelime: string, audioUri: string) => {
        // SESSİZLİK KONTROLÜ
        console.log("Maksimum Ses Seviyesi:", maxAudioLevel);

        if (maxAudioLevel < -50) {
            setRecordingStatus('Ses Algılanmadı 🔇');
            setErrors(e => e + 1);
            setAllTranscripts(prev => [...prev, "(Sessiz)"]);
            setMoves(m => m + 1);

            // Otomatik olarak bir sonraki aşamaya geç
            setTimeout(() => {
                handleNextStage();
            }, 2000);
            return;
        }

        try {
            // Platform-specific Base64 encoding
            let base64Audio: string;

            if (Platform.OS === 'web') {
                // WEB: fetch + FileReader kullan
                console.log('🌐 Web platformu tespit edildi, fetch kullanılıyor...');
                const response = await fetch(audioUri);
                const blob = await response.blob();

                base64Audio = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        // "data:audio/...;base64," başlığını temizle
                        const base64 = result.split(',')[1];
                        resolve(base64);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            } else {
                // MOBILE: expo-file-system kullan
                console.log('📱 Mobil platform tespit edildi, FileSystem kullanılıyor...');
                base64Audio = await FileSystem.readAsStringAsync(audioUri, {
                    encoding: 'base64',
                });
            }

            // Google Speech-to-Text API çağrısı
            const apiKey = process.env.EXPO_PUBLIC_SPEECH_API_KEY;
            if (!apiKey) {
                throw new Error('API key bulunamadı');
            }

            console.log('🎤 Google Speech-to-Text API çağrılıyor...');

            // API çağrısı için AbortController ile timeout ekle
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 saniye timeout

            try {
                const response = await fetch(
                    `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            config: {
                                encoding: Platform.OS === 'web' ? 'WEBM_OPUS' : 'LINEAR16',
                                sampleRateHertz: Platform.OS === 'web' ? 48000 : 44100,
                                languageCode: 'tr-TR',
                            },
                            audio: {
                                content: base64Audio,
                            },
                        }),
                        signal: controller.signal
                    }
                );
                clearTimeout(timeoutId);

                const data = await response.json();
                console.log('📥 API Yanıtı:', data);

                // Transcript'i çıkar
                let transcript = '';
                if (data.results && data.results.length > 0) {
                    transcript = data.results[0].alternatives[0].transcript || '';
                }

                if (!transcript) {
                    transcript = '(Anlaşılamadı)';
                }

                console.log('✅ Algılanan kelime:', transcript);
                setAllTranscripts(prev => [...prev, transcript]);

                const temizlenenTranscript = transcript.toLowerCase().trim();
                const temizlenenBeklenen = beklenenKelime.toLowerCase().trim();

                // Her durumda hareketi kaydet
                setMoves(m => m + 1);

                if (temizlenenTranscript === temizlenenBeklenen) {
                    // Doğru cevap - hata yok
                    setRecordingStatus('Harika! 🎉');
                    setTimeout(() => handleNextStage(), 2000);
                } else {
                    // Yanlış cevap - hata kaydet ve yine de devam et
                    setErrors(e => e + 1);
                    setRecordingStatus(`Tekrar Dene ❌ ("${transcript}")`);
                    // Otomatik olarak bir sonraki aşamaya geç
                    setTimeout(() => handleNextStage(), 2000);
                }
            } catch (fetchError: any) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('API isteği zaman aşımına uğradı');
                }
                throw fetchError;
            }
        } catch (error) {
            console.error('❌ Speech API hatası:', error);
            // Hata durumunda bile kaydet ve devam et
            setAllTranscripts(prev => [...prev, '(API Hatası)']);
            setErrors(e => e + 1);
            setMoves(m => m + 1);
            setRecordingStatus('API Hatası ⚠️');
            setTimeout(() => handleNextStage(), 2000);
        }
    };

    const handleNextStage = () => {
        if (currentStage < STAGES.length - 1) {
            setCurrentStage(prev => prev + 1);
        } else {
            const duration = Math.floor((Date.now() - startTime) / 1000);
            const finalTranscriptString = allTranscripts.join(", ");
            onGameEnd('bunu-soyle', duration, moves, errors, finalTranscriptString, {
                zorlukSeviyesi: currentStage + 1,
                kazanimOdagi: 'Dil Gelişimi ve Sözel İfade',
            });
        }
    };

    return (
        <DynamicBackground onExit={onExit}>
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
                            onPress={() => stopRecording(true)}
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
                                <Text style={styles.listeningText}>SİSTEM DİNLİYOR... (Durdur)</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={styles.recordButton}
                            onPress={handleRetry}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="mic" size={50} color="white" />
                        </TouchableOpacity>
                    )}

                    <Text style={[
                        styles.statusText,
                        isRecording && styles.statusRecording,
                        recordingStatus === 'Analiz Ediliyor...' && styles.statusProcessing,
                        recordingStatus === 'Harika! 🎉' && styles.statusSuccess,
                        recordingStatus === 'Tekrar Dene ❌' && styles.statusError,
                        recordingStatus === 'Ses Algılanmadı 🔇' && styles.statusError
                    ]}>
                        {recordingStatus}
                    </Text>
                </View>
            </View>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
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
    statusError: { color: '#E74C3C', fontWeight: 'bold' }
});
