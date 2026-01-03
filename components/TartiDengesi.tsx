import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSound } from './SoundContext';

interface TartiDengesiProps {
    onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number, algilananKelime?: string, extraData?: any) => void;
    onExit: () => void;
}

export default function TartiDengesi({ onGameEnd, onExit }: TartiDengesiProps) {
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
    const containerHeight = containerWidth * (isPortrait ? 0.8 : 9 / 16);

    // Sizing
    const WEIGHT_SIZE = containerHeight * 0.12;
    const OPTION_SIZE = containerHeight * 0.13;

    // Floating animations
    const float1 = useRef(new Animated.Value(0)).current;
    const float2 = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const anim = (a: Animated.Value, d: number) => Animated.loop(Animated.sequence([
            Animated.timing(a, { toValue: 10, duration: d, useNativeDriver: true }),
            Animated.timing(a, { toValue: 0, duration: d, useNativeDriver: true }),
        ])).start();
        anim(float1, 4500);
        anim(float2, 6000);
    }, []);

    const [round, setRound] = useState(1);
    const [targetNumber, setTargetNumber] = useState(1);
    const [mistakes, setMistakes] = useState(0);
    const [startTime] = useState(Date.now());
    const [showConfetti, setShowConfetti] = useState(false);
    const [placedValue, setPlacedValue] = useState<number | null>(null);
    const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [isBalanced, setIsBalanced] = useState(false);

    const rotateAnim = useRef(new Animated.Value(-12)).current;
    const pan = useRef(new Animated.ValueXY()).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const [draggingValue, setDraggingValue] = useState<number | null>(null);

    useEffect(() => {
        setPlacedValue(null);
        setFeedback(null);
        setIsBalanced(false);
        setShowConfetti(false);
        rotateAnim.setValue(-12);
        // Her iki kefede aynı sayı olacak - işlem yok!
        const newTarget = round <= 4
            ? Math.floor(Math.random() * 5) + 1
            : Math.min(Math.floor(Math.random() * 5) + 6, 10);
        setTargetNumber(newTarget);
    }, [round]);

    const handleDrop = (val: number) => {
        if (feedback) return;
        setPlacedValue(val);
        setDraggingValue(null);
        pan.setValue({ x: 0, y: 0 });

        if (val === targetNumber) {
            setFeedback('correct');
            setIsBalanced(true);
            setShowConfetti(true);
            animateBalance(0);
            setTimeout(() => {
                setShowConfetti(false);
                if (round < 10) setRound(r => r + 1);
                else {
                    const d = Math.floor((Date.now() - startTime) / 1000);
                    onGameEnd('Tartı Dengesi', d, 10, mistakes, undefined, { zorlukSeviyesi: 1, kazanimOdagi: 'MAB.1 Sayısal Denge' });
                }
            }, 1500);
        } else if (val > targetNumber) {
            setFeedback('wrong');
            setMistakes(m => m + 1);
            animateBalance(10);
            setTimeout(() => { setPlacedValue(null); setFeedback(null); animateBalance(-12); }, 1000);
        } else {
            setFeedback('wrong');
            setMistakes(m => m + 1);
            animateBalance(-6);
            setTimeout(() => { setPlacedValue(null); setFeedback(null); animateBalance(-12); }, 1000);
        }
    };

    const animateBalance = (deg: number) => {
        Animated.spring(rotateAnim, { toValue: deg, friction: 6, tension: 50, useNativeDriver: true }).start();
    };

    const generateOptions = () => {
        const opts = [targetNumber];
        while (opts.length < 3) {
            const r = Math.floor(Math.random() * 9) + 1;
            if (!opts.includes(r)) opts.push(r);
        }
        return opts.sort(() => Math.random() - 0.5);
    };

    const options = generateOptions();

    // Create pan responder for each option
    const createPanResponder = (val: number) => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
            setDraggingValue(val);
            pan.setOffset({ x: 0, y: 0 });
            pan.setValue({ x: 0, y: 0 });
            Animated.spring(scaleAnim, { toValue: 1.2, useNativeDriver: true }).start();
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_, g) => {
            pan.flattenOffset();
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start();
            // Eğer yeterince yukarı sürüklediyse
            if (g.dy < -30) handleDrop(val);
            else {
                setDraggingValue(null);
                pan.setValue({ x: 0, y: 0 });
            }
        }
    });

    const rotateInterpolate = rotateAnim.interpolate({
        inputRange: [-12, 0, 12],
        outputRange: ['-10deg', '0deg', '10deg']
    });

    return (
        <View style={styles.outerContainer}>
            {/* Floating */}
            <Animated.Text style={[styles.floatingCloud, { top: '15%', left: '8%', transform: [{ translateY: float1 }] }]}>☁️</Animated.Text>
            <Animated.Text style={[styles.floatingCloud, { top: '30%', right: '6%', opacity: 0.4, transform: [{ translateY: float2 }] }]}>☁️</Animated.Text>
            <Animated.Text style={[styles.floatingStar, { bottom: '22%', right: '12%', transform: [{ translateY: float1 }] }]}>💜</Animated.Text>

            {showConfetti && <ConfettiCannon count={100} origin={{ x: screenWidth / 2, y: 0 }} fadeOut />}

            <View style={[styles.gameContainer, { width: containerWidth, height: containerHeight }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onExit}><Ionicons name="arrow-back-circle" size={30} color="#9C27B0" /></TouchableOpacity>
                    <View style={styles.roundBadge}><Text style={styles.roundText}>⚖️ Tur {round}/10</Text></View>
                    <TouchableOpacity onPress={toggleMute}><Ionicons name={isMuted ? 'volume-mute-outline' : 'volume-high-outline'} size={26} color="#9C27B0" /></TouchableOpacity>
                </View>

                {/* Main */}
                <View style={styles.mainArea}>
                    {/* Question */}
                    <View style={styles.questionBox}>
                        <Text style={styles.questionText}>Teraziyi Dengele!</Text>
                        {isBalanced ? (
                            <Text style={styles.balancedText}>✓ Dengede!</Text>
                        ) : (
                            <Text style={styles.hintText}>Sol: <Text style={styles.highlight}>{targetNumber}</Text> kg = Sağ: ?</Text>
                        )}
                    </View>

                    {/* Scale */}
                    <View style={styles.scaleWrapper}>
                        <View style={[styles.scaleBase, { width: containerWidth * 0.06, height: containerHeight * 0.05 }]} />
                        <View style={[styles.scalePole, { height: containerHeight * 0.3, width: containerWidth * 0.015 }]} />
                        <Animated.View style={[
                            styles.beam, { width: containerWidth * 0.4, bottom: containerHeight * 0.28, transform: [{ rotate: rotateInterpolate }] }
                        ]}>
                            {/* Left */}
                            <View style={[styles.panContainer, { left: 0 }]}>
                                <View style={[styles.string, { height: containerHeight * 0.1 }]} />
                                <View style={[styles.pan, { width: WEIGHT_SIZE * 1.3 }]}>
                                    <View style={[styles.weight, styles.leftWeight, { width: WEIGHT_SIZE, height: WEIGHT_SIZE }]}>
                                        <Text style={[styles.weightText, { fontSize: WEIGHT_SIZE * 0.45 }]}>{targetNumber}</Text>
                                    </View>
                                </View>
                            </View>
                            {/* Right */}
                            <View style={[styles.panContainer, { right: 0 }]}>
                                <View style={[styles.string, { height: containerHeight * 0.1 }]} />
                                <View style={[styles.pan, { width: WEIGHT_SIZE * 1.3 }]}>
                                    {placedValue !== null ? (
                                        <View style={[styles.weight, styles.placedWeight, { width: WEIGHT_SIZE, height: WEIGHT_SIZE }]}>
                                            <Text style={[styles.weightText, { fontSize: WEIGHT_SIZE * 0.45 }]}>{placedValue}</Text>
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

                    {/* Draggable Options */}
                    <Text style={styles.dragLabel}>⬆️ Sürükleyip teraziye bırak!</Text>
                    <View style={styles.optionsRow}>
                        {options.map((opt, idx) => {
                            const pr = createPanResponder(opt);
                            const isDragging = draggingValue === opt;
                            return (
                                <Animated.View
                                    key={`${round}-${idx}`}
                                    style={[
                                        styles.optionBtn, { width: OPTION_SIZE, height: OPTION_SIZE },
                                        isDragging && { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: scaleAnim }], zIndex: 100 },
                                        feedback === 'correct' && placedValue === opt && styles.optCorrect,
                                        feedback === 'wrong' && placedValue === opt && styles.optWrong,
                                        Platform.OS === 'web' && { cursor: 'grab' } as any
                                    ]}
                                    {...pr.panHandlers}
                                >
                                    <Text style={[styles.optionText, { fontSize: OPTION_SIZE * 0.4 }]}>{opt}</Text>
                                    <Text style={styles.kgLabel}>kg</Text>
                                </Animated.View>
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
    outerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#CE93D8' },
    floatingCloud: { position: 'absolute', fontSize: 36, opacity: 0.35, zIndex: 0 },
    floatingStar: { position: 'absolute', fontSize: 24, opacity: 0.4, zIndex: 0 },
    gameContainer: {
        backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, overflow: 'hidden', zIndex: 10,
        ...(Platform.OS === 'web' ? { boxShadow: '0 12px 40px rgba(0,0,0,0.12)' } as any : { elevation: 12, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 20 }),
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: '3%', paddingVertical: '1.5%', backgroundColor: 'rgba(243,229,245,0.9)', borderBottomWidth: 1, borderBottomColor: '#E1BEE7',
    },
    roundBadge: { backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, borderWidth: 2, borderColor: '#BA68C8' },
    roundText: { fontSize: 13, fontWeight: 'bold', color: '#7B1FA2' },
    mainArea: { flex: 1, alignItems: 'center', padding: '2%' },
    questionBox: { alignItems: 'center', marginBottom: 8 },
    questionText: { fontSize: 15, fontWeight: 'bold', color: '#4A148C' },
    hintText: { fontSize: 12, color: '#6D4C41' },
    highlight: { fontSize: 16, fontWeight: 'bold', color: '#D32F2F' },
    balancedText: { fontSize: 16, fontWeight: 'bold', color: '#4CAF50' },
    scaleWrapper: { alignItems: 'center', justifyContent: 'flex-end', height: '45%', position: 'relative', width: '100%' },
    scaleBase: { backgroundColor: '#5D4037', borderTopLeftRadius: 6, borderTopRightRadius: 6, zIndex: 2 },
    scalePole: { position: 'absolute', bottom: 0, backgroundColor: '#795548', zIndex: 1 },
    beam: { position: 'absolute', height: 6, backgroundColor: '#8D6E63', borderRadius: 3 },
    panContainer: { position: 'absolute', top: 3, alignItems: 'center' },
    string: { width: 2, backgroundColor: '#BDBDBD' },
    pan: { height: 4, backgroundColor: '#5D4037', alignItems: 'center', justifyContent: 'flex-end' },
    weight: { borderRadius: 6, justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 4 },
    leftWeight: { backgroundColor: '#EF5350' },
    placedWeight: { backgroundColor: '#66BB6A' },
    placeholder: { borderWidth: 2, borderColor: '#BDBDBD', borderStyle: 'dashed', borderRadius: 6, justifyContent: 'center', alignItems: 'center', position: 'absolute', bottom: 4 },
    placeholderText: { fontSize: 16, color: '#9E9E9E' },
    weightText: { color: '#FFF', fontWeight: 'bold' },
    dragLabel: { fontSize: 11, color: '#7B1FA2', marginTop: 4, marginBottom: 8 },
    optionsRow: { flexDirection: 'row', gap: 10 },
    optionBtn: {
        borderRadius: 100, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: '#CE93D8',
        ...(Platform.OS === 'web' ? { boxShadow: '0 3px 8px rgba(0,0,0,0.1)' } as any : { elevation: 4, shadowColor: '#000', shadowOpacity: 0.1 }),
    },
    optCorrect: { backgroundColor: '#C8E6C9', borderColor: '#4CAF50' },
    optWrong: { backgroundColor: '#FFCDD2', borderColor: '#F44336' },
    optionText: { fontWeight: 'bold', color: '#7B1FA2' },
    kgLabel: { fontSize: 8, color: '#9E9E9E' },
    progressBar: { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: '1%', backgroundColor: 'rgba(243,229,245,0.9)' },
    progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E1BEE7', borderWidth: 1, borderColor: '#CE93D8' },
    progressDotActive: { backgroundColor: '#9C27B0', borderColor: '#7B1FA2' },
    progressDotCurrent: { backgroundColor: '#FF9800', borderColor: '#E65100', transform: [{ scale: 1.3 }] },
});
