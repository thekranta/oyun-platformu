import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    ImageBackground,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import CountdownOverlay from './CountdownOverlay';
import GameExitButton from './GameExitButton';
import { useSound } from './SoundContext';
import { asset } from '../lib/assetMap';
import { speak, speakThenWait, stopSpeech } from '../services/speechService';
import ListenButton from './ListenButton';
import {
    applyPour,
    bottleCount,
    generate,
    hint as findHint,
    isBottleComplete,
    isSolved,
    pourCount,
    solve,
    tierForAge,
    type Bottle,
    type Move,
} from '../lib/sihirliSiseler';
import { COMPLETE_TEXT, HOW_TO_TEXT, INTRO_TEXT, INVALID_TEXT, WIN_TEXT } from '../constants/sihirliSiseler';

// Sihirli Şişeler — Fen/FAB.2 (renklere göre gruplama).
// Oyun mantığı lib/sihirliSiseler.ts'te (kademe tablosu, üretim, dökme kuralı, BFS çözücü/ipucu),
// seslendirilen metinler constants/sihirliSiseler.ts'te. Bu dosya yalnız görünüm ve etkileşimdir.
// Oyun_Test_Listesi #59 ("çok zor, bug ve hata çok") düzeltmeleri: kolay kademe tablosu + 2 boş şişe,
// çözülebilir ve zaten çözülmemiş bulmaca, geri al / ipucu, geçersiz hamlede geri bildirim, tamamlanan
// şişeyi kilitleme, dökme animasyonu, kutlamanın görünmesi ve doğru kayıt alanları.

const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

// Arka plan görseli
const BACKGROUND_IMAGE = asset('/backgrounds/games/sihirli_siseler_bg.webp');

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
// Karakterler yalnız geniş web ekranında: dar ekranda şişelerin üstüne biniyorlardı.
const SHOW_CHARACTERS = isWeb && width >= 700;

// High-contrast color palette with symbols for accessibility
const LIQUID_COLORS = [
    { main: '#FF3B3B', light: '#FF6B6B', dark: '#CC2222', symbol: '★', name: 'Kırmızı' },  // Bright Red - Star
    { main: '#FFD700', light: '#FFE44D', dark: '#CCB000', symbol: '●', name: 'Sarı' },     // Vivid Yellow - Circle
    { main: '#1E88E5', light: '#64B5F6', dark: '#1565C0', symbol: '▲', name: 'Mavi' },     // Deep Blue - Triangle
    { main: '#4CAF50', light: '#81C784', dark: '#388E3C', symbol: '◆', name: 'Yeşil' },    // Grass Green - Diamond
    { main: '#9C27B0', light: '#BA68C8', dark: '#7B1FA2', symbol: '♦', name: 'Mor' },      // Purple - Diamond Alt
    { main: '#FF9800', light: '#FFB74D', dark: '#F57C00', symbol: '♥', name: 'Turuncu' },  // Orange - Heart
    { main: '#00BCD4', light: '#4DD0E1', dark: '#0097A7', symbol: '✦', name: 'Turkuaz' },  // Cyan - Sparkle
];

// Katman yüksekliği SABİT; şişe boyu kapasiteye göre değişir (kapasite 2 → kısa şişe, 4 → uzun).
// Gövde iç yüksekliği tam kapasite × katman: eskiden üst katman kırpılıyordu (≈%72 görünüyordu).
const LAYER_HEIGHT = isWeb ? 40 : 38;
const BODY_BORDER = 3;
const NECK_HEIGHT = 18;
const IDLE_HINT_MS = 12000;

// Tamamlanmış şişedeki baloncuklar: sabit konumlar (eskiden her render'da Math.random ile titriyordu).
const BUBBLES = [
    { left: 8, bottom: 14, size: 7 }, { left: 22, bottom: 30, size: 5 }, { left: 14, bottom: 52, size: 9 },
    { left: 28, bottom: 68, size: 5 }, { left: 10, bottom: 84, size: 6 },
];

interface SihirliSiselerProps {
    childName: string;
    childAge: number;
    email?: string;
    onClose: () => void;
    onGameEnd?: (data: any) => void;
}

