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

interface TartiDengesiProps {
    onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number, algilananKelime?: string, extraData?: any) => void;
    onExit: () => void;
}

interface Question {
    leftSide: number;
    rightSideFixed: number;
    missing: number;
}

export default function TartiDengesi({ onGameEnd, onExit }: TartiDengesiProps) {
    const { isMuted, toggleMute } = useSound();
    const [dimensions, setDimensions] = useState(Dimensions.get('window'));

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setDimensions(window);
        });
        return () => subscription?.remove();
    }, []);

    const { width: screenWidth, height: screenHeight } = dimensions;

    // 16:9 Aspect Ratio Container
    const containerWidth = Math.min(screenWidth * 0.95, 900);
    const containerHeight = containerWidth * (9 / 16);

    // Responsive sizing
    const SCALE_HEIGHT = containerHeight * 0.45;
    const WEIGHT_SIZE = containerHeight * 0.1;
    const OPTION_SIZE = containerHeight * 0.14;

    const [round, setRound] = useState(1);
    const [question, setQuestion] = useState<Question | null>(null);
    const [mistakes, setMistakes] = useState(0);
    const [startTime] = useState(Date.now());
    const [roundData, setRoundData] = useState<any[]>([]);
    const [showConfetti, setShowConfetti] = useState(false);

    const rotateAnim = useRef(new Animated.Value(-15)).current;
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
        rotateAnim.setValue(-15);

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
            setFeedback('wrong');
            setMistakes(m => m + 1);
            animateBalance(15);
            handleErrorLogic();
        } else {
            setFeedback('wrong');
            setMistakes(m => m + 1);
            animateBalance(-8);
            handleErrorLogic();
        }
    };

    const handleErrorLogic = () => {
        setTimeout(() => {
            setPlacedValue(null);
            setFeedback(null);
            animateBalance(-15);
        }, 1200);
    };

    const animateBalance = (toDeg: number) => {
        Animated.spring(rotateAnim, {
            toValue: toDeg,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
        }).start();
    };

    const finishGame = () => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        onGameEnd('Tartı Dengesi', duration, 10, mistakes, undefined, {
            zorlukSeviyesi: 1,
            kazanimOdagi: 'MAB.1 Sayısal Denge',
            algilananKelime: mistakes === 0 ? 'Mükemmel' : `${mistakes} hata`
        });
    };

    const generateOptions = () => {
        if (!question) return [];
        const correct = question.missing;
        const opts = [correct];
        while (opts.length < 3) {
            const r = Math.floor(Math.random() * 9) + 1;
            if (!opts.includes(r)) opts.push(r);
        }
        return opts.sort(() => Math.random() - 0.5);
    };

    const options = generateOptions();

    const rotateInterpolate = rotateAnim.interpolate({
        inputRange: [-15, 0, 15],
        outputRange: ['-12deg', '0deg', '12deg']
    });

    return (
        <View style={styles.outerContainer}>
            {showConfetti && <ConfettiCannon count={120} origin={{ x: screenWidth / 2, y: 0 }} fadeOut />}

            {/* Game Container - 16:9 */}
            <View style={[styles.gameContainer, { width: containerWidth, height: containerHeight }]}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onExit} style={styles.headerBtn}>
                        <Ionicons name="arrow-back-circle" size={32} color="#9C27B0" />
                    </TouchableOpacity>
                    <View style={styles.roundBadge}>
                        <Text style={styles.roundText}>⚖️ Tur {round}/10</Text>
                    </View>
                    <TouchableOpacity onPress={toggleMute} style={styles.headerBtn}>
                        <Ionicons name={isMuted ? 'volume-mute-outline' : 'volume-high-outline'} size={28} color="#9C27B0" />
                    </TouchableOpacity>
                </View>

                {/* Main Area */}
                <View style={styles.mainArea}>

                    {/* Left - Question */}
                    <View style={styles.questionPanel}>
                        <View style={styles.questionCard}>
                            <Text style={styles.questionTitle}>Teraziyi Dengele!</Text>
                            {isBalanced ? (
                                <Text style={styles.balancedText}>✓ Dengede!</Text>
                            ) : (
                                <Text style={styles.questionSub}>
                                    Sol: <Text style={styles.highlight}>{question?.leftSide}</Text> kg
                                    {question?.rightSideFixed ? ` = Sağ: ${question.rightSideFixed} + ?` : ' = Sağ: ?'}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Center - Scale */}
                    <View style={[styles.scaleArea, { height: SCALE_HEIGHT }]}>
                        {/* Base */}
                        <View style={[styles.scaleBase, { width: containerWidth * 0.08, height: containerHeight * 0.06 }]} />
                        <View style={[styles.scalePole, { height: SCALE_HEIGHT * 0.65, width: containerWidth * 0.02 }]} />

                        {/* Beam */}
                        <Animated.View style={[
                            styles.beam,
                            {
                                width: containerWidth * 0.35,
                                bottom: SCALE_HEIGHT * 0.6,
                                transform: [{ rotate: rotateInterpolate }]
                            }
                        ]}>
                            {/* Left Pan */}
                            <View style={[styles.panContainer, { left: 0 }]}>
                                <View style={[styles.string, { height: SCALE_HEIGHT * 0.2 }]} />
                                <View style={[styles.pan, { width: containerWidth * 0.1 }]}>
                                    <View style={[styles.weightBlock, styles.leftWeight, { width: WEIGHT_SIZE, height: WEIGHT_SIZE }]}>
                                        <Text style={[styles.weightText, { fontSize: WEIGHT_SIZE * 0.5 }]}>{question?.leftSide}</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Right Pan */}
                            <View style={[styles.panContainer, { right: 0 }]}>
                                <View style={[styles.string, { height: SCALE_HEIGHT * 0.2 }]} />
                                <View style={[styles.pan, { width: containerWidth * 0.12 }]}>
                                    {question && question.rightSideFixed > 0 && (
                                        <View style={[styles.weightBlock, styles.fixedWeight, { width: WEIGHT_SIZE * 0.7, height: WEIGHT_SIZE * 0.7, left: -WEIGHT_SIZE * 0.3 }]}>
                                            <Text style={[styles.weightText, { fontSize: WEIGHT_SIZE * 0.35 }]}>{question.rightSideFixed}</Text>
                                        </View>
                                    )}
                                    {placedValue !== null ? (
                                        <View style={[styles.weightBlock, styles.placedWeight, { width: WEIGHT_SIZE, height: WEIGHT_SIZE, right: -WEIGHT_SIZE * 0.2 }]}>
                                            <Text style={[styles.weightText, { fontSize: WEIGHT_SIZE * 0.5 }]}>{placedValue}</Text>
                                        </View>
                                    ) : (
                                        <View style={[styles.placeholder, { width: WEIGHT_SIZE, height: WEIGHT_SIZE }]}>
                                            <Text style={styles.placeholderText}>?</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </Animated.View>
                    </View>

                    {/* Right - Options */}
                    <View style={styles.optionsPanel}>
                        <Text style={styles.optionsTitle}>Seç:</Text>
                        <View style={styles.optionsGrid}>
                            {options.map((opt, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.optionBtn,
                                        { width: OPTION_SIZE, height: OPTION_SIZE },
                                        feedback === 'correct' && placedValue === opt && styles.optCorrect,
                                        feedback === 'wrong' && placedValue === opt && styles.optWrong
                                    ]}
                                    onPress={() => handleDrop(opt)}
                                    disabled={!!feedback}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.optionText, { fontSize: OPTION_SIZE * 0.4 }]}>{opt}</Text>
                                    <Text style={styles.kgLabel}>kg</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
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
    outerContainer: {
        flex: 1,
        backgroundColor: '#E1BEE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    gameContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        ...(Platform.OS === 'web' && { boxShadow: '0 8px 32px rgba(0,0,0,0.15)' } as any),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: '3%',
        paddingVertical: '2%',
        backgroundColor: '#F3E5F5',
        borderBottomWidth: 2,
        borderBottomColor: '#CE93D8',
    },
    headerBtn: { padding: 4 },
    roundBadge: {
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#BA68C8',
    },
    roundText: { fontSize: 14, fontWeight: 'bold', color: '#7B1FA2' },

    mainArea: {
        flex: 1,
        flexDirection: 'row',
        padding: '2%',
    },

    questionPanel: {
        flex: 0.25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    questionCard: {
        backgroundColor: '#FCE4EC',
        borderRadius: 12,
        padding: '8%',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#F48FB1',
    },
    questionTitle: { fontSize: 14, fontWeight: 'bold', color: '#AD1457', marginBottom: 4 },
    questionSub: { fontSize: 12, color: '#6D4C41', textAlign: 'center' },
    highlight: { fontSize: 18, fontWeight: 'bold', color: '#D32F2F' },
    balancedText: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50' },

    scaleArea: {
        flex: 0.5,
        alignItems: 'center',
        justifyContent: 'flex-end',
        position: 'relative',
    },
    scaleBase: {
        backgroundColor: '#5D4037',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        zIndex: 2,
    },
    scalePole: {
        position: 'absolute',
        bottom: 0,
        backgroundColor: '#795548',
        zIndex: 1,
    },
    beam: {
        position: 'absolute',
        height: 8,
        backgroundColor: '#8D6E63',
        borderRadius: 4,
    },
    panContainer: {
        position: 'absolute',
        top: 4,
        alignItems: 'center',
    },
    string: {
        width: 2,
        backgroundColor: '#BDBDBD',
    },
    pan: {
        height: 6,
        backgroundColor: '#5D4037',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
    },
    weightBlock: {
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: 6,
    },
    leftWeight: { backgroundColor: '#EF5350' },
    fixedWeight: { backgroundColor: '#42A5F5' },
    placedWeight: { backgroundColor: '#66BB6A' },
    weightText: { color: '#FFF', fontWeight: 'bold' },
    placeholder: {
        borderWidth: 2,
        borderColor: '#BDBDBD',
        borderStyle: 'dashed',
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: 6,
    },
    placeholderText: { fontSize: 18, color: '#9E9E9E' },

    optionsPanel: {
        flex: 0.25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionsTitle: { fontSize: 13, color: '#7B1FA2', fontWeight: 'bold', marginBottom: 8 },
    optionsGrid: {
        flexDirection: 'column',
        gap: 8,
    },
    optionBtn: {
        borderRadius: 100,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#CE93D8',
        elevation: 3,
    },
    optCorrect: { backgroundColor: '#C8E6C9', borderColor: '#4CAF50' },
    optWrong: { backgroundColor: '#FFCDD2', borderColor: '#F44336' },
    optionText: { fontWeight: 'bold', color: '#7B1FA2' },
    kgLabel: { fontSize: 10, color: '#9E9E9E' },

    progressBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: '1.5%',
        backgroundColor: '#F3E5F5',
    },
    progressDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#E1BEE7',
        borderWidth: 2,
        borderColor: '#CE93D8',
    },
    progressDotActive: { backgroundColor: '#9C27B0', borderColor: '#7B1FA2' },
    progressDotCurrent: { backgroundColor: '#FF9800', borderColor: '#E65100', transform: [{ scale: 1.3 }] },
});
