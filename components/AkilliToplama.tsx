import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';

// Akıllı Toplama — UYARLANIR (adaptif) zorluk. Maarif: MAB.7
// (Matematiksel problemler ve çözümlerine ilişkin stratejiler geliştirebilme).
// İki grubu birleştirip say: "toplam kaç?". Zorlukla sayılar büyür, çeldiriciler yakınlaşır.

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

const TOTAL_ROUNDS = 9;
const TARGET_MS = 9000;
const A_OBJ = '🍎';
const B_OBJ = '🍊';

const CFG: Record<number, { max: number; near: boolean }> = {
    1: { max: 3, near: false },
    2: { max: 4, near: false },
    3: { max: 5, near: true },
    4: { max: 6, near: true },
    5: { max: 7, near: true },
};

const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

interface Round { a: number; b: number; sum: number; options: number[]; }

function buildRound(diff: number): Round {
    const c = CFG[diff] || CFG[2];
    const a = 1 + Math.floor(Math.random() * c.max);
    const b = 1 + Math.floor(Math.random() * c.max);
    const sum = a + b;

    const opts = new Set<number>([sum]);
    if (c.near) {
        [sum - 1, sum + 1, sum - 2, sum + 2].filter(v => v > 0).forEach(v => opts.add(v));
    }
    let guard = 0;
    while (opts.size < 4 && guard++ < 40) {
        const v = Math.max(1, sum + (Math.floor(Math.random() * 7) - 3));
        opts.add(v);
    }
    const options = shuffle(Array.from(opts)).slice(0, 4);
    if (!options.includes(sum)) options[0] = sum;
    return { a, b, sum, options: shuffle(options) };
}

