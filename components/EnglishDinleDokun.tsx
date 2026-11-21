import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import ListenButton from './ListenButton';
import ScrollIfNeeded from './ScrollIfNeeded';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';
import {
    DINLE_DOKUN_ADAPTIF,
    GIRIS_MESAJI,
    KAZANIM_ODAGI,
    TOPLAM_TUR,
    alkisSec,
    hedefSureMs,
    turKur,
    type DinleDokunTuru,
} from '../lib/enDinleDokun';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';

// ============================================
// 👂 DİNLE VE DOKUN — İngilizce ek etkinlik (Maarif DIŞI; kod/kazanım iddiası yok)
// Ses bir İngilizce sözcük söyler; çocuk 2-4 resimden doğrusuna dokunur. Hedef resim ÖNCEDEN gösterilmez (yalnız ses).
// Yazılı sözcük/Türkçe karşılık/puan/hata sayısı çocuğa gösterilmez; yanlışta cezasız: sarsılma + sözcük yeniden söylenir.
// Zorluk uyarlanır: seçenek sayısı 2→3→4, tema karışımı artar (lib/enDinleDokun.ts).
// ============================================

const USE_NATIVE = Platform.OS !== 'web';
const GAP = 14;
const MAX_OPTIONS = 4;
const RESPEAK_MIN_GAP_MS = 700;

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

