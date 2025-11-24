import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSound } from './SoundContext';

interface DiziyiTamamlaProps {
    onGameEnd: (oyunAdi: string, sure: number, finalHamle: number, finalHata: number) => void;
}

type ShapeType = 'kare' | 'ucgen' | 'daire' | 'yildiz';

interface Pattern {
    sequence: ShapeType[];
    answer: ShapeType;
    options: ShapeType[];
}

const SHAPES = {
    kare: require('../assets/images/kare.png'),
    ucgen: require('../assets/images/ucgen.png'),
    daire: require('../assets/images/daire.png'),
    yildiz: require('../assets/images/yildiz.png'),
};

const PATTERNS: Pattern[] = [
    // Aşama 1: AB pattern (A-B-A-B-A-?)
    {
        sequence: ['kare', 'daire', 'kare', 'daire', 'kare'],
        answer: 'daire',
        options: ['daire', 'kare', 'ucgen', 'yildiz']
    },
    // Aşama 2: ABB pattern (A-B-B-A-B-?)
    {
        sequence: ['ucgen', 'daire', 'daire', 'ucgen', 'daire'],
        answer: 'daire',
        options: ['daire', 'ucgen', 'kare', 'yildiz']
    },
    // Aşama 3: AAB pattern (A-A-B-A-A-?)
    {
        sequence: ['kare', 'kare', 'ucgen', 'kare', 'kare'],
        answer: 'ucgen',
        options: ['ucgen', 'kare', 'daire', 'yildiz']
    },
    // Aşama 4: ABC pattern (A-B-C-A-B-?)
    {
        sequence: ['daire', 'kare', 'ucgen', 'daire', 'kare'],
        answer: 'ucgen',
        options: ['ucgen', 'daire', 'kare', 'yildiz']
    },
    // Aşama 5: ABC pattern (Farklı varyasyon: B-C-A-B-C-?)
    {
        sequence: ['ucgen', 'daire', 'kare', 'ucgen', 'daire'],
        answer: 'kare',
        options: ['kare', 'ucgen', 'daire', 'yildiz']
    }
];

