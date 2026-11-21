import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import ListenButton from './ListenButton';
import ScrollIfNeeded from './ScrollIfNeeded';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import { ogretmenDerKi } from '../constants/ingilizceKelimeler';
import { GIRIS_MESAJI, TOTAL_ROUNDS, TR_YONERGELER, buildResult, buildSequence, pickApplause, unlockDelayMs } from '../lib/enOgretmenDerKi';

// ============================================
// 🧑‍🏫 ÖĞRETMEN DER Kİ (İngilizce ek etkinlik, hareket) — Maarif DIŞI
// Öğretmen bir eylemi söyler ("Teacher says, clap!"), karakter canlandırır, çocuk karakterle BİRLİKTE gerçek hayatta yapar
// ve büyük "tamam" düğmesine basar. Kamera/ses tanıma/doğrulama YOK; puan/hata YOK; yazılı İngilizce YOK.
// Düğme animasyon bitene kadar kilitli (çocuk hemen ileri basıp geçmesin). Mantık: lib/enOgretmenDerKi.ts.
// ============================================

/** Klip üretimi için bu oyunun söylediği Türkçe metinler (bkz. lib/enOgretmenDerKi.ts). */
export { TR_YONERGELER };

const USE_NATIVE = Platform.OS !== 'web';
const CHARACTER = '🐻';
const OK_SIZE = 96;
const BUBBLE_SIZE = 64;

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

type Phase = 'acting' | 'ready' | 'done';

