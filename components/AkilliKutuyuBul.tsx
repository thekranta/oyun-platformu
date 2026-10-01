import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import GameExitButton from './GameExitButton';
import { useSound } from './SoundContext';
import { speak } from '../services/speechService';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';

interface Props {
    onGameEnd: (
        oyunAdi: string,
        sure: number,
        finalHamle: number,
        finalHata: number,
        algilananKelime?: string,
        extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string },
    ) => void;
    onExit?: () => void;
    childName?: string;
}

const ITEM_CATEGORIES = {
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🐢', '🐍', '🦎', '🐙', '🦑', '🦐', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🦈', '🐊'],
    fruits: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑'],
    objects: ['⭐', '🌙', '☀️', '🌈', '❤️', '💎', '🎈', '🎁', '🎀', '🏀', '⚽', '🎾', '🎸', '🎺', '🎨', '✏️', '📚', '🔔', '🏠', '🚗', '✈️', '🚀', '⛵', '🎂', '🍰', '🍪', '🍩', '🍭'],
};

const QUESTIONS: { target: string; question: string; category: keyof typeof ITEM_CATEGORIES }[] = [
    { target: '🐦', question: 'Kuş olan kutuyu bul! 🐦', category: 'animals' },
    { target: '🍎', question: 'Elma olan kutuyu bul! 🍎', category: 'fruits' },
    { target: '🐱', question: 'Kedi olan kutuyu bul! 🐱', category: 'animals' },
    { target: '🍌', question: 'Muz olan kutuyu bul! 🍌', category: 'fruits' },
    { target: '⭐', question: 'Yıldız olan kutuyu bul! ⭐', category: 'objects' },
    { target: '🐶', question: 'Köpek olan kutuyu bul! 🐶', category: 'animals' },
    { target: '🍉', question: 'Karpuz olan kutuyu bul! 🍉', category: 'fruits' },
    { target: '🦋', question: 'Kelebek olan kutuyu bul! 🦋', category: 'animals' },
    { target: '❤️', question: 'Kalp olan kutuyu bul! ❤️', category: 'objects' },
    { target: '🐰', question: 'Tavşan olan kutuyu bul! 🐰', category: 'animals' },
    { target: '🍇', question: 'Üzüm olan kutuyu bul! 🍇', category: 'fruits' },
    { target: '🌙', question: 'Ay olan kutuyu bul! 🌙', category: 'objects' },
    { target: '🐢', question: 'Kaplumbağa olan kutuyu bul! 🐢', category: 'animals' },
    { target: '🍓', question: 'Çilek olan kutuyu bul! 🍓', category: 'fruits' },
    { target: '🎈', question: 'Balon olan kutuyu bul! 🎈', category: 'objects' },
];

// Zorluk arttıkça kutu başına çeldirici sayısı artar (daha yoğun görsel arama).
const ITEMS_PER_BOX_BY_DIFF: Record<number, number> = { 1: 3, 2: 4, 3: 5, 4: 6, 5: 7 };
const TOTAL_STAGES = 9;
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

