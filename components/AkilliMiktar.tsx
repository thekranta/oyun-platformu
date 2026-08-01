import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';

// Akıllı Miktar — UYARLANIR (adaptif) zorluk. Maarif: MAB.1
// (Ritmik ve algısal sayabilme; nicelik karşılaştırma).
// Zorluk arttıkça sayılar büyür ve iki taraf birbirine YAKLAŞIR (ayırt etmesi zorlaşır).

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
const TARGET_MS = 7000;
const OBJECT = '🍎';

const CFG: Record<number, { lo: number; hi: number; minGap: number; maxGap: number }> = {
    1: { lo: 1, hi: 5, minGap: 3, maxGap: 9 },
    2: { lo: 1, hi: 6, minGap: 2, maxGap: 9 },
    3: { lo: 2, hi: 8, minGap: 2, maxGap: 4 },
    4: { lo: 3, hi: 9, minGap: 1, maxGap: 2 },
    5: { lo: 5, hi: 10, minGap: 1, maxGap: 1 },
};

interface Round { left: number; right: number; more: boolean; }

function buildRound(diff: number): Round {
    const c = CFG[diff] || CFG[2];
    let left = 0, right = 0;
    for (let i = 0; i < 40; i++) {
        left = c.lo + Math.floor(Math.random() * (c.hi - c.lo + 1));
        right = c.lo + Math.floor(Math.random() * (c.hi - c.lo + 1));
        const gap = Math.abs(left - right);
        if (left !== right && gap >= c.minGap && gap <= c.maxGap) break;
    }
    if (left === right) right = left + 1; // güvenlik
    return { left, right, more: Math.random() > 0.5 };
}