export default function AkilliToplama({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
    const START_DIFF = 2;
    const { recordLevel } = useAdaptiveDifficulty({
        minDifficulty: 1, maxDifficulty: 5, checkpointEvery: 3, startDifficulty: START_DIFF,
    });

    const [round, setRound] = useState(1);
    const [current, setCurrent] = useState(() => buildRound(START_DIFF));
    const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const [selected, setSelected] = useState<number | null>(null);
    const [gameReady, setGameReady] = useState(false);

    const startTimeRef = useRef(Date.now());
    const levelStartRef = useRef(Date.now());
    const levelErrorsRef = useRef(0);
    const totalMovesRef = useRef(0);
    const totalErrorsRef = useRef(0);
    const diffRef = useRef(START_DIFF);
    const lockRef = useRef(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const bump = useRef(new Animated.Value(1)).current;
    const shake = useRef(new Animated.Value(0)).current;

    React.useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);
    const startTimer = (t: ReturnType<typeof setTimeout>) => { timersRef.current.push(t); return t; };

    const nextRound = useCallback((solvedInDiff: number) => {
        const timeMs = Date.now() - levelStartRef.current;
        const nextDiff = recordLevel({ correct: 1, total: 1, errors: levelErrorsRef.current, timeMs, targetMs: TARGET_MS });

        if (round >= TOTAL_ROUNDS) {
            const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
            onGameEnd('akilli-toplama', duration, totalMovesRef.current, totalErrorsRef.current, undefined, {
                zorlukSeviyesi: solvedInDiff,
                kazanimOdagi: 'MAB.7 Toplama / problem çözme stratejisi (uyarlanır zorluk)',
            });
            return;
        }
        levelErrorsRef.current = 0;
        levelStartRef.current = Date.now();
        diffRef.current = nextDiff;
        setRound(r => r + 1);
        setCurrent(buildRound(nextDiff));
        setSelected(null);
        setFeedback('idle');
        lockRef.current = false;
    }, [round, recordLevel, onGameEnd]);

    const handlePick = (n: number) => {
        if (lockRef.current || feedback === 'correct') return;
        totalMovesRef.current += 1;
        setSelected(n);

        if (n === current.sum) {
            lockRef.current = true;
            setFeedback('correct');
            Animated.sequence([
                Animated.timing(bump, { toValue: 1.15, duration: 140, useNativeDriver: true }),
                Animated.timing(bump, { toValue: 1, duration: 140, useNativeDriver: true }),
            ]).start();
            const solvedInDiff = diffRef.current;
            startTimer(setTimeout(() => nextRound(solvedInDiff), 850));
        } else {
            levelErrorsRef.current += 1;
            totalErrorsRef.current += 1;
            setFeedback('wrong');
            Animated.sequence([
                Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true }),
                Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: true }),
                Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
            ]).start();
            startTimer(setTimeout(() => { setFeedback('idle'); setSelected(null); }, 550));
        }
    };

    return (
        <DynamicBackground>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                        <Ionicons name="close" size={26} color="#d84315" />
                    </TouchableOpacity>
                    <Text style={styles.title}>📈 Akıllı Toplama</Text>
                    <View style={styles.roundBadge}>
                        <Text style={styles.roundText}>{round}/{TOTAL_ROUNDS}</Text>
                    </View>
                </View>

                <Text style={styles.question}>Toplam kaç tane?</Text>

                {/* İki grup + toplam */}
                <Animated.View style={[styles.card, { transform: [{ scale: bump }, { translateX: shake }] }]}>
                    <View style={styles.groupsRow}>
                        <View style={styles.group}>
                            <View style={styles.objectsWrap}>
                                {Array.from({ length: current.a }, (_, i) => (<Text key={i} style={styles.object}>{A_OBJ}</Text>))}
                            </View>
                        </View>
                        <Text style={styles.plus}>+</Text>
                        <View style={styles.group}>
                            <View style={styles.objectsWrap}>
                                {Array.from({ length: current.b }, (_, i) => (<Text key={i} style={styles.object}>{B_OBJ}</Text>))}
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* Seçenekler */}
                <View style={styles.optionsRow}>
                    {current.options.map((n) => {
                        const isSel = selected === n;
                        const showCorrect = feedback !== 'idle' && n === current.sum && (isSel || feedback === 'correct');
                        const showWrong = feedback === 'wrong' && isSel && n !== current.sum;
                        return (
                            <TouchableOpacity
                                key={n}
                                style={[styles.optionBtn, showCorrect && styles.optionCorrect, showWrong && styles.optionWrong]}
                                onPress={() => handlePick(n)}
                                activeOpacity={0.85}
                                disabled={feedback === 'correct'}
                            >
                                <Text style={[styles.optionText, (showCorrect || showWrong) && { color: '#fff' }]}>{n}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={styles.hint}>
                    {feedback === 'correct' ? 'Harika! 🎉' : feedback === 'wrong' ? 'Hepsini birlikte say 👀' : 'İki grubu birlikte say'}
                </Text>

                <View style={styles.progressDots}>
                    {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                        <View key={i} style={[styles.pDot, i < round - 1 && styles.pDotDone, i === round - 1 && styles.pDotCurrent]} />
                    ))}
                </View>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    message="İki grubu birleştir ve topla! Sen başardıkça zorlaşır 📈"
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => { levelStartRef.current = Date.now(); startTimeRef.current = Date.now(); setGameReady(true); }}
                />
            )}
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, alignItems: 'center' },
    header: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    exitBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffe5e0', alignItems: 'center', justifyContent: 'center', elevation: 2 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#3e2723' },
    roundBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    roundText: { fontSize: 14, fontWeight: 'bold', color: '#1976D2' },

    question: { fontSize: 20, fontWeight: '800', color: '#37474F', marginTop: 6, marginBottom: 12, textAlign: 'center' },

    card: {
        backgroundColor: '#FFFDF5', borderRadius: 24, borderWidth: 3, borderColor: '#FFE0B2',
        padding: 14, minHeight: 140, width: '100%', maxWidth: 480, justifyContent: 'center',
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 4,
    },
    groupsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    group: { flex: 1, backgroundColor: '#FFF8E1', borderRadius: 14, padding: 8, minHeight: 100, justifyContent: 'center' },
    objectsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 4 },
    object: { fontSize: 30, margin: 2 },
    plus: { fontSize: 34, fontWeight: '900', color: '#FF7043', marginHorizontal: 8 },

    optionsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 20 },
    optionBtn: {
        width: 64, height: 64, borderRadius: 20, backgroundColor: '#E3F2FD', borderWidth: 3, borderColor: '#2196F3',
        alignItems: 'center', justifyContent: 'center', elevation: 4,
    },
    optionCorrect: { backgroundColor: '#4CAF50', borderColor: '#2E7D32' },
    optionWrong: { backgroundColor: '#EF5350', borderColor: '#C62828' },
    optionText: { fontSize: 28, fontWeight: '900', color: '#0D47A1' },

    hint: { fontSize: 15, color: '#5D4037', marginTop: 16, fontWeight: '600', minHeight: 22 },

    progressDots: { flexDirection: 'row', gap: 6, marginTop: 14 },
    pDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#E0E0E0' },
    pDotDone: { backgroundColor: '#66BB6A' },
    pDotCurrent: { backgroundColor: '#FF9800', transform: [{ scale: 1.3 }] },
});
