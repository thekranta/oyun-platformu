import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSound } from './SoundContext';

interface TartiDengesiProps {
    onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number, algilananKelime?: string, extraData?: any) => void;
    onExit: () => void;
}

interface Question {
    leftSide: number;
    rightSideFixed: number;
    missing: number;
}

const { width } = Dimensions.get('window');

export default function TartiDengesi({ onGameEnd, onExit }: TartiDengesiProps) {
    const { isMuted, toggleMute } = useSound();
    const [round, setRound] = useState(1);
    const [question, setQuestion] = useState<Question | null>(null);
    const [mistakes, setMistakes] = useState(0);
    const [startTime] = useState(Date.now());
    const [roundData, setRoundData] = useState<any[]>([]);
    const [showConfetti, setShowConfetti] = useState(false);

    // FIXED: useRef ile animation value
    const rotateAnim = useRef(new Animated.Value(-20)).current;
    const [placedValue, setPlacedValue] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [isBalanced, setIsBalanced] = useState(false);

    useEffect(() => {
        startRound();
    }, [round]);

    const startRound = () => {
        setPlacedValue(null);
        setFeedback(null);
        setIsBalanced(false);
        setShowConfetti(false);
        rotateAnim.setValue(-20);

        let target, rightFixed, missing;
        if (round <= 4) {
            target = Math.floor(Math.random() * 5) + 1;
            rightFixed = 0;
            missing = target;
        } else {
            target = Math.floor(Math.random() * 5) + 6;
            if (target > 10) target = 10;
            rightFixed = Math.floor(Math.random() * (target - 1)) + 1;
            missing = target - rightFixed;
        }
        setQuestion({ leftSide: target, rightSideFixed: rightFixed, missing });
    };

    const handleDrop = (val: number) => {
        if (feedback) return;
        setPlacedValue(val);

        const currentRightTotal = (question?.rightSideFixed || 0) + val;
        const target = question?.leftSide || 0;

        if (currentRightTotal === target) {
            // Correct -> Balance!
            setFeedback('correct');
            setIsBalanced(true);
            setShowConfetti(true);
            animateBalance(0);

            setRoundData(prev => [...prev, { round, target, result: 'success' }]);

            setTimeout(() => {
                setShowConfetti(false);
                if (round < 10) {
                    setRound(r => r + 1);
                } else {
                    finishGame();
                }
            }, 1800);
        } else if (currentRightTotal > target) {
            // Wrong -> Too heavy on right
            setFeedback('wrong');
            setMistakes(m => m + 1);
            animateBalance(20); // Right side down
            handleErrorLogic(val);
        } else {
            // Wrong -> Still too light (left still heavy)
            setFeedback('wrong');
            setMistakes(m => m + 1);
            animateBalance(-10); // Still left down but less
            handleErrorLogic(val);
        }
    };

    const handleErrorLogic = (val: number) => {
        setRoundData(prev => [...prev, {
            round,
            target: question?.leftSide,
            result: 'wrong',
            errorValue: val
        }]);

        setTimeout(() => {
            setPlacedValue(null);
            setFeedback(null);
            animateBalance(-20); // Reset
        }, 1500);
    };

    const animateBalance = (toDeg: number) => {
        Animated.spring(rotateAnim, {
            toValue: toDeg,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const finishGame = () => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const extraData = {
            cizimVerisi: JSON.stringify({ roundHistory: roundData }),
            zorlukSeviyesi: 1,
            kazanimOdagi: 'MAB.1 Sayısal Karşılaştırma ve Denge',
            algilananKelime: mistakes === 0 ? 'Mükemmel Denge' : `${mistakes} denge hatası`
        };
        onGameEnd('Tartı Dengesi', duration, 10, mistakes, undefined, extraData);
    };

    const generateOptions = () => {
        if (!question) return [];
        const correct = question.missing;
        const opts = [correct];
        // 2 yanlış cevap
        while (opts.length < 3) {
            const r = Math.floor(Math.random() * 9) + 1;
            if (!opts.includes(r)) opts.push(r);
        }
        return opts.sort(() => Math.random() - 0.5);
    };

    const options = generateOptions();

    const rotateInterpolate = rotateAnim.interpolate({
        inputRange: [-20, 0, 20],
        outputRange: ['-15deg', '0deg', '15deg']
    });

    return (
        <View style={styles.container}>
            {showConfetti && <ConfettiCannon count={80} origin={{ x: width / 2, y: 0 }} fadeOut />}

            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreText}>{round}/10</Text>
                </View>
                <TouchableOpacity onPress={toggleMute} style={styles.soundButton}>
                    <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.gameContent}>
                <Text style={styles.title}>Teraziyi Dengele!</Text>
                {isBalanced ? (
                    <Text style={styles.balancedText}>✓ Dengede!</Text>
                ) : (
                    <Text style={styles.subtitle}>
                        Sol: {question?.leftSide} kg = Sağ: {question?.rightSideFixed || 0} + ?
                    </Text>
                )}

                {/* Balance Scale Visual */}
                <View style={styles.scaleContainer}>
                    {/* Pivot (Center Base) */}
                    <View style={styles.scaleBase} />
                    <View style={styles.scalePole} />

                    {/* Beam (Moving Part) */}
                    <Animated.View style={[styles.beam, { transform: [{ rotate: rotateInterpolate }] }]}>
                        {/* Left Pan */}
                        <View style={styles.panContainerLeft}>
                            <View style={styles.string} />
                            <View style={styles.pan}>
                                <View style={styles.weightBlockLeft}>
                                    <Text style={styles.weightText}>{question?.leftSide}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Right Pan */}
                        <View style={styles.panContainerRight}>
                            <View style={styles.string} />
                            <View style={styles.pan}>
                                {/* Fixed Weight if any */}
                                {question && question.rightSideFixed > 0 && (
                                    <View style={styles.weightBlockFixed}>
                                        <Text style={styles.weightText}>{question.rightSideFixed}</Text>
                                    </View>
                                )}

                                {/* User Placed Weight */}
                                {placedValue !== null && (
                                    <View style={styles.weightBlockPlaced}>
                                        <Text style={styles.weightText}>{placedValue}</Text>
                                    </View>
                                )}

                                {/* Placeholder Ghost */}
                                {placedValue === null && (
                                    <View style={styles.weightPlaceholder}>
                                        <Text style={styles.placeholderText}>?</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </Animated.View>
                </View>
            </View>

            {/* Options */}
            <View style={styles.optionsArea}>
                {options.map((opt, idx) => (
                    <TouchableOpacity
                        key={idx}
                        style={[
                            styles.optionButton,
                            feedback === 'wrong' && placedValue === opt ? styles.optWrong : {},
                            feedback === 'correct' && placedValue === opt ? styles.optCorrect : {}
                        ]}
                        onPress={() => handleDrop(opt)}
                        disabled={!!feedback}
                    >
                        <Text style={styles.optionText}>{opt}</Text>
                        <Text style={styles.kgText}>kg</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3E5F5', // Light Purple
        paddingTop: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    backButton: { backgroundColor: '#BA68C8', padding: 8, borderRadius: 20 },
    soundButton: { backgroundColor: '#BA68C8', padding: 8, borderRadius: 20 },
    scoreContainer: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
    scoreText: { fontSize: 18, fontWeight: 'bold', color: '#8E24AA' },

    gameContent: {
        flex: 1,
        alignItems: 'center',
    },
    title: { fontSize: 22, fontWeight: 'bold', color: '#4A148C', marginBottom: 5 },
    subtitle: { fontSize: 14, color: '#666', textAlign: 'center', maxWidth: 300, marginBottom: 20 },
    balancedText: { fontSize: 22, fontWeight: 'bold', color: '#4CAF50', marginBottom: 20 },

    scaleContainer: {
        height: 250,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 20,
    },
    scaleBase: {
        width: 100,
        height: 20,
        backgroundColor: '#5D4037',
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        zIndex: 1,
    },
    scalePole: {
        position: 'absolute',
        bottom: 20,
        width: 10,
        height: 150,
        backgroundColor: '#795548',
        zIndex: 0,
    },
    beam: {
        position: 'absolute',
        bottom: 160, // Top of pole
        width: 280,
        height: 10,
        backgroundColor: '#8D6E63',
        borderRadius: 5,
        justifyContent: 'center',
    },

    panContainerLeft: {
        position: 'absolute',
        left: 0,
        top: 5,
        alignItems: 'center',
    },
    panContainerRight: {
        position: 'absolute',
        right: 0,
        top: 5,
        alignItems: 'center',
    },
    string: {
        width: 2,
        height: 60,
        backgroundColor: '#BDBDBD',
    },
    pan: {
        width: 80,
        height: 10, // Flat pan base
        backgroundColor: '#5D4037',
        alignItems: 'center',
        justifyContent: 'flex-end', // Items sit on top
        overflow: 'visible',
    },

    weightBlockLeft: {
        width: 50,
        height: 50,
        backgroundColor: '#EF5350', // Red
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: 10,
        elevation: 3,
    },
    weightBlockFixed: {
        width: 40,
        height: 40,
        backgroundColor: '#42A5F5', // Blue fixed
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: 10,
        left: -10,
        elevation: 3,
    },
    weightBlockPlaced: {
        width: 50,
        height: 50,
        backgroundColor: '#66BB6A', // Green placed
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: 10, // On pan
        right: -5,
        elevation: 4,
    },
    weightPlaceholder: {
        width: 50,
        height: 50,
        borderWidth: 2,
        borderColor: '#BDBDBD',
        borderStyle: 'dashed',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: 10,
    },
    placeholderText: { fontSize: 24, color: '#999' },

    weightText: { color: 'white', fontWeight: 'bold', fontSize: 20 },

    optionsArea: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 15,
        paddingBottom: 40,
    },
    optionButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 5,
        borderWidth: 2,
        borderColor: '#BA68C8',
    },
    optCorrect: { backgroundColor: '#C8E6C9', borderColor: '#4CAF50' },
    optWrong: { backgroundColor: '#FFCDD2', borderColor: '#F44336' },
    optionText: { fontSize: 28, fontWeight: 'bold', color: '#4A148C' },
    kgText: { fontSize: 10, color: '#888' },
});
