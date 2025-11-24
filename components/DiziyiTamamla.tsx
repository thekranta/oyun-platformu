import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSound } from './SoundContext';

const { width: screenWidth } = Dimensions.get('window');

interface DiziyiTamamlaProps {
    onGameEnd: (oyunAdi: string, sure: number, finalHamle: number, finalHata: number) => void;
    onLogout: () => void;
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
    {
        sequence: ['kare', 'daire', 'kare', 'daire', 'kare'],
        answer: 'daire',
        options: ['daire', 'kare', 'ucgen', 'yildiz']
    },
    {
        sequence: ['ucgen', 'daire', 'daire', 'ucgen', 'daire'],
        answer: 'daire',
        options: ['daire', 'ucgen', 'kare', 'yildiz']
    },
    {
        sequence: ['kare', 'kare', 'ucgen', 'kare', 'kare'],
        answer: 'ucgen',
        options: ['ucgen', 'kare', 'daire', 'yildiz']
    },
    {
        sequence: ['daire', 'kare', 'ucgen', 'daire', 'kare'],
        answer: 'ucgen',
        options: ['ucgen', 'daire', 'kare', 'yildiz']
    },
    {
        sequence: ['ucgen', 'daire', 'kare', 'ucgen', 'daire'],
        answer: 'kare',
        options: ['kare', 'ucgen', 'daire', 'yildiz']
    }
];

export default function DiziyiTamamla({ onGameEnd, onLogout }: DiziyiTamamlaProps) {
    const [currentStage, setCurrentStage] = useState(0);
    const [totalMoves, setTotalMoves] = useState(0);
    const [totalErrors, setTotalErrors] = useState(0);
    const [startTime] = useState(Date.now());
    const [stageCompleted, setStageCompleted] = useState(false);
    const [selectedOption, setSelectedOption] = useState<ShapeType | null>(null);
    const [isCorrect, setIsCorrect] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0.5);
    const [showVolumeControls, setShowVolumeControls] = useState(false);

    const { playSound, stopSound, isMuted, toggleMute, changeVolume } = useSound();

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

    const handleVolumeChange = (change: number) => {
        const newVolume = Math.max(0, Math.min(1, volumeLevel + change));
        setVolumeLevel(newVolume);
        changeVolume(newVolume);
    };

    const handleOptionPress = (option: ShapeType) => {
        if (stageCompleted) return;

        setSelectedOption(option);
        setTotalMoves(totalMoves + 1);

        if (option === currentPattern.answer) {
            setIsCorrect(true);
            setStageCompleted(true);
            setShowConfetti(true);
            playSound('correct');

            if (confettiRef.current) {
                confettiRef.current.start();
            }

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

            setTimeout(() => {
                handleNextStage();
            }, 1500);

        } else {
            setTotalErrors(totalErrors + 1);
            playSound('wrong');

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
            setCurrentStage(prev => prev + 1);
            setStageCompleted(false);
            setSelectedOption(null);
            setIsCorrect(false);
            scaleAnim.setValue(1);
        } else {
            const totalTime = Math.floor((Date.now() - startTime) / 1000);
            onGameEnd('diziyi-tamamla', totalTime, totalMoves, totalErrors);
        }
    };

    return (
        <View style={styles.container}>
            {showConfetti && (
                <ConfettiCannon
                    count={200}
                    origin={{ x: -10, y: 0 }}
                    autoStart={true}
                    ref={confettiRef}
                    fadeOut={true}
                />
            )}

            {/* Üst Bar: Çıkış, Başlık, Ses */}
            <View style={styles.topBar}>
                <TouchableOpacity onPress={onLogout} style={styles.iconButton}>
                    <Ionicons name="log-out-outline" size={32} color="#E74C3C" />
                </TouchableOpacity>

                <Text style={styles.title}>Diziyi Tamamla 🧩</Text>

                <View style={styles.soundControls}>
                    <TouchableOpacity onPress={() => setShowVolumeControls(!showVolumeControls)} style={styles.iconButton}>
                        <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={32} color="#2C3E50" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Ses Kontrol Paneli (Açılır/Kapanır) */}
            {showVolumeControls && (
                <View style={styles.volumePanel}>
                    <TouchableOpacity onPress={() => handleVolumeChange(-0.1)} style={styles.volumeBtn}>
                        <Ionicons name="remove" size={24} color="#333" />
                    </TouchableOpacity>
                    <View style={styles.volumeBarContainer}>
                        <View style={[styles.volumeBarFill, { width: `${volumeLevel * 100}%` }]} />
                    </View>
                    <TouchableOpacity onPress={() => handleVolumeChange(0.1)} style={styles.volumeBtn}>
                        <Ionicons name="add" size={24} color="#333" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${((currentStage) / PATTERNS.length) * 100}%` }]} />
            </View>

            {/* Oyun Alanı */}
            <View style={styles.gameArea}>
                {/* Dizi Gösterimi */}
                <View style={styles.sequenceContainer}>
                    {currentPattern.sequence.map((shape, index) => (
                        <View key={index} style={styles.sequenceItem}>
                            <Image source={SHAPES[shape]} style={styles.sequenceImage} />
                        </View>
                    ))}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F8FF',
        paddingTop: 40, // Status bar için boşluk
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
    },
    iconButton: {
        padding: 10,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2C3E50',
    },
    soundControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    volumePanel: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        padding: 10,
        borderRadius: 15,
        marginBottom: 10,
        elevation: 3,
    },
    volumeBtn: {
        padding: 5,
        backgroundColor: '#eee',
        borderRadius: 20,
    },
    volumeBarContainer: {
        width: 150,
        height: 10,
        backgroundColor: '#ddd',
        borderRadius: 5,
        marginHorizontal: 15,
        overflow: 'hidden',
    },
    volumeBarFill: {
        height: '100%',
        backgroundColor: '#3498DB',
    },
    progressContainer: {
        height: 10,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 20,
        borderRadius: 5,
        marginBottom: 30,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#2ECC71',
    },
    gameArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sequenceContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 50,
        flexWrap: 'wrap',
    },
    sequenceItem: {
        width: 75, // Büyütüldü
        height: 75, // Büyütüldü
        backgroundColor: '#FFFFFF',
        borderRadius: 15,
        margin: 6,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    sequenceImage: {
        width: 60, // Büyütüldü
        height: 60, // Büyütüldü
        resizeMode: 'contain',
    },
    questionMark: {
        backgroundColor: '#FFE5B4',
        borderWidth: 3,
        borderColor: '#FF8C00',
        borderStyle: 'dashed',
    },
    questionMarkText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#FF8C00',
    },
    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        width: '100%',
        paddingHorizontal: 10,
    },
    optionWrapper: {
        margin: 12,
    },
    optionButton: {
        width: 90, // Büyütüldü
        height: 90, // Büyütüldü
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        borderWidth: 3,
        borderColor: '#BDC3C7',
    },
    optionImage: {
        width: 70, // Büyütüldü
        height: 70, // Büyütüldü
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
});
