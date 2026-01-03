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

interface QuantityComparisonProps {
    onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number, algilananKelime?: string, extraData?: any) => void;
    onExit: () => void;
}

interface RoundData {
    round: number;
    leftCount: number;
    rightCount: number;
    correctAnswer: 'left' | 'right' | 'equal';
    userAnswer: 'left' | 'right' | 'equal' | null;
    isCorrect: boolean;
    distanceEffect: number; // Difference between counts
    responseTime: number;   // Time in ms to answer
}

export default function QuantityComparison({ onGameEnd, onExit }: QuantityComparisonProps) {
    const { isMuted, toggleMute } = useSound();
    const [dimensions, setDimensions] = useState(Dimensions.get('window'));

    useEffect(() => {
        const sub = Dimensions.addEventListener('change', ({ window }) => setDimensions(window));
        return () => sub?.remove();
    }, []);

    const { width: screenWidth, height: screenHeight } = dimensions;
    const isPortrait = screenHeight > screenWidth;

    // Responsive container
    const containerWidth = isPortrait ? Math.min(screenWidth * 0.94, 500) : Math.min(screenWidth * 0.88, 900);
    const containerHeight = containerWidth * (isPortrait ? 0.85 : 9 / 16);

    // Fruit sizing
    const FRUIT_SIZE = containerHeight * 0.08;
    const BUTTON_HEIGHT = containerHeight * 0.12;

    // Floating animations
    const float1 = useRef(new Animated.Value(0)).current;
    const float2 = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const anim = (a: Animated.Value, d: number) => Animated.loop(Animated.sequence([
            Animated.timing(a, { toValue: 8, duration: d, useNativeDriver: true }),
            Animated.timing(a, { toValue: 0, duration: d, useNativeDriver: true }),
        ])).start();
        anim(float1, 4000);
        anim(float2, 5500);
    }, []);

    const [round, setRound] = useState(1);
    const [leftCount, setLeftCount] = useState(0);
    const [rightCount, setRightCount] = useState(0);
    const [mistakes, setMistakes] = useState(0);
    const [startTime] = useState(Date.now());
    const [roundStartTime, setRoundStartTime] = useState(Date.now());
    const [showConfetti, setShowConfetti] = useState(false);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [roundHistory, setRoundHistory] = useState<RoundData[]>([]);
    const [prevPair, setPrevPair] = useState<string>('');

    // Animation refs
    const leftScale = useRef(new Animated.Value(1)).current;
    const rightScale = useRef(new Animated.Value(1)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        generateRound();
    }, [round]);

    const generateRound = () => {
        setFeedback(null);
        fadeAnim.setValue(0);
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        setRoundStartTime(Date.now());

        let left: number, right: number;

        // Round-specific scenarios
        if (round === 9) {
            // Close numbers scenario (8 vs 9)
            left = Math.random() > 0.5 ? 8 : 9;
            right = left === 8 ? 9 : 8;
        } else if (round === 10) {
            // Equal scenario
            const equalVal = Math.floor(Math.random() * 5) + 4; // 4-8
            left = equalVal;
            right = equalVal;
        } else if (round <= 4) {
            // Easy: Big difference (1-5 range)
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
                left = Math.floor(Math.random() * 6) + 5;
                right = Math.floor(Math.random() * 6) + 5;
            } while (left === right || `${left}-${right}` === prevPair || Math.abs(left - right) > 3);
        }

        setPrevPair(`${left}-${right}`);
        setLeftCount(left);
        setRightCount(right);
    };

    const getCorrectAnswer = (): 'left' | 'right' | 'equal' => {
        if (leftCount > rightCount) return 'left';
        if (rightCount > leftCount) return 'right';
        return 'equal';
    };

    const handleChoice = (choice: 'left' | 'right' | 'equal') => {
        if (feedback) return;

        const responseTime = Date.now() - roundStartTime;
        const correct = getCorrectAnswer();
        const isCorrect = choice === correct;
        const distanceEffect = Math.abs(leftCount - rightCount);

        const roundData: RoundData = {
            round,
            leftCount,
            rightCount,
            correctAnswer: correct,
            userAnswer: choice,
            isCorrect,
            distanceEffect,
            responseTime
        };
        setRoundHistory(prev => [...prev, roundData]);

        // Visual feedback
        if (choice === 'left') {
            Animated.sequence([
                Animated.timing(leftScale, { toValue: 1.1, duration: 100, useNativeDriver: true }),
                Animated.timing(leftScale, { toValue: 1, duration: 100, useNativeDriver: true }),
            ]).start();
        } else if (choice === 'right') {
            Animated.sequence([
                Animated.timing(rightScale, { toValue: 1.1, duration: 100, useNativeDriver: true }),
                Animated.timing(rightScale, { toValue: 1, duration: 100, useNativeDriver: true }),
            ]).start();
        }

        if (isCorrect) {
            setFeedback('correct');
            setShowConfetti(true);
            setTimeout(() => {
                setShowConfetti(false);
                if (round < 10) setRound(r => r + 1);
                else finishGame();
            }, 1200);
        } else {
            setFeedback('wrong');
            setMistakes(m => m + 1);
            setTimeout(() => {
                setFeedback(null);
                // Stay on same round for retry
            }, 800);
        }
    };

    const finishGame = () => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const avgResponseTime = roundHistory.length > 0
            ? Math.round(roundHistory.reduce((a, b) => a + b.responseTime, 0) / roundHistory.length)
            : 0;
        const avgDistanceEffect = roundHistory.length > 0
            ? roundHistory.reduce((a, b) => a + b.distanceEffect, 0) / roundHistory.length
            : 0;

        // Veri kaydı: distance_effect, response_time ve round_history
        onGameEnd('Miktar Avcısı', duration, 10, mistakes, undefined, {
            cizimVerisi: JSON.stringify({
                roundHistory,
                distance_effect: avgDistanceEffect.toFixed(2),
                response_time: avgResponseTime,
                totalRounds: 10,
                correctAnswers: roundHistory.filter(r => r.isCorrect).length
            }),
            zorlukSeviyesi: 1,
            kazanimOdagi: 'MAB.1 Sayı-Miktar İlişkisi ve Hızlı Karar Verme',
            algilananKelime: `Ort: ${avgResponseTime}ms, Fark: ${avgDistanceEffect.toFixed(1)}`
        });
    };

    // Render fruits in a grid pattern
    const renderFruits = (count: number, emoji: string) => {
        const fruits = [];
        const cols = count <= 5 ? count : 5;
        const rows = Math.ceil(count / 5);

        for (let i = 0; i < count; i++) {
            fruits.push(
                <Text key={i} style={[styles.fruitEmoji, { fontSize: FRUIT_SIZE }]}>{emoji}</Text>
            );
        }
        return (
            <View style={[styles.fruitGrid, { flexDirection: 'row', flexWrap: 'wrap', width: cols * (FRUIT_SIZE + 4), justifyContent: 'center' }]}>
                {fruits}
            </View>
        );
    };

    const isEqual = leftCount === rightCount;

    return (
        <View style={styles.outerContainer}>
            {/* Floating Background */}
            <Animated.Text style={[styles.floatingCloud, { top: '12%', left: '5%', transform: [{ translateY: float1 }] }]}>☁️</Animated.Text>
            <Animated.Text style={[styles.floatingCloud, { top: '25%', right: '8%', opacity: 0.4, transform: [{ translateY: float2 }] }]}>☁️</Animated.Text>
            <Animated.Text style={[styles.floatingStar, { bottom: '15%', left: '10%', transform: [{ translateY: float2 }] }]}>🌟</Animated.Text>

            {showConfetti && <ConfettiCannon count={80} origin={{ x: screenWidth / 2, y: 0 }} fadeOut />}

            <View style={[styles.gameContainer, { width: containerWidth, height: containerHeight }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onExit}>
                        <Ionicons name="arrow-back-circle" size={30} color="#2196F3" />
                    </TouchableOpacity>
                    <View style={styles.roundBadge}>
                        <Text style={styles.roundText}>🎯 Miktar Avcısı - Tur {round}/10</Text>
                    </View>
                    <TouchableOpacity onPress={toggleMute}>
                        <Ionicons name={isMuted ? 'volume-mute-outline' : 'volume-high-outline'} size={26} color="#2196F3" />
                    </TouchableOpacity>
                </View>

                {/* Question */}
                <Text style={styles.questionText}>Hangisi daha çok?</Text>

                {/* Main Comparison Area */}
                <Animated.View style={[styles.comparisonArea, { opacity: fadeAnim }]}>
                    {/* Left Side - Apples */}
                    <Animated.View style={[styles.side, styles.leftSide, { transform: [{ scale: leftScale }] }]}>
                        <View style={styles.fruitContainer}>
                            {renderFruits(leftCount, '🍎')}
                        </View>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{leftCount}</Text>
                        </View>
                    </Animated.View>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <Text style={styles.vsText}>vs</Text>
                    </View>

                    {/* Right Side - Pears */}
                    <Animated.View style={[styles.side, styles.rightSide, { transform: [{ scale: rightScale }] }]}>
                        <View style={styles.fruitContainer}>
                            {renderFruits(rightCount, '🍐')}
                        </View>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>{rightCount}</Text>
                        </View>
                    </Animated.View>
                </Animated.View>

                {/* Choice Buttons */}
                <View style={styles.buttonsRow}>
                    <TouchableOpacity
                        style={[
                            styles.choiceBtn, styles.leftBtn, { height: BUTTON_HEIGHT },
                            feedback === 'correct' && getCorrectAnswer() === 'left' && styles.correctBtn,
                            feedback === 'wrong' && getCorrectAnswer() !== 'left' && styles.wrongBtn
                        ]}
                        onPress={() => handleChoice('left')}
                        disabled={!!feedback}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.btnEmoji}>🍎</Text>
                        <Text style={styles.btnText}>Elmalar</Text>
                    </TouchableOpacity>

                    {isEqual && (
                        <TouchableOpacity
                            style={[
                                styles.choiceBtn, styles.equalBtn, { height: BUTTON_HEIGHT },
                                feedback === 'correct' && getCorrectAnswer() === 'equal' && styles.correctBtn
                            ]}
                            onPress={() => handleChoice('equal')}
                            disabled={!!feedback}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.btnText}>=</Text>
                            <Text style={[styles.btnText, { fontSize: 11 }]}>Eşit</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.choiceBtn, styles.rightBtn, { height: BUTTON_HEIGHT },
                            feedback === 'correct' && getCorrectAnswer() === 'right' && styles.correctBtn,
                            feedback === 'wrong' && getCorrectAnswer() !== 'right' && styles.wrongBtn
                        ]}
                        onPress={() => handleChoice('right')}
                        disabled={!!feedback}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.btnEmoji}>🍐</Text>
                        <Text style={styles.btnText}>Armutlar</Text>
                    </TouchableOpacity>
                </View>

                {/* Progress Bar */}
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
    outerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#BBDEFB' },
    floatingCloud: { position: 'absolute', fontSize: 36, opacity: 0.3, zIndex: 0 },
    floatingStar: { position: 'absolute', fontSize: 22, opacity: 0.4, zIndex: 0 },
    gameContainer: {
        backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 20, overflow: 'hidden', zIndex: 10,
        ...(Platform.OS === 'web' ? { boxShadow: '0 12px 40px rgba(0,0,0,0.1)' } as any : { elevation: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 }),
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: '3%', paddingVertical: '1.5%', backgroundColor: 'rgba(227,242,253,0.9)', borderBottomWidth: 1, borderBottomColor: '#90CAF9',
    },
    roundBadge: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, borderWidth: 2, borderColor: '#64B5F6' },
    roundText: { fontSize: 13, fontWeight: 'bold', color: '#1565C0' },
    questionText: { fontSize: 16, fontWeight: 'bold', color: '#1565C0', textAlign: 'center', marginTop: 8, marginBottom: 4 },
    comparisonArea: { flex: 1, flexDirection: 'row', paddingHorizontal: '2%' },
    side: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: '2%' },
    leftSide: { backgroundColor: 'rgba(255,205,210,0.3)', borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
    rightSide: { backgroundColor: 'rgba(200,230,201,0.3)', borderTopRightRadius: 12, borderBottomRightRadius: 12 },
    fruitContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    fruitGrid: { alignItems: 'center' },
    fruitEmoji: { margin: 2 },
    countBadge: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 2, borderColor: '#90CAF9', marginBottom: 4 },
    countText: { fontSize: 18, fontWeight: 'bold', color: '#1565C0' },
    divider: { width: 2, backgroundColor: '#90CAF9', justifyContent: 'center', alignItems: 'center' },
    vsText: { backgroundColor: '#FFF', fontSize: 12, fontWeight: 'bold', color: '#64B5F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    buttonsRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: '3%', paddingVertical: '2%' },
    choiceBtn: {
        flex: 1, maxWidth: 140, borderRadius: 14, justifyContent: 'center', alignItems: 'center',
        borderWidth: 3,
        ...(Platform.OS === 'web' ? { boxShadow: '0 3px 8px rgba(0,0,0,0.1)' } as any : { elevation: 4 }),
    },
    leftBtn: { backgroundColor: '#FFCDD2', borderColor: '#EF5350' },
    rightBtn: { backgroundColor: '#C8E6C9', borderColor: '#66BB6A' },
    equalBtn: { backgroundColor: '#E3F2FD', borderColor: '#64B5F6', maxWidth: 80 },
    correctBtn: { backgroundColor: '#A5D6A7', borderColor: '#4CAF50', borderWidth: 4 },
    wrongBtn: { backgroundColor: '#EF9A9A', borderColor: '#F44336' },
    btnEmoji: { fontSize: 22 },
    btnText: { fontSize: 13, fontWeight: 'bold', color: '#424242' },
    progressBar: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: '1%', backgroundColor: 'rgba(227,242,253,0.9)' },
    progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#BBDEFB', borderWidth: 1, borderColor: '#90CAF9' },
    progressDotActive: { backgroundColor: '#2196F3', borderColor: '#1565C0' },
    progressDotCurrent: { backgroundColor: '#FF9800', borderColor: '#E65100', transform: [{ scale: 1.3 }] },
});