export default function SihirliSiseler({ childName, childAge, email, onClose, onGameEnd }: SihirliSiselerProps) {
    const tier = useMemo(() => tierForAge(childAge), [childAge]);
    const cap = tier.capacity;
    const nBottles = bottleCount(tier);
    // Dokunma hedefi ≥48 px: eskiden web'de width*0.08 ≈ 31 px'e düşüyordu.
    const bottleW = Math.max(48, Math.min(72, Math.floor((width - 32) / nBottles) - 12));
    const bodyH = cap * LAYER_HEIGHT + BODY_BORDER * 2;

    const initialRef = useRef<Bottle[]>([]);
    const [bottles, setBottles] = useState<Bottle[]>([]);
    const [selected, setSelected] = useState<number | null>(null);
    const [history, setHistory] = useState<Bottle[][]>([]);
    const [hintMove, setHintMove] = useState<Move | null>(null);
    const [busy, setBusy] = useState(false);
    const [pouring, setPouring] = useState<{ from: number; to: number } | null>(null);
    const [shakeIdx, setShakeIdx] = useState<number | null>(null);
    const [gameReady, setGameReady] = useState(false);
    const [celebrating, setCelebrating] = useState(false);
    const [idleTick, setIdleTick] = useState(0);

    // Sayaçlar (render dışı; kayıt ve tek seferlik sesler için)
    const movesRef = useRef(0);
    const invalidRef = useRef(0);
    const undoRef = useRef(0);
    const hintRef = useRef(0);
    const restartRef = useRef(0);
    const sequenceRef = useRef<string[]>([]);
    const startTimeRef = useRef(Date.now());
    const finishedRef = useRef(false);
    const mountedRef = useRef(true);
    const spokeHowToRef = useRef(false);
    const spokeInvalidRef = useRef(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Animasyonlar
    const tilt = useRef(new Animated.Value(0)).current;
    const shake = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(0.5)).current;
    const celebrateScale = useRef(new Animated.Value(0)).current;

    const { playSound: playGlobalSfx } = useSound();

    const schedule = (fn: () => void, ms: number) => {
        const t = setTimeout(() => { if (mountedRef.current) fn(); }, ms);
        timersRef.current.push(t);
    };

    // İlk bulmaca (kademe yaşa göre sabit)
    useEffect(() => {
        const fresh = generate(tier);
        initialRef.current = fresh.map((b) => [...b]);
        setBottles(fresh);
    }, [tier]);

    useEffect(() => () => {
        mountedRef.current = false;
        timersRef.current.forEach(clearTimeout);
        stopSpeech();
    }, []);

    // Seçili/ipucu halkaları yanıp söner
    useEffect(() => {
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 0.45, duration: 500, useNativeDriver: true }),
        ]));
        loop.start();
        return () => loop.stop();
    }, [pulse]);

    // Geri sayım bitince oyunu başlat: süre BURADAN sayılır (eskiden geri sayım da süreye giriyordu);
    // nasıl oynandığı bir kez sesle anlatılır.
    const handleReady = () => {
        startTimeRef.current = Date.now();
        setGameReady(true);
        if (!spokeHowToRef.current) {
            spokeHowToRef.current = true;
            speak(HOW_TO_TEXT, { instructions: HAPPY_VOICE });
        }
    };

    const markInteraction = () => setIdleTick((n) => n + 1);

    // ---- İpucu ----
    const showHint = (auto = false) => {
        if (busy || celebrating || finishedRef.current) return;
        const m = findHint(bottles, cap);
        if (!m) return;
        if (!auto) hintRef.current += 1;
        setSelected(null);
        setHintMove(m);
    };
    const showHintRef = useRef(showHint);
    showHintRef.current = showHint;

    // 12 sn hareketsizlikte otomatik ipucu (sayılmaz); her dokunuşta zamanlayıcı sıfırlanır.
    useEffect(() => {
        if (!gameReady || celebrating || busy || hintMove) return;
        const t = setTimeout(() => showHintRef.current(true), IDLE_HINT_MS);
        return () => clearTimeout(t);
    }, [gameReady, celebrating, busy, hintMove, idleTick, bottles, selected]);

    // ---- Kayıt ----
    const buildGameData = () => {
        const responseTime = Date.now() - startTimeRef.current;
        const moves = Math.max(1, movesRef.current);
        const avgMoveTime = responseTime / moves;
        const optimal = solve(initialRef.current, cap)?.length ?? moves;
        // Verimlilik: en kısa çözüme oranı; ipucu başına -5 (ipucuyla çözmek de öğrenmedir ama ayrı görünür).
        const efficiency = Math.round(100 * Math.min(1, optimal / moves));
        return {
            ogrenci_adi: childName,
            email: email || '',
            yas: childAge,
            oyun_turu: 'sihirli-siseler',
            sure: Math.round(responseTime / 1000),
            total_moves: movesRef.current,            // gameRegistry bu alanı okuyor (eskiden hiç gönderilmiyordu → hamle hep 0)
            hata_sayisi: invalidRef.current,          // geçersiz hamle sayısı (eskiden sabit 0)
            correct_answers: tier.colors,
            response_time: responseTime,
            cognitive_speed_score: Math.max(0, efficiency - hintRef.current * 5),
            zorluk_seviyesi: tier.level,
            // Nesne olarak verilir: services/gameResults.ts kaydederken JSON.stringify eder
            // (önceden burada da stringify edildiği için veritabanına iki kez kodlanıyordu).
            round_history: {
                strategy: avgMoveTime > 5000 ? 'methodical' : 'trial_error',
                total_moves: movesRef.current,
                invalid_moves: invalidRef.current,
                undo_count: undoRef.current,
                hint_count: hintRef.current,
                restart_count: restartRef.current,
                optimal_moves: optimal,
                move_sequence: sequenceRef.current,
                difficulty: { level: tier.level, colors: tier.colors, capacity: cap, empty: tier.empty, bottles: nBottles },
                avg_move_time_ms: Math.round(avgMoveTime),
            },
        };
    };

    // ---- Kazanma: kutlama GÖRÜNÜR, 'Tebrikler!' bitene kadar beklenir, sonra sonuç ekranına geçilir ----
    const handleWin = () => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        setCelebrating(true);
        Animated.spring(celebrateScale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
        const finish = async () => {
            await speakThenWait(WIN_TEXT, 2800, { instructions: HAPPY_VOICE }).catch(() => undefined);
            if (!mountedRef.current) return;
            onGameEnd?.(buildGameData());
        };
        finish();
    };

    // ---- Dökme (kaynak şişe hedefe doğru yatar, sonra katmanlar yer değiştirir) ----
    const doPour = (from: number, to: number, result: { bottles: Bottle[]; count: number }) => {
        setBusy(true);
        setSelected(null);
        setPouring({ from, to });
        tilt.setValue(0);
        Animated.timing(tilt, { toValue: 1, duration: 230, useNativeDriver: true }).start();
        const before = bottles;
        schedule(() => {
            setHistory((h) => [...h, before]);
            setBottles(result.bottles);
            movesRef.current += 1;
            sequenceRef.current.push(`${from}->${to}`);
            Animated.timing(tilt, { toValue: 0, duration: 200, useNativeDriver: true }).start();
            const newlyComplete = isBottleComplete(result.bottles[to], cap) && !isBottleComplete(before[to], cap);
            if (isSolved(result.bottles, cap)) handleWin();
            else if (newlyComplete) speak(COMPLETE_TEXT);          // yalnız ilk tamamlanışta; kilitli şişe tekrar tetiklemez
            schedule(() => { setPouring(null); setBusy(false); markInteraction(); }, 220);
        }, 230);
    };

    // ---- Dokunma ----
    const handleBottleTap = (index: number) => {
        if (!gameReady || busy || celebrating) return;
        markInteraction();
        setHintMove(null);
        const tapped = bottles[index];

        if (selected === null) {
            // Boş ya da tamamlanmış şişe seçilemez
            if (!tapped || tapped.length === 0 || isBottleComplete(tapped, cap)) return;
            setSelected(index);
            return;
        }
        if (selected === index) { setSelected(null); return; }

        const result = applyPour(bottles, selected, index, cap);
        if (!result) {
            // Geçersiz hamle: seçim KORUNUR, şişe sallanır, 'wrong' sesi; ilk seferde sesli açıklama.
            invalidRef.current += 1;
            setShakeIdx(selected);
            shake.setValue(0);
            Animated.sequence([
                Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true }),
                Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: true }),
                Animated.timing(shake, { toValue: 6, duration: 50, useNativeDriver: true }),
                Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
            ]).start();
            schedule(() => setShakeIdx(null), 260);
            playGlobalSfx('wrong').catch(() => { });
            if (!spokeInvalidRef.current) {
                spokeInvalidRef.current = true;
                speak(INVALID_TEXT, { instructions: HAPPY_VOICE });
            }
            return;
        }
        doPour(selected, index, result);
    };

    const handleUndo = () => {
        if (busy || celebrating || history.length === 0) return;
        markInteraction();
        const prev = history[history.length - 1];
        setHistory((h) => h.slice(0, -1));
        setBottles(prev);
        setSelected(null);
        setHintMove(null);
        undoRef.current += 1;
    };

    // Baştan: AYNI bulmaca yeniden başlar (eskiden yenile düğmesi yeni rastgele bulmaca üretiyordu).
    const handleRestart = () => {
        if (busy || celebrating) return;
        markInteraction();
        setBottles(initialRef.current.map((b) => [...b]));
        setHistory([]);
        setSelected(null);
        setHintMove(null);
        restartRef.current += 1;
    };

    // ---- Görünüm ----
    const completedCount = bottles.filter((b) => isBottleComplete(b, cap)).length;

    const renderBottle = (bottle: Bottle, index: number) => {
        const complete = isBottleComplete(bottle, cap);
        const isSelected = selected === index;
        const isTarget = selected !== null && selected !== index && pourCount(bottles, selected, index, cap) > 0;
        const dimmed = selected !== null && selected !== index && !isTarget && !complete;
        const isHintFrom = hintMove?.[0] === index;
        const isHintTo = hintMove?.[1] === index;
        const dir = pouring && pouring.from === index ? (pouring.to > index ? 1 : -1) : 0;

        const transform: any[] = [];
        if (isSelected) transform.push({ translateY: -14 });
        if (dir !== 0) {
            transform.push({ translateX: tilt.interpolate({ inputRange: [0, 1], outputRange: [0, dir * 14] }) });
            transform.push({ rotate: tilt.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${dir * 26}deg`] }) });
        }
        if (shakeIdx === index) transform.push({ translateX: shake });

        return (
            <TouchableOpacity
                key={index}
                onPress={() => handleBottleTap(index)}
                activeOpacity={0.85}
                disabled={complete}
                accessibilityRole="button"
                accessibilityLabel={complete ? 'Tamamlanan şişe' : bottle.length === 0 ? 'Boş şişe' : 'Şişe'}
            >
                <Animated.View
                    style={[
                        styles.bottle,
                        { width: bottleW, height: bodyH + NECK_HEIGHT },
                        dimmed && styles.bottleDimmed,
                        { transform },
                    ]}
                >
                    {/* Boyun */}
                    <View style={styles.bottleNeck} />

                    {/* Gövde + sıvı katmanları */}
                    <View style={[styles.bottleBody, { width: bottleW, height: bodyH }, complete && styles.bottleBodyComplete]}>
                        <View style={styles.glassReflection} />
                        {bottle.map((colorIndex, layerIndex) => (
                            <View
                                key={layerIndex}
                                style={[
                                    styles.liquidLayer,
                                    {
                                        backgroundColor: LIQUID_COLORS[colorIndex].main,
                                        bottom: layerIndex * LAYER_HEIGHT,
                                        height: LAYER_HEIGHT,
                                        borderTopLeftRadius: layerIndex === bottle.length - 1 ? 8 : 0,
                                        borderTopRightRadius: layerIndex === bottle.length - 1 ? 8 : 0,
                                    },
                                ]}
                            >
                                <View style={[styles.liquidShine, { backgroundColor: LIQUID_COLORS[colorIndex].light }]} />
                                {/* Renk körlüğü için simge */}
                                <Text style={styles.layerSymbol}>{LIQUID_COLORS[colorIndex].symbol}</Text>
                                {layerIndex < bottle.length - 1 && <View style={styles.layerSeparator} />}
                            </View>
                        ))}
                        {complete && (
                            <View style={styles.bubbleContainer} pointerEvents="none">
                                {BUBBLES.map((b, i) => (
                                    <View key={i} style={[styles.bubble, { left: b.left, bottom: b.bottom, width: b.size, height: b.size }]} />
                                ))}
                            </View>
                        )}
                    </View>

                    {/* Halkalar: seçili (altın), geçerli hedef (yeşil), ipucu (mavi/yeşil) */}
                    {isSelected && <View pointerEvents="none" style={[styles.ring, { borderColor: '#FFC107' }]} />}
                    {isTarget && <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: '#2ECC71', opacity: pulse }]} />}
                    {isHintFrom && <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: '#29B6F6', opacity: pulse }]} />}
                    {isHintTo && <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: '#2ECC71', opacity: pulse }]} />}
                    {complete && <View style={styles.doneBadge}><Text style={styles.doneBadgeText}>✓</Text></View>}
                </Animated.View>
            </TouchableOpacity>
        );
    };

    const canUndo = history.length > 0 && !busy && !celebrating;

    return (
        <ImageBackground source={BACKGROUND_IMAGE} style={styles.container} resizeMode="cover">
            <View style={styles.darkOverlay} />
            {!gameReady && (
                <CountdownOverlay
                    message={INTRO_TEXT}
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={handleReady}
                />
            )}
            <View style={styles.background}>
                <View style={styles.labGradient} />
                <View style={[styles.labDecor, { left: 20, top: height * 0.15 }]}><Text style={styles.labDekorEmoji}>🔬</Text></View>
                <View style={[styles.labDecor, { right: 20, top: height * 0.2 }]}><Text style={styles.labDekorEmoji}>⚗️</Text></View>
                <View style={[styles.labDecor, { left: 30, bottom: height * 0.25 }]}><Text style={styles.labDekorEmoji}>🧬</Text></View>
                <View style={[styles.labDecor, { right: 30, bottom: height * 0.3 }]}><Text style={styles.labDekorEmoji}>💡</Text></View>
                {[...Array(8)].map((_, i) => (
                    <View
                        key={i}
                        style={[styles.bgBubble, {
                            left: `${10 + (i * 12)}%`, top: `${20 + (i % 3) * 25}%`,
                            width: 10 + (i % 4) * 8, height: 10 + (i % 4) * 8, opacity: 0.3 + (i % 3) * 0.1,
                        }]}
                    />
                ))}
            </View>

            {/* Karakterler (yalnız geniş web): dokunmayı yutmasınlar */}
            {SHOW_CHARACTERS && (
                <View style={styles.leftCharacter} pointerEvents="none">
                    <Text style={[styles.characterEmoji, completedCount > 0 && styles.characterHappy]}>🐥</Text>
                    {completedCount > 0 && (
                        <View style={styles.speechBubble}><Text style={styles.speechText}>{completedCount === 1 ? 'Harika!' : 'Süpersin!'}</Text></View>
                    )}
                </View>
            )}
            {SHOW_CHARACTERS && (
                <View style={styles.rightCharacter} pointerEvents="none">
                    <Text style={[styles.characterEmoji, completedCount > 1 && styles.characterHappy]}>🐸</Text>
                    {completedCount > 1 && (
                        <View style={styles.speechBubble}><Text style={styles.speechText}>{completedCount >= 3 ? 'Dahisin!' : 'Çok iyi! 🎉'}</Text></View>
                    )}
                </View>
            )}

            {/* Başlık: çıkış butonu satırın içinde (iOS'ta durum çubuğuyla çakışmaz) */}
            <View style={styles.header}>
                <GameExitButton onPress={onClose} />
                <Text style={styles.title}>🧪 Sihirli Şişeler</Text>
                <View style={{ width: 44 }} />
            </View>

            <ListenButton onPress={() => speak(INTRO_TEXT, { instructions: HAPPY_VOICE })} color="#4CAF50" style={{ alignSelf: 'center', marginTop: 12 }} />

            {/* Şişeler */}
            <View style={styles.bottlesContainer}>
                <View style={[styles.bottlesGrid, isWeb && styles.bottlesGridWeb]}>
                    {bottles.map((bottle, index) => renderBottle(bottle, index))}
                </View>
            </View>

            {/* Yazısız ikon düğmeleri: Geri al · İpucu · Baştan */}
            <View style={styles.actionBar}>
                <TouchableOpacity
                    style={[styles.actionBtn, !canUndo && styles.actionBtnOff]}
                    onPress={handleUndo}
                    disabled={!canUndo}
                    accessibilityRole="button"
                    accessibilityLabel="Geri al"
                >
                    <Ionicons name="arrow-undo" size={28} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FFB300' }]}
                    onPress={() => showHint(false)}
                    disabled={busy || celebrating}
                    accessibilityRole="button"
                    accessibilityLabel="İpucu"
                >
                    <Text style={styles.actionEmoji}>💡</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FF7043' }, (busy || celebrating) && styles.actionBtnOff]}
                    onPress={handleRestart}
                    disabled={busy || celebrating}
                    accessibilityRole="button"
                    accessibilityLabel="Baştan başla"
                >
                    <Ionicons name="refresh" size={28} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Kutlama: confetti + kart; 'Tebrikler!' bitince sonuç ekranına geçilir */}
            {celebrating && (
                <View style={styles.celebrationOverlay}>
                    <ConfettiCannon count={120} origin={{ x: width / 2, y: 0 }} autoStart fadeOut />
                    <Animated.View style={[styles.winCard, { transform: [{ scale: celebrateScale }] }]}>
                        <Text style={styles.winEmoji}>🏆</Text>
                        <Text style={styles.winTitle}>{childName}, Harika Bir Kimyagersin!</Text>
                        <Text style={styles.winStats}>🎯 {movesRef.current} hamlede tamamladın!</Text>
                    </Animated.View>
                </View>
            )}
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        ...(Platform.OS === 'web' ? { height: '100vh' as any } : {}),
    },
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    background: {
        ...StyleSheet.absoluteFillObject,
        overflow: 'hidden',
    },
    // Lab temalı arka plan
    labGradient: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#E3F2FD',
    },
    labDecor: { position: 'absolute', zIndex: 1 },
    labDekorEmoji: { fontSize: 40, opacity: 0.3 },
    bgBubble: {
        position: 'absolute',
        backgroundColor: 'rgba(100, 181, 246, 0.3)',
        borderRadius: 50,
    },
    // Karakterler
    leftCharacter: { position: 'absolute', left: 20, top: height * 0.35, alignItems: 'center', zIndex: 10 },
    rightCharacter: { position: 'absolute', right: 20, top: height * 0.35, alignItems: 'center', zIndex: 10 },
    characterEmoji: { fontSize: 60 },
    characterHappy: { transform: [{ scale: 1.2 }] },
    speechBubble: {
        backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginTop: 8,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    },
    speechText: { fontSize: 12, fontWeight: 'bold', color: '#4CAF50' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 56 : 36,
        paddingBottom: 12,
        backgroundColor: '#4CAF50',
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 20,
    },
    title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },

    bottlesContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
    bottlesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
    bottlesGridWeb: { gap: 24, maxWidth: 700 },
    bottle: { alignItems: 'center', marginHorizontal: 6, marginVertical: 14 },
    bottleDimmed: { opacity: 0.45 },
    bottleNeck: {
        width: 30,
        height: NECK_HEIGHT,
        backgroundColor: 'rgba(255,255,255,0.6)',
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
        borderWidth: 2,
        borderColor: 'rgba(0,0,0,0.1)',
        borderBottomWidth: 0,
    },
    bottleBody: {
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 12,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderWidth: BODY_BORDER,
        borderColor: 'rgba(255,255,255,0.9)',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 6,
    },
    bottleBodyComplete: { borderColor: '#FFD700' },
    glassReflection: {
        position: 'absolute', left: 5, top: 10, width: 8, height: '60%',
        backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 4, zIndex: 10,
    },
    liquidLayer: { position: 'absolute', left: 0, right: 0 },
    liquidShine: { position: 'absolute', left: 5, top: 5, width: 15, height: 8, borderRadius: 4, opacity: 0.5 },
    layerSymbol: {
        position: 'absolute', right: 6, top: '50%', marginTop: -8, fontSize: 14, color: 'rgba(255,255,255,0.8)',
        textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2,
    },
    layerSeparator: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.4)' },
    ring: {
        position: 'absolute', left: -4, right: -4, top: -4, bottom: -4,
        borderWidth: 4, borderRadius: 16,
    },
    doneBadge: {
        position: 'absolute', top: 24, left: '50%', marginLeft: -13, width: 26, height: 26, borderRadius: 13,
        backgroundColor: '#FFC107', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff',
    },
    doneBadgeText: { color: '#fff', fontSize: 15, fontWeight: '900' },
    bubbleContainer: { ...StyleSheet.absoluteFillObject },
    bubble: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 10 },

    actionBar: { flexDirection: 'row', justifyContent: 'center', gap: 18, paddingBottom: 28, paddingTop: 6 },
    actionBtn: {
        width: 60, height: 60, borderRadius: 30, backgroundColor: '#5C6BC0', alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 5,
    },
    actionBtnOff: { opacity: 0.4 },
    actionEmoji: { fontSize: 30 },

    celebrationOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 50,
    },
    winCard: {
        backgroundColor: '#fff', borderRadius: 30, padding: 30, alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15,
        maxWidth: width - 60,
    },
    winEmoji: { fontSize: 80, marginBottom: 10 },
    winTitle: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32', textAlign: 'center', marginBottom: 10 },
    winStats: { fontSize: 18, color: '#666' },
});
