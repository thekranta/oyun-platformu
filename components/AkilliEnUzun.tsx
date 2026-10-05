
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import ListenButton from './ListenButton';

// ============================================
// 📈 AKILLI EN UZUN - Uzunluk karşılaştırma, UYARLANIR (adaptif) zorluk.
// Baz oyun: EnUzun.tsx (routeKey 'en-uzun', Matematik/MAB.3-4). Aynı görev —
// çubuklar arasından EN UZUN olanı bul — ama zorluk performansa göre ayarlanır:
// hem çubuk SAYISI (3 → 5) hem de en uzun ile bir sonraki en uzun arasındaki
// fark (gap, px) daralır. Kolay = az çubuk + belirgin fark; zor = çok çubuk +
// göze çok yakın uzunluklar (ayırt etmesi güç).
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');
const USE_NATIVE = Platform.OS !== 'web';
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const TOTAL_ROUNDS = 9;        // 3 checkpoint (her 3 seviyede uyarlama)
const TARGET_MS = 6000;        // "hızlı" eşiği (hız değerlendirmesi için)
const COLORS = ['#FF6B6B', '#4FACFE', '#66BB6A', '#FFA726', '#AB47BC'];
const ENDS = ['🐛', '🚂', '🐍', '✏️', '🖍️'];
const INSTRUCTION_TEXT = 'Çubuklardan en uzun olanına dokun! Sen başardıkça zorlaşır 📈';

// Zorluğa göre: çubuk sayısı + en uzun çubuk ile komşusu arasındaki fark (gap, px).
// Yüksek zorlukta hem çubuk sayısı artar hem de uzunluklar birbirine yaklaşır.
const DIFF_CFG: Record<number, { count: number; minW: number; gap: number }> = {
    1: { count: 3, minW: 110, gap: 62 },
    2: { count: 3, minW: 100, gap: 46 },
    3: { count: 4, minW: 90, gap: 34 },
    4: { count: 4, minW: 90, gap: 24 },
    5: { count: 5, minW: 84, gap: 16 },
};

const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
};

interface Bar { id: number; w: number; color: string }
interface Round { bars: Bar[]; maxId: number; end: string }

function buildRound(diff: number): Round {
    const cfg = DIFF_CFG[diff] || DIFF_CFG[2];
    const chosen = Array.from({ length: cfg.count }, (_, i) => cfg.minW + i * cfg.gap);
    const cols = shuffle(COLORS).slice(0, cfg.count);
    const items: Bar[] = chosen.map((w, i) => ({ id: i, w, color: cols[i] }));
    const maxW = Math.max(...chosen);
    const maxId = items.find((b) => b.w === maxW)!.id;
    const bars = shuffle(items);
    const end = ENDS[Math.floor(Math.random() * ENDS.length)];
    return { bars, maxId, end };
}

interface Props {
    onGameEnd: (
        oyunAdi: string,
        sure: number,
        finalHamle: number,
        finalHata: number,
        algilananKelime?: string,
        extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string; correct_answers?: number },
    ) => void;
    onExit?: () => void;
    childName?: string;
}

