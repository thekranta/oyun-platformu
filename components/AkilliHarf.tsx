import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';

// Akıllı Harf — UYARLANIR (adaptif) zorluk. Maarif: TAEOB.1
// (Yazı farkındalığına ilişkin becerileri gösterebilme; harf biçimi ayırt etme).
// "Aynı harfi bul": zorlukla seçenek sayısı artar ve çeldiriciler görsel olarak
// benzeşir (b/d/p, m/n, ı/i/l ...) — okuma öncesi harf-biçim ayırt etme.

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
const TARGET_MS = 6000;

const ALL_LETTERS = ['a', 'b', 'c', 'ç', 'd', 'e', 'g', 'ğ', 'h', 'ı', 'i', 'k', 'm', 'n', 'o', 'ö', 'p', 'r', 's', 'ş', 't', 'u', 'ü', 'v', 'y', 'z'];
// Görsel olarak karışabilen kümeler (yüksek zorlukta çeldirici bunlardan)
const SIMILAR: string[][] = [
    ['b', 'd', 'p'],
    ['m', 'n'],
    ['ı', 'i', 'l'],
    ['u', 'ü', 'v', 'y'],
    ['o', 'ö', 'c', 'ç'],
    ['g', 'ğ'],
    ['s', 'ş'],
    ['a', 'e'],
];

const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

interface Round { target: string; options: string[]; }

function buildRound(diff: number): Round {
    const near = diff >= 3;
    const optionCount = diff <= 2 ? 3 : 4;

    let target: string;
    let distractors: string[] = [];

    if (near) {
        // Benzer kümeden bir harf seç, çeldiricileri aynı kümeden al
        const cluster = SIMILAR[Math.floor(Math.random() * SIMILAR.length)];
        target = cluster[Math.floor(Math.random() * cluster.length)];
        distractors = shuffle(cluster.filter(l => l !== target));
    } else {
        target = ALL_LETTERS[Math.floor(Math.random() * ALL_LETTERS.length)];
    }
    // Yeterli değilse rastgele farklı harflerle doldur
    const pool = shuffle(ALL_LETTERS.filter(l => l !== target && !distractors.includes(l)));
    while (distractors.length < optionCount - 1) distractors.push(pool.shift()!);

    const options = shuffle([target, ...distractors.slice(0, optionCount - 1)]);
    return { target, options };
}

export default function AkilliHarf({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
    const START_DIFF = 2;
    const { recordLevel } = useAdaptiveDifficulty({
        minDifficulty: 1, maxDifficulty: 5, checkpointEvery: 3, startDifficulty: START_DIFF,
    });

    const [round, setRound] = useState(1);
    const [current, setCurrent] = useState(() => buildRound(START_DIFF));
    const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const [selected, setSelected] = useState<string | null>(null);
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
            onGameEnd('akilli-harf', duration, totalMovesRef.current, totalErrorsRef.current, undefined, {
                zorlukSeviyesi: solvedInDiff,
                kazanimOdagi: 'TAEOB.1 Harf biçimi ayırt etme / yazı farkındalığı (uyarlanır zorluk)',
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

    const handlePick = (letter: string) => {
        if (lockRef.current || feedback === 'correct') return;
        totalMovesRef.current += 1;
        setSelected(letter);

        if (letter === current.target) {
            lockRef.current = true;
            setFeedback('correct');
            Animated.sequence([
                Animated.timing(bump, { toValue: 1.15, duration: 140, useNativeDriver: true }),
                Animated.timing(bump, { toValue: 1, duration: 140, useNativeDriver: true }),
            ]).start();
            const solvedInDiff = diffRef.current;
            startTimer(setTimeout(() => nextRound(solvedInDiff), 800));
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
                    <Text style={styles.title}>📈 Akıllı Harf</Text>
                    <View style={styles.roundBadge}>
                        <Text style={styles.roundText}>{round}/{TOTAL_ROUNDS}</Text>
                    </View>
                </View>

                <Text style={styles.question}>Aynı harfi bul</Text>

                {/* Hedef harf */}
                <Animated.View style={[styles.targetCard, { transform: [{ scale: bump }, { translateX: shake }] }]}>
                    <Text style={styles.targetLetter}>{current.target}</Text>
                </Animated.View>

                {/* Seçenekler */}
                <View style={styles.optionsRow}>
                    {current.options.map((l, idx) => {
                        const isSel = selected === l;
                        const showCorrect = feedback !== 'idle' && l === current.target && (isSel || feedback === 'correct');
                        const showWrong = feedback === 'wrong' && isSel && l !== current.target;
                        return (
                            <TouchableOpacity
                                key={`${l}-${idx}`}
                                style={[styles.optionBtn, showCorrect && styles.optionCorrect, showWrong && styles.optionWrong]}
                                onPress={() => handlePick(l)}
                                activeOpacity={0.85}
                                disabled={feedback === 'correct'}
                            >
                                <Text style={[styles.optionText, (showCorrect || showWrong) && { color: '#fff' }]}>{l}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={styles.hint}>
                    {feedback === 'correct' ? 'Harika! 🎉' : feedback === 'wrong' ? 'Harfin biçimine dikkatli bak 👀' : 'Yukarıdaki harfin aynısına dokun'}
                </Text>

                <View style={styles.progressDots}>
                    {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                        <View key={i} style={[styles.pDot, i < round - 1 && styles.pDotDone, i === round - 1 && styles.pDotCurrent]} />
                    ))}
                </View>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    message="Yukarıdaki harfin aynısını aşağıda bul! Sen başardıkça zorlaşır 📈"
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

    question: { fontSize: 20, fontWeight: '800', color: '#37474F', marginTop: 6, marginBottom: 14, textAlign: 'center' },

    targetCard: {
        width: 130, height: 130, borderRadius: 28, backgroundColor: '#FFFDF5', borderWidth: 4, borderColor: '#F06292',
        alignItems: 'center', justifyContent: 'center', elevation: 5,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5,
    },
    targetLetter: { fontSize: 84, fontWeight: '900', color: '#C2185B', includeFontPadding: false },

    optionsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 26 },
    optionBtn: {
        width: 70, height: 70, borderRadius: 20, backgroundColor: '#F3E5F5', borderWidth: 3, borderColor: '#BA68C8',
        alignItems: 'center', justifyContent: 'center', elevation: 4,
    },
    optionCorrect: { backgroundColor: '#4CAF50', borderColor: '#2E7D32' },
    optionWrong: { backgroundColor: '#EF5350', borderColor: '#C62828' },
    optionText: { fontSize: 40, fontWeight: '900', color: '#6A1B9A', includeFontPadding: false },

    hint: { fontSize: 15, color: '#5D4037', marginTop: 18, fontWeight: '600', minHeight: 22, textAlign: 'center' },

    progressDots: { flexDirection: 'row', gap: 6, marginTop: 14 },
    pDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#E0E0E0' },
    pDotDone: { backgroundColor: '#66BB6A' },
    pDotCurrent: { backgroundColor: '#FF9800', transform: [{ scale: 1.3 }] },
});