export default function DiziyiTamamla({ onGameEnd }: DiziyiTamamlaProps) {
    const [currentStage, setCurrentStage] = useState(0);
    const [totalMoves, setTotalMoves] = useState(0);
    const [totalErrors, setTotalErrors] = useState(0);
    const [startTime] = useState(Date.now());
    const [stageCompleted, setStageCompleted] = useState(false);
    const [selectedOption, setSelectedOption] = useState<ShapeType | null>(null);
    const [isCorrect, setIsCorrect] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    const { playSound, stopSound, isMuted, toggleMute } = useSound();

    const scaleAnim = useRef(new Animated.Value(1)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const confettiRef = useRef<ConfettiCannon>(null);

    const currentPattern = PATTERNS[currentStage];

    useEffect(() => {
        playSound('background');
        return () => {
            stopSound('background');
        };
    }, []);

    const handleOptionPress = (option: ShapeType) => {
        if (stageCompleted) return;

        setSelectedOption(option);
        setTotalMoves(totalMoves + 1);

        if (option === currentPattern.answer) {
            // Doğru cevap
            setIsCorrect(true);
            setStageCompleted(true);
            setShowConfetti(true);
            playSound('correct');

            // Konfeti patlat
            if (confettiRef.current) {
                confettiRef.current.start();
            }

            // Başarı animasyonu
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.2,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();

            // Otomatik geçiş (1.5 saniye sonra)
            setTimeout(() => {
                handleNextStage();
            }, 1500);

        } else {
            // Yanlış cevap
            setTotalErrors(totalErrors + 1);
            playSound('wrong');

            // Hata animasyonu (sallama)
            Animated.sequence([
                Animated.timing(shakeAnim, {
                    toValue: 10,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(shakeAnim, {
                    toValue: -10,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(shakeAnim, {
                    toValue: 10,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(shakeAnim, {
                    toValue: 0,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setSelectedOption(null);
            });
        }
    };

    const handleNextStage = () => {
        setShowConfetti(false);

        if (currentStage < PATTERNS.length - 1) {
            // Sonraki aşamaya geç
            setCurrentStage(prev => prev + 1);
            setStageCompleted(false);
            setSelectedOption(null);
            setIsCorrect(false);
            scaleAnim.setValue(1);
        } else {
            // Oyun bitti
            const totalTime = Math.floor((Date.now() - startTime) / 1000);
            onGameEnd('diziyi-tamamla', totalTime, totalMoves, totalErrors);
        }
    };

    return (
        <View style={styles.container}>
            {/* Konfeti */}
            {showConfetti && (
                <ConfettiCannon
                    count={200}
                    origin={{ x: -10, y: 0 }}
                    autoStart={true}
                    ref={confettiRef}
                    fadeOut={true}
                />
            )}

            {/* Başlık ve Aşama Bilgisi */}
            <View style={styles.header}>
                <Text style={styles.title}>Diziyi Tamamla 🧩</Text>
                <Text style={styles.stageInfo}>Aşama {currentStage + 1} / {PATTERNS.length}</Text>
                <TouchableOpacity onPress={toggleMute} style={styles.soundButton}>
                    <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={24} color="#2C3E50" />
                </TouchableOpacity>
            </View>

            {/* Talimat */}
            <Text style={styles.instruction}>
                Soru işaretinin yerine hangi şekil gelmelidir?
            </Text>

            {/* Dizi Gösterimi */}
            <View style={styles.sequenceContainer}>
                {currentPattern.sequence.map((shape, index) => (
                    <View key={index} style={styles.sequenceItem}>
                        <Image source={SHAPES[shape]} style={styles.sequenceImage} />
                    </View>
                ))}
                {/* Soru işareti */}
                <View style={[styles.sequenceItem, styles.questionMark]}>
                    <Text style={styles.questionMarkText}>?</Text>
                </View>
            </View>

            {/* Seçenekler */}
            <View style={styles.optionsContainer}>
                {currentPattern.options.map((option, index) => {
                    const isSelected = selectedOption === option;
                    const isSelectedCorrect = isSelected && isCorrect;
                    const isSelectedWrong = isSelected && !isCorrect && !stageCompleted;

                    return (
                        <Animated.View
                            key={index}
                            style={[
                                styles.optionWrapper,
                                {
                                    transform: [
                                        { scale: isSelectedCorrect ? scaleAnim : 1 },
                                        { translateX: isSelectedWrong ? shakeAnim : 0 },
                                    ],
                                },
                            ]}
                        >
                            <TouchableOpacity
                                style={[
                                    styles.optionButton,
                                    isSelectedCorrect && styles.optionCorrect,
                                    isSelectedWrong && styles.optionWrong,
                                ]}
                                onPress={() => handleOptionPress(option)}
                                disabled={stageCompleted}
                            >
                                <Image source={SHAPES[option]} style={styles.optionImage} />
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#F0F8FF',
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
        width: '100%',
    },
    soundButton: {
        position: 'absolute',
        right: 0,
        top: 0,
        padding: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2C3E50',
        marginBottom: 10,
    },
    stageInfo: {
        fontSize: 18,
        color: '#7F8C8D',
        fontWeight: '600',
    },
    instruction: {
        fontSize: 18,
        color: '#34495E',
        textAlign: 'center',
        marginBottom: 30,
        fontWeight: '500',
    },
    sequenceContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
        flexWrap: 'wrap',
    },
    sequenceItem: {
        width: 60,
        height: 60,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        margin: 5,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    sequenceImage: {
        width: 45,
        height: 45,
        resizeMode: 'contain',
    },
    questionMark: {
        backgroundColor: '#FFE5B4',
        borderWidth: 2,
        borderColor: '#FF8C00',
        borderStyle: 'dashed',
    },
    questionMarkText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FF8C00',
    },
    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 30,
        flexWrap: 'wrap',
    },
    optionWrapper: {
        margin: 10,
    },
    optionButton: {
        width: 80,
        height: 80,
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        borderWidth: 3,
        borderColor: '#BDC3C7',
    },
    optionImage: {
        width: 60,
        height: 60,
        resizeMode: 'contain',
    },
    optionCorrect: {
        borderColor: '#27AE60',
        backgroundColor: '#D5F4E6',
    },
    optionWrong: {
        borderColor: '#E74C3C',
        backgroundColor: '#FADBD8',
    },
    nextButton: {
        backgroundColor: '#3498DB',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 25,
        alignSelf: 'center',
        marginTop: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    nextButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
