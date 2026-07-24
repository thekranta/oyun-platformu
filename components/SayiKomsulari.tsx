import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
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
interface Question { type: QuestionType; numbers: (number | null)[]; correctAnswer: number; options: number[]; }

export default function SayiKomsulari({ onGameEnd, onExit }: SayiKomsulariProps) {
    const { isMuted, toggleMute } = useSound();
    const [dimensions, setDimensions] = useState(Dimensions.get('window'));

    useEffect(() => {
        const sub = Dimensions.addEventListener('change', ({ window }) => setDimensions(window));
        return () => sub?.remove();
    }, []);

    const { width: screenWidth, height: screenHeight } = dimensions;
    const isPortrait = screenHeight > screenWidth;

    // Responsive container
    const containerWidth = isPortrait ? Math.min(screenWidth * 0.92, 500) : Math.min(screenWidth * 0.85, 850);
    const containerHeight = containerWidth * (isPortrait ? 0.75 : 9 / 16);

    // Sizing
    const CARD_SIZE = containerHeight * 0.18;
    const OPTION_SIZE = containerHeight * 0.16;

    // Floating animations
    const float1 = useRef(new Animated.Value(0)).current;
    const float2 = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const anim = (a: Animated.Value, d: number) => Animated.loop(Animated.sequence([
            Animated.timing(a, { toValue: 12, duration: d, useNativeDriver: true }),
            Animated.timing(a, { toValue: 0, duration: d, useNativeDriver: true }),
        ]));
        const loops = [anim(float1, 3500), anim(float2, 5000)];
        loops.forEach(l => l.start());
        return () => loops.forEach(l => l.stop());
    }, []);

    const [round, setRound] = useState(1);
    const [question, setQuestion] = useState<Question | null>(null);
    const [mistakes, setMistakes] = useState(0);
    const [startTime] = useState(Date.now());
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [droppedAnswer, setDroppedAnswer] = useState<number | null>(null);
    const [prevCorrect, setPrevCorrect] = useState(0); // Prevent consecutive same

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        setFeedback(null);
        setDroppedAnswer(null);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        setQuestion(generateQuestion());
    }, [round]);

    const generateQuestion = (): Question => {
        let type: QuestionType = 'next', max = 5;
        if (round > 4) {
            type = (['next', 'prev', 'between'] as QuestionType[])[Math.floor(Math.random() * 3)];
            max = 10;
        }
        let num1: number, correct: number, result: Question;
        let attempts = 0;
        do {
            switch (type) {
                case 'next': num1 = Math.floor(Math.random() * (max - 2)) + 1; correct = num1 + 2;
                    result = { type, numbers: [num1, num1 + 1, null], correctAnswer: correct, options: genOpts(correct) }; break;
                case 'prev': num1 = Math.floor(Math.random() * (max - 2)) + 2; correct = num1 - 1;
                    result = { type, numbers: [null, num1, num1 + 1], correctAnswer: correct, options: genOpts(correct) }; break;
                case 'between': num1 = Math.floor(Math.random() * (max - 2)) + 1; correct = num1 + 1;
                    result = { type, numbers: [num1, null, num1 + 2], correctAnswer: correct, options: genOpts(correct) }; break;
                default: result = { type: 'next', numbers: [1, 2, null], correctAnswer: 3, options: [1, 3, 4] };
            }
            attempts++;
        } while (result!.correctAnswer === prevCorrect && attempts < 10);
        setPrevCorrect(result!.correctAnswer);
        return result!;
    };

    const genOpts = (c: number) => {
        const o = [c];
        while (o.length < 3) { const r = Math.floor(Math.random() * 10) + 1; if (!o.includes(r)) o.push(r); }
        return o.sort(() => Math.random() - 0.5);
    };

    const handleAnswer = (val: number) => {
        if (feedback) return;
        setDroppedAnswer(val);
        if (val === question?.correctAnswer) {
            setFeedback('correct');
            setShowConfetti(true);
            setTimeout(() => {
                setShowConfetti(false);
                if (round < 10) setRound(r => r + 1);
                else {
                    const d = Math.floor((Date.now() - startTime) / 1000);
                    onGameEnd('Sayı Komşuları', d, 10, mistakes, undefined, { zorlukSeviyesi: 1, kazanimOdagi: 'MAB.4 Sayı Sıralama' });
                }
            }, 1200);
        } else {
            setFeedback('wrong');
            setMistakes(m => m + 1);
            setTimeout(() => { setFeedback(null); setDroppedAnswer(null); }, 800);
        }
    };

    return (
        <View style={styles.outerContainer}>
            {/* Floating */}
            <Animated.Text style={[styles.floatingCloud, { top: '12%', left: '6%', transform: [{ translateY: float1 }] }]}>☁️</Animated.Text>
            <Animated.Text style={[styles.floatingCloud, { top: '22%', right: '8%', opacity: 0.4, transform: [{ translateY: float2 }] }]}>☁️</Animated.Text>
            <Animated.Text style={[styles.floatingStar, { bottom: '25%', left: '10%', transform: [{ translateY: float2 }] }]}>⭐</Animated.Text>

            {showConfetti && <ConfettiCannon count={80} origin={{ x: screenWidth / 2, y: 0 }} fadeOut />}

            <View style={[styles.gameContainer, { width: containerWidth, height: containerHeight }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onExit}><Ionicons name="arrow-back-circle" size={30} color="#FF9800" /></TouchableOpacity>
                    <View style={styles.roundBadge}><Text style={styles.roundText}>🔢 Tur {round}/10</Text></View>
                    <TouchableOpacity onPress={toggleMute}><Ionicons name={isMuted ? 'volume-mute-outline' : 'volume-high-outline'} size={26} color="#FF9800" /></TouchableOpacity>
                </View>

                {/* Main */}
                <View style={styles.mainArea}>
                    {/* Question Cards */}
                    <Text style={styles.questionTitle}>Boşluğa hangi sayı gelir?</Text>
                    <Animated.View style={[styles.cardsRow, { opacity: fadeAnim }]}>
                        {question?.numbers.map((num, idx) => (
                            <View key={idx} style={styles.cardWrapper}>
                                {idx > 0 && <View style={styles.dash} />}
                                <View style={[
                                    styles.card, { width: CARD_SIZE, height: CARD_SIZE },
                                    num === null ? styles.emptyCard : styles.filledCard,
                                    feedback === 'correct' && num === null && styles.correctCard
                                ]}>
                                    <Text style={[styles.cardNumber, { fontSize: CARD_SIZE * 0.5 }, num === null && styles.cardQ]}>
                                        {num === null ? (droppedAnswer ?? '?') : num}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </Animated.View>

                    {/* Options - with light feedback, no text */}
                    <View style={styles.optionsRow}>
                        {question?.options.map((opt, idx) => {
                            const isSelected = droppedAnswer === opt;
                            const isCorrectPick = feedback === 'correct' && isSelected;
                            const isWrongPick = feedback === 'wrong' && isSelected;
                            return (
                                <TouchableOpacity
                                    key={`${round}-${idx}`}
                                    style={[
                                        styles.optionBtn, { width: OPTION_SIZE, height: OPTION_SIZE },
                                        isCorrectPick && styles.optCorrect,
                                        isWrongPick && styles.optWrong
                                    ]}
                                    onPress={() => handleAnswer(opt)}
                                    disabled={!!feedback}
                                >
                                    <Text style={[styles.optionText, { fontSize: OPTION_SIZE * 0.45 }]}>{opt}</Text>
                                    {/* Light indicators */}
                                    {isCorrectPick && <View style={styles.greenLight} />}
                                    {isWrongPick && <View style={styles.redLight} />}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Progress */}
                <View style={styles.progressBar}>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <View key={i} style={[styles.progressDot, i < round && styles.progressDotActive, i === round - 1 && styles.progressDotCurrent]} />
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFE0B2' },
    floatingCloud: { position: 'absolute', fontSize: 36, opacity: 0.3, zIndex: 0 },
    floatingStar: { position: 'absolute', fontSize: 22, opacity: 0.4, zIndex: 0 },
    gameContainer: {
        backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, overflow: 'hidden', zIndex: 10,
        ...(Platform.OS === 'web' ? { boxShadow: '0 12px 40px rgba(0,0,0,0.1)' } as any : { elevation: 12, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20 }),
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: '3%', paddingVertical: '1.5%', backgroundColor: 'rgba(255,243,224,0.9)', borderBottomWidth: 1, borderBottomColor: '#FFCC80',
    },
    roundBadge: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, borderWidth: 2, borderColor: '#FFB74D' },
    roundText: { fontSize: 13, fontWeight: 'bold', color: '#E65100' },
    mainArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: '3%' },
    questionTitle: { fontSize: 16, fontWeight: 'bold', color: '#5D4037', marginBottom: 12 },
    cardsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    cardWrapper: { flexDirection: 'row', alignItems: 'center' },
    dash: { width: 8, height: 3, backgroundColor: '#BCAAA4', marginHorizontal: 3 },
    card: { borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 3 },
    filledCard: { backgroundColor: '#FFCC80', borderColor: '#EF6C00' },
    emptyCard: { backgroundColor: '#FFF', borderColor: '#BDBDBD', borderStyle: 'dashed' },
    correctCard: { backgroundColor: '#C8E6C9', borderColor: '#4CAF50', borderStyle: 'solid' },
    cardNumber: { fontWeight: 'bold', color: '#E65100' },
    cardQ: { color: '#9E9E9E' },
    optionsRow: { flexDirection: 'row', gap: 12 },
    optionBtn: {
        borderRadius: 100, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: '#FFB74D', position: 'relative',
    },
    optCorrect: { backgroundColor: '#C8E6C9', borderColor: '#4CAF50' },
    optWrong: { backgroundColor: '#FFCDD2', borderColor: '#F44336' },
    optionText: { fontWeight: 'bold', color: '#E65100' },
    greenLight: { position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#FFF' },
    redLight: { position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: 7, backgroundColor: '#F44336', borderWidth: 2, borderColor: '#FFF' },
    progressBar: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: '1%', backgroundColor: 'rgba(255,243,224,0.9)' },
    progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFE0B2', borderWidth: 1, borderColor: '#FFCC80' },
    progressDotActive: { backgroundColor: '#FF9800', borderColor: '#E65100' },
    progressDotCurrent: { backgroundColor: '#4CAF50', borderColor: '#2E7D32', transform: [{ scale: 1.3 }] },
});
