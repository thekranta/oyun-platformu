import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';

// Akıllı Sıralama — UYARLANIR (adaptif) zorluk. Maarif: MAB.3
// (Matematiksel olgu/olay/nesnelere ilişkin çıkarım; azdan çoğa sıralama).
// Zorlukla: kart sayısı artar ve miktarlar birbirine yaklaşır (ayırt etmesi zorlaşır).

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
const TARGET_MS = 10000;
const DOT = '🔵';

const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

interface Card { id: number; count: number; }
interface Round { cards: Card[]; sortedAsc: number[]; }

function buildRound(diff: number): Round {
    const n = diff <= 1 ? 3 : diff <= 3 ? 4 : diff <= 4 ? 5 : 6;
    let counts: number[];
    if (diff <= 2) {
        // Geniş aralık: ayırt etmesi kolay
        counts = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, n);
    } else {
        // Ardışık pencere: yakın miktarlar, ayırt etmesi zor
        const base = 1 + Math.floor(Math.random() * (9 - n));
        counts = Array.from({ length: n }, (_, i) => base + i);
    }
    const cards = shuffle(counts.map((count, id) => ({ id, count })));
    const sortedAsc = [...counts].sort((a, b) => a - b);
    return { cards, sortedAsc };
}

export default function AkilliSiralama({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
    const START_DIFF = 2;
    const { recordLevel } = useAdaptiveDifficulty({
        minDifficulty: 1, maxDifficulty: 5, checkpointEvery: 3, startDifficulty: START_DIFF,
    });

    const [round, setRound] = useState(1);
    const [current, setCurrent] = useState(() => buildRound(START_DIFF));
    const [orderMap, setOrderMap] = useState<Record<number, number>>({});
    const [wrongId, setWrongId] = useState<number | null>(null);
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
            onGameEnd('akilli-siralama', duration, totalMovesRef.current, totalErrorsRef.current, undefined, {
                zorlukSeviyesi: solvedInDiff,
                kazanimOdagi: 'MAB.3 Azdan çoğa sıralama / çıkarım (uyarlanır zorluk)',
            });
            return;
        }
        levelErrorsRef.current = 0;
        levelStartRef.current = Date.now();
        diffRef.current = nextDiff;
        setRound(r => r + 1);
        setCurrent(buildRound(nextDiff));
        setOrderMap({});
        setWrongId(null);
        lockRef.current = false;
    }, [round, recordLevel, onGameEnd]);

    const handleTap = (card: Card) => {
        if (lockRef.current) return;
        if (orderMap[card.id]) return; // zaten sıralandı
        totalMovesRef.current += 1;

        const nextIdx = Object.keys(orderMap).length;
        if (card.count === current.sortedAsc[nextIdx]) {
            const newOrder = { ...orderMap, [card.id]: nextIdx + 1 };
            setOrderMap(newOrder);
            if (Object.keys(newOrder).length === current.cards.length) {
                lockRef.current = true;
                const solvedInDiff = diffRef.current;
                startTimer(setTimeout(() => nextRound(solvedInDiff), 750));
            }
        } else {
            levelErrorsRef.current += 1;
            totalErrorsRef.current += 1;
            setWrongId(card.id);
            Animated.sequence([
                Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true }),
                Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: true }),
                Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
            ]).start();
            startTimer(setTimeout(() => setWrongId(null), 450));
        }
    };

    const solvedCount = Object.keys(orderMap).length;
    const done = solvedCount === current.cards.length;

    return (
        <DynamicBackground>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                        <Ionicons name="close" size={26} color="#d84315" />
                    </TouchableOpacity>
                    <Text style={styles.title}>📈 Akıllı Sıralama</Text>
                    <View style={styles.roundBadge}>
                        <Text style={styles.roundText}>{round}/{TOTAL_ROUNDS}</Text>
                    </View>
                </View>

                <Text style={styles.question}>Azdan çoğa sırayla dokun 👇</Text>

                <Animated.View style={[styles.cardsWrap, { transform: [{ translateX: shake }] }]}>
                    {current.cards.map((card) => {
                        const order = orderMap[card.id];
                        const isWrong = wrongId === card.id;
                        return (
                            <TouchableOpacity
                                key={card.id}
                                style={[styles.card, !!order && styles.cardDone, isWrong && styles.cardWrong]}
                                onPress={() => handleTap(card)}
                                activeOpacity={0.85}
                                disabled={!!order || done}
                            >
                                {order && (
                                    <View style={styles.orderBadge}><Text style={styles.orderBadgeText}>{order}</Text></View>
                                )}
                                <View style={styles.dotsWrap}>
                                    {Array.from({ length: card.count }, (_, i) => (
                                        <Text key={i} style={styles.dot}>{DOT}</Text>
                                    ))}
                                </View>
                                <Text style={styles.countText}>{card.count}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </Animated.View>

                <Text style={styles.hint}>
                    {done ? 'Harika! 🎉' : wrongId !== null ? 'En az olandan başla 👀' : `Sıradaki: en az olan (${solvedCount}/${current.cards.length})`}
                </Text>

                <View style={styles.progressDots}>
                    {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                        <View key={i} style={[styles.pDot, i < round - 1 && styles.pDotDone, i === round - 1 && styles.pDotCurrent]} />
                    ))}
                </View>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    message="Kartları en azdan en çoğa doğru sırayla dokun! Sen başardıkça zorlaşır 📈"
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

    question: { fontSize: 19, fontWeight: '800', color: '#37474F', marginTop: 6, marginBottom: 14, textAlign: 'center' },

    cardsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, maxWidth: 520 },
    card: {
        width: 96, minHeight: 108, borderRadius: 18, backgroundColor: '#FFFDF5', borderWidth: 3, borderColor: '#FFE0B2',
        padding: 8, alignItems: 'center', justifyContent: 'center', elevation: 3,
    },
    cardDone: { backgroundColor: '#E8F5E9', borderColor: '#66BB6A', opacity: 0.9 },
    cardWrong: { backgroundColor: '#FFEBEE', borderColor: '#EF5350' },
    dotsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 1, maxWidth: 84 },
    dot: { fontSize: 16, margin: 1 },
    countText: { fontSize: 15, fontWeight: '900', color: '#5D4037', marginTop: 4 },
    orderBadge: { position: 'absolute', top: -8, left: -8, width: 26, height: 26, borderRadius: 13, backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center', zIndex: 5, elevation: 4 },
    orderBadgeText: { color: '#fff', fontSize: 14, fontWeight: '900' },

    hint: { fontSize: 15, color: '#5D4037', marginTop: 18, fontWeight: '600', minHeight: 22, textAlign: 'center' },

    progressDots: { flexDirection: 'row', gap: 6, marginTop: 14 },
    pDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#E0E0E0' },
    pDotDone: { backgroundColor: '#66BB6A' },
    pDotCurrent: { backgroundColor: '#FF9800', transform: [{ scale: 1.3 }] },
});
