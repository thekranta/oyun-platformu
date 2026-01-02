import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
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

export default function SayiKomsulari({ onGameEnd, onExit }: SayiKomsulariProps) {
    const { isMuted, toggleMute } = useSound();
    const [dimensions, setDimensions] = useState(Dimensions.get('window'));

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setDimensions(window);
        });
        return () => subscription?.remove();
    }, []);

    const { width, height } = dimensions;
    const isSmallScreen = width < 380;
    const isLandscape = width > height;

    // Responsive sizes - daha kompakt kartlar, büyük sayılar
    const CARD_SIZE = Math.min(width / 5, 65);
    const NUMBER_SIZE = Math.min(CARD_SIZE * 0.7, 42);
    const OPTION_SIZE = Math.min(width / 6, 60);

    const [round, setRound] = useState(1);
    const [question, setQuestion] = useState<Question | null>(null);
    const [mistakes, setMistakes] = useState(0);
    const [startTime] = useState(Date.now());
    const [roundData, setRoundData] = useState<any[]>([]);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [droppedAnswer, setDroppedAnswer] = useState<number | null>(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        startRound();
    }, [round]);

    const startRound = () => {
        setFeedback(null);
        setDroppedAnswer(null);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        setQuestion(generateQuestion());
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
                return { type, numbers: [num1, num1 + 1, null], correctAnswer: correct, options: generateOptions(correct) };
            case 'prev':
                num1 = Math.floor(Math.random() * (max - 2)) + 2;
                correct = num1 - 1;
                return { type, numbers: [null, num1, num1 + 1], correctAnswer: correct, options: generateOptions(correct) };
            case 'between':
                num1 = Math.floor(Math.random() * (max - 2)) + 1;
                correct = num1 + 1;
                return { type, numbers: [num1, null, num1 + 2], correctAnswer: correct, options: generateOptions(correct) };
            default:
                return { type: 'next', numbers: [1, 2, null], correctAnswer: 3, options: [1, 3, 4] };
        }
    };

    const generateOptions = (correct: number) => {
        const options = [correct];
        while (options.length < 3) {
            const rand = Math.floor(Math.random() * 10) + 1;
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
            setRoundData(prev => [...prev, { round, result: 'success' }]);

            setTimeout(() => {
                setShowConfetti(false);
                if (round < 10) {
                    setRound(r => r + 1);
                } else {
                    finishGame();
                }
            }, 1200);
        } else {
            setFeedback('wrong');
            setMistakes(m => m + 1);
            setRoundData(prev => [...prev, { round, result: 'wrong', errorValue: selected }]);
            setTimeout(() => setFeedback(null), 800);
        }
    };

    const finishGame = () => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        onGameEnd('Sayı Komşuları', duration, 10, mistakes, undefined, {
            zorlukSeviyesi: 1,
            kazanimOdagi: 'MAB.4 Sayı Sıralama',
            algilananKelime: mistakes === 0 ? 'Mükemmel' : `${mistakes} hata`
        });
    };

    // Basit dokunma ile cevaplama (sürükleme yerine)
    const OptionButton = ({ value }: { value: number }) => (
        <TouchableOpacity
            style={[
                styles.optionButton,
                { width: OPTION_SIZE, height: OPTION_SIZE },
                feedback === 'correct' && droppedAnswer === value && styles.optionCorrect,
                feedback === 'wrong' && styles.optionWrong
            ]}
            onPress={() => handleAnswer(value)}
            disabled={feedback !== null}
            activeOpacity={0.7}
        >
            <Text style={[styles.optionText, { fontSize: OPTION_SIZE * 0.55 }]}>{value}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {showConfetti && <ConfettiCannon count={80} origin={{ x: width / 2, y: 0 }} fadeOut />}

            {/* Compact Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={20} color="#fff" />
                </TouchableOpacity>
                <View style={styles.scoreBox}>
                    <Text style={styles.scoreText}>{round}/10</Text>
                </View>
                <TouchableOpacity onPress={toggleMute} style={styles.soundBtn}>
                    <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={18} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Question */}
            <View style={styles.questionArea}>
                <Text style={styles.questionText}>Boşluğa hangi sayı gelir?</Text>
            </View>

            {/* Number Cards - Compact */}
            <Animated.View style={[styles.cardsRow, { opacity: fadeAnim }]}>
                {question?.numbers.map((num, idx) => (
                    <View key={idx} style={styles.cardWrapper}>
                        {idx > 0 && <View style={styles.dash} />}
                        <View style={[
                            styles.card,
                            { width: CARD_SIZE, height: CARD_SIZE },
                            num === null ? styles.emptyCard : styles.filledCard,
                            feedback === 'correct' && num === null && styles.correctCard
                        ]}>
                            <Text style={[
                                styles.cardNumber,
                                { fontSize: NUMBER_SIZE },
                                num === null && styles.cardQuestion
                            ]}>
                                {num === null ? (droppedAnswer ?? '?') : num}
                            </Text>
                        </View>
                    </View>
                ))}
            </Animated.View>

            {/* Options */}
            <View style={styles.optionsRow}>
                {question?.options.map((opt, idx) => (
                    <OptionButton key={`${round}-${idx}`} value={opt} />
                ))}
            </View>

            {/* Feedback */}
            {feedback && (
                <Text style={[styles.feedback, feedback === 'correct' ? styles.feedbackOk : styles.feedbackErr]}>
                    {feedback === 'correct' ? '✓ Doğru!' : '✗ Tekrar dene'}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF8E1',
        paddingTop: Platform.OS === 'ios' ? 45 : 15,
        paddingHorizontal: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    backBtn: { backgroundColor: '#FF9800', padding: 8, borderRadius: 18 },
    soundBtn: { backgroundColor: '#FF9800', padding: 8, borderRadius: 18 },
    scoreBox: {
        backgroundColor: '#fff',
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 14,
        elevation: 2,
    },
    scoreText: { fontSize: 14, fontWeight: 'bold', color: '#EF6C00' },

    questionArea: {
        alignItems: 'center',
        marginVertical: 10,
    },
    questionText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#5D4037',
        textAlign: 'center',
    },

    cardsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 20,
    },
    cardWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dash: {
        width: 10,
        height: 4,
        backgroundColor: '#BCAAA4',
        marginHorizontal: 2,
    },
    card: {
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        elevation: 3,
    },
    filledCard: {
        backgroundColor: '#FFCC80',
        borderColor: '#EF6C00',
    },
    emptyCard: {
        backgroundColor: '#FFF',
        borderColor: '#BDBDBD',
        borderStyle: 'dashed',
    },
    correctCard: {
        backgroundColor: '#C8E6C9',
        borderColor: '#4CAF50',
        borderStyle: 'solid',
    },
    cardNumber: {
        fontWeight: 'bold',
        color: '#E65100',
    },
    cardQuestion: {
        color: '#9E9E9E',
    },

    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginTop: 20,
    },
    optionButton: {
        borderRadius: 30,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#FFB74D',
        elevation: 3,
    },
    optionCorrect: {
        backgroundColor: '#C8E6C9',
        borderColor: '#4CAF50',
    },
    optionWrong: {
        opacity: 0.5,
    },
    optionText: {
        fontWeight: 'bold',
        color: '#E65100',
    },

    feedback: {
        textAlign: 'center',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
    },
    feedbackOk: { color: '#4CAF50' },
    feedbackErr: { color: '#f44336' },
});
