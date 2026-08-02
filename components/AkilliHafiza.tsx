import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';

// Akıllı Hafıza — UYARLANIR (adaptif) zorluk. Maarif: MAB.2
// (Nesnelerin özelliklerini çözümleyip eşleştirebilme; görsel bellek).
// Her tahtayı (çift eşleştirme) temizle. Zorlukla çift sayısı artar.

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

const TOTAL_ROUNDS = 6;
const ANIMALS = ['🐶', '🐱', '🐭', '🐰', '🦊', '🐻', '🐼', '🐸'];
const PAIRS_BY_DIFF: Record<number, number> = { 1: 2, 2: 3, 3: 3, 4: 4, 5: 5 };

interface Card { id: number; emoji: string; matched: boolean; flipped: boolean; }

const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

function buildBoard(diff: number): Card[] {
    const pairs = PAIRS_BY_DIFF[diff] || 3;
    const emojis = shuffle(ANIMALS).slice(0, pairs);
    const deck = shuffle(emojis.flatMap(e => [e, e]));
    return deck.map((emoji, id) => ({ id, emoji, matched: false, flipped: false }));
}

export default function AkilliHafiza({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
    const START_DIFF = 2;
    const { recordLevel } = useAdaptiveDifficulty({
        minDifficulty: 1, maxDifficulty: 5, checkpointEvery: 2, startDifficulty: START_DIFF,
    });

    const [round, setRound] = useState(1);
    const [cards, setCards] = useState<Card[]>(() => buildBoard(START_DIFF));
    const [gameReady, setGameReady] = useState(false);

    const cardsRef = useRef(cards);
    useEffect(() => { cardsRef.current = cards; }, [cards]);

    const startTimeRef = useRef(Date.now());
    const levelStartRef = useRef(Date.now());
    const levelErrorsRef = useRef(0);
    const totalMovesRef = useRef(0);
    const totalErrorsRef = useRef(0);
    const diffRef = useRef(START_DIFF);
    const lockRef = useRef(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);
    const startTimer = (t: ReturnType<typeof setTimeout>) => { timersRef.current.push(t); return t; };

    const solveRound = useCallback(() => {
        const timeMs = Date.now() - levelStartRef.current;
        const nextDiff = recordLevel({ correct: 1, total: 1, errors: levelErrorsRef.current, timeMs, targetMs: 6000 + diffRef.current * 2000 });

        if (round >= TOTAL_ROUNDS) {
            const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
            onGameEnd('akilli-hafiza', duration, totalMovesRef.current, totalErrorsRef.current, undefined, {
                zorlukSeviyesi: diffRef.current,
                kazanimOdagi: 'MAB.2 Görsel bellek / eşleştirme (uyarlanır zorluk)',
            });
            return;
        }
        levelErrorsRef.current = 0;
        diffRef.current = nextDiff;
        startTimer(setTimeout(() => {
            setRound(r => r + 1);
            setCards(buildBoard(nextDiff));
            levelStartRef.current = Date.now();
            lockRef.current = false;
        }, 700));
    }, [round, recordLevel, onGameEnd]);

    const handleTap = (id: number) => {
        if (lockRef.current) return;
        const cur = cardsRef.current;
        const card = cur.find(c => c.id === id);
        if (!card || card.matched || card.flipped) return;

        const updated = cur.map(c => (c.id === id ? { ...c, flipped: true } : c));
        setCards(updated);
        cardsRef.current = updated;

        const openNow = updated.filter(c => c.flipped && !c.matched);
        if (openNow.length < 2) return;

        // İki kart açık → değerlendir
        lockRef.current = true;
        totalMovesRef.current += 1;
        const [a, b] = openNow;

        if (a.emoji === b.emoji) {
            startTimer(setTimeout(() => {
                const matched = cardsRef.current.map(c => (c.id === a.id || c.id === b.id ? { ...c, matched: true } : c));
                setCards(matched);
                cardsRef.current = matched;
                lockRef.current = false;
                if (matched.every(c => c.matched)) {
                    lockRef.current = true; // sonraki tahta kurulana kadar kilit
                    solveRound();
                }
            }, 350));
        } else {
            levelErrorsRef.current += 1;
            totalErrorsRef.current += 1;
            startTimer(setTimeout(() => {
                const reset = cardsRef.current.map(c => (c.id === a.id || c.id === b.id ? { ...c, flipped: false } : c));
                setCards(reset);
                cardsRef.current = reset;
                lockRef.current = false;
            }, 800));
        }
    };

    const cols = cards.length <= 4 ? 2 : cards.length <= 6 ? 3 : cards.length <= 8 ? 4 : 5;
    const cellSize = cols <= 3 ? 82 : cols === 4 ? 72 : 62;
    const matchedCount = cards.filter(c => c.matched).length;

    return (
        <DynamicBackground>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                        <Ionicons name="close" size={26} color="#d84315" />
                    </TouchableOpacity>
                    <Text style={styles.title}>📈 Akıllı Hafıza</Text>
                    <View style={styles.roundBadge}>
                        <Text style={styles.roundText}>{round}/{TOTAL_ROUNDS}</Text>
                    </View>
                </View>

                <Text style={styles.question}>Aynı ikilileri bul 🧠</Text>

                <View style={[styles.grid, { maxWidth: cols * (cellSize + 12) + 8 }]}>
                    {cards.map((card) => {
                        const show = card.flipped || card.matched;
                        return (
                            <TouchableOpacity
                                key={card.id}
                                style={[styles.cell, { width: cellSize, height: cellSize }, show && styles.cellOpen, card.matched && styles.cellMatched]}
                                onPress={() => handleTap(card.id)}
                                activeOpacity={0.9}
                                disabled={show || lockRef.current}
                            >
                                <Text style={[styles.cellEmoji, { fontSize: cellSize * 0.5 }]}>{show ? card.emoji : '❓'}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={styles.hint}>{matchedCount === cards.length ? 'Harika! 🎉' : 'İki kart aç, aynılarını eşleştir'}</Text>

                <View style={styles.progressDots}>
                    {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                        <View key={i} style={[styles.pDot, i < round - 1 && styles.pDotDone, i === round - 1 && styles.pDotCurrent]} />
                    ))}
                </View>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    message="Kartları çevir, aynı ikilileri hatırla ve eşleştir! Sen başardıkça zorlaşır 📈"
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

    question: { fontSize: 19, fontWeight: '800', color: '#37474F', marginTop: 6, marginBottom: 16, textAlign: 'center' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
    cell: {
        borderRadius: 16, backgroundColor: '#5C6BC0', borderWidth: 3, borderColor: '#3F51B5',
        alignItems: 'center', justifyContent: 'center', elevation: 3,
    },
    cellOpen: { backgroundColor: '#FFFDF5', borderColor: '#FFB74D' },
    cellMatched: { backgroundColor: '#E8F5E9', borderColor: '#66BB6A', opacity: 0.85 },
    cellEmoji: { color: '#fff' },

    hint: { fontSize: 15, color: '#5D4037', marginTop: 18, fontWeight: '600', minHeight: 22, textAlign: 'center' },

    progressDots: { flexDirection: 'row', gap: 6, marginTop: 14 },
    pDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#E0E0E0' },
    pDotDone: { backgroundColor: '#66BB6A' },
    pDotCurrent: { backgroundColor: '#FF9800', transform: [{ scale: 1.3 }] },
});
