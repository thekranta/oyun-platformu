import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
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
    onGameEnd: (oyunAdi: string, sure: number, finalHamle: number, finalHata: number) => void;
    onExit: () => void;
}

export default function BunuSoyle({ onGameEnd, onExit }: BunuSoyleProps) {
    const [currentStage, setCurrentStage] = useState(0);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStatus, setRecordingStatus] = useState('Kayıt Hazır');
    const [startTime] = useState(Date.now());
    const [moves, setMoves] = useState(0);
    const [errors, setErrors] = useState(0);

    // Timer Ref'i (Otomatik durdurma için)
    const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const currentItem = STAGES[currentStage];

    // Bileşen unmount olduğunda timer'ı temizle
    useEffect(() => {
        return () => {
            if (recordingTimeoutRef.current) {
                clearTimeout(recordingTimeoutRef.current);
            }
        };
    }, []);

    const startRecording = () => {
        setIsRecording(true);
        setRecordingStatus('Kayıt Yapılıyor...');
        console.log("Kayıt Başladı (Simülasyon)");

        // 1. KRİTİK DÜZELTME: 3 Saniye sonra otomatik durdurma
        if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);

        recordingTimeoutRef.current = setTimeout(() => {
            console.log("Süre doldu, otomatik durduruluyor...");
            stopRecordingAndAnalyze();
        }, 3000);
    };

    const stopRecordingAndAnalyze = () => {
        // Eğer zaten durmuşsa işlem yapma
        if (!isRecording) return;

        // Timer'ı temizle (Manuel durdurulursa çalışmasın diye)
        if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);

        setIsRecording(false);
        setRecordingStatus('Analiz Ediliyor...');

        // Simüle edilmiş analiz süreci
        analyzeSpeech(currentItem.word);
    };

    const handleRecordToggle = () => {
        if (!isRecording) {
            startRecording();
        } else {
            stopRecordingAndAnalyze();
        }
    };

    const analyzeSpeech = (beklenenKelime: string) => {
        // API Simülasyonu: %80 ihtimalle doğru bildiğini varsayalım
        // Gerçek API entegrasyonunda buraya API'den gelen transcript gelecek
        const randomSuccess = Math.random() > 0.2;
        const simulatedTranscript = randomSuccess ? beklenenKelime : "Yanlış Kelime";

        console.log(`Analiz Sonucu - Beklenen: "${beklenenKelime}", Algılanan: "${simulatedTranscript}"`);

        // 2. KRİTİK DÜZELTME: Karşılaştırma Mantığı
        const temizlenenTranscript = simulatedTranscript.trim().toLowerCase();
        const temizlenenBeklenen = beklenenKelime.trim().toLowerCase();

        if (temizlenenTranscript === temizlenenBeklenen) {
            // BAŞARILI
            setRecordingStatus('Harika! 🎉');
            setMoves(m => m + 1);

            setTimeout(() => {
                handleNextStage();
            }, 1000);
        } else {
            // HATALI
            setRecordingStatus('Tekrar Dene ❌');
            setErrors(e => e + 1);

            // Kullanıcıya tekrar deneme şansı ver
            setTimeout(() => {
                setRecordingStatus('Kayıt Hazır');
            }, 1500);
        }
    };

    const handleNextStage = () => {
        if (currentStage < STAGES.length - 1) {
            setCurrentStage(prev => prev + 1);
            setRecordingStatus('Kayıt Hazır');
        } else {
            // Oyun Bitti
            const duration = Math.floor((Date.now() - startTime) / 1000);
            onGameEnd('bunu-soyle', duration, moves + 1, errors);
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
                    <TouchableOpacity
                        style={[styles.recordButton, isRecording && styles.recordingButton]}
                        onPress={handleRecordToggle}
                        activeOpacity={0.7}
                    >
                        <Ionicons name={isRecording ? "stop" : "mic"} size={50} color="white" />
                    </TouchableOpacity>

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
    recordingButton: {
        backgroundColor: '#E74C3C',
        shadowColor: '#E74C3C',
        transform: [{ scale: 1.1 }],
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