export default function AkilliMiktar({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
    const START_DIFF = 2;
    const { recordLevel } = useAdaptiveDifficulty({
        minDifficulty: 1, maxDifficulty: 5, checkpointEvery: 3, startDifficulty: START_DIFF,
    });

    const [round, setRound] = useState(1);
    const [current, setCurrent] = useState(() => buildRound(START_DIFF));
    const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const [selectedSide, setSelectedSide] = useState<'left' | 'right' | null>(null);
    const [gameReady, setGameReady] = useState(false);

    const startTimeRef = useRef(Date.now());
    const levelStartRef = useRef(Date.now());
    const levelErrorsRef = useRef(0);
    const totalMovesRef = useRef(0);
    const totalErrorsRef = useRef(0);
    const diffRef = useRef(START_DIFF);
    const lockRef = useRef(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const shake = useRef(new Animated.Value(0)).current;

    React.useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);
    const startTimer = (t: ReturnType<typeof setTimeout>) => { timersRef.current.push(t); return t; };

    const correctSide = (r: Round): 'left' | 'right' =>
        r.more ? (r.left > r.right ? 'left' : 'right') : (r.left < r.right ? 'left' : 'right');

    const nextRound = useCallback((solvedInDiff: number) => {
        const timeMs = Date.now() - levelStartRef.current;
        const nextDiff = recordLevel({ correct: 1, total: 1, errors: levelErrorsRef.current, timeMs, targetMs: TARGET_MS });

        if (round >= TOTAL_ROUNDS) {
            const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
            onGameEnd('akilli-miktar', duration, totalMovesRef.current, totalErrorsRef.current, undefined, {
                zorlukSeviyesi: solvedInDiff,
                kazanimOdagi: 'MAB.1 Nicelik karşılaştırma (uyarlanır zorluk)',
            });
            return;
        }
        levelErrorsRef.current = 0;
        levelStartRef.current = Date.now();
        diffRef.current = nextDiff;
        setRound(r => r + 1);
        setCurrent(buildRound(nextDiff));
        setSelectedSide(null);
        setFeedback('idle');
        lockRef.current = false;
    }, [round, recordLevel, onGameEnd]);

    const handlePick = (side: 'left' | 'right') => {
        if (lockRef.current || feedback === 'correct') return;
        totalMovesRef.current += 1;
        setSelectedSide(side);

        if (side === correctSide(current)) {
            lockRef.current = true;
            setFeedback('correct');
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
            startTimer(setTimeout(() => { setFeedback('idle'); setSelectedSide(null); }, 550));
        }
    };

    const renderSide = (side: 'left' | 'right', count: number) => {
        const isSel = selectedSide === side;
        const showCorrect = feedback !== 'idle' && side === correctSide(current) && (isSel || feedback === 'correct');
        const showWrong = feedback === 'wrong' && isSel && side !== correctSide(current);
        return (
            <TouchableOpacity
                style={[styles.sideCard, showCorrect && styles.sideCorrect, showWrong && styles.sideWrong]}
                onPress={() => handlePick(side)}
                activeOpacity={0.85}
                disabled={feedback === 'correct'}
            >
                <View style={styles.objectsWrap}>
                    {Array.from({ length: count }, (_, i) => (
                        <Text key={i} style={styles.object}>{OBJECT}</Text>
                    ))}
                </View>
            </TouchableOpacity>
        );
    };

    const qText = current.more ? 'Hangisinde daha ÇOK var?' : 'Hangisinde daha AZ var?';
    const qColor = current.more ? '#1565C0' : '#C62828';

    return (
        <DynamicBackground>
            <Animated.View style={[styles.container, { transform: [{ translateX: shake }] }]}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                        <Ionicons name="close" size={26} color="#d84315" />
                    </TouchableOpacity>
                    <Text style={styles.title}>📈 Akıllı Miktar</Text>
                    <View style={styles.roundBadge}>
                        <Text style={styles.roundText}>{round}/{TOTAL_ROUNDS}</Text>
                    </View>
                </View>

                <Text style={[styles.question, { color: qColor }]}>{qText}</Text>

                <View style={styles.sidesRow}>
                    {renderSide('left', current.left)}
                    <View style={styles.vs}><Text style={styles.vsText}>?</Text></View>
                    {renderSide('right', current.right)}
                </View>

                <Text style={styles.hint}>
                    {feedback === 'correct' ? 'Harika! 🎉' : feedback === 'wrong' ? 'Tekrar say ve dene 👀' : 'Doğru sepete dokun'}
                </Text>

                <View style={styles.progressDots}>
                    {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                        <View key={i} style={[styles.pDot, i < round - 1 && styles.pDotDone, i === round - 1 && styles.pDotCurrent]} />
                    ))}
                </View>
            </Animated.View>

            {!gameReady && (
                <CountdownOverlay
                    message="Hangi tarafta daha çok (veya az) var? Say ve dokun! Sen başardıkça zorlaşır 📈"
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

    question: { fontSize: 21, fontWeight: '900', marginTop: 6, marginBottom: 14, textAlign: 'center' },

    sidesRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', maxWidth: 500 },
    sideCard: {
        flex: 1, minHeight: 210, backgroundColor: '#FFFDF5', borderRadius: 22, borderWidth: 3, borderColor: '#FFE0B2',
        padding: 12, justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 4,
    },
    sideCorrect: { borderColor: '#2E7D32', backgroundColor: '#E8F5E9', borderWidth: 4 },
    sideWrong: { borderColor: '#C62828', backgroundColor: '#FFEBEE', borderWidth: 4 },
    objectsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 4 },
    object: { fontSize: 32, margin: 2 },
    vs: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#ECEFF1', alignItems: 'center', justifyContent: 'center' },
    vsText: { fontSize: 16, fontWeight: '900', color: '#90A4AE' },

    hint: { fontSize: 15, color: '#5D4037', marginTop: 18, fontWeight: '600', minHeight: 22 },

    progressDots: { flexDirection: 'row', gap: 6, marginTop: 14 },
    pDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#E0E0E0' },
    pDotDone: { backgroundColor: '#66BB6A' },
    pDotCurrent: { backgroundColor: '#FF9800', transform: [{ scale: 1.3 }] },
});
