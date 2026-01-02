import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSound } from './SoundContext';

interface SayiKomsulariProps {
    onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number, algilananKelime?: string, extraData?: any) => void;
    onExit: () => void;
}

type QuestionType = 'next' | 'prev' | 'between';

interface Question {
    type: QuestionType;
    numbers: (number | null)[];
    correctAnswer: number;
    options: number[];
}

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 400;

export default function SayiKomsulari({ onGameEnd, onExit }: SayiKomsulariProps) {
    const { isMuted, toggleMute } = useSound();
    const [round, setRound] = useState(1);
    const [question, setQuestion] = useState<Question | null>(null);
    const [mistakes, setMistakes] = useState(0);
    const [startTime] = useState(Date.now());
    const [roundData, setRoundData] = useState<any[]>([]);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [droppedAnswer, setDroppedAnswer] = useState<number | null>(null);

    // Animation
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Drop zone ref for collision detection
    const [dropZoneLayout, setDropZoneLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

    useEffect(() => {
        startRound();
    }, [round]);

    const startRound = () => {
        setFeedback(null);
        setDroppedAnswer(null);
        fadeAnim.setValue(0);

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true
        }).start();

        const q = generateQuestion();
        setQuestion(q);
    };

    const generateQuestion = (): Question => {
        let type: QuestionType = 'next';
        let max = 5;

        if (round > 4) {
            const types: QuestionType[] = ['next', 'prev', 'between'];
            type = types[Math.floor(Math.random() * types.length)];
            max = 10;
        }

        let num1, correct;

        switch (type) {
            case 'next':
                num1 = Math.floor(Math.random() * (max - 2)) + 1;
                correct = num1 + 2;
                return {
                    type,
                    numbers: [num1, num1 + 1, null],
                    correctAnswer: correct,
                    options: generateOptions(correct, 1, 10)
                };
            case 'prev':
                num1 = Math.floor(Math.random() * (max - 2)) + 2;
                correct = num1 - 1;
                return {
                    type,
                    numbers: [null, num1, num1 + 1],
                    correctAnswer: correct,
                    options: generateOptions(correct, 1, 10)
                };
            case 'between':
                num1 = Math.floor(Math.random() * (max - 2)) + 1;
                correct = num1 + 1;
                return {
                    type,
                    numbers: [num1, null, num1 + 2],
                    correctAnswer: correct,
                    options: generateOptions(correct, 1, 10)
                };
            default:
                return { type: 'next', numbers: [1, 2, null], correctAnswer: 3, options: [1, 3, 4] };
        }
    };

    const generateOptions = (correct: number, min: number, max: number) => {
        const options = [correct];
        while (options.length < 3) {
            const rand = Math.floor(Math.random() * (max - min + 1)) + min;
            if (!options.includes(rand)) options.push(rand);
        }
        return options.sort(() => Math.random() - 0.5);
    };

    const handleAnswer = (selected: number) => {
        if (feedback) return;

        if (selected === question?.correctAnswer) {
            setFeedback('correct');
            setDroppedAnswer(selected);
            setShowConfetti(true);

            setRoundData(prev => [...prev, {
                round,
                question: question.numbers,
                result: 'success',
            }]);

            setTimeout(() => {
                setShowConfetti(false);
                if (round < 10) {
                    setRound(r => r + 1);
                } else {
                    finishGame();
                }
            }, 1500);
        } else {
            setFeedback('wrong');
            setMistakes(m => m + 1);

            setRoundData(prev => [...prev, {
                round,
                question: question?.numbers,
                result: 'wrong',
                errorValue: selected
            }]);

            setTimeout(() => {
                setFeedback(null);
            }, 1000);
        }
    };

    const finishGame = () => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const extraData = {
            cizimVerisi: JSON.stringify({ roundHistory: roundData }),
            zorlukSeviyesi: 1,
            kazanimOdagi: 'MAB.4 Sayı Sıralama ve İlişkilendirme',
            algilananKelime: mistakes === 0 ? 'Mükemmel Sıralama' : `${mistakes} hatalı seçim`
        };
        onGameEnd('Sayı Komşuları', duration, 10, mistakes, undefined, extraData);
    };

    // Draggable Option Component
    const DraggableOption = ({ value }: { value: number }) => {
        const pan = useRef(new Animated.ValueXY()).current;
        const [isDragging, setIsDragging] = useState(false);

        const panResponder = useRef(
            PanResponder.create({
                onStartShouldSetPanResponder: () => true,
                onPanResponderGrant: () => {
                    setIsDragging(true);
                    pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
                    pan.setValue({ x: 0, y: 0 });
                },
                onPanResponderMove: Animated.event(
                    [null, { dx: pan.x, dy: pan.y }],
                    { useNativeDriver: false }
                ),
                onPanResponderRelease: (_, gesture) => {
                    setIsDragging(false);
                    pan.flattenOffset();

                    // Yukarı doğru yeterince sürüklediyse cevap kabul
                    if (gesture.dy < -80) {
                        handleAnswer(value);
                    }

                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: false
                    }).start();
                }
            })
        ).current;

        return (
            <Animated.View
                style={[
                    styles.optionButton,
                    isDragging && styles.optionDragging,
                    { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
                ]}
                {...panResponder.panHandlers}
            >
                <Text style={styles.optionText}>{value}</Text>
            </Animated.View>
        );
    };

    return (
        <View style={styles.container}>
            {showConfetti && <ConfettiCannon count={100} origin={{ x: width / 2, y: 0 }} fadeOut />}

            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreText}>Tur: {round}/10</Text>
                </View>
                <TouchableOpacity onPress={toggleMute} style={styles.soundButton}>
                    <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.gameContent}>
                <Text style={styles.questionTitle}>Boşluğa hangi sayı gelmeli?</Text>
                <Text style={styles.helpText}>Sayıyı yukarı sürükle!</Text>

                <Animated.View style={[styles.trainContainer, { opacity: fadeAnim }]}>
                    {question?.numbers.map((num, idx) => (
                        <View key={idx} style={styles.trainCar}>
                            {idx > 0 && <View style={styles.connector} />}
                            <View
                                style={[
                                    styles.numberBlock,
                                    num === null ? styles.emptyBlock : styles.filledBlock,
                                    feedback === 'correct' && num === null && styles.correctBlock
                                ]}
                                onLayout={(e) => {
                                    if (num === null) {
                                        setDropZoneLayout(e.nativeEvent.layout);
                                    }
                                }}
                            >
                                <Text style={[styles.numberText, num === null && styles.questionMark]}>
                                    {num === null ? (droppedAnswer ?? '?') : num}
                                </Text>
                            </View>
                        </View>
                    ))}
                </Animated.View>
            </View>

            <View style={styles.optionsContainer}>
                {question?.options.map((opt, idx) => (
                    <DraggableOption key={`${round}-${idx}`} value={opt} />
                ))}
            </View>
        </View>
    );
}

