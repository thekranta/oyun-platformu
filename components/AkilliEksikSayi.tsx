import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';

// Akıllı Eksik Sayı — UYARLANIR (adaptif) zorluk. Maarif: MAB.5
// (Matematiksel durumlara ilişkin eksik olan parçayı söyler).
// Zorlukla: sayı aralığı büyür, dizi uzar, çeldiriciler yakınlaşır, adım artar.

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
const TARGET_MS = 8000;

const CFG: Record<number, { startMax: number; len: number; step: number; near: boolean }> = {
    1: { startMax: 3, len: 4, step: 1, near: false },
    2: { startMax: 5, len: 5, step: 1, near: false },
    3: { startMax: 6, len: 5, step: 1, near: true },
    4: { startMax: 8, len: 6, step: 1, near: true },
    5: { startMax: 6, len: 6, step: 2, near: true },
};

const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

interface Round { seq: (number | null)[]; answer: number; options: number[]; }

function buildRound(diff: number): Round {
    const c = CFG[diff] || CFG[2];
    const start = 1 + Math.floor(Math.random() * c.startMax);
    const full = Array.from({ length: c.len }, (_, i) => start + i * c.step);
    const missingIdx = 1 + Math.floor(Math.random() * (c.len - 2)); // baş/son değil
    const answer = full[missingIdx];
    const seq = full.map((v, i) => (i === missingIdx ? null : v));

    const opts = new Set<number>([answer]);
    if (c.near) {
        [answer - c.step, answer + c.step, answer - 2 * c.step, answer + 2 * c.step]
            .filter(v => v > 0).forEach(v => opts.add(v));
    }
    // Yeterli seçenek yoksa/uzak istenirse rastgele yakın sayılarla doldur
    let guard = 0;
    while (opts.size < 4 && guard++ < 40) {
        const v = Math.max(1, answer + (Math.floor(Math.random() * 9) - 4));
        opts.add(v);
    }
    const options = shuffle(Array.from(opts)).slice(0, 4);
    if (!options.includes(answer)) options[0] = answer;
    return { seq, answer, options: shuffle(options) };
}

export default function AkilliEksikSayi({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
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
            onGameEnd('akilli-eksik-sayi', duration, totalMovesRef.current, totalErrorsRef.current, undefined, {
                zorlukSeviyesi: solvedInDiff,
                kazanimOdagi: 'MAB.5 Eksik parçayı bulma / sayı dizisi (uyarlanır zorluk)',
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

        if (n === current.answer) {
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
                    <Text style={styles.title}>📈 Akıllı Eksik Sayı</Text>
                    <View style={styles.roundBadge}>
                        <Text style={styles.roundText}>{round}/{TOTAL_ROUNDS}</Text>
                    </View>
                </View>

                <Text style={styles.question}>Eksik sayı hangisi?</Text>

                {/* Dizi */}
                <Animated.View style={[styles.seqCard, { transform: [{ scale: bump }, { translateX: shake }] }]}>
                    <View style={styles.seqWrap}>
                        {current.seq.map((v, i) => (
                            v === null ? (
                                <View key={i} style={styles.qBox}><Text style={styles.qMark}>?</Text></View>
                            ) : (
                                <View key={i} style={styles.numBox}><Text style={styles.numText}>{v}</Text></View>
                            )
                        ))}
                    </View>
                </Animated.View>

                {/* Seçenekler */}
                <View style={styles.optionsRow}>
                    {current.options.map((n) => {
                        const isSel = selected === n;
                        const showCorrect = feedback !== 'idle' && n === current.answer && (isSel || feedback === 'correct');
                        const showWrong = feedback === 'wrong' && isSel && n !== current.answer;
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
                    {feedback === 'correct' ? 'Harika! 🎉' : feedback === 'wrong' ? 'Diziye tekrar bak 👀' : 'Boşluğa gelecek sayıyı seç'}
                </Text>

                <View style={styles.progressDots}>
                    {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                        <View key={i} style={[styles.pDot, i < round - 1 && styles.pDotDone, i === round - 1 && styles.pDotCurrent]} />
                    ))}
                </View>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    message="Diziye bak, eksik sayıyı bul! Sen başardıkça zorlaşır 📈"
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
    title: { fontSize: 19, fontWeight: 'bold', color: '#3e2723' },
    roundBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    roundText: { fontSize: 14, fontWeight: 'bold', color: '#1976D2' },

    question: { fontSize: 20, fontWeight: '800', color: '#37474F', marginTop: 6, marginBottom: 14, textAlign: 'center' },

    seqCard: {
        backgroundColor: '#FFFDF5', borderRadius: 24, borderWidth: 3, borderColor: '#FFE0B2',
        padding: 16, minHeight: 96, width: '100%', maxWidth: 480, justifyContent: 'center',
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 4,
    },
    seqWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 8 },
    numBox: { minWidth: 50, height: 54, borderRadius: 14, backgroundColor: '#E3F2FD', borderWidth: 2, borderColor: '#90CAF9', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
    numText: { fontSize: 28, fontWeight: '900', color: '#1565C0' },
    qBox: { minWidth: 50, height: 54, borderRadius: 14, borderWidth: 3, borderColor: '#FF8C00', borderStyle: 'dashed', backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
    qMark: { fontSize: 30, fontWeight: '900', color: '#FF8C00' },

    optionsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 22 },
    optionBtn: {
        width: 64, height: 64, borderRadius: 20, backgroundColor: '#E8F5E9', borderWidth: 3, borderColor: '#66BB6A',
        alignItems: 'center', justifyContent: 'center', elevation: 4,
    },
    optionCorrect: { backgroundColor: '#4CAF50', borderColor: '#2E7D32' },
    optionWrong: { backgroundColor: '#EF5350', borderColor: '#C62828' },
    optionText: { fontSize: 28, fontWeight: '900', color: '#2E7D32' },

    hint: { fontSize: 15, color: '#5D4037', marginTop: 16, fontWeight: '600', minHeight: 22 },

    progressDots: { flexDirection: 'row', gap: 6, marginTop: 14 },
    pDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#E0E0E0' },
    pDotDone: { backgroundColor: '#66BB6A' },
    pDotCurrent: { backgroundColor: '#FF9800', transform: [{ scale: 1.3 }] },
});
