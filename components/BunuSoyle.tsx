import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
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

    const handleRecordToggle = () => {
        console.log("Kayıt butonu basıldı. Kayıt mantığı burada yer alacak.");

        if (!isRecording) {
            // Kaydı Başlat
            setIsRecording(true);
            setRecordingStatus('Kayıt Yapılıyor...');
        } else {
            // Kaydı Bitir ve İlerle
            setIsRecording(false);
            setRecordingStatus('Analiz Ediliyor...');
            setMoves(m => m + 1);

            // Başarılı kabul edip sonraki aşamaya geçiş simülasyonu
            setTimeout(() => {
                handleNextStage();
            }, 1000);
        }
    };

    const handleNextStage = () => {
        if (currentStage < STAGES.length - 1) {
            setCurrentStage(prev => prev + 1);
            setRecordingStatus('Kayıt Hazır');
        } else {
            // Oyun Bitti
            const duration = Math.floor((Date.now() - startTime) / 1000);
            onGameEnd('bunu-soyle', duration, moves + 1, 0);
        }
    };

    const currentItem = STAGES[currentStage];

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
                        {/* Not: Eğer görseller yoksa uygulama hata verebilir. 
                            Bu durumda geçici olarak uri kullanılması gerekebilir. 
                            Şimdilik istenildiği gibi require kullanıldı. */}
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
                        recordingStatus === 'Analiz Ediliyor...' && styles.statusProcessing
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
    }
});
