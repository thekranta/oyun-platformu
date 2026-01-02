import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
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
    const { isMuted, toggleMute, playSound } = useSound();
    const [round, setRound] = useState(1);
    const [question, setQuestion] = useState<Question | null>(null);
    const [mistakes, setMistakes] = useState(0);
    const [score, setScore] = useState(0); // Optional internal score
    const [startTime, setStartTime] = useState(Date.now());
    const [roundData, setRoundData] = useState<any[]>([]);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [wrongSelection, setWrongSelection] = useState<number | null>(null);

    // Animasyonlar - useRef kullanımı düzeltildi
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        startRound();
    }, [round]);

    const startRound = () => {
        setFeedback(null);
        setWrongSelection(null);
        fadeAnim.setValue(0);

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
        }).start();

        const q = generateQuestion();
        setQuestion(q);
    };

    const generateQuestion = (): Question => {
        // Round 1-4: Basit (1-5), sadece 'next'
        // Round 5-10: Zorlu (1-10), karışık tipler

        let type: QuestionType = 'next';
        let min = 1;
        let max = 5;

        if (round > 4) {
            const types: QuestionType[] = ['next', 'prev', 'between'];
            type = types[Math.floor(Math.random() * types.length)];
            max = 10;
        }

        let num1, num2, correct;

        switch (type) {
            case 'next':
                // Örnek: 3, 4, ?
                num1 = Math.floor(Math.random() * (max - 2)) + 1; // max=5 ise 1,2,3 gelebilir. +2 ile 5 olur.
                num2 = num1 + 1;
                correct = num2 + 1;
                return {
                    type,
                    numbers: [num1, num2, null],
                    correctAnswer: correct,
                    options: generateOptions(correct, 1, 10)
                };
            case 'prev':
                // Örnek: ?, 6, 7
                num1 = Math.floor(Math.random() * (max - 2)) + 2; // min 2 olmalı ki öncesi 1 olsun
                correct = num1 - 1;
                return {
                    type,
                    numbers: [null, num1, num1 + 1],
                    correctAnswer: correct,
                    options: generateOptions(correct, 1, 10)
                };
            case 'between':
                // Örnek: 2, ?, 4
                num1 = Math.floor(Math.random() * (max - 2)) + 1;
                correct = num1 + 1;
                return {
                    type,
                    numbers: [num1, null, num1 + 2],
                    correctAnswer: correct,
                    options: generateOptions(correct, 1, 10)
                };
            default:
                // Fallback
                return { type: 'next', numbers: [1, 2, null], correctAnswer: 3, options: [1, 3, 4] };
        }
    };

    const generateOptions = (correct: number, min: number, max: number) => {
        const checkDupe = (arr: number[], num: number) => arr.includes(num);
        const options = [correct];

        while (options.length < 3) {
            const rand = Math.floor(Math.random() * (max - min + 1)) + min;
            if (rand !== correct && !checkDupe(options, rand)) {
                options.push(rand);
            }
        }

        // Shuffle
        return options.sort(() => Math.random() - 0.5);
    };

    const handleAnswer = (selected: number) => {
        if (feedback) return;

        if (selected === question?.correctAnswer) {
            setFeedback('correct');
            // Play sound success

            // Veri kaydı
            setRoundData(prev => [...prev, {
                round,
                question: question.numbers,
                result: 'success',
                mistakesInRound: wrongSelection ? 1 : 0
            }]);

            setTimeout(() => {
                if (round < 10) {
                    setRound(r => r + 1);
                } else {
                    finishGame();
                }
            }, 1000);
        } else {
            setFeedback('wrong');
            setWrongSelection(selected);
            setMistakes(m => m + 1);
            // Play sound error

            setRoundData(prev => [...prev, {
                round,
                question: question?.numbers,
                result: 'wrong',
                errorValue: selected
            }]);

            setTimeout(() => {
                setFeedback(null);
                setWrongSelection(null);
            }, 1000);
        }
    };

    const finishGame = () => {
        const duration = Math.floor((Date.now() - startTime) / 1000);

        // Hatalı olunan sayı analizi
        const errorCounts: Record<string, number> = {};
        roundData.filter(d => d.result === 'wrong').forEach(d => {
            // Hangi sayıda hata yaptı (doğru cevap neydi?)
            // Burada basitçe hatalı seçimi kaydediyoruz ama analiz için "hangi soruda takıldı" daha önemli
            // Soruyu stringleştirip key yapalım veya doğru cevabı alalım.
            // Bu component scope'unda question state'i değişiyor, o yüzden roundData içinde doğru cevabı saklamalıydık.
            // Şimdilik sadece errorValue'yu sayalım (seçilen yanlış sayı) veya basitçe "Sıralama hatası" diyelim.
        });

        const extraData = {
            cizimVerisi: JSON.stringify({ roundHistory: roundData }),
            zorlukSeviyesi: 1,
            kazanimOdagi: 'MAB.4 Sayı Sıralama ve İlişkilendirme',
            algilananKelime: mistakes === 0 ? 'Mükemmel Sıralama' : `${mistakes} hatalı seçim`
        };

        onGameEnd('Sayı Komşuları', duration, 10, mistakes, undefined, extraData);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreText}>Tur: {round}/10</Text>
                </View>
                <TouchableOpacity onPress={toggleMute} style={styles.soundButton}>
                    <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.gameContent}>
                <Text style={styles.questionTitle}>Boşluğa hangi sayı gelmeli?</Text>

                <Animated.View style={[styles.trainContainer, { opacity: fadeAnim }]}>
                    {question?.numbers.map((num, idx) => (
                        <View key={idx} style={styles.trainCar}>
                            {/* Connector Line */}
                            {idx > 0 && <View style={styles.connector} />}

                            <View style={[styles.numberBlock, num === null ? styles.emptyBlock : styles.filledBlock]}>
                                <Text style={[styles.numberText, num === null && styles.questionMark]}>
                                    {num === null ? '?' : num}
                                </Text>
                            </View>
                        </View>
                    ))}
                </Animated.View>
            </View>

            <View style={styles.optionsContainer}>
                {question?.options.map((opt, idx) => (
                    <TouchableOpacity
                        key={idx}
                        style={[
                            styles.optionButton,
                            feedback === 'wrong' && wrongSelection === opt ? styles.optionWrong : {},
                            feedback === 'correct' && opt === question.correctAnswer ? styles.optionCorrect : {}
                        ]}
                        onPress={() => handleAnswer(opt)}
                        disabled={!!feedback}
                    >
                        <Text style={styles.optionText}>{opt}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const { width } = Dimensions.get('window');
const BLOCK_SIZE = width / 4.5;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF3E0', // Açık turuncu (Sıcak tema)
        paddingTop: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 40,
    },
    backButton: { backgroundColor: '#FF9800', padding: 8, borderRadius: 20 },
    soundButton: { backgroundColor: '#FF9800', padding: 8, borderRadius: 20 },
    scoreContainer: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, elevation: 2 },
    scoreText: { fontSize: 18, fontWeight: 'bold', color: '#EF6C00' },

    gameContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    questionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#5D4037',
        marginBottom: 30,
        textAlign: 'center',
    },
    trainContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    trainCar: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    connector: {
        width: 15,
        height: 6,
        backgroundColor: '#8D6E63',
    },
    numberBlock: {
        width: BLOCK_SIZE,
        height: BLOCK_SIZE,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        borderWidth: 3,
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
    numberText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#E65100',
    },
    questionMark: {
        color: '#BDBDBD',
    },

    optionsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        paddingBottom: 50,
        paddingHorizontal: 20,
    },
    optionButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        borderWidth: 2,
        borderColor: '#FFB74D',
    },
    optionWrong: { backgroundColor: '#FFCDD2', borderColor: '#F44336' },
    optionCorrect: { backgroundColor: '#C8E6C9', borderColor: '#4CAF50' },
    optionText: { fontSize: 32, fontWeight: 'bold', color: '#555' },
});
