import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DynamicBackground from './DynamicBackground';

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

const { width: screenWidth } = Dimensions.get('window');
const boxSize = Math.min((screenWidth - 60) / 3, 140);

export default function KutuyuBul({ onGameEnd, onExit }: Props) {
    const [stage, setStage] = useState(1);
    const [currentQuestion, setCurrentQuestion] = useState<typeof QUESTIONS[0] | null>(null);
    const [boxes, setBoxes] = useState<string[][]>([[], [], []]);
    const [correctBoxIndex, setCorrectBoxIndex] = useState(0);
    const [selectedBox, setSelectedBox] = useState<number | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
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

    // Generate a new round
    const generateRound = () => {
        // Pick a random unused question
        const availableQuestions = QUESTIONS.map((_, i) => i).filter(i => !usedQuestions.includes(i));
        if (availableQuestions.length === 0) {
            setUsedQuestions([]);
        }
        const questionIndex = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        const question = QUESTIONS[questionIndex];
        setUsedQuestions(prev => [...prev, questionIndex]);
        setCurrentQuestion(question);

        // Determine which box will have the target
        const targetBoxIndex = Math.floor(Math.random() * 3);
        setCorrectBoxIndex(targetBoxIndex);

        // Get items from the same category (excluding the target)
        const categoryItems = [...ITEM_CATEGORIES[question.category]].filter(item => item !== question.target);

        // Generate boxes
        const newBoxes: string[][] = [];
        for (let i = 0; i < 3; i++) {
            const boxItems: string[] = [];

            if (i === targetBoxIndex) {
                // This box has the target - add target and other items
                boxItems.push(question.target);
                const shuffled = [...categoryItems].sort(() => Math.random() - 0.5);
                for (let j = 0; j < ITEMS_PER_BOX - 1; j++) {
                    boxItems.push(shuffled[j]);
                }
            } else {
                // This box doesn't have the target - add random items (NOT the target)
                const shuffled = [...categoryItems].sort(() => Math.random() - 0.5);
                for (let j = 0; j < ITEMS_PER_BOX; j++) {
                    boxItems.push(shuffled[j + (i * ITEMS_PER_BOX)]);
                }
            }

            // Shuffle items within the box
            newBoxes.push(boxItems.sort(() => Math.random() - 0.5));
        }

        setBoxes(newBoxes);
        setSelectedBox(null);
        setIsCorrect(null);

        // Animate boxes in
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

        // Animate question
        questionAnim.setValue(0);
        Animated.spring(questionAnim, {
            toValue: 1,
            delay: 300,
            useNativeDriver: true,
        }).start();
    };

    useEffect(() => {
        generateRound();
    }, [stage]);

    const handleBoxPress = (boxIndex: number) => {
        if (selectedBox !== null) return; // Already selected

        setSelectedBox(boxIndex);
        setMoves(prev => prev + 1);

        const correct = boxIndex === correctBoxIndex;
        setIsCorrect(correct);

        if (!correct) {
            setErrors(prev => prev + 1);
        }

        // Animate feedback
        feedbackAnim.setValue(0);
        Animated.spring(feedbackAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();

        // Move to next stage after delay
        setTimeout(() => {
            if (stage < TOTAL_STAGES) {
                setStage(prev => prev + 1);
            } else {
                // Game complete
                const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
                onGameEnd('kutuyu-bul', duration, moves + 1, errors + (correct ? 0 : 1));
            }
        }, correct ? 1500 : 2000);
    };

    const getBoxStyle = (boxIndex: number) => {
        if (selectedBox === null) return styles.box;
        if (boxIndex === correctBoxIndex) return [styles.box, styles.correctBox];
        if (boxIndex === selectedBox) return [styles.box, styles.wrongBox];
        return styles.box;
    };

    return (
        <DynamicBackground>
            <View style={styles.container}>
                {/* Exit button */}
                <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                    <Ionicons name="close" size={28} color="#d84315" />
                </TouchableOpacity>

                {/* Progress indicator */}
                <View style={styles.progressContainer}>
                    {Array.from({ length: TOTAL_STAGES }).map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.progressDot,
                                i < stage ? styles.progressDotActive : {},
                                i === stage - 1 ? styles.progressDotCurrent : {},
                            ]}
                        />
                    ))}
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
                    <Text style={styles.questionText}>{currentQuestion?.question}</Text>
                </Animated.View>

                {/* Boxes */}
                <View style={styles.boxesContainer}>
                    {boxes.map((boxItems, boxIndex) => (
                        <Animated.View
                            key={boxIndex}
                            style={{
                                opacity: boxAnims[boxIndex],
                                transform: [
                                    { scale: boxAnims[boxIndex] },
                                    { translateY: boxAnims[boxIndex].interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
                                ],
                            }}
                        >
                            <TouchableOpacity
                                style={[getBoxStyle(boxIndex), { width: boxSize, height: boxSize }]}
                                onPress={() => handleBoxPress(boxIndex)}
                                disabled={selectedBox !== null}
                                activeOpacity={0.8}
                            >
                                <View style={styles.boxContent}>
                                    {boxItems.map((item, itemIndex) => (
                                        <Text key={itemIndex} style={styles.boxItem}>
                                            {item}
                                        </Text>
                                    ))}
                                </View>

                                {/* Correct/Wrong indicator */}
                                {selectedBox !== null && boxIndex === correctBoxIndex && (
                                    <View style={styles.correctIndicator}>
                                        <Ionicons name="checkmark-circle" size={40} color="#4CAF50" />
                                    </View>
                                )}
                                {selectedBox === boxIndex && boxIndex !== correctBoxIndex && (
                                    <View style={styles.wrongIndicator}>
                                        <Ionicons name="close-circle" size={40} color="#f44336" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </View>

                {/* Feedback message */}
                {selectedBox !== null && (
                    <Animated.View
                        style={[
                            styles.feedbackContainer,
                            {
                                opacity: feedbackAnim,
                                transform: [{ scale: feedbackAnim }],
                            },
                        ]}
                    >
                        <Text style={[styles.feedbackText, isCorrect ? styles.correctText : styles.wrongText]}>
                            {isCorrect ? '🎉 Harika! Doğru!' : '😊 Tekrar dene!'}
                        </Text>
                    </Animated.View>
                )}

                {/* Stats */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Ionicons name="flag" size={18} color="#666" />
                        <Text style={styles.statText}>{stage}/{TOTAL_STAGES}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="close-circle-outline" size={18} color="#f44336" />
                        <Text style={styles.statText}>{errors}</Text>
                    </View>
                </View>
            </View>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
        paddingHorizontal: 16,
    },
    exitBtn: {
        position: 'absolute',
        top: 50,
        left: 16,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 229, 224, 0.95)',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        zIndex: 100,
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginTop: 60,
        marginBottom: 20,
    },
    progressDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#e0e0e0',
    },
    progressDotActive: {
        backgroundColor: '#4CAF50',
    },
    progressDotCurrent: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 3,
        borderColor: '#4CAF50',
        backgroundColor: '#E8F5E9',
    },
    questionContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 30,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    questionText: {
        fontSize: 22,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#333',
    },
    boxesContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    box: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 10,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        borderWidth: 4,
        borderColor: '#e0e0e0',
    },
    correctBox: {
        borderColor: '#4CAF50',
        backgroundColor: '#E8F5E9',
    },
    wrongBox: {
        borderColor: '#f44336',
        backgroundColor: '#FFEBEE',
    },
    boxContent: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    boxItem: {
        fontSize: 28,
    },
    correctIndicator: {
        position: 'absolute',
        top: -15,
        right: -15,
        backgroundColor: '#fff',
        borderRadius: 20,
    },
    wrongIndicator: {
        position: 'absolute',
        top: -15,
        right: -15,
        backgroundColor: '#fff',
        borderRadius: 20,
    },
    feedbackContainer: {
        position: 'absolute',
        bottom: 120,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    feedbackText: {
        fontSize: 24,
        fontWeight: 'bold',
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 30,
        overflow: 'hidden',
    },
    correctText: {
        color: '#4CAF50',
    },
    wrongText: {
        color: '#FF9800',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 30,
        paddingBottom: 30,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    statText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
});
