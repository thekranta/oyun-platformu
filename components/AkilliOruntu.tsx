import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';

// Akıllı Örüntü — UYARLANIR (adaptif) zorluk. Maarif: MAB.3
// (Matematiksel olgu/olay/nesnelere ilişkin çıkarım — örüntüyü sürdürme).
// Zorluk arttıkça örüntü birimi uzar, renk çeşidi ve çeldirici sayısı artar.

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
const PALETTE = ['🔴', '🔵', '🟡', '🟢', '🟣', '🟠'];

const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

interface Round { shown: string[]; answer: string; options: string[]; }

function buildRound(diff: number): Round {
    const colorsCount = diff <= 2 ? 2 : diff <= 4 ? 3 : 4;
    const unitLen = diff <= 2 ? 2 : 3;
    const colors = shuffle(PALETTE).slice(0, colorsCount);
    const unit = colors.slice(0, unitLen);          // örüntü birimi (sıra karışık paletten)
    const reps = 2;
    const p = Math.floor(Math.random() * unitLen);  // kısmi tekrar → cevap değişkenliği
    const shownCount = reps * unitLen + p;
    const shown = Array.from({ length: shownCount }, (_, i) => unit[i % unitLen]);
    const answer = unit[shownCount % unitLen];

    const optionCount = diff >= 3 ? 4 : 3;
    const distractPool = [...colors.filter(c => c !== answer), ...PALETTE.filter(c => !colors.includes(c))];
    const distractors = shuffle(distractPool).slice(0, optionCount - 1);
    const options = shuffle([answer, ...distractors]);
    return { shown, answer, options };
}

export default function AkilliOruntu({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
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
            onGameEnd('akilli-oruntu', duration, totalMovesRef.current, totalErrorsRef.current, undefined, {
                zorlukSeviyesi: solvedInDiff,
                kazanimOdagi: 'MAB.3 Örüntüyü sürdürme / çıkarım (uyarlanır zorluk)',
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

    const handlePick = (c: string) => {
        if (lockRef.current || feedback === 'correct') return;
        totalMovesRef.current += 1;
        setSelected(c);

        if (c === current.answer) {
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
                    <Text style={styles.title}>📈 Akıllı Örüntü</Text>
                    <View style={styles.roundBadge}>
                        <Text style={styles.roundText}>{round}/{TOTAL_ROUNDS}</Text>
                    </View>
                </View>

                <Text style={styles.question}>Sırada hangisi gelmeli?</Text>

                {/* Örüntü dizisi */}
                <Animated.View style={[styles.seqCard, { transform: [{ scale: bump }, { translateX: shake }] }]}>
                    <View style={styles.seqWrap}>
                        {current.shown.map((c, i) => (
                            <Text key={i} style={styles.seqItem}>{c}</Text>
                        ))}
                        <View style={styles.qBox}><Text style={styles.qMark}>?</Text></View>
                    </View>
                </Animated.View>

                {/* Seçenekler */}
                <View style={styles.optionsRow}>
                    {current.options.map((c, idx) => {
                        const isSel = selected === c;
                        const showCorrect = feedback !== 'idle' && c === current.answer && (isSel || feedback === 'correct');
                        const showWrong = feedback === 'wrong' && isSel && c !== current.answer;
                        return (
                            <TouchableOpacity
                                key={`${c}-${idx}`}
                                style={[styles.optionBtn, showCorrect && styles.optionCorrect, showWrong && styles.optionWrong]}
                                onPress={() => handlePick(c)}
                                activeOpacity={0.85}
                                disabled={feedback === 'correct'}
                            >
                                <Text style={styles.optionEmoji}>{c}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={styles.hint}>
                    {feedback === 'correct' ? 'Harika! 🎉' : feedback === 'wrong' ? 'Örüntüye tekrar bak 👀' : 'Örüntüyü sürdür'}
                </Text>

                <View style={styles.progressDots}>
                    {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                        <View key={i} style={[styles.pDot, i < round - 1 && styles.pDotDone, i === round - 1 && styles.pDotCurrent]} />
                    ))}
                </View>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    message="Renk örüntüsünü çöz ve sıradakini bul! Sen başardıkça zorlaşır 📈"
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

    seqCard: {
        backgroundColor: '#FFFDF5', borderRadius: 24, borderWidth: 3, borderColor: '#FFE0B2',
        padding: 16, minHeight: 96, width: '100%', maxWidth: 480, justifyContent: 'center',
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 4,
    },
    seqWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 },
    seqItem: { fontSize: 38, marginHorizontal: 2 },
    qBox: { width: 52, height: 52, borderRadius: 14, borderWidth: 3, borderColor: '#FF8C00', borderStyle: 'dashed', backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
    qMark: { fontSize: 30, fontWeight: '900', color: '#FF8C00' },

    optionsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 22 },
    optionBtn: {
        width: 68, height: 68, borderRadius: 20, backgroundColor: '#fff', borderWidth: 3, borderColor: '#CFD8DC',
        alignItems: 'center', justifyContent: 'center', elevation: 4,
    },
    optionCorrect: { borderColor: '#2E7D32', backgroundColor: '#E8F5E9' },
    optionWrong: { borderColor: '#C62828', backgroundColor: '#FFEBEE' },
    optionEmoji: { fontSize: 34 },

    hint: { fontSize: 15, color: '#5D4037', marginTop: 16, fontWeight: '600', minHeight: 22 },

    progressDots: { flexDirection: 'row', gap: 6, marginTop: 14 },
    pDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#E0E0E0' },
    pDotDone: { backgroundColor: '#66BB6A' },
    pDotCurrent: { backgroundColor: '#FF9800', transform: [{ scale: 1.3 }] },
});
