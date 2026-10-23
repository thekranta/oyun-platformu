
import React, { useCallback, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import { RESPONSIVE_ADAPTIVE, useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';
import { buildCompareRound, type CompareRound } from '../lib/akilliRounds';
import { speak } from '../services/speechService';
import AdaptiveLevelBadge from './AdaptiveLevelBadge';
import ListenButton from './ListenButton';

const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

const speakQuestion = (more: boolean) => speak(more ? 'Hangisinde daha ÇOK var?' : 'Hangisinde daha AZ var?');

// Akıllı Miktar — UYARLANIR (adaptif) zorluk. Maarif: MAB.1
// (Ritmik ve algısal sayabilme; nicelik karşılaştırma).
// Zorluk arttıkça sayılar büyür ve iki taraf birbirine YAKLAŞIR (ayırt etmesi zorlaşır).
// Her 2 turda bir uyarlanır; tur üretimi lib/akilliRounds.ts, seviye rozeti AdaptiveLevelBadge.

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
const TARGET_MS = 6000;
const OBJECT = '🍎';

type Round = CompareRound;

export default function AkilliMiktar({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
    const START_DIFF = RESPONSIVE_ADAPTIVE.startDifficulty ?? 2;
    const { recordLevel } = useAdaptiveDifficulty(RESPONSIVE_ADAPTIVE);

    const [round, setRound] = useState(1);
    const [current, setCurrent] = useState(() => buildCompareRound(START_DIFF));
    const [displayDiff, setDisplayDiff] = useState(START_DIFF);
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

    const nextRound = useCallback((solvedInDiff: number, timeMs: number, solved: Round) => {
        // Süre, doğru cevabın verildiği andan ölçülür (850 ms'lik kutlama bekleyişi eklenmez).
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
        setDisplayDiff(nextDiff);
        setRound(r => r + 1);
        const next = buildCompareRound(nextDiff, solved);
        setCurrent(next);
        speakQuestion(next.more);
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
            speak('Harika!');
            const solvedInDiff = diffRef.current;
            const timeMs = Date.now() - levelStartRef.current;
            const solved = current;
            startTimer(setTimeout(() => nextRound(solvedInDiff, timeMs, solved), 850));
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
        <DynamicBackground onExit={onExit}>
            <Animated.View style={[styles.container, { transform: [{ translateX: shake }] }]}>
                <View style={styles.header}>
                    <Text style={styles.title}>📈 Akıllı Miktar</Text>
                    <View style={styles.headerRight}>
                        <AdaptiveLevelBadge level={displayDiff} />
                        <View style={styles.roundBadge}>
                            <Text style={styles.roundText}>{round}/{TOTAL_ROUNDS}</Text>
                        </View>
                    </View>
                </View>

                <Text style={[styles.question, { color: qColor }]}>{qText}</Text>

                <ListenButton onPress={() => speak(qText, { instructions: HAPPY_VOICE })} color="#1976D2" style={{ marginTop: 12 }} />

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
                    message="Hangi tarafta daha çok (veya az) var? Say ve dokun!"
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => { levelStartRef.current = Date.now(); startTimeRef.current = Date.now(); setGameReady(true); speakQuestion(current.more); }}
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