export default function EnglishOgretmenDerKi({ onGameEnd, onExit, childName }: Props) {
    const { width, height } = useWindowDimensions();
    const charSize = Math.max(64, Math.min(120, Math.round(Math.min(width * 0.32, height * 0.17))));
    const jumpUp = Math.round(charSize * 0.3);
    const runAmp = Math.round(Math.min(width * 0.25, 90));
    const stageH = BUBBLE_SIZE + 8 + jumpUp + Math.round(charSize * 1.3);

    const [gameReady, setGameReady] = useState(false);
    const [sequence] = useState(() => buildSequence());
    const [round, setRound] = useState(0);
    const [phase, setPhase] = useState<Phase>('acting');
    const [showConfetti, setShowConfetti] = useState(false);

    const [startTime] = useState(Date.now());
    const movesRef = useRef(0);
    const completedRef = useRef(0);
    const finishedRef = useRef(false);
    const lockedRef = useRef(false);
    const isMountedRef = useRef(true);
    const reduceRef = useRef(false);
    const prevApplauseRef = useRef<string | undefined>(undefined);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const actionAnimRef = useRef<Animated.CompositeAnimation | null>(null);
    const glowAnimRef = useRef<Animated.CompositeAnimation | null>(null);

    // Karakter (hepsi yerel sürücülü; JS sürücülü değer YOK)
    const tx = useRef(new Animated.Value(0)).current;
    const ty = useRef(new Animated.Value(0)).current;
    const rot = useRef(new Animated.Value(0)).current;
    const sc = useRef(new Animated.Value(1)).current;
    const zzz = useRef(new Animated.Value(0)).current;
    const bubble = useRef(new Animated.Value(1)).current;
    // "Tamam" düğmesi
    const okOn = useRef(new Animated.Value(0)).current;
    const glow = useRef(new Animated.Value(0)).current;

    const eylem = sequence[Math.min(round, sequence.length - 1)];

    useEffect(() => {
        isMountedRef.current = true;
        AccessibilityInfo.isReduceMotionEnabled().then((v) => { reduceRef.current = !!v; }).catch(() => { });
        const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v: boolean) => { reduceRef.current = !!v; });
        return () => {
            isMountedRef.current = false;
            timersRef.current.forEach(clearTimeout);
            timersRef.current = [];
            actionAnimRef.current?.stop();
            glowAnimRef.current?.stop();
            sub?.remove?.();
            if (!finishedRef.current) stopSpeech();
        };
    }, []);

    const timing = (v: Animated.Value, to: number, duration: number, easing: (t: number) => number = Easing.inOut(Easing.quad)) =>
        Animated.timing(v, { toValue: to, duration, easing, useNativeDriver: USE_NATIVE });
    const repeat = (n: number, make: () => Animated.CompositeAnimation) => Animated.sequence(Array.from({ length: n }, make));

    const resetCharacter = useCallback(() => {
        actionAnimRef.current?.stop();
        tx.setValue(0); ty.setValue(0); rot.setValue(0); sc.setValue(1); zzz.setValue(0);
    }, [tx, ty, rot, sc, zzz]);

    /** Eylemin animasyonu (hareketi azalt açıksa yalnız yumuşak bir nabız). */
    const playAction = useCallback((id: string) => {
        resetCharacter();
        bubble.setValue(0.6);
        Animated.spring(bubble, { toValue: 1, friction: 4, useNativeDriver: USE_NATIVE }).start();
        let anim: Animated.CompositeAnimation;
        if (reduceRef.current) {
            if (id === 'sleep') zzz.setValue(0.5);
            anim = repeat(2, () => Animated.sequence([timing(sc, 1.08, 500), timing(sc, 1, 500)]));
        } else if (id === 'clap') {
            anim = Animated.sequence([
                repeat(13, () => Animated.sequence([timing(sc, 1.18, 130, Easing.out(Easing.quad)), timing(sc, 0.95, 130, Easing.in(Easing.quad))])),
                timing(sc, 1, 100),
            ]);
        } else if (id === 'wave') {
            anim = Animated.sequence([
                timing(rot, -16, 150),
                repeat(6, () => Animated.sequence([timing(rot, 16, 260), timing(rot, -16, 260)])),
                timing(rot, 0, 150),
            ]);
        } else if (id === 'jump') {
            anim = repeat(5, () => Animated.sequence([
                timing(ty, -jumpUp, 330, Easing.out(Easing.quad)),
                timing(ty, 0, 330, Easing.in(Easing.quad)),
            ]));
        } else if (id === 'run') {
            anim = Animated.parallel([
                Animated.sequence([
                    timing(tx, -runAmp, 200),
                    repeat(3, () => Animated.sequence([timing(tx, runAmp, 520), timing(tx, -runAmp, 520)])),
                    timing(tx, 0, 250),
                ]),
                repeat(13, () => Animated.sequence([timing(ty, -8, 130), timing(ty, 0, 130)])),
            ]);
        } else if (id === 'dance') {
            anim = Animated.parallel([
                repeat(6, () => Animated.sequence([timing(rot, 14, 280), timing(rot, -14, 280)])),
                repeat(12, () => Animated.sequence([timing(ty, -10, 140), timing(ty, 0, 140)])),
            ]);
        } else {
            // sleep: yavaşça yana eğil, 💤 yukarı süzülür
            anim = Animated.parallel([
                Animated.sequence([timing(rot, 22, 1400), Animated.delay(2000)]),
                timing(ty, 10, 1400),
                repeat(3, () => Animated.sequence([timing(zzz, 1, 1100, Easing.out(Easing.quad)), timing(zzz, 0, 1)])),
            ]);
        }
        actionAnimRef.current = anim;
        anim.start();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jumpUp, runAmp]);

    // Yeni tur: öğretmen söyler + karakter canlandırır + "tamam" kilitli başlar
    useEffect(() => {
        if (!gameReady || finishedRef.current) return;
        lockedRef.current = false;
        setPhase('acting');
        glowAnimRef.current?.stop();
        okOn.setValue(0);
        glow.setValue(0);
        speak(ogretmenDerKi(eylem), { lang: 'en' }).catch(() => { });
        playAction(eylem.id);
        const t = setTimeout(() => {
            if (isMountedRef.current && !lockedRef.current) setPhase('ready');
        }, unlockDelayMs(eylem.id, reduceRef.current));
        timersRef.current.push(t);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [round, gameReady]);

    // Kilit açılınca düğme parlayarak belirir
    useEffect(() => {
        if (phase !== 'ready') return;
        Animated.spring(okOn, { toValue: 1, friction: 5, tension: 90, useNativeDriver: USE_NATIVE }).start();
        if (!reduceRef.current) {
            glow.setValue(0);
            const loop = Animated.loop(Animated.timing(glow, { toValue: 1, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: USE_NATIVE }));
            glowAnimRef.current = loop;
            loop.start();
        } else {
            glow.setValue(0.5);
        }
        return () => { glowAnimRef.current?.stop(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    const finish = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const r = buildResult(completedRef.current);
        onGameEnd('en-ogretmen-der-ki', duration, movesRef.current, r.finalHata, undefined, {
            zorlukSeviyesi: 1,
            kazanimOdagi: r.kazanimOdagi,
            correct_answers: r.correct_answers,
        });
    };

    const handleOk = () => {
        if (phase !== 'ready' || lockedRef.current || finishedRef.current) return;
        lockedRef.current = true;
        movesRef.current += 1;
        completedRef.current += 1;
        setPhase('done');
        glowAnimRef.current?.stop();
        setShowConfetti(true);
        const line = pickApplause(Math.random, prevApplauseRef.current);
        prevApplauseRef.current = line;
        speakThenWait(line, 1300, { lang: 'en' }).then(() => {
            if (!isMountedRef.current) return;
            setShowConfetti(false);
            if (round + 1 < TOTAL_ROUNDS) setRound((r) => r + 1);
            else finish();
        });
    };

    const replay = () => {
        if (lockedRef.current) return;
        speak(ogretmenDerKi(eylem), { lang: 'en' }).catch(() => { });
        playAction(eylem.id);
    };

    const rotate = rot.interpolate({ inputRange: [-45, 45], outputRange: ['-45deg', '45deg'] });
    const zzzY = zzz.interpolate({ inputRange: [0, 1], outputRange: [0, -34] });
    const zzzOpacity = zzz.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] });
    const okScale = okOn.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
    const okOpacity = okOn.interpolate({ inputRange: [0, 1], outputRange: [0.28, 1], extrapolate: 'clamp' });
    const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] });
    const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
    const ready = phase === 'ready';
    const bubbleEmoji = eylem.emoji ?? '⭐';

    return (
        <View style={styles.container}>
            {showConfetti && <ConfettiCannon count={80} origin={{ x: width / 2, y: 0 }} fadeOut />}
            {!gameReady && (
                <CountdownOverlay
                    message={GIRIS_MESAJI}
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => setGameReady(true)}
                />
            )}

            <View style={styles.header}>
                <GameExitButton onPress={onExit ?? (() => { })} />
                <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                    {sequence.map((_, i) => (
                        <View key={i} style={[styles.dot, i < round || (i === round && phase === 'done') ? styles.dotDone : i === round && styles.dotNow]} />
                    ))}
                </View>
                <View style={{ width: 44 }} />
            </View>

            <ScrollIfNeeded contentStyle={styles.body}>
                <View style={[styles.stage, { height: stageH }]}>
                    <Animated.View style={[styles.bubble, { transform: [{ scale: bubble }] }]}>
                        <Text style={styles.bubbleEmoji}>{bubbleEmoji}</Text>
                    </Animated.View>
                    <View pointerEvents="none" style={[styles.floorWrap, { bottom: Math.round(charSize * 0.02) }]}>
                        <View style={[styles.floor, { width: charSize * 1.4 }]} />
                    </View>
                    <Animated.View
                        style={[styles.character, { bottom: Math.round(charSize * 0.12), transform: [{ translateX: tx }, { translateY: ty }, { rotate }, { scale: sc }] }]}
                    >
                        <Text style={{ fontSize: charSize, lineHeight: Math.round(charSize * 1.15) }}>{CHARACTER}</Text>
                    </Animated.View>
                    {eylem.id === 'sleep' && (
                        <Animated.View
                            pointerEvents="none"
                            style={[styles.zzz, { bottom: Math.round(charSize * 0.9), opacity: zzzOpacity, transform: [{ translateY: zzzY }] }]}
                        >
                            <Text style={[styles.zzzEmoji, { marginLeft: Math.round(charSize * 0.9) }]}>💤</Text>
                        </Animated.View>
                    )}
                </View>

                <ListenButton onPress={replay} color="#FB8C00" style={styles.listen} />

                <View style={styles.okWrap}>
                    <Animated.View pointerEvents="none" style={[styles.okGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
                    <Animated.View style={{ opacity: okOpacity, transform: [{ scale: okScale }] }}>
                        <TouchableOpacity
                            style={[styles.okBtn, !ready && styles.okLocked]}
                            onPress={handleOk}
                            disabled={!ready}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Tamam"
                            accessibilityState={{ disabled: !ready }}
                        >
                            <Ionicons name="checkmark" size={58} color="#fff" />
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </ScrollIfNeeded>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF8E1' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
    dots: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999 },
    dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#E0E0E0' },
    dotNow: { backgroundColor: '#FFE082', borderWidth: 2, borderColor: '#FB8C00' },
    dotDone: { backgroundColor: '#FFB300' },

    body: { alignItems: 'center', justifyContent: 'center', paddingBottom: 16 },
    stage: { width: '100%', alignItems: 'center' },
    bubble: { width: BUBBLE_SIZE, height: BUBBLE_SIZE, borderRadius: BUBBLE_SIZE / 2, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 3 },
    bubbleEmoji: { fontSize: 36 },
    floorWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    floor: { height: 14, borderRadius: 7, backgroundColor: 'rgba(0,0,0,0.08)' },
    character: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
    zzz: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    zzzEmoji: { fontSize: 32 },

    listen: { marginTop: 10, minHeight: 48 },
    okWrap: { marginTop: 18, width: OK_SIZE + 40, height: OK_SIZE + 40, alignItems: 'center', justifyContent: 'center' },
    okGlow: { position: 'absolute', width: OK_SIZE, height: OK_SIZE, borderRadius: OK_SIZE / 2, backgroundColor: '#FFD54F' },
    okBtn: { width: OK_SIZE, height: OK_SIZE, borderRadius: OK_SIZE / 2, backgroundColor: '#43A047', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 5 },
    okLocked: { backgroundColor: '#9E9E9E' },
});
