import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';
import { speak, stopSpeech } from '../services/speechService';
import ListenButton from './ListenButton';
import { buildRound, SETS, type Round } from '../constants/akilliSiniflandir';

// Akıllı Sınıflandır — UYARLANIR (adaptif) zorluk. Maarif: FAB.2
// (Nesneleri benzerlik ve farklılıklarına göre sınıflandırabilme).
// Nesneyi doğru sepete ayır. Zorlukla gruplar incelir: hayvan/yiyecek →
// meyve/sebze → karada/denizde → canlı/cansız (soyut).
// Çocuk okuma bilmediği için sepetlerde YAZI yok: büyük renkli kart + örnek emojiler; grup adı
// sete özel SESLİ soruyla söylenir (içerik ve sorular constants/akilliSiniflandir.ts'te — #58).

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

const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const INSTRUCTION_TEXT = 'Nesneyi doğru gruba ayır!';
const TOTAL_ROUNDS = 9;
const TARGET_MS = 7000;

// Sepet kartı kenarı: geniş ekranda 150; dar telefonda iki kart yan yana sığacak kadar.
const CARD = Math.min(150, Math.floor((Dimensions.get('window').width - 32 - 14) / 2));
const emblemSize = (n: number) => (n <= 1 ? 76 : n === 2 ? 56 : 40);

export default function AkilliSiniflandir({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
    // En kolay grupla (hayvan/yiyecek) başla; eskiden en kavramsal grupla (meyve/sebze) başlıyordu.
    const START_DIFF = 1;
    const { recordLevel } = useAdaptiveDifficulty({
        minDifficulty: 1, maxDifficulty: 5, checkpointEvery: 3, startDifficulty: START_DIFF,
    });

    const [round, setRound] = useState(1);
    const [current, setCurrent] = useState<Round>(() => buildRound(START_DIFF));
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

    React.useEffect(() => () => { timersRef.current.forEach(clearTimeout); stopSpeech(); }, []);
    const startTimer = (t: ReturnType<typeof setTimeout>) => { timersRef.current.push(t); return t; };

    // Sete özel sesli soru: oyun başlayınca ve grup seti değişince (zorluk arttıkça yeni grup adı
    // hiç söylenmiyordu). Tekrar Dinle de aynı soruyu okur.
    const prompt = SETS[current.setIndex].prompt;
    useEffect(() => {
        if (!gameReady) return;
        speak(prompt, { instructions: HAPPY_VOICE });
    }, [gameReady, prompt]);

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
        setCurrent((prev) => buildRound(nextDiff, prev.emoji)); // aynı nesne art arda gelmesin
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
            speak('Harika!');
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
            startTimer(setTimeout(() => { if (!lockRef.current) { setFeedback('idle'); setSelected(null); } }, 550));
        }
    };

    return (
        <DynamicBackground onExit={onExit}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>📈 Akıllı Sınıflandır</Text>
                    <View style={styles.roundBadge}>
                        <Text style={styles.roundText}>{round}/{TOTAL_ROUNDS}</Text>
                    </View>
                </View>

                <ListenButton onPress={() => speak(prompt, { instructions: HAPPY_VOICE })} color="#66BB6A" style={{ marginBottom: 16 }} />

                {/* Nesne */}
                <Animated.View style={[styles.itemCard, { transform: [{ scale: bump }, { translateX: shake }] }]}>
                    <Text style={styles.itemEmoji}>{current.emoji}</Text>
                </Animated.View>

                {/* Sepetler: yazısız, büyük renkli kartlar + örnek emojiler */}
                <View style={styles.catsRow}>
                    {current.cats.map((cat) => {
                        const isSel = selected === cat.key;
                        const showCorrect = feedback !== 'idle' && cat.key === current.answer && (isSel || feedback === 'correct');
                        const showWrong = feedback === 'wrong' && isSel && cat.key !== current.answer;
                        return (
                            <TouchableOpacity
                                key={cat.key}
                                style={[
                                    styles.catCard,
                                    { width: CARD, height: CARD, backgroundColor: cat.bg, borderColor: cat.border },
                                    showCorrect && styles.catCorrect,
                                    showWrong && styles.catWrong,
                                ]}
                                onPress={() => handlePick(cat.key)}
                                activeOpacity={0.85}
                                disabled={feedback === 'correct'}
                                accessibilityRole="button"
                                accessibilityLabel={cat.a11y}
                            >
                                <View style={styles.emblemRow}>
                                    {cat.emblem.map((e, i) => (
                                        <Text key={i} style={{ fontSize: emblemSize(cat.emblem.length) }}>{e}</Text>
                                    ))}
                                </View>
                                {showCorrect && <View style={styles.checkBadge}><Text style={styles.checkText}>✓</Text></View>}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Yazı yok: yalnız emoji geri bildirimi (satır boşken de yer tutar) */}
                <Text style={styles.hint}>{feedback === 'correct' ? '🎉' : feedback === 'wrong' ? '🤔' : ''}</Text>

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
    header: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 19, fontWeight: 'bold', color: '#3e2723' },
    roundBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    roundText: { fontSize: 14, fontWeight: 'bold', color: '#1976D2' },

    itemCard: {
        width: 150, height: 150, borderRadius: 28, backgroundColor: '#FFFDF5', borderWidth: 4, borderColor: '#81C784',
        alignItems: 'center', justifyContent: 'center', elevation: 5,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5,
    },
    itemEmoji: { fontSize: 90 },

    catsRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 24 },
    catCard: {
        borderRadius: 28, borderWidth: 5, alignItems: 'center', justifyContent: 'center', padding: 8,
        elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 5,
    },
    catCorrect: { borderColor: '#2E7D32', borderWidth: 7 },
    catWrong: { borderColor: '#C62828', borderWidth: 7, opacity: 0.85 },
    emblemRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 4 },
    checkBadge: {
        position: 'absolute', top: 8, right: 8, width: 34, height: 34, borderRadius: 17, backgroundColor: '#4CAF50',
        alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
    },
    checkText: { color: '#fff', fontSize: 20, fontWeight: '900' },

    hint: { fontSize: 28, marginTop: 14, minHeight: 36, textAlign: 'center' },

    progressDots: { flexDirection: 'row', gap: 6, marginTop: 10 },
    pDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#E0E0E0' },
    pDotDone: { backgroundColor: '#66BB6A' },
    pDotCurrent: { backgroundColor: '#FF9800', transform: [{ scale: 1.3 }] },
});