export default function AkilliEnUzun({ onGameEnd, onExit, childName }: Props) {
    const START_DIFF = 2;
    const { recordLevel } = useAdaptiveDifficulty({
        minDifficulty: 1, maxDifficulty: 5, checkpointEvery: 3, startDifficulty: START_DIFF,
    });

    const [gameReady, setGameReady] = useState(false);
    const [round, setRound] = useState(1);
    const [current, setCurrent] = useState<Round>(() => buildRound(START_DIFF));
    const [locked, setLocked] = useState(false);
    const [wrongId, setWrongId] = useState<number | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);

    const startTimeRef = useRef(Date.now());
    const levelStartRef = useRef(Date.now());
    const levelErrorsRef = useRef(0);
    const totalMovesRef = useRef(0);
    const totalErrorsRef = useRef(0);
    const correctRef = useRef(0);
    const diffRef = useRef(START_DIFF);
    const finishedRef = useRef(false);
    const isMountedRef = useRef(true);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const shake = useRef(new Animated.Value(0)).current;

    useEffect(() => () => { isMountedRef.current = false; timersRef.current.forEach(clearTimeout); stopSpeech(); }, []);

    const startTimer = (t: ReturnType<typeof setTimeout>) => { timersRef.current.push(t); return t; };

    const nextRound = useCallback((solvedInDiff: number) => {
        const timeMs = Date.now() - levelStartRef.current;
        const errs = levelErrorsRef.current;
        const nextDiff = recordLevel({ correct: 1, total: 1, errors: errs, timeMs, targetMs: TARGET_MS });

        if (round >= TOTAL_ROUNDS) {
            if (finishedRef.current) return;
            finishedRef.current = true;
            const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
            onGameEnd('akilli-en-uzun', duration, totalMovesRef.current, totalErrorsRef.current, undefined, {
                zorlukSeviyesi: solvedInDiff,
                kazanimOdagi: 'Matematik: Uzunluğa Göre Karşılaştırma (en uzun) (MAB.3) (uyarlanır zorluk)',
                correct_answers: correctRef.current,
            });
            return;
        }
        levelErrorsRef.current = 0;
        levelStartRef.current = Date.now();
        diffRef.current = nextDiff;
        setRound((r) => r + 1);
        setCurrent(buildRound(nextDiff));
        setLocked(false);
        setWrongId(null);
    }, [round, recordLevel, onGameEnd]);

    const handleTap = (bar: Bar) => {
        if (locked) return;
        totalMovesRef.current += 1;
        if (bar.id === current.maxId) {
            setLocked(true);
            correctRef.current += 1;
            setShowConfetti(true);
            const solvedInDiff = diffRef.current;
            speakThenWait('Evet! En uzun bu. Aferin.', 1300, { instructions: HAPPY_VOICE }).then(() => {
                if (!isMountedRef.current) return;
                setShowConfetti(false);
                nextRound(solvedInDiff);
            });
        } else {
            levelErrorsRef.current += 1;
            totalErrorsRef.current += 1;
            setWrongId(bar.id);
            Animated.sequence([
                Animated.timing(shake, { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
                Animated.timing(shake, { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
                Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
            ]).start();
            startTimer(setTimeout(() => setWrongId(null), 450));
        }
    };

    return (
        <View style={styles.container}>
            {showConfetti && <ConfettiCannon count={110} origin={{ x: SCREEN_W / 2, y: 0 }} fadeOut />}
            {!gameReady && (
                <CountdownOverlay
                    message={INSTRUCTION_TEXT}
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => {
                        levelStartRef.current = Date.now();
                        startTimeRef.current = Date.now();
                        setGameReady(true);
                    }}
                />
            )}

            <View style={styles.header}>
                <GameExitButton onPress={onExit ?? (() => {})} />
                <Text style={styles.title}>📈 Akıllı En Uzun</Text>
                <View style={styles.roundBadge}><Text style={styles.roundText}>{round}/{TOTAL_ROUNDS}</Text></View>
            </View>

            <Text style={styles.prompt}>En uzun hangisi?</Text>

            <ListenButton onPress={() => speak(INSTRUCTION_TEXT, { instructions: HAPPY_VOICE })} color="#F97316" style={{ marginTop: 12 }} />

            <View style={styles.bars}>
                {current.bars.map((bar) => {
                    const isWrong = wrongId === bar.id;
                    return (
                        <Animated.View key={bar.id} style={[styles.barRow, isWrong ? { transform: [{ translateX: shake }] } : undefined]}>
                            <TouchableOpacity style={styles.barTouch} onPress={() => handleTap(bar)} activeOpacity={0.85}>
                                <View style={[styles.bar, { width: bar.w, backgroundColor: bar.color }]}>
                                    <Text style={styles.barEnd}>{current.end}</Text>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF6EF', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
    title: { fontSize: 16, fontWeight: '900', color: '#3e2723', flex: 1, textAlign: 'center' },
    roundBadge: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
    roundText: { fontSize: 15, fontWeight: '900', color: '#C2410C' },

    prompt: { fontSize: 22, fontWeight: '900', color: '#C2410C', marginTop: 10 },

    bars: { marginTop: 26, gap: 18, alignItems: 'flex-start', width: 280 },
    barRow: { justifyContent: 'flex-start' },
    barTouch: { justifyContent: 'center' },
    bar: { height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'flex-end', paddingRight: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 4 },
    barEnd: { fontSize: 26 },
});