export default function EnglishDinleDokun({ onGameEnd, onExit, childName }: Props) {
    const { width, height } = useWindowDimensions();
    const { recordLevel } = useAdaptiveDifficulty(DINLE_DOKUN_ADAPTIF);

    const [gameReady, setGameReady] = useState(false);
    const [round, setRound] = useState(1);
    const [tur, setTur] = useState<DinleDokunTuru>(() => turKur({ zorluk: DINLE_DOKUN_ADAPTIF.startDifficulty ?? 1 }));
    const [wrongIdx, setWrongIdx] = useState<number | null>(null);
    const [solvedIdx, setSolvedIdx] = useState<number | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [reduceMotion, setReduceMotion] = useState(false);

    const startTimeRef = useRef(Date.now());
    const levelStartRef = useRef(Date.now());
    const levelErrorsRef = useRef(0);
    const movesRef = useRef(0);
    const errorsRef = useRef(0);
    const correctRef = useRef(0);
    const finishedRef = useRef(false);
    const isMountedRef = useRef(true);
    const lockRef = useRef(false);
    const spokenRoundRef = useRef(0);
    const lastRespeakRef = useRef(0);
    const usedEnRef = useRef<Set<string>>(new Set());
    const playedDiffRef = useRef(DINLE_DOKUN_ADAPTIF.startDifficulty ?? 1);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const shake = useRef(Array.from({ length: MAX_OPTIONS }, () => new Animated.Value(0))).current;
    const pop = useRef(Array.from({ length: MAX_OPTIONS }, () => new Animated.Value(1))).current;

    const later = (fn: () => void, ms: number) => {
        timersRef.current.push(setTimeout(() => { if (isMountedRef.current) fn(); }, ms));
    };

    useEffect(() => () => {
        isMountedRef.current = false;
        timersRef.current.forEach(clearTimeout);
        if (!finishedRef.current) stopSpeech();
    }, []);

    // Hareketi azalt ayarı: sarsılma/zıplama/konfeti yok (yalnız renk ve ses geri bildirimi).
    useEffect(() => {
        let active = true;
        AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (active) setReduceMotion(v); }).catch(() => { });
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
        return () => { active = false; sub?.remove?.(); };
    }, []);

    // Her turun başında sözcük BİR KEZ söylenir (tekrar için hoparlör düğmesi).
    useEffect(() => {
        if (!gameReady || spokenRoundRef.current === round) return;
        spokenRoundRef.current = round;
        levelStartRef.current = Date.now();
        usedEnRef.current.add(tur.hedef.en);
        later(() => { speak(tur.hedef.en, { lang: 'en' }); }, 350);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [round, gameReady, tur]);

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const sure = Math.round((Date.now() - startTimeRef.current) / 1000);
        onGameEnd('en-dinle-dokun', sure, movesRef.current, errorsRef.current, undefined, {
            zorlukSeviyesi: playedDiffRef.current,
            kazanimOdagi: KAZANIM_ODAGI,
            correct_answers: correctRef.current,
        });
    };

    const hedefiTekrarla = () => { speak(tur.hedef.en, { lang: 'en' }); };

    const handlePick = (i: number) => {
        if (lockRef.current || finishedRef.current) return;
        movesRef.current += 1;

        if (i === tur.hedefIndeks) {
            lockRef.current = true;
            setSolvedIdx(i);
            setWrongIdx(null);
            const timeMs = Date.now() - levelStartRef.current;
            // Seviye sonucu motora hemen bildirilir (süre doğru dokunuşun ANINDAN ölçülür; kutlama bekleyişi eklenmez).
            const sonrakiZorluk = recordLevel({
                correct: 1,
                total: 1,
                errors: levelErrorsRef.current,
                timeMs,
                targetMs: hedefSureMs(tur.secenekler.length),
            });
            const alkis = alkisSec(correctRef.current);
            correctRef.current += 1;
            if (!reduceMotion) {
                setShowConfetti(true);
                Animated.sequence([
                    Animated.timing(pop[i], { toValue: 1.12, duration: 140, useNativeDriver: USE_NATIVE }),
                    Animated.timing(pop[i], { toValue: 1, duration: 140, useNativeDriver: USE_NATIVE }),
                ]).start();
            }
            const bitis = round >= TOPLAM_TUR;
            const simdikiHedefEn = tur.hedef.en;
            speakThenWait(alkis, 1500, { lang: 'en' }).then(() => {
                if (!isMountedRef.current) return;
                setShowConfetti(false);
                if (bitis) {
                    finish();
                    return;
                }
                const yeni = turKur({ zorluk: sonrakiZorluk, oncekiHedefEn: simdikiHedefEn, kullanilanEn: usedEnRef.current });
                playedDiffRef.current = sonrakiZorluk;
                levelErrorsRef.current = 0;
                setTur(yeni);
                setSolvedIdx(null);
                setWrongIdx(null);
                lockRef.current = false;
                setRound((r) => r + 1);
            });
        } else {
            errorsRef.current += 1;
            levelErrorsRef.current += 1;
            setWrongIdx(i);
            if (!reduceMotion) {
                Animated.sequence([
                    Animated.timing(shake[i], { toValue: 7, duration: 55, useNativeDriver: USE_NATIVE }),
                    Animated.timing(shake[i], { toValue: -7, duration: 55, useNativeDriver: USE_NATIVE }),
                    Animated.timing(shake[i], { toValue: 0, duration: 55, useNativeDriver: USE_NATIVE }),
                ]).start();
            }
            later(() => setWrongIdx((w) => (w === i ? null : w)), 450);
            // Cezasız: hedef sözcük yeniden söylenir (art arda dokunuşta üst üste binmesin diye aralıklı).
            const now = Date.now();
            if (now - lastRespeakRef.current >= RESPEAK_MIN_GAP_MS) {
                lastRespeakRef.current = now;
                later(hedefiTekrarla, 450);
            }
        }
    };

    // Kart boyutu: ekran genişliği ve yüksekliğinden (360x640'ta da taşmaz; dokunma hedefi >= 72 dp).
    const n = tur.secenekler.length;
    const cols = n === 3 ? 3 : 2;
    const rows = Math.ceil(n / cols);
    const availW = Math.max(200, width - 32);
    const availH = Math.max(160, height - 250);
    const sizeW = Math.floor((availW - GAP * (cols - 1)) / cols);
    const sizeH = Math.floor((availH - GAP * (rows - 1)) / rows);
    const size = Math.max(72, Math.min(sizeW, sizeH, 160));

    return (
        <View style={styles.container}>
            {showConfetti && <ConfettiCannon count={110} origin={{ x: width / 2, y: 0 }} fadeOut />}
            {!gameReady && (
                <CountdownOverlay
                    message={GIRIS_MESAJI}
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => { startTimeRef.current = Date.now(); levelStartRef.current = Date.now(); setGameReady(true); }}
                />
            )}

            <View style={styles.header}>
                <GameExitButton onPress={onExit ?? (() => { })} />
                <View style={styles.progress}>
                    {Array.from({ length: TOPLAM_TUR }, (_, k) => (
                        <View key={k} style={[styles.pDot, k < round - 1 && styles.pDotDone, k === round - 1 && styles.pDotCurrent]} />
                    ))}
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollIfNeeded contentStyle={styles.body}>
                <ListenButton
                    onPress={hedefiTekrarla}
                    color="#1E88E5"
                    style={styles.listen}
                />
                <View style={[styles.grid, { maxWidth: availW }]}>
                    {tur.secenekler.map((k, i) => {
                        const isWrong = wrongIdx === i;
                        const isSolved = solvedIdx === i;
                        const dim = solvedIdx !== null && !isSolved;
                        return (
                            <Animated.View
                                key={`${round}-${k.id}`}
                                style={{ transform: [{ translateX: shake[i] }, { scale: pop[i] }], opacity: dim ? 0.45 : 1 }}
                            >
                                <TouchableOpacity
                                    style={[
                                        styles.card,
                                        { width: size, height: size, borderRadius: Math.round(size * 0.2) },
                                        isWrong && styles.cardWrong,
                                        isSolved && styles.cardSolved,
                                    ]}
                                    onPress={() => handlePick(i)}
                                    activeOpacity={0.85}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Seçenek ${i + 1}`}
                                >
                                    {k.hex ? (
                                        <View style={{ width: Math.round(size * 0.62), height: Math.round(size * 0.62), borderRadius: Math.round(size * 0.31), backgroundColor: k.hex, borderWidth: 3, borderColor: 'rgba(0,0,0,0.14)' }} />
                                    ) : (
                                        <Text allowFontScaling={false} style={{ fontSize: Math.round(size * 0.55), lineHeight: Math.round(size * 0.7), textAlign: 'center' }}>{k.emoji}</Text>
                                    )}
                                </TouchableOpacity>
                            </Animated.View>
                        );
                    })}
                </View>
            </ScrollIfNeeded>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EEF5FF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8, zIndex: 20 },
    progress: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    pDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#CFD8DC' },
    pDotDone: { backgroundColor: '#66BB6A' },
    pDotCurrent: { backgroundColor: '#FF9800', transform: [{ scale: 1.3 }] },
    body: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 22 },
    listen: { minHeight: 64, paddingHorizontal: 28, justifyContent: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: GAP },
    card: {
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
        borderWidth: 4, borderColor: '#BBDEFB',
        shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4,
    },
    cardWrong: { backgroundColor: '#FFE0E0', borderColor: '#FFB4B4' },
    cardSolved: { backgroundColor: '#E8F5E9', borderColor: '#66BB6A' },
});
