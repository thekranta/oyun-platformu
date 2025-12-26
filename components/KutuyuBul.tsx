import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import DynamicBackground from './DynamicBackground';
import { useSound } from './SoundContext';

interface Props {
    onGameEnd: (
        oyunAdi: string,
        sure: number,
        finalHamle: number,
        finalHata: number,
    ) => void;
    onExit?: () => void;
}

// Item categories with emojis
const ITEM_CATEGORIES = {
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🐢', '🐍', '🦎', '🐙', '🦑', '🦐', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🦈', '🐊'],
    fruits: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑'],
    objects: ['⭐', '🌙', '☀️', '🌈', '❤️', '💎', '🎈', '🎁', '🎀', '🏀', '⚽', '🎾', '🎸', '🎺', '🎨', '✏️', '📚', '🔔', '🏠', '🚗', '✈️', '🚀', '⛵', '🎂', '🍰', '🍪', '🍩', '🍭'],
};

// Question templates - Turkish
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

const TOTAL_STAGES = 5;
const ITEMS_PER_BOX = 4;

export default function KutuyuBul({ onGameEnd, onExit }: Props) {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const isPortrait = screenHeight > screenWidth;
    const { playSound } = useSound();

    // For portrait: use vertical layout with 2x2 grid per box
    // Box size based on screen width - much bigger on mobile
    const boxSize = isPortrait
        ? Math.min(screenWidth * 0.42, 160) // Much bigger boxes on mobile
        : Math.min((screenWidth - 100) / 3, 160);

    const emojiSize = isPortrait ? 38 : 36; // Much bigger emojis on mobile

    const [stage, setStage] = useState(1);
    const [currentQuestion, setCurrentQuestion] = useState<typeof QUESTIONS[0] | null>(null);
    const [boxes, setBoxes] = useState<string[][]>([[], [], []]);
    const [correctBoxIndex, setCorrectBoxIndex] = useState(0);
    const [wrongBoxes, setWrongBoxes] = useState<Set<number>>(new Set());
    const [foundCorrect, setFoundCorrect] = useState(false);
    const [errors, setErrors] = useState(0);
    const [moves, setMoves] = useState(0);
    const [usedQuestions, setUsedQuestions] = useState<number[]>([]);
    const startTimeRef = useRef(Date.now());

    // Animations
    const boxAnims = [
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
        useRef(new Animated.Value(0)).current,
    ];
    const questionAnim = useRef(new Animated.Value(0)).current;
    const feedbackAnim = useRef(new Animated.Value(0)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    // Generate a new round
    const generateRound = () => {
        let availableQuestions = QUESTIONS.map((_, i) => i).filter(i => !usedQuestions.includes(i));
        if (availableQuestions.length === 0) {
            setUsedQuestions([]);
            availableQuestions = QUESTIONS.map((_, i) => i);
        }
        const questionIndex = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        const question = QUESTIONS[questionIndex];
        setUsedQuestions(prev => [...prev, questionIndex]);
        setCurrentQuestion(question);

        const targetBoxIndex = Math.floor(Math.random() * 3);
        setCorrectBoxIndex(targetBoxIndex);

        const categoryItems = [...ITEM_CATEGORIES[question.category]].filter(item => item !== question.target);

        const newBoxes: string[][] = [];
        for (let i = 0; i < 3; i++) {
            const boxItems: string[] = [];

            if (i === targetBoxIndex) {
                boxItems.push(question.target);
                const shuffled = [...categoryItems].sort(() => Math.random() - 0.5);
                for (let j = 0; j < ITEMS_PER_BOX - 1; j++) {
                    boxItems.push(shuffled[j]);
                }
            } else {
                const shuffled = [...categoryItems].sort(() => Math.random() - 0.5);
                for (let j = 0; j < ITEMS_PER_BOX; j++) {
                    boxItems.push(shuffled[j + (i * ITEMS_PER_BOX)]);
                }
            }

            newBoxes.push(boxItems.sort(() => Math.random() - 0.5));
        }

        setBoxes(newBoxes);
        setWrongBoxes(new Set());
        setFoundCorrect(false);

        boxAnims.forEach((anim, i) => {
            anim.setValue(0);
            Animated.spring(anim, {
                toValue: 1,
                delay: i * 100,
                useNativeDriver: true,
                tension: 50,
                friction: 8,
            }).start();
        });

        questionAnim.setValue(0);
        Animated.spring(questionAnim, {
            toValue: 1,
            delay: 300,
            useNativeDriver: true,
        }).start();

        Animated.timing(progressAnim, {
            toValue: stage / TOTAL_STAGES,
            duration: 300,
            useNativeDriver: false,
        }).start();
    };

    useEffect(() => {
        generateRound();
    }, [stage]);

    const handleBoxPress = (boxIndex: number) => {
        if (foundCorrect || wrongBoxes.has(boxIndex)) return;

        setMoves(prev => prev + 1);
        const correct = boxIndex === correctBoxIndex;

        if (correct) {
            setFoundCorrect(true);
            playSound('correct');

            feedbackAnim.setValue(0);
            Animated.spring(feedbackAnim, {
                toValue: 1,
                useNativeDriver: true,
            }).start();

            setTimeout(() => {
                if (stage < TOTAL_STAGES) {
                    setStage(prev => prev + 1);
                } else {
                    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
                    onGameEnd('kutuyu-bul', duration, moves + 1, errors);
                }
            }, 1500);
        } else {
            setWrongBoxes(prev => new Set(prev).add(boxIndex));
            setErrors(prev => prev + 1);
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
        if (foundCorrect && boxIndex === correctBoxIndex) {
            return [styles.box, styles.correctBox];
        }
        if (wrongBoxes.has(boxIndex)) {
            return [styles.box, styles.wrongBox];
        }
        return styles.box;
    };

    const renderBox = (boxIndex: number) => {
        const boxItems = boxes[boxIndex];
        return (
            <Animated.View
                key={boxIndex}
                style={{
                    opacity: boxAnims[boxIndex],
                    transform: [
                        { scale: boxAnims[boxIndex] },
                    ],
                }}
            >
                <TouchableOpacity
                    style={[
                        getBoxStyle(boxIndex),
                        {
                            width: boxSize,
                            height: boxSize,
                        }
                    ]}
                    onPress={() => handleBoxPress(boxIndex)}
                    disabled={foundCorrect || wrongBoxes.has(boxIndex)}
                    activeOpacity={0.8}
                >
                    <View style={styles.boxContent}>
                        {boxItems.map((item, itemIndex) => (
                            <Text key={itemIndex} style={[styles.boxItem, { fontSize: emojiSize }]}>
                                {item}
                            </Text>
                        ))}
                    </View>

                    {foundCorrect && boxIndex === correctBoxIndex && (
                        <View style={styles.correctIndicator}>
                            <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
                        </View>
                    )}
                    {wrongBoxes.has(boxIndex) && (
                        <View style={styles.wrongIndicator}>
                            <Ionicons name="close-circle" size={28} color="#f44336" />
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
        );
    };

    return (
        <DynamicBackground>
            <View style={styles.container}>
                {/* Exit button */}
                <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                    <Ionicons name="close" size={26} color="#d84315" />
                </TouchableOpacity>

                {/* Progress bar */}
                <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBg}>
                        <Animated.View
                            style={[
                                styles.progressBarFill,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%'],
                                    }),
                                },
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>{stage} / {TOTAL_STAGES}</Text>
                </View>

                {/* Question */}
                <Animated.View
                    style={[
                        styles.questionContainer,
                        {
                            opacity: questionAnim,
                            transform: [
                                { scale: questionAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                            ],
                        },
                    ]}
                >
                    <Text style={[styles.questionText, isPortrait && styles.questionTextSmall]}>
                        {currentQuestion?.question}
                    </Text>
                </Animated.View>

                {/* Boxes - Triangle/Pyramid layout on portrait */}
                {isPortrait ? (
                    <View style={styles.pyramidContainer}>
                        {/* Top box */}
                        <View style={styles.pyramidTop}>
                            {renderBox(0)}
                        </View>
                        {/* Bottom two boxes */}
                        <View style={styles.pyramidBottom}>
                            {renderBox(1)}
                            {renderBox(2)}
                        </View>
                    </View>
                ) : (
                    <View style={styles.boxesContainerRow}>
                        {boxes.map((_, boxIndex) => renderBox(boxIndex))}
                    </View>
                )}

                {/* Feedback message */}
                {foundCorrect && (
                    <Animated.View
                        style={[
                            styles.feedbackContainer,
                            {
                                opacity: feedbackAnim,
                                transform: [{ scale: feedbackAnim }],
                            },
                        ]}
                    >
                        <Text style={[styles.feedbackText, isPortrait && styles.feedbackTextSmall]}>
                            🎉 Harika!
                        </Text>
                    </Animated.View>
                )}
            </View>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 45,
        paddingHorizontal: 12,
    },
    exitBtn: {
        position: 'absolute',
        top: 45,
        left: 12,
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: 'rgba(255, 229, 224, 0.95)',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        zIndex: 100,
    },
    progressBarContainer: {
        marginTop: 45,
        marginBottom: 12,
        marginHorizontal: 50,
        alignItems: 'center',
    },
    progressBarBg: {
        width: '100%',
        height: 8,
        backgroundColor: '#e0e0e0',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 4,
    },
    progressText: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '600',
        color: '#666',
    },
    questionContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 14,
        padding: 14,
        marginHorizontal: 16,
        marginBottom: 16,
        elevation: 4,
    },
    questionText: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#333',
    },
    questionTextSmall: {
        fontSize: 16,
    },
    pyramidContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    pyramidTop: {
        alignItems: 'center',
    },
    pyramidBottom: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
    },
    boxesContainerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        flex: 1,
    },
    box: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 8,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        borderWidth: 3,
        borderColor: '#e0e0e0',
        overflow: 'hidden',
    },
    correctBox: {
        borderColor: '#4CAF50',
        backgroundColor: '#E8F5E9',
    },
    wrongBox: {
        borderColor: '#f44336',
        backgroundColor: '#FFEBEE',
        opacity: 0.6,
    },
    boxContent: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
    },
    boxItem: {
        fontSize: 24,
    },
    correctIndicator: {
        position: 'absolute',
        top: -10,
        right: -10,
        backgroundColor: '#fff',
        borderRadius: 16,
    },
    wrongIndicator: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#fff',
        borderRadius: 14,
    },
    feedbackContainer: {
        position: 'absolute',
        bottom: 60,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    feedbackText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#4CAF50',
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 22,
        overflow: 'hidden',
    },
    feedbackTextSmall: {
        fontSize: 18,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
});