const BLOCK_SIZE = isSmallScreen ? width / 4.5 : width / 5;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8E1',
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        marginBottom: 20,
    },
    backButton: { backgroundColor: '#FF9800', padding: 10, borderRadius: 25 },
    soundButton: { backgroundColor: '#FF9800', padding: 10, borderRadius: 25 },
    scoreContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    scoreText: { fontSize: 16, fontWeight: 'bold', color: '#EF6C00' },

    gameContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    questionTitle: {
        fontSize: isSmallScreen ? 20 : 24,
        fontWeight: 'bold',
        color: '#5D4037',
        marginBottom: 5,
        textAlign: 'center',
    },
    helpText: {
        fontSize: 14,
        color: '#8D6E63',
        marginBottom: 25,
    },
    trainContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    trainCar: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    connector: {
        width: 12,
        height: 6,
        backgroundColor: '#8D6E63',
        marginHorizontal: -1,
    },
    numberBlock: {
        width: BLOCK_SIZE,
        height: BLOCK_SIZE,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        borderWidth: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    filledBlock: {
        backgroundColor: '#FFCC80',
        borderColor: '#EF6C00',
    },
    emptyBlock: {
        backgroundColor: '#FFF',
        borderColor: '#BDBDBD',
        borderStyle: 'dashed',
    },
    correctBlock: {
        backgroundColor: '#C8E6C9',
        borderColor: '#4CAF50',
        borderStyle: 'solid',
    },
    numberText: {
        fontSize: isSmallScreen ? 36 : 48,
        fontWeight: 'bold',
        color: '#E65100',
    },
    questionMark: {
        color: '#BDBDBD',
    },

    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 15,
        paddingBottom: 50,
        paddingHorizontal: 20,
    },
    optionButton: {
        width: isSmallScreen ? 70 : 85,
        height: isSmallScreen ? 70 : 85,
        borderRadius: 45,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        borderWidth: 3,
        borderColor: '#FFB74D',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    optionDragging: {
        transform: [{ scale: 1.15 }],
        elevation: 10,
        borderColor: '#FF9800',
        backgroundColor: '#FFF3E0',
    },
    optionText: {
        fontSize: isSmallScreen ? 28 : 36,
        fontWeight: 'bold',
        color: '#E65100'
    },
});
