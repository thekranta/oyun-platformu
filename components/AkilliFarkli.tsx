import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';

// Akıllı Farklı — UYARLANIR (adaptif) zorluk. Maarif: FAB.2
// (Nesneleri benzerlik ve farklılıklarına göre sınıflandırabilme; farklı olanı bulma).
// Zorlukla: ızgara büyür ve "farklı" renk, diğerlerine hue olarak YAKLAŞIR (ayırt etmesi zor).

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
// Renk çemberi (hue sırası) — komşular benzer, karşıttlar çok farklı
const PALETTE = ['🔴', '🟠', '🟡', '🟢', '🔵', '🟣'];

interface Round { n: number; base: string; odd: string; oddPos: number; cols: number; }

function buildRound(diff: number): Round {
    const n = diff <= 1 ? 4 : diff <= 3 ? 6 : 9;
    const near = diff >= 4; // ince fark (komşu renk)
    const baseIdx = Math.floor(Math.random() * PALETTE.length);
    const oddIdx = near
        ? (baseIdx + (Math.random() > 0.5 ? 1 : PALETTE.length - 1)) % PALETTE.length
        : (baseIdx + 3) % PALETTE.length;
    const oddPos = Math.floor(Math.random() * n);
    const cols = n <= 4 ? 2 : 3;
    return { n, base: PALETTE[baseIdx], odd: PALETTE[oddIdx], oddPos, cols };
}

export default function AkilliFarkli({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
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

    const shake = useRef(new Animated.Value(0)).current;

    React.useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);
    const startTimer = (t: ReturnType<typeof setTimeout>) => { timersRef.current.push(t); return t; };

    const nextRound = useCallback((solvedInDiff: number) => {
        const timeMs = Date.now() - levelStartRef.current;
        const nextDiff = recordLevel({ correct: 1, total: 1, errors: levelErrorsRef.current, timeMs, targetMs: TARGET_MS });

        if (round >= TOTAL_ROUNDS) {
            const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
            onGameEnd('akilli-farkli', duration, totalMovesRef.current, totalErrorsRef.current, undefined, {
                zorlukSeviyesi: solvedInDiff,
                kazanimOdagi: 'FAB.2 Farklı olanı ayırt etme / sınıflandırma (uyarlanır zorluk)',
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

    const handleTap = (index: number) => {
        if (lockRef.current || feedback === 'correct') return;
        totalMovesRef.current += 1;
        setSelected(index);

        if (index === current.oddPos) {
            lockRef.current = true;
            setFeedback('correct');
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
            startTimer(setTimeout(() => { setFeedback('idle'); setSelected(null); }, 500));
        }
    };

    const cellSize = current.cols === 2 ? 92 : 84;

    return (
        <DynamicBackground>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                        <Ionicons name="close" size={26} color="#d84315" />
                    </TouchableOpacity>
                    <Text style={styles.title}>📈 Akıllı Farklı</Text>
                    <View style={styles.roundBadge}>
                        <Text style={styles.roundText}>{round}/{TOTAL_ROUNDS}</Text>
                    </View>
                </View>

                <Text style={styles.question}>Farklı olanı bul!</Text>

                <Animated.View style={[styles.grid, { maxWidth: current.cols * (cellSize + 12) + 8, transform: [{ translateX: shake }] }]}>
                    {Array.from({ length: current.n }, (_, i) => {
                        const emoji = i === current.oddPos ? current.odd : current.base;
                        const isSel = selected === i;
                        const showCorrect = feedback !== 'idle' && i === current.oddPos && (isSel || feedback === 'correct');
                        const showWrong = feedback === 'wrong' && isSel && i !== current.oddPos;
                        return (
                            <TouchableOpacity
                                key={i}
                                style={[styles.cell, { width: cellSize, height: cellSize }, showCorrect && styles.cellCorrect, showWrong && styles.cellWrong]}
                                onPress={() => handleTap(i)}
                                activeOpacity={0.85}
                                disabled={feedback === 'correct'}
                            >
                                <Text style={styles.cellEmoji}>{emoji}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </Animated.View>

                <Text style={styles.hint}>
                    {feedback === 'correct' ? 'Harika! 🎉' : feedback === 'wrong' ? 'Renklere dikkatli bak 👀' : 'Diğerlerinden farklı olana dokun'}
                </Text>

                <View style={styles.progressDots}>
                    {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                        <View key={i} style={[styles.pDot, i < round - 1 && styles.pDotDone, i === round - 1 && styles.pDotCurrent]} />
                    ))}
                </View>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    message="Diğerlerinden farklı olan tek nesneyi bul! Sen başardıkça zorlaşır 📈"
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

    question: { fontSize: 20, fontWeight: '800', color: '#37474F', marginTop: 6, marginBottom: 16, textAlign: 'center' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
    cell: {
        borderRadius: 18, backgroundColor: '#FFFDF5', borderWidth: 3, borderColor: '#ECEFF1',
        alignItems: 'center', justifyContent: 'center', elevation: 3,
    },
    cellCorrect: { borderColor: '#2E7D32', backgroundColor: '#E8F5E9' },
    cellWrong: { borderColor: '#C62828', backgroundColor: '#FFEBEE' },
    cellEmoji: { fontSize: 44 },

    hint: { fontSize: 15, color: '#5D4037', marginTop: 18, fontWeight: '600', minHeight: 22 },

    progressDots: { flexDirection: 'row', gap: 6, marginTop: 14 },
    pDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#E0E0E0' },
    pDotDone: { backgroundColor: '#66BB6A' },
    pDotCurrent: { backgroundColor: '#FF9800', transform: [{ scale: 1.3 }] },
});
