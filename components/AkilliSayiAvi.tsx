import React, { useCallback, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import { RESPONSIVE_ADAPTIVE, useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';
import { buildCountRound } from '../lib/akilliRounds';
import { speak } from '../services/speechService';
import AdaptiveLevelBadge from './AdaptiveLevelBadge';
import ListenButton from './ListenButton';

// Akıllı Sayı Avı — UYARLANIR (adaptif) zorluk gösterim oyunu.
// Maarif: MAB.1 (Ritmik ve algısal sayabilme; sayı-nicelik ilişkisi).
// Her seviye sonunda performans (doğru/hata/süre) motora bildirilir; her 2
// seviyede bir sayı aralığı, seçenek sayısı ve çeldirici yakınlığı çocuğa göre ayarlanır
// (tur üretimi: lib/akilliRounds.ts; seviye rozeti: AdaptiveLevelBadge).

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

const TOTAL_ROUNDS = 10;        // her 2 turda bir uyarlama (RESPONSIVE_ADAPTIVE)
const OBJECT = '🍎';
// "Hızlı" eşiği (hız değerlendirmesi için): nesne sayısıyla artar (3 → 5,6 sn, 9 → 9,8 sn)
const targetMsFor = (count: number) => 3500 + count * 700;

const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const INSTRUCTION_TEXT = 'Nesneleri say ve doğru sayıya dokun! Sen başardıkça oyun akıllanır 📈';

export default function AkilliSayiAvi({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
    const START_DIFF = RESPONSIVE_ADAPTIVE.startDifficulty ?? 2;
    const { recordLevel } = useAdaptiveDifficulty(RESPONSIVE_ADAPTIVE);

    const [round, setRound] = useState(1);
    const [current, setCurrent] = useState(() => buildCountRound(START_DIFF));
    const [displayDiff, setDisplayDiff] = useState(START_DIFF);
    const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const [selected, setSelected] = useState<number | null>(null);
    const [gameReady, setGameReady] = useState(false);

    const startTimeRef = useRef(Date.now());
    const levelStartRef = useRef(Date.now());
    const levelErrorsRef = useRef(0);
    const totalMovesRef = useRef(0);
    const totalErrorsRef = useRef(0);
    const lockRef = useRef(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const bump = useRef(new Animated.Value(1)).current;
    const shake = useRef(new Animated.Value(0)).current;

    React.useEffect(() => () => { timersRef.current.forEach(clearTimeout); }, []);

    const startTimer = (t: ReturnType<typeof setTimeout>) => { timersRef.current.push(t); return t; };

    const nextRound = useCallback((solvedInDiff: number, timeMs: number, solvedCount: number) => {
        // Seviye sonucu motora bildirilir; sıradaki zorluk döner (süre, doğru cevabın verildiği
        // andan ölçülür: 850 ms'lik kutlama bekleyişi çocuğun süresine eklenmez)
        const errs = levelErrorsRef.current;
        const nextDiff = recordLevel({ correct: 1, total: 1, errors: errs, timeMs, targetMs: targetMsFor(solvedCount) });

        if (round >= TOTAL_ROUNDS) {
            const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
            onGameEnd('akilli-sayi-avi', duration, totalMovesRef.current, totalErrorsRef.current, undefined, {
                zorlukSeviyesi: solvedInDiff,
                kazanimOdagi: 'MAB.1 Sayı-Nicelik İlişkisi (uyarlanır zorluk)',
            });
            return;
        }
        levelErrorsRef.current = 0;
        levelStartRef.current = Date.now();
        setRound(r => r + 1);
        setCurrent(buildCountRound(nextDiff, solvedCount));
        setDisplayDiff(nextDiff);
        setSelected(null);
        setFeedback('idle');
        lockRef.current = false;
    }, [round, recordLevel, onGameEnd]);

    const handlePick = (n: number) => {
        if (lockRef.current || feedback === 'correct') return;
        totalMovesRef.current += 1;
        setSelected(n);

        if (n === current.count) {
            lockRef.current = true;
            setFeedback('correct');
            speak('Harika!');
            Animated.sequence([
                Animated.timing(bump, { toValue: 1.15, duration: 140, useNativeDriver: true }),
                Animated.timing(bump, { toValue: 1, duration: 140, useNativeDriver: true }),
            ]).start();
            const solvedInDiff = displayDiff;
            const timeMs = Date.now() - levelStartRef.current;
            const solvedCount = current.count;
            startTimer(setTimeout(() => nextRound(solvedInDiff, timeMs, solvedCount), 850));
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
        <DynamicBackground onExit={onExit}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>📈 Akıllı Sayı Avı</Text>
                    <View style={styles.headerRight}>
                        <AdaptiveLevelBadge level={displayDiff} />
                        <View style={styles.roundBadge}>
                            <Text style={styles.roundText}>{round}/{TOTAL_ROUNDS}</Text>
                        </View>
                    </View>
                </View>

                {/* Soru */}
                <Text style={styles.question}>Kaç tane {OBJECT} var?</Text>

                <ListenButton onPress={() => speak(INSTRUCTION_TEXT, { instructions: HAPPY_VOICE })} color="#1976D2" style={{ marginBottom: 12 }} />

                {/* Nesneler */}
                <Animated.View style={[styles.objectsCard, { transform: [{ scale: bump }, { translateX: shake }] }]}>
                    <View style={styles.objectsWrap}>
                        {Array.from({ length: current.count }, (_, i) => (
                            <Text key={i} style={styles.object}>{OBJECT}</Text>
                        ))}
                    </View>
                </Animated.View>

                {/* Sayı seçenekleri */}
                <View style={styles.optionsRow}>
                    {current.options.map((n) => {
                        const isSel = selected === n;
                        const showCorrect = feedback !== 'idle' && n === current.count && (isSel || feedback === 'correct');
                        const showWrong = feedback === 'wrong' && isSel && n !== current.count;
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
                    {feedback === 'correct' ? 'Harika! 🎉' : feedback === 'wrong' ? 'Tekrar say ve dene 👀' : 'Doğru sayıya dokun'}
                </Text>

                {/* İlerleme noktaları */}
                <View style={styles.progressDots}>
                    {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                        <View key={i} style={[styles.pDot, i < round - 1 && styles.pDotDone, i === round - 1 && styles.pDotCurrent]} />
                    ))}
                </View>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    message={INSTRUCTION_TEXT}
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => { levelStartRef.current = Date.now(); startTimeRef.current = Date.now(); setGameReady(true); }}
                />
            )}
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, zIndex: 20 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#3e2723' },
    roundBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    roundText: { fontSize: 14, fontWeight: 'bold', color: '#1976D2' },

    question: { fontSize: 20, fontWeight: '800', color: '#37474F', marginBottom: 12, marginTop: 6, textAlign: 'center' },

    objectsCard: {
        backgroundColor: '#FFFDF5', borderRadius: 24, borderWidth: 3, borderColor: '#FFE0B2',
        padding: 16, minHeight: 150, width: '100%', maxWidth: 460, justifyContent: 'center',
        elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 4,
    },
    objectsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 6 },
    object: { fontSize: 40, margin: 3 },

    optionsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 20 },
    optionBtn: {
        width: 64, height: 64, borderRadius: 20, backgroundColor: '#E3F2FD', borderWidth: 3, borderColor: '#2196F3',
        alignItems: 'center', justifyContent: 'center', elevation: 4,
    },
    optionCorrect: { backgroundColor: '#4CAF50', borderColor: '#2E7D32' },
    optionWrong: { backgroundColor: '#EF5350', borderColor: '#C62828' },
    optionText: { fontSize: 28, fontWeight: '900', color: '#0D47A1' },

    hint: { fontSize: 15, color: '#5D4037', marginTop: 16, fontWeight: '600', minHeight: 22 },

    progressDots: { flexDirection: 'row', gap: 6, marginTop: 14 },
    pDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#E0E0E0' },
    pDotDone: { backgroundColor: '#66BB6A' },
    pDotCurrent: { backgroundColor: '#FF9800', transform: [{ scale: 1.3 }] },
});
