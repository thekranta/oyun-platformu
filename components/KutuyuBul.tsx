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

    // Responsive box size - smaller on portrait mobile
    const boxSize = isPortrait
        ? Math.min((screenWidth - 48) / 3, 100) // Portrait: 3 boxes with smaller padding
        : Math.min((screenWidth - 80) / 3, 160); // Landscape: more space

    const emojiSize = isPortrait ? 28 : 40;

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
        // Pick a random unused question
        let availableQuestions = QUESTIONS.map((_, i) => i).filter(i => !usedQuestions.includes(i));
        if (availableQuestions.length === 0) {
            setUsedQuestions([]);
            availableQuestions = QUESTIONS.map((_, i) => i);
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
        setWrongBoxes(new Set());
        setFoundCorrect(false);

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

        // Animate progress
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
            playSound('correct'); // Play correct sound

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
                    onGameEnd('kutuyu-bul', duration, moves + 1, errors);
                }
            }, 1500);
        } else {
            // Wrong answer - mark this box and track error
            setWrongBoxes(prev => new Set(prev).add(boxIndex));
            setErrors(prev => prev + 1);
            playSound('wrong'); // Play wrong sound

            // Shake animation for wrong box
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

    return (
        <DynamicBackground>
            <View style={styles.container}>
                {/* Exit button */}
                <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                    <Ionicons name="close" size={28} color="#d84315" />
                </TouchableOpacity>

                {/* Progress bar at top */}
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
                                style={[
                                    getBoxStyle(boxIndex),
                                    {
                                        width: boxSize,
                                        height: boxSize,
                                        padding: isPortrait ? 6 : 12,
                                        borderRadius: isPortrait ? 16 : 24,
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

                                {/* Correct indicator */}
                                {foundCorrect && boxIndex === correctBoxIndex && (
                                    <View style={styles.correctIndicator}>
                                        <Ionicons name="checkmark-circle" size={isPortrait ? 32 : 44} color="#4CAF50" />
                                    </View>
                                )}
                                {/* Wrong indicator */}
                                {wrongBoxes.has(boxIndex) && (
                                    <View style={styles.wrongIndicator}>
                                        <Ionicons name="close-circle" size={isPortrait ? 28 : 36} color="#f44336" />
                                    </View>
                                )}
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </View>

                {/* Feedback message when correct */}
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
                            🎉 Harika! Doğru!
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
        paddingTop: 50,
        paddingHorizontal: 12,
    },
    exitBtn: {
        position: 'absolute',
        top: 50,
        left: 12,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 229, 224, 0.95)',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        zIndex: 100,
    },
    progressBarContainer: {
        marginTop: 50,
        marginBottom: 16,
        marginHorizontal: 50,
        alignItems: 'center',
    },
    progressBarBg: {
        width: '100%',
        height: 10,
        backgroundColor: '#e0e0e0',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 5,
    },
    progressText: {
        marginTop: 6,
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    questionContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 10,
        marginBottom: 20,
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
    questionTextSmall: {
        fontSize: 18,
    },
    boxesContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        paddingHorizontal: 4,
    },
    box: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 12,
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
        opacity: 0.6,
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
        fontSize: 40,
    },
    correctIndicator: {
        position: 'absolute',
        top: -14,
        right: -14,
        backgroundColor: '#fff',
        borderRadius: 22,
    },
    wrongIndicator: {
        position: 'absolute',
        top: -12,
        right: -12,
        backgroundColor: '#fff',
        borderRadius: 18,
    },
    feedbackContainer: {
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    feedbackText: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#4CAF50',
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 30,
        paddingVertical: 16,
        borderRadius: 25,
        overflow: 'hidden',
    },
    feedbackTextSmall: {
        fontSize: 20,
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
});
