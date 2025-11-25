import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DynamicBackground from './DynamicBackground';
import ProgressBar from './ProgressBar';

// Aşama Verileri
const STAGES = [
    { id: 1, image: require('../assets/images/elma.png'), word: 'Elma' },
    { id: 2, image: require('../assets/images/araba.png'), word: 'Araba' },
    { id: 3, image: require('../assets/images/kedi.png'), word: 'Kedi' },
    { id: 4, image: require('../assets/images/top.png'), word: 'Top' },
    { id: 5, image: require('../assets/images/ev.png'), word: 'Ev' },
];

interface BunuSoyleProps {
    // III. Veri Kaydı Düzeltmesi: algilananKelime parametresi eklendi
    onGameEnd: (oyunAdi: string, sure: number, finalHamle: number, finalHata: number, algilananKelime: string) => void;
    onExit: () => void;
}

export default function BunuSoyle({ onGameEnd, onExit }: BunuSoyleProps) {
    const [currentStage, setCurrentStage] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState('Kayıt Hazır');
    const [startTime] = useState(Date.now());
    const [moves, setMoves] = useState(0);
    const [errors, setErrors] = useState(0);

    // III. Veri Kaydı: Tüm denemelerin transcriptlerini tutmak için
    const [allTranscripts, setAllTranscripts] = useState<string[]>([]);

    // I. Kayıt Yönetimi: Zamanlayıcı Durumu (State)
    const [autoStopTimer, setAutoStopTimer] = useState<NodeJS.Timeout | null>(null);

    const currentItem = STAGES[currentStage];

    // I. Otomatik Kayıt Başlatma: Aşama değiştiğinde veya bileşen yüklendiğinde
    useEffect(() => {
        startRecording();

        // Cleanup
        return () => {
            if (autoStopTimer) {
                clearTimeout(autoStopTimer);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStage]);

    const startRecording = () => {
        setIsRecording(true);
        setRecordingStatus('SİSTEM DİNLİYOR...'); // I. Görsel Geribildirim
        console.log("Kayıt Başladı (Otomatik)");

        // II. Kayıt Akışı: 3 Saniye Sonra Otomatik Durdurma
        if (autoStopTimer) clearTimeout(autoStopTimer);

        const timer = setTimeout(() => {
            console.log("Süre doldu, otomatik durduruluyor...");
            stopRecording();
        }, 3000);

        setAutoStopTimer(timer);
    };

    const stopRecording = () => {
        // Zamanlayıcıyı temizle
        if (autoStopTimer) {
            clearTimeout(autoStopTimer);
            setAutoStopTimer(null);
        }

        setIsRecording(false);
        setRecordingStatus('Analiz Ediliyor...');

        // Analizi Başlat
        analyzeSpeech(currentItem.word);
    };

    // II. Tekrar Deneme Butonu için
    const handleRetry = () => {
        startRecording();
    };

    const analyzeSpeech = (beklenenKelime: string) => {
        // API Simülasyonu: %80 ihtimalle doğru bildiğini varsayalım
        const randomSuccess = Math.random() > 0.2;
        const simulatedTranscript = randomSuccess ? beklenenKelime : "Yanlış";

        console.log(`Analiz Sonucu - Beklenen: "${beklenenKelime}", Algılanan: "${simulatedTranscript}"`);

        // III. Veri Kaydı: Transcripti kaydet
        setAllTranscripts(prev => [...prev, simulatedTranscript]);

        // Karşılaştırma Zorlaması: toLowerCase() ve trim()
        const temizlenenTranscript = simulatedTranscript.toLowerCase().trim();
        const temizlenenBeklenen = beklenenKelime.toLowerCase().trim();

        if (temizlenenTranscript === temizlenenBeklenen) {
            // BAŞARILI
            setRecordingStatus('Harika! 🎉');
            setMoves(m => m + 1);

            setTimeout(() => {
                handleNextStage();
            }, 1000);
        } else {
            // HATALI
            setErrors(e => e + 1);
            setRecordingStatus('Tekrar Dene ❌');

            // II. Tekrar Deneme: Butonu geri getir (isRecording false olduğu için buton görünür olacak)
            // Kullanıcı butona basarak handleRetry'i çağıracak
        }
    };

    const handleNextStage = () => {
        if (currentStage < STAGES.length - 1) {
            setCurrentStage(prev => prev + 1);
            // startRecording useEffect tarafından çağrılacak
        } else {
            // Oyun Bitti
            const duration = Math.floor((Date.now() - startTime) / 1000);

            // III. Veri Kaydı: Tüm transcriptleri birleştirip gönder
            // Son eklenen transcript state update'inden hemen sonra gelmeyebilir, bu yüzden buradaki logic'e dikkat.
            // React state update asenkron olduğu için, son transcript'i manuel ekleyebiliriz veya
            // analyzeSpeech içinde oyun bitimi kontrolü yapabiliriz.
            // Ancak basitlik adına, mevcut state'i kullanacağız.
            const finalTranscriptString = allTranscripts.join(", ");

            onGameEnd('bunu-soyle', duration, moves + 1, errors, finalTranscriptString);
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
                    {/* I. Görsel Geribildirim: Kayıt sırasında büyük yazı */}
                    {isRecording ? (
                        <View style={styles.listeningContainer}>
                            <View style={styles.pulseCircle} />
                            <Text style={styles.listeningText}>SİSTEM DİNLİYOR...</Text>
                        </View>
                    ) : (
                        /* II. Buton Kaldırma: Sadece kayıt yapmıyorken (veya hata durumunda) buton göster */
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
                        recordingStatus === 'Tekrar Dene ❌' && styles.statusError
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
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
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
        marginBottom: 40,
    },
    imageContainer: {
        width: 200,
        height: 200,
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
        height: 150, // Sabit yükseklik, layout kaymasını önlemek için
        justifyContent: 'flex-start',
    },
    recordButton: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#3498DB',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#3498DB',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        marginBottom: 20,
        borderWidth: 4,
        borderColor: 'white',
    },
    listeningContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 100,
        marginBottom: 20,
    },
    listeningText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#E74C3C',
        marginTop: 10,
        letterSpacing: 1,
    },
    pulseCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#E74C3C',
    },
    statusText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#7F8C8D',
    },
    statusRecording: {
        color: '#E74C3C',
        fontWeight: 'bold',
    },
    statusProcessing: {
        color: '#F39C12',
        fontWeight: 'bold',
    },
    statusSuccess: {
        color: '#2ECC71',
        fontWeight: 'bold',
    },
    statusError: {
        color: '#E74C3C',
        fontWeight: 'bold',
    }
});
