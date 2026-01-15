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
import CountdownOverlay from './CountdownOverlay';
import { useSound } from './SoundContext';

interface QuantityComparisonProps {
    onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number, algilananKelime?: string, extraData?: any) => void;
    onExit: () => void;
    childName?: string;
}

type QuestionType = 'MORE' | 'LESS';

interface RoundData {
    round: number;
    questionType: QuestionType;
    leftCount: number;
    rightCount: number;
    correctAnswer: 'left' | 'right';
    userAnswer: 'left' | 'right' | null;
    isCorrect: boolean;
    distanceEffect: number;
    responseTime: number;
}

// Flat 2D fruit emojis (Apple and Orange for variety)
const FRUITS = { left: '🍎', right: '🍊' };

export default function QuantityComparison({ onGameEnd, onExit, childName = 'Çocuk' }: QuantityComparisonProps) {
    const { isMuted, toggleMute } = useSound();
    const [gameReady, setGameReady] = useState(false);
    const [dimensions, setDimensions] = useState(Dimensions.get('window'));

    useEffect(() => {
        const sub = Dimensions.addEventListener('change', ({ window }) => setDimensions(window));
        return () => sub?.remove();
    }, []);

    const { width: screenWidth, height: screenHeight } = dimensions;
    const isPortrait = screenHeight > screenWidth;

    // Responsive container - professional stage
    const containerWidth = isPortrait ? Math.min(screenWidth * 0.92, 480) : Math.min(screenWidth * 0.85, 850);
    const containerHeight = containerWidth * (isPortrait ? 0.9 : 9 / 16);
    const FRUIT_SIZE = containerHeight * 0.09;

    // Floating background animations
    const float1 = useRef(new Animated.Value(0)).current;
    const float2 = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const anim = (a: Animated.Value, d: number) => Animated.loop(Animated.sequence([
            Animated.timing(a, { toValue: 12, duration: d, useNativeDriver: true }),
            Animated.timing(a, { toValue: 0, duration: d, useNativeDriver: true }),
        ])).start();
        anim(float1, 4500);
        anim(float2, 6000);
    }, []);

    // Game state
    const [round, setRound] = useState(1);
    const [questionType, setQuestionType] = useState<QuestionType>('MORE');
    const [leftCount, setLeftCount] = useState(0);
    const [rightCount, setRightCount] = useState(0);
    const [mistakes, setMistakes] = useState(0);
    const [startTime] = useState(Date.now());
    const [roundStartTime, setRoundStartTime] = useState(Date.now());
    const [showConfetti, setShowConfetti] = useState(false);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [selectedSide, setSelectedSide] = useState<'left' | 'right' | null>(null);
    const [roundHistory, setRoundHistory] = useState<RoundData[]>([]);
    const [prevPair, setPrevPair] = useState('');

    // Animation
    const leftScale = useRef(new Animated.Value(1)).current;
    const rightScale = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const questionPulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (gameReady) generateRound();
    }, [round, gameReady]);

    const generateRound = () => {
        setFeedback(null);
        setSelectedSide(null);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
        setRoundStartTime(Date.now());

        // Random question type: MORE or LESS
        const newQuestionType: QuestionType = Math.random() > 0.5 ? 'MORE' : 'LESS';
        setQuestionType(newQuestionType);

        // Animate question change
        Animated.sequence([
            Animated.timing(questionPulse, { toValue: 1.15, duration: 150, useNativeDriver: true }),
            Animated.timing(questionPulse, { toValue: 1, duration: 150, useNativeDriver: true }),
        ]).start();

        let left: number, right: number;

        // Round-specific difficulty
        if (round === 9 || round === 10) {
            // Close numbers (8 vs 9 or 9 vs 10)
            const baseNum = round === 9 ? 8 : 9;
            left = Math.random() > 0.5 ? baseNum : baseNum + 1;
            right = left === baseNum ? baseNum + 1 : baseNum;
        } else if (round <= 4) {
            // Easy: Big difference (1-5)
            do {
                left = Math.floor(Math.random() * 5) + 1;
                right = Math.floor(Math.random() * 5) + 1;
            } while (left === right || `${left}-${right}` === prevPair || Math.abs(left - right) < 2);
        } else if (round <= 6) {
            // Medium: Larger numbers (3-8)
            do {
                left = Math.floor(Math.random() * 6) + 3;
                right = Math.floor(Math.random() * 6) + 3;
            } while (left === right || `${left}-${right}` === prevPair);
        } else {
            // Hard: Close numbers (5-10)
            do {
                left = Math.floor(Math.random() * 5) + 5;
                right = Math.floor(Math.random() * 5) + 5;
            } while (left === right || `${left}-${right}` === prevPair || Math.abs(left - right) > 2);
        }

        setPrevPair(`${left}-${right}`);
        setLeftCount(left);
        setRightCount(right);
    };

    const getCorrectAnswer = (): 'left' | 'right' => {
        if (questionType === 'MORE') {
            return leftCount > rightCount ? 'left' : 'right';
        } else {
            return leftCount < rightCount ? 'left' : 'right';
        }
    };

    const handleChoice = (choice: 'left' | 'right') => {
        if (feedback) return;

        setSelectedSide(choice);
        const responseTime = Date.now() - roundStartTime;
        const correct = getCorrectAnswer();
        const isCorrect = choice === correct;
        const distanceEffect = Math.abs(leftCount - rightCount);

        // Scale animation
        const scaleAnim = choice === 'left' ? leftScale : rightScale;
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.08, duration: 100, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();

        const roundData: RoundData = {
            round,
            questionType,
            leftCount,
            rightCount,
            correctAnswer: correct,
            userAnswer: choice,
            isCorrect,
            distanceEffect,
            responseTime
        };
        setRoundHistory(prev => [...prev, roundData]);

        if (isCorrect) {
            setFeedback('correct');
            setShowConfetti(true);
            setTimeout(() => {
                setShowConfetti(false);
                if (round < 10) setRound(r => r + 1);
                else finishGame();
            }, 1100);
        } else {
            setFeedback('wrong');
            setMistakes(m => m + 1);
            setTimeout(() => {
                setFeedback(null);
                setSelectedSide(null);
            }, 700);
        }
    };

    const finishGame = () => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const correctAnswers = roundHistory.filter(r => r.isCorrect).length;
        const avgResponseTime = roundHistory.length > 0
            ? Math.round(roundHistory.reduce((a, b) => a + b.responseTime, 0) / roundHistory.length)
            : 0;
        const avgDistanceEffect = roundHistory.length > 0
            ? roundHistory.reduce((a, b) => a + b.distanceEffect, 0) / roundHistory.length
            : 0;

        // Cognitive speed score: lower response time + higher accuracy = higher score
        const cognitiveSpeedScore = Math.round((correctAnswers / 10) * 100 - (avgResponseTime / 100));

        onGameEnd('miktar-avcisi', duration, 10, mistakes, undefined, {
            // Separate columns for Supabase
            distance_effect: parseFloat(avgDistanceEffect.toFixed(2)),
            response_time: avgResponseTime,
            round_history: roundHistory,
            correct_answers: correctAnswers,
            cognitive_speed_score: cognitiveSpeedScore,
            // Standard fields
            zorlukSeviyesi: 1,
            kazanimOdagi: 'MAB.1 Sayı-Miktar İlişkisi ve Hızlı Karar Verme',
            algilananKelime: `${correctAnswers}/10 doğru, ${avgResponseTime}ms`
        });
    };

    // Render fruits in grid
    const renderFruits = (count: number, emoji: string) => {
        const fruits = [];
        for (let i = 0; i < count; i++) {
            fruits.push(
                <Text key={i} style={[styles.fruitEmoji, { fontSize: FRUIT_SIZE }]}>{emoji}</Text>
            );
        }
        return (
            <View style={styles.fruitGrid}>
                {fruits}
            </View>
        );
    };

    const questionText = questionType === 'MORE' ? 'Hangisi daha ÇOK?' : 'Hangisi daha AZ?';
    const questionColor = questionType === 'MORE' ? '#1565C0' : '#C62828';

    return (
        <View style={styles.outerContainer}>
            {/* Countdown Overlay */}
            {!gameReady && (
                <CountdownOverlay
                    message="Miktar Avcısı oyununa hoş geldin! Hangisi daha çok veya az, bul!"
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => setGameReady(true)}
                />
            )}
            {/* Floating Background Elements */}
            <Animated.Text style={[styles.floatingCloud, { top: '10%', left: '5%', transform: [{ translateY: float1 }] }]}>☁️</Animated.Text>
            <Animated.Text style={[styles.floatingCloud, { top: '20%', right: '8%', opacity: 0.35, transform: [{ translateY: float2 }] }]}>☁️</Animated.Text>
            <Animated.Text style={[styles.floatingStar, { bottom: '18%', left: '8%', transform: [{ translateY: float2 }] }]}>✨</Animated.Text>
            <Animated.Text style={[styles.floatingStar, { top: '35%', right: '5%', opacity: 0.4, transform: [{ translateY: float1 }] }]}>⭐</Animated.Text>

            {showConfetti && <ConfettiCannon count={80} origin={{ x: screenWidth / 2, y: 0 }} fadeOut />}

            {/* Professional White Stage */}
            <View style={[styles.stageContainer, { width: containerWidth, height: containerHeight }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onExit} style={styles.headerBtn}>
                        <Ionicons name="arrow-back-circle" size={28} color="#5D4037" />
                    </TouchableOpacity>
                    <View style={styles.roundBadge}>
                        <Text style={styles.roundText}>🎯 Tur {round}/10</Text>
                    </View>
                    <TouchableOpacity onPress={toggleMute} style={styles.headerBtn}>
                        <Ionicons name={isMuted ? 'volume-mute-outline' : 'volume-high-outline'} size={24} color="#5D4037" />
                    </TouchableOpacity>
                </View>

                {/* Dynamic Question */}
                <Animated.View style={[styles.questionContainer, { transform: [{ scale: questionPulse }] }]}>
                    <Text style={[styles.questionText, { color: questionColor }]}>{questionText}</Text>
                </Animated.View>

                {/* Split Comparison Area */}
                <Animated.View style={[styles.comparisonArea, { opacity: fadeAnim }]}>
                    {/* Left Side - Clickable */}
                    <TouchableOpacity
                        style={[
                            styles.sideArea,
                            selectedSide === 'left' && feedback === 'correct' && styles.sideCorrect,
                            selectedSide === 'left' && feedback === 'wrong' && styles.sideWrong
                        ]}
                        onPress={() => handleChoice('left')}
                        disabled={!!feedback}
                        activeOpacity={0.8}
                    >
                        <Animated.View style={[styles.sideContent, { transform: [{ scale: leftScale }] }]}>
                            {renderFruits(leftCount, FRUITS.left)}
                            <View style={styles.countBadge}>
                                <Text style={styles.countNumber}>{leftCount}</Text>
                            </View>
                        </Animated.View>
                    </TouchableOpacity>

                    {/* Center Divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.vsText}>VS</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Right Side - Clickable */}
                    <TouchableOpacity
                        style={[
                            styles.sideArea,
                            selectedSide === 'right' && feedback === 'correct' && styles.sideCorrect,
                            selectedSide === 'right' && feedback === 'wrong' && styles.sideWrong
                        ]}
                        onPress={() => handleChoice('right')}
                        disabled={!!feedback}
                        activeOpacity={0.8}
                    >
                        <Animated.View style={[styles.sideContent, { transform: [{ scale: rightScale }] }]}>
                            {renderFruits(rightCount, FRUITS.right)}
                            <View style={styles.countBadge}>
                                <Text style={styles.countNumber}>{rightCount}</Text>
                            </View>
                        </Animated.View>
                    </TouchableOpacity>
                </Animated.View>

                {/* Progress Dots */}
                <View style={styles.progressBar}>
                    {Array.from({ length: 10 }).map((_, i) => (
                        <View key={i} style={[
                            styles.progressDot,
                            i < round && styles.progressDotActive,
                            i === round - 1 && styles.progressDotCurrent
                        ]} />
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        // Pastel gradient effect
        backgroundColor: '#E8F5E9',
    },
    floatingCloud: { position: 'absolute', fontSize: 40, opacity: 0.3, zIndex: 0 },
    floatingStar: { position: 'absolute', fontSize: 24, opacity: 0.45, zIndex: 0 },

    stageContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
        zIndex: 10,
        // Glassmorphism shadow
        ...(Platform.OS === 'web' ? { boxShadow: '0 16px 48px rgba(0,0,0,0.12), 0 6px 16px rgba(0,0,0,0.08)' } as any : {
            elevation: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 24
        }),
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: '4%',
        paddingVertical: '2%',
        backgroundColor: '#FAFAFA',
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    headerBtn: { padding: 4 },
    roundBadge: {
        backgroundColor: '#FFF',
        paddingHorizontal: 14,
        paddingVertical: 5,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#A5D6A7',
    },
    roundText: { fontSize: 13, fontWeight: 'bold', color: '#2E7D32' },

    questionContainer: {
        paddingVertical: '3%',
        alignItems: 'center',
    },
    questionText: {
        fontSize: 20,
        fontWeight: 'bold',
    },

    comparisonArea: {
        flex: 1,
        flexDirection: 'row',
        paddingHorizontal: '3%',
        paddingBottom: '2%',
    },

    sideArea: {
        flex: 1,
        borderRadius: 16,
        backgroundColor: '#FAFAFA',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 4,
        borderWidth: 2,
        borderColor: '#E0E0E0',
    },
    sideCorrect: {
        backgroundColor: '#C8E6C9',
        borderColor: '#4CAF50',
        borderWidth: 3,
    },
    sideWrong: {
        backgroundColor: '#FFCDD2',
        borderColor: '#F44336',
        borderWidth: 3,
    },
    sideContent: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4%',
    },

    fruitGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '90%',
        marginBottom: 8,
    },
    fruitEmoji: {
        margin: 2,
    },

    countBadge: {
        backgroundColor: '#FFF',
        paddingHorizontal: 18,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#BDBDBD',
        marginTop: 4,
    },
    countNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#424242',
    },

    divider: {
        width: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dividerLine: {
        flex: 1,
        width: 2,
        backgroundColor: '#E0E0E0',
    },
    vsText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#9E9E9E',
        paddingVertical: 8,
    },

    progressBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: '2%',
        backgroundColor: '#FAFAFA',
    },
    progressDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#E0E0E0',
        borderWidth: 1,
        borderColor: '#BDBDBD',
    },
    progressDotActive: {
        backgroundColor: '#4CAF50',
        borderColor: '#2E7D32',
    },
    progressDotCurrent: {
        backgroundColor: '#FF9800',
        borderColor: '#E65100',
        transform: [{ scale: 1.3 }],
    },
});
