import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';

// Akıllı Önce-Sonra — UYARLANIR (adaptif) zorluk. Maarif: SAB.2 (48-60)
// (Kendisine/ailesine/bir hikâyeye ait görselleri oluş sırasına göre sıralayabilme).
// Olay görsellerini önceden sonraya sırayla dokun. Zorlukla adım sayısı 3→5 artar.

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

// Kronolojik olay dizileri (önce → sonra)
const SEQ3: string[][] = [
    ['🥚', '🐣', '🐔'],
    ['🌱', '🌿', '🌳'],
    ['🥚', '🐛', '🦋'],
    ['👶', '🧒', '🧓'],
    ['🌰', '🌱', '🌳'],
];
const SEQ4: string[][] = [
    ['😴', '⏰', '🪥', '🎒'],
    ['🥚', '🐣', '🐤', '🐔'],
    ['🌱', '🌿', '🌷', '🥀'],
];
const SEQ5: string[][] = [
    ['🌅', '☀️', '🌇', '🌙', '😴'],
    ['🌱', '🌿', '🌷', '🍎', '🍂'],
];

const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

interface Card { id: number; emoji: string; correctPos: number; }
interface Round { cards: Card[]; len: number; }

function buildRound(diff: number): Round {
    const bank = diff <= 2 ? SEQ3 : diff <= 4 ? SEQ4 : SEQ5;
    const seq = bank[Math.floor(Math.random() * bank.length)];
    const cards = shuffle(seq.map((emoji, correctPos) => ({ id: correctPos, emoji, correctPos })));
    return { cards, len: seq.length };
}

export default function AkilliOnceSonra({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
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
            onGameEnd('akilli-once-sonra', duration, totalMovesRef.current, totalErrorsRef.current, undefined, {
                zorlukSeviyesi: solvedInDiff,
                kazanimOdagi: 'SAB.2 Görselleri oluş sırasına dizme (uyarlanır zorluk)',
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
        if (orderMap[card.id]) return;
        totalMovesRef.current += 1;

        const nextIdx = Object.keys(orderMap).length;
        if (card.correctPos === nextIdx) {
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
    const cellSize = current.len >= 5 ? 66 : current.len === 4 ? 76 : 88;

    return (
        <DynamicBackground>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                        <Ionicons name="close" size={26} color="#d84315" />
                    </TouchableOpacity>
                    <Text style={styles.title}>📈 Akıllı Önce-Sonra</Text>
                    <View style={styles.roundBadge}>
                        <Text style={styles.roundText}>{round}/{TOTAL_ROUNDS}</Text>
                    </View>
                </View>

                <Text style={styles.question}>Önce olandan başla, sırayla dokun ⏳</Text>

                <Animated.View style={[styles.cardsWrap, { transform: [{ translateX: shake }] }]}>
                    {current.cards.map((card) => {
                        const order = orderMap[card.id];
                        const isWrong = wrongId === card.id;
                        return (
                            <TouchableOpacity
                                key={card.id}
                                style={[styles.card, { width: cellSize, height: cellSize }, !!order && styles.cardDone, isWrong && styles.cardWrong]}
                                onPress={() => handleTap(card)}
                                activeOpacity={0.85}
                                disabled={!!order || done}
                            >
                                {!!order && (
                                    <View style={styles.orderBadge}><Text style={styles.orderBadgeText}>{order}</Text></View>
                                )}
                                <Text style={{ fontSize: cellSize * 0.5 }}>{card.emoji}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </Animated.View>

                <Text style={styles.hint}>
                    {done ? 'Harika! 🎉' : wrongId !== null ? 'Önce olandan başla 👀' : `Sıradaki: ${solvedCount + 1}. adım`}
                </Text>

                <View style={styles.progressDots}>
                    {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                        <View key={i} style={[styles.pDot, i < round - 1 && styles.pDotDone, i === round - 1 && styles.pDotCurrent]} />
                    ))}
                </View>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    message="Olayları önceden sonraya doğru sırayla dokun! Sen başardıkça zorlaşır 📈"
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
    title: { fontSize: 18, fontWeight: 'bold', color: '#3e2723' },
    roundBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    roundText: { fontSize: 14, fontWeight: 'bold', color: '#1976D2' },

    question: { fontSize: 18, fontWeight: '800', color: '#37474F', marginTop: 6, marginBottom: 18, textAlign: 'center' },

    cardsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 520 },
    card: {
        borderRadius: 18, backgroundColor: '#FFFDF5', borderWidth: 3, borderColor: '#B39DDB',
        alignItems: 'center', justifyContent: 'center', elevation: 3,
    },
    cardDone: { backgroundColor: '#EDE7F6', borderColor: '#7E57C2', opacity: 0.92 },
    cardWrong: { backgroundColor: '#FFEBEE', borderColor: '#EF5350' },
    orderBadge: { position: 'absolute', top: -8, left: -8, width: 26, height: 26, borderRadius: 13, backgroundColor: '#5E35B1', alignItems: 'center', justifyContent: 'center', zIndex: 5, elevation: 4 },
    orderBadgeText: { color: '#fff', fontSize: 14, fontWeight: '900' },

    hint: { fontSize: 15, color: '#5D4037', marginTop: 18, fontWeight: '600', minHeight: 22, textAlign: 'center' },

    progressDots: { flexDirection: 'row', gap: 6, marginTop: 14 },
    pDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#E0E0E0' },
    pDotDone: { backgroundColor: '#66BB6A' },
    pDotCurrent: { backgroundColor: '#FF9800', transform: [{ scale: 1.3 }] },
});
