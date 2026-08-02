import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';

// Akıllı Sınıflandır — UYARLANIR (adaptif) zorluk. Maarif: FAB.2
// (Nesneleri benzerlik ve farklılıklarına göre sınıflandırabilme).
// Nesneyi doğru sepete ayır. Zorlukla kategoriler incelir: hayvan/yiyecek →
// meyve/sebze → karada/denizde → canlı/cansız (soyut).

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

interface CatSet {
    cats: { key: string; label: string }[];
    items: { emoji: string; cat: string }[];
}

// Zorluk arttıkça kategoriler daha soyut/yakın
const SETS: CatSet[] = [
    {
        cats: [{ key: 'hayvan', label: '🐾 Hayvan' }, { key: 'yiyecek', label: '🍽️ Yiyecek' }],
        items: [
            ...['🐶', '🐱', '🐰', '🐻', '🦊', '🐸', '🐔', '🐴'].map(e => ({ emoji: e, cat: 'hayvan' })),
            ...['🍎', '🍌', '🍰', '🥕', '🍞', '🧀', '🍇', '🍕'].map(e => ({ emoji: e, cat: 'yiyecek' })),
        ],
    },
    {
        cats: [{ key: 'meyve', label: '🍎 Meyve' }, { key: 'sebze', label: '🥕 Sebze' }],
        items: [
            ...['🍎', '🍌', '🍇', '🍓', '🍊', '🍑', '🍉', '🍐'].map(e => ({ emoji: e, cat: 'meyve' })),
            ...['🥕', '🥦', '🌽', '🥔', '🍅', '🧅', '🥬', '🫑'].map(e => ({ emoji: e, cat: 'sebze' })),
        ],
    },
    {
        cats: [{ key: 'kara', label: '🌳 Karada' }, { key: 'deniz', label: '🌊 Denizde' }],
        items: [
            ...['🐶', '🐴', '🐘', '🦁', '🐰', '🦒', '🐷', '🐮'].map(e => ({ emoji: e, cat: 'kara' })),
            ...['🐟', '🐙', '🐳', '🦀', '🐠', '🦈', '🐬', '🦑'].map(e => ({ emoji: e, cat: 'deniz' })),
        ],
    },
    {
        cats: [{ key: 'canli', label: '🌱 Canlı' }, { key: 'cansiz', label: '🪨 Cansız' }],
        items: [
            ...['🐶', '🌳', '🐝', '🐟', '🌻', '🐔', '🧒', '🐰'].map(e => ({ emoji: e, cat: 'canli' })),
            ...['🪨', '🚗', '🪑', '📱', '⚽', '🥄', '👟', '🔑'].map(e => ({ emoji: e, cat: 'cansiz' })),
        ],
    },
];

interface Round { emoji: string; cats: { key: string; label: string }[]; answer: string; }

function buildRound(diff: number): Round {
    const set = SETS[Math.min(diff - 1, SETS.length - 1)];
    const item = set.items[Math.floor(Math.random() * set.items.length)];
    return { emoji: item.emoji, cats: set.cats, answer: item.cat };
}

export default function AkilliSiniflandir({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
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
            onGameEnd('akilli-siniflandir', duration, totalMovesRef.current, totalErrorsRef.current, undefined, {
                zorlukSeviyesi: solvedInDiff,
                kazanimOdagi: 'FAB.2 Sınıflandırma (uyarlanır zorluk)',
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

    const handlePick = (key: string) => {
        if (lockRef.current || feedback === 'correct') return;
        totalMovesRef.current += 1;
        setSelected(key);

        if (key === current.answer) {
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
                    <Text style={styles.title}>📈 Akıllı Sınıflandır</Text>
                    <View style={styles.roundBadge}>
                        <Text style={styles.roundText}>{round}/{TOTAL_ROUNDS}</Text>
                    </View>
                </View>

                <Text style={styles.question}>Bu hangi gruba ait?</Text>

                {/* Nesne */}
                <Animated.View style={[styles.itemCard, { transform: [{ scale: bump }, { translateX: shake }] }]}>
                    <Text style={styles.itemEmoji}>{current.emoji}</Text>
                </Animated.View>

                {/* Kategoriler */}
                <View style={styles.catsRow}>
                    {current.cats.map((cat) => {
                        const isSel = selected === cat.key;
                        const showCorrect = feedback !== 'idle' && cat.key === current.answer && (isSel || feedback === 'correct');
                        const showWrong = feedback === 'wrong' && isSel && cat.key !== current.answer;
                        return (
                            <TouchableOpacity
                                key={cat.key}
                                style={[styles.catBtn, showCorrect && styles.catCorrect, showWrong && styles.catWrong]}
                                onPress={() => handlePick(cat.key)}
                                activeOpacity={0.85}
                                disabled={feedback === 'correct'}
                            >
                                <Text style={[styles.catText, (showCorrect || showWrong) && { color: '#fff' }]}>{cat.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={styles.hint}>
                    {feedback === 'correct' ? 'Harika! 🎉' : feedback === 'wrong' ? 'Tekrar düşün 👀' : 'Doğru sepeti seç'}
                </Text>

                <View style={styles.progressDots}>
                    {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                        <View key={i} style={[styles.pDot, i < round - 1 && styles.pDotDone, i === round - 1 && styles.pDotCurrent]} />
                    ))}
                </View>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    message="Nesneyi doğru gruba ayır! Sen başardıkça gruplar zorlaşır 📈"
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

    question: { fontSize: 20, fontWeight: '800', color: '#37474F', marginTop: 6, marginBottom: 16, textAlign: 'center' },

    itemCard: {
        width: 150, height: 150, borderRadius: 28, backgroundColor: '#FFFDF5', borderWidth: 4, borderColor: '#81C784',
        alignItems: 'center', justifyContent: 'center', elevation: 5,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5,
    },
    itemEmoji: { fontSize: 90 },

    catsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, marginTop: 28 },
    catBtn: {
        minWidth: 140, paddingVertical: 18, paddingHorizontal: 16, borderRadius: 18, backgroundColor: '#E8F5E9',
        borderWidth: 3, borderColor: '#66BB6A', alignItems: 'center', justifyContent: 'center', elevation: 4,
    },
    catCorrect: { backgroundColor: '#4CAF50', borderColor: '#2E7D32' },
    catWrong: { backgroundColor: '#EF5350', borderColor: '#C62828' },
    catText: { fontSize: 18, fontWeight: '800', color: '#2E7D32' },

    hint: { fontSize: 15, color: '#5D4037', marginTop: 18, fontWeight: '600', minHeight: 22, textAlign: 'center' },

    progressDots: { flexDirection: 'row', gap: 6, marginTop: 14 },
    pDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#E0E0E0' },
    pDotDone: { backgroundColor: '#66BB6A' },
    pDotCurrent: { backgroundColor: '#FF9800', transform: [{ scale: 1.3 }] },
});