export default function AkilliKutuyuBul({ onGameEnd, onExit, childName }: Props) {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const isPortrait = screenHeight > screenWidth;
    const { playSound } = useSound();
    const { difficulty, recordLevel } = useAdaptiveDifficulty({ minDifficulty: 1, maxDifficulty: 5, checkpointEvery: 3 });

    const boxSize = isPortrait
        ? Math.min(screenWidth * 0.42, 160)
        : Math.min((screenWidth - 100) / 3, 160);

    const [stage, setStage] = useState(1);
    const [currentQuestion, setCurrentQuestion] = useState<typeof QUESTIONS[0] | null>(null);
    const [boxes, setBoxes] = useState<string[][]>([[], [], []]);
    const [correctBoxIndex, setCorrectBoxIndex] = useState(0);
    const [wrongBoxes, setWrongBoxes] = useState<Set<number>>(new Set());
    const [foundCorrect, setFoundCorrect] = useState(false);
    const [errors, setErrors] = useState(0);
    const [moves, setMoves] = useState(0);
    const [usedQuestions, setUsedQuestions] = useState<number[]>([]);
    const [gameReady, setGameReady] = useState(false);
    const startTimeRef = useRef(Date.now());
    const levelStartRef = useRef(Date.now());
    const levelErrorsRef = useRef(0);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const boxAnims = [
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
    ];
    const questionAnim = useRef(new Animated.Value(0)).current;
    const feedbackAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    const emojiSizeFor = (itemsPerBox: number) => {
        // Kutudaki öğe sayısı arttıkça her birinin fontu biraz küçülür (sığması için).
        if (itemsPerBox <= 3) return isPortrait ? 38 : 36;
        if (itemsPerBox <= 5) return isPortrait ? 32 : 30;
        return isPortrait ? 26 : 24;
    };

    const generateRound = (diff: number) => {
        const itemsPerBox = ITEMS_PER_BOX_BY_DIFF[diff] ?? 4;
        levelStartRef.current = Date.now();
        levelErrorsRef.current = 0;

        let availableQuestions = QUESTIONS.map((_, i) => i).filter(i => !usedQuestions.includes(i));
        if (availableQuestions.length === 0) {
            setUsedQuestions([]);
            availableQuestions = QUESTIONS.map((_, i) => i);
        }
        const questionIndex = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        const question = QUESTIONS[questionIndex];
        setUsedQuestions(prev => [...prev, questionIndex]);
        setCurrentQuestion(question);
        if (gameReady) speak(question.question);

        const targetBoxIndex = Math.floor(Math.random() * 3);
        setCorrectBoxIndex(targetBoxIndex);

        const categoryItems = [...ITEM_CATEGORIES[question.category]].filter(item => item !== question.target);

        const newBoxes: string[][] = [];
        for (let i = 0; i < 3; i++) {
            const boxItems: string[] = [];
            const shuffled = [...categoryItems].sort(() => Math.random() - 0.5);

            if (i === targetBoxIndex) {
                boxItems.push(question.target);
                for (let j = 0; j < itemsPerBox - 1; j++) {
                    boxItems.push(shuffled[j % shuffled.length]);
                }
            } else {
                for (let j = 0; j < itemsPerBox; j++) {
                    boxItems.push(shuffled[(j + i * itemsPerBox) % shuffled.length]);
                }
            }

            newBoxes.push(boxItems.sort(() => Math.random() - 0.5));
        }

        setBoxes(newBoxes);
        setWrongBoxes(new Set());
        setFoundCorrect(false);

        boxAnims.forEach((anim, i) => {
            anim.setValue(0);
            Animated.spring(anim, { toValue: 1, delay: i * 100, useNativeDriver: true, tension: 50, friction: 8 }).start();
        });

        questionAnim.setValue(0);
        Animated.spring(questionAnim, { toValue: 1, delay: 300, useNativeDriver: true }).start();

        Animated.timing(progressAnim, { toValue: stage / TOTAL_STAGES, duration: 300, useNativeDriver: false }).start();
    };

    useEffect(() => {
        generateRound(difficulty);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage]);

    useEffect(() => {
        return () => {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            timersRef.current.forEach(clearTimeout);
        };
    }, []);

    const handleBoxPress = (boxIndex: number) => {
        if (foundCorrect || wrongBoxes.has(boxIndex)) return;

        setMoves(prev => prev + 1);
        const correct = boxIndex === correctBoxIndex;

        if (correct) {
            setFoundCorrect(true);
            playSound('correct');
            speak('Aferin!');

            feedbackAnim.setValue(0);
            Animated.spring(feedbackAnim, { toValue: 1, useNativeDriver: true }).start();

            const timeMs = Date.now() - levelStartRef.current;
            const nextDiff = recordLevel({ correct: 1, total: 1, errors: levelErrorsRef.current, timeMs, targetMs: 6000 });

            timersRef.current.push(setTimeout(() => {
                if (stage < TOTAL_STAGES) {
                    setStage(prev => prev + 1);
                } else {
                    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
                    onGameEnd('akilli-kutuyu-bul', duration, moves + 1, errors, undefined, {
                        zorlukSeviyesi: nextDiff,
                        kazanimOdagi: 'Görsel Arama ve Dikkat (uyarlanır zorluk)',
                    });
                }
            }, 1500));
        } else {
            setWrongBoxes(prev => new Set(prev).add(boxIndex));
            setErrors(prev => prev + 1);
            levelErrorsRef.current += 1;
            playSound('wrong');

            const shakeAnim = boxAnims[boxIndex];
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 1.05, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0.95, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 1.05, duration: 50, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 1, duration: 50, useNativeDriver: true }),
            ]).start();
        }
    };

    const getBoxStyle = (boxIndex: number) => {
        if (foundCorrect && boxIndex === correctBoxIndex) return [styles.box, styles.correctBox];
        if (wrongBoxes.has(boxIndex)) return [styles.box, styles.wrongBox];
        return styles.box;
    };

    const itemsPerBox = ITEMS_PER_BOX_BY_DIFF[difficulty] ?? 4;
    const emojiSize = emojiSizeFor(itemsPerBox);

    const renderBox = (boxIndex: number) => {
        const boxItems = boxes[boxIndex];
        return (
            <Animated.View key={boxIndex} style={{ opacity: boxAnims[boxIndex], transform: [{ scale: boxAnims[boxIndex] }] }}>
                <TouchableOpacity
                    style={[getBoxStyle(boxIndex), { width: boxSize, height: boxSize }]}
                    onPress={() => handleBoxPress(boxIndex)}
                    disabled={foundCorrect || wrongBoxes.has(boxIndex)}
                    activeOpacity={0.8}
                >
                    <View style={styles.boxContent}>
                        {boxItems.map((item, itemIndex) => (
                            <Text key={itemIndex} style={[styles.boxItem, { fontSize: emojiSize }]}>{item}</Text>
                        ))}
                    </View>
                    {foundCorrect && boxIndex === correctBoxIndex && (
                        <View style={styles.correctIndicator}><Ionicons name="checkmark-circle" size={32} color="#4CAF50" /></View>
                    )}
                    {wrongBoxes.has(boxIndex) && (
                        <View style={styles.wrongIndicator}><Ionicons name="close-circle" size={28} color="#f44336" /></View>
                    )}
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <DynamicBackground>
            <View style={styles.container}>
                <GameExitButton onPress={onExit ?? (() => {})} style={{ position: 'absolute', top: 16, left: 16, zIndex: 20 }} />

                <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBg}>
                        <Animated.View style={[styles.progressBarFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
                    </View>
                    <Text style={styles.progressText}>{stage} / {TOTAL_STAGES}  📈</Text>
                </View>

                <Animated.View
                    style={[
                        styles.questionContainer,
                        { opacity: questionAnim, transform: [{ scale: questionAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }] },
                    ]}
                >
                    <Text style={styles.targetEmoji}>{currentQuestion?.target}</Text>
                </Animated.View>

                <TouchableOpacity style={styles.listenBtn} onPress={() => currentQuestion && speak(currentQuestion.question, { instructions: HAPPY_VOICE })} activeOpacity={0.85}>
                    <Ionicons name="volume-high" size={20} color="#fff" />
                    <Text style={styles.listenText}>Tekrar Dinle</Text>
                </TouchableOpacity>

                {isPortrait ? (
                    <View style={styles.pyramidContainer}>
                        <View style={styles.pyramidTop}>{renderBox(0)}</View>
                        <View style={styles.pyramidBottom}>{renderBox(1)}{renderBox(2)}</View>
                    </View>
                ) : (
                    <View style={styles.boxesContainerRow}>
                        {boxes.map((_, boxIndex) => renderBox(boxIndex))}
                    </View>
                )}

                {foundCorrect && (
                    <Animated.View style={[styles.feedbackContainer, { opacity: feedbackAnim, transform: [{ scale: feedbackAnim }] }]}>
                        <Text style={[styles.feedbackText, isPortrait && styles.feedbackTextSmall]}>🎉 Harika!</Text>
                    </Animated.View>
                )}
            </View>

            {!gameReady && (
                <CountdownOverlay
                    message="Sana söylenen şeyi bul ve dokun! Sen başardıkça oyun akıllanır 📈"
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => { setGameReady(true); if (currentQuestion) speak(currentQuestion.question); }}
                />
            )}
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 45, paddingHorizontal: 12 },
    progressBarContainer: { marginTop: 45, marginBottom: 12, marginHorizontal: 50, alignItems: 'center' },
    progressBarBg: { width: '100%', height: 8, backgroundColor: '#e0e0e0', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 4 },
    progressText: { marginTop: 4, fontSize: 12, fontWeight: '600', color: '#666' },
    questionContainer: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 16, elevation: 4 },
    targetEmoji: { fontSize: 64, textAlign: 'center', marginBottom: 4 },
    listenBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#4CAF50', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 22, marginTop: 12, alignSelf: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
    listenText: { color: '#fff', fontSize: 15, fontWeight: '800' },
    pyramidContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
    pyramidTop: { alignItems: 'center' },
    pyramidBottom: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
    boxesContainerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, flex: 1 },
    box: { backgroundColor: '#fff', borderRadius: 16, padding: 8, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, borderWidth: 3, borderColor: '#e0e0e0', overflow: 'hidden' },
    correctBox: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
    wrongBox: { borderColor: '#f44336', backgroundColor: '#FFEBEE', opacity: 0.6 },
    boxContent: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 2 },
    boxItem: { fontSize: 24 },
    correctIndicator: { position: 'absolute', top: -10, right: -10, backgroundColor: '#fff', borderRadius: 16 },
    wrongIndicator: { position: 'absolute', top: -8, right: -8, backgroundColor: '#fff', borderRadius: 14 },
    feedbackContainer: { position: 'absolute', bottom: 60, left: 0, right: 0, alignItems: 'center' },
    feedbackText: { fontSize: 24, fontWeight: 'bold', color: '#4CAF50', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 22, overflow: 'hidden' },
    feedbackTextSmall: { fontSize: 18, paddingHorizontal: 20, paddingVertical: 10 },
});
