import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, Platform, StyleSheet, Text, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import { useAdaptiveDifficulty } from '../lib/useAdaptiveDifficulty';
import { speak, stopSpeech } from '../services/speechService';
import ListenButton from './ListenButton';
import { buildRound, SETS, type Round } from '../constants/akilliSiniflandir';

// Akıllı Sınıflandır — UYARLANIR (adaptif) zorluk. Maarif: FAB.2
// (Nesneleri benzerlik ve farklılıklarına göre sınıflandırabilme).
// Nesneyi doğru sepete SÜRÜKLE-BIRAK. Zorlukla gruplar incelir: hayvan/yiyecek →
// meyve/sebze → karada/denizde → canlı/cansız (soyut).
// Çocuk okuma bilmediği için sepetlerde YAZI yok: büyük renkli sepet + grubun SOMUT 1-2 örneği (soyut simge değil);
// grup adı sete özel SESLİ soruyla HER TURDA söylenir (içerik ve sorular constants/akilliSiniflandir.ts'te — #58).
// Kullanıcı notları 2026-10-25: soru her sahnede çalsın; yanlış cevapta alttaki 🤔 kalksın; simgeler belirsizdi ("yetişkin olarak bile
// emin olamadım") → somut örnekler; "doğru sepete koy" deniyordu ama dokununca nesne hiçbir yere gitmiyordu → sürükle-bırak.

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
const emblemSize = (n: number) => (n <= 1 ? 76 : n === 2 ? 46 : 40);   // iki örnek yan yana sığsın (56'da alt alta düşüyordu)

interface Rect { x: number; y: number; w: number; h: number }
// Bırakma isabeti: sepet dikdörtgeni parmağa dostu olsun diye her yandan genişletilir (iki sepet arası 14 px; çakışırsa merkeze yakın olan).
const HIT_PAD = 18;
const WEB_NO_SCROLL = Platform.OS === 'web' ? ({ touchAction: 'none', userSelect: 'none', cursor: 'grab' } as object) : null;

/**
 * Sürüklenen nesne kartı. Bırakma sonucu üst bileşenden döner: true → nesne sepete girdi (kart kalkar), false → yayla yerine döner.
 * PanResponder bir kez kurulur; işleyiciler H.current'ta her render'da tazelenir (sürükleme sırasında state değişse de kopmaz).
 */
function DraggableItem({ emoji, disabled, bump, onStart, onMove, onEnd }: {
    emoji: string;
    disabled: boolean;
    bump: Animated.Value;
    onStart: () => void;
    onMove: (x: number, y: number) => void;
    onEnd: (x: number, y: number) => boolean;
}) {
    const pan = useRef(new Animated.ValueXY()).current;
    const [dragging, setDragging] = useState(false);
    const H = useRef({ disabled, onStart, onMove, onEnd });
    H.current = { disabled, onStart, onMove, onEnd };

    const springBack = () => Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6 }).start();

    const responder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !H.current.disabled,
            onMoveShouldSetPanResponder: () => !H.current.disabled,
            onPanResponderTerminationRequest: () => false,
            onPanResponderGrant: () => {
                pan.setValue({ x: 0, y: 0 });
                setDragging(true);
                H.current.onStart();
            },
            onPanResponderMove: (_e, g) => {
                pan.setValue({ x: g.dx, y: g.dy });
                H.current.onMove(g.moveX, g.moveY);
            },
            onPanResponderRelease: (_e, g) => {
                setDragging(false);
                if (!H.current.onEnd(g.moveX, g.moveY)) springBack();
            },
            onPanResponderTerminate: () => {
                setDragging(false);
                H.current.onMove(-1, -1);
                springBack();
            },
        }),
    ).current;

    return (
        <Animated.View
            {...responder.panHandlers}
            style={[
                styles.itemCard,
                dragging && styles.itemCardDragging,
                { transform: [{ scale: bump }, ...pan.getTranslateTransform(), { scale: dragging ? 1.1 : 1 }] },
                WEB_NO_SCROLL,
            ]}
        >
            <Text style={styles.itemEmoji} selectable={false}>{emoji}</Text>
        </Animated.View>
    );
}

export default function AkilliSiniflandir({ onGameEnd, onExit, childName = 'Küçük Kaşif' }: Props) {
    // En kolay grupla (hayvan/yiyecek) başla; eskiden en kavramsal grupla (meyve/sebze) başlıyordu.
    const START_DIFF = 1;
    const { recordLevel } = useAdaptiveDifficulty({
        minDifficulty: 1, maxDifficulty: 5, checkpointEvery: 3, startDifficulty: START_DIFF,
    });

    const [round, setRound] = useState(1);
    const [current, setCurrent] = useState<Round>(() => buildRound(START_DIFF));
    const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const [selected, setSelected] = useState<string | null>(null);   // son bırakılan sepet (yanlışta kırmızı + sallanır)
    const [placedKey, setPlacedKey] = useState<string | null>(null);  // doğru bırakılan sepet (nesne içinde görünür)
    const [hoverKey, setHoverKey] = useState<string | null>(null);    // sürüklenen nesnenin üstünde durduğu sepet
    const [gameReady, setGameReady] = useState(false);

    const startTimeRef = useRef(Date.now());
    const levelStartRef = useRef(Date.now());
    const levelErrorsRef = useRef(0);
    const totalMovesRef = useRef(0);
    const totalErrorsRef = useRef(0);
    const diffRef = useRef(START_DIFF);
    const lockRef = useRef(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const basketRefs = useRef<Record<string, View | null>>({});
    const basketRects = useRef<Record<string, Rect>>({});
    const hoverRef = useRef<string | null>(null);

    const bump = useRef(new Animated.Value(1)).current;
    const shake = useRef(new Animated.Value(0)).current;

    React.useEffect(() => () => { timersRef.current.forEach(clearTimeout); stopSpeech(); }, []);
    const startTimer = (t: ReturnType<typeof setTimeout>) => { timersRef.current.push(t); return t; };

    // Sete özel sesli soru: oyun başlayınca ve HER TURDA (eskiden yalnız grup seti değişince okunuyordu: kullanıcı
    // "her sahnede çalmıyor" dedi). 2. turdan itibaren 'Harika!' bitsin diye kısa gecikmeyle. Tekrar Dinle de aynı soruyu okur.
    const prompt = SETS[current.setIndex].prompt;
    useEffect(() => {
        if (!gameReady) return;
        const t = setTimeout(() => speak(prompt, { instructions: HAPPY_VOICE }), round === 1 ? 0 : 300);
        return () => clearTimeout(t);
    }, [gameReady, prompt, round]);

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
        setPlacedKey(null);
        setFeedback('idle');
        lockRef.current = false;
    }, [round, recordLevel, onGameEnd]);

    // ---- Sürükleme: sepet ölçümü ve isabet ----
    const measureBaskets = () => {
        Object.entries(basketRefs.current).forEach(([key, node]) => {
            node?.measureInWindow?.((x, y, w, h) => {
                if ([x, y, w, h].every(Number.isFinite) && w > 0 && h > 0) basketRects.current[key] = { x, y, w, h };
            });
        });
    };

    const hitBasket = (x: number, y: number): string | null => {
        let best: string | null = null;
        let bestDist = Infinity;
        for (const [key, r] of Object.entries(basketRects.current)) {
            if (x >= r.x - HIT_PAD && x <= r.x + r.w + HIT_PAD && y >= r.y - HIT_PAD && y <= r.y + r.h + HIT_PAD) {
                const d = Math.abs(x - (r.x + r.w / 2));
                if (d < bestDist) { bestDist = d; best = key; }
            }
        }
        return best;
    };

    const handleDragMove = (x: number, y: number) => {
        const k = x < 0 ? null : hitBasket(x, y);
        if (k !== hoverRef.current) { hoverRef.current = k; setHoverKey(k); }
    };

    // Nesne bir sepete bırakıldı: doğruysa girer (true), yanlışsa sepet sallanır ve nesne döner, dışarıdaysa sessizce döner.
    const handleDrop = (x: number, y: number): boolean => {
        hoverRef.current = null;
        setHoverKey(null);
        if (lockRef.current) return false;
        const key = hitBasket(x, y);
        if (!key) return false;
        totalMovesRef.current += 1;
        setSelected(key);

        if (key === current.answer) {
            lockRef.current = true;
            setFeedback('correct');
            setPlacedKey(key);
            speak('Harika!');
            Animated.sequence([
                Animated.timing(bump, { toValue: 1.15, duration: 140, useNativeDriver: true }),
                Animated.timing(bump, { toValue: 1, duration: 140, useNativeDriver: true }),
            ]).start();
            const solvedInDiff = diffRef.current;
            startTimer(setTimeout(() => nextRound(solvedInDiff), 900));
            return true;
        }
        levelErrorsRef.current += 1;
        totalErrorsRef.current += 1;
        setFeedback('wrong');
        shake.setValue(0);
        Animated.sequence([
            Animated.timing(shake, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shake, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
        startTimer(setTimeout(() => { if (!lockRef.current) { setFeedback('idle'); setSelected(null); } }, 550));
        return false;
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

                {/* Nesne: sepete sürüklenir. Doğru bırakılınca kart kalkar (nesne sepetin içinde görünür). */}
                <View style={styles.itemWrap}>
                    {feedback === 'correct' ? (
                        <View style={styles.itemSlot} />
                    ) : (
                        <DraggableItem
                            key={`${round}-${current.emoji}`}
                            emoji={current.emoji}
                            disabled={lockRef.current}
                            bump={bump}
                            onStart={measureBaskets}
                            onMove={handleDragMove}
                            onEnd={handleDrop}
                        />
                    )}
                </View>

                {/* Sepetler: yazısız, büyük renkli sepetler + grubun somut örnekleri */}
                <View style={styles.catsRow}>
                    {current.cats.map((cat) => {
                        const isSel = selected === cat.key;
                        const isHover = hoverKey === cat.key;
                        const showCorrect = feedback === 'correct' && cat.key === current.answer;
                        const showWrong = feedback === 'wrong' && isSel && cat.key !== current.answer;
                        return (
                            <Animated.View key={cat.key} style={showWrong ? { transform: [{ translateX: shake }] } : undefined}>
                                <View
                                    ref={(node) => { basketRefs.current[cat.key] = node; }}
                                    collapsable={false}
                                    style={[
                                        styles.catCard,
                                        { width: CARD, height: CARD, backgroundColor: cat.bg, borderColor: cat.border },
                                        isHover && styles.catHover,
                                        showCorrect && styles.catCorrect,
                                        showWrong && styles.catWrong,
                                    ]}
                                    accessibilityLabel={cat.a11y}
                                >
                                    <View style={styles.emblemRow}>
                                        {cat.emblem.map((e, i) => (
                                            <Text key={i} style={{ fontSize: emblemSize(cat.emblem.length) }} selectable={false}>{e}</Text>
                                        ))}
                                    </View>
                                    {placedKey === cat.key && (
                                        <View style={styles.placedItem} pointerEvents="none">
                                            <Text style={styles.placedEmoji}>{current.emoji}</Text>
                                        </View>
                                    )}
                                    {showCorrect && <View style={styles.checkBadge}><Text style={styles.checkText}>✓</Text></View>}
                                </View>
                            </Animated.View>
                        );
                    })}
                </View>

                {/* Yazı yok: yalnız doğruda 🎉 (yanlışta emoji gösterilmez; satır boşken de yer tutar) */}
                <Text style={styles.hint}>{feedback === 'correct' ? '🎉' : ''}</Text>

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
                    interaction="drag"
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

    // Sürüklenen kart sepetlerin üstünden geçsin: nesne alanı sepetlerin üstünde çizilir.
    itemWrap: { zIndex: 20, width: 150, height: 150 },
    itemSlot: { width: 150, height: 150 },
    itemCard: {
        width: 150, height: 150, borderRadius: 28, backgroundColor: '#FFFDF5', borderWidth: 4, borderColor: '#81C784',
        alignItems: 'center', justifyContent: 'center', elevation: 5,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5,
    },
    itemCardDragging: { borderColor: '#2E7D32', elevation: 14, zIndex: 50 },
    itemEmoji: { fontSize: 90 },

    catsRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 24, zIndex: 1 },
    catCard: {
        borderRadius: 28, borderWidth: 5, alignItems: 'center', justifyContent: 'center', padding: 8,
        elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 5,
    },
    catHover: { borderWidth: 8, transform: [{ scale: 1.05 }] },
    catCorrect: { borderColor: '#2E7D32', borderWidth: 7 },
    catWrong: { borderColor: '#C62828', borderWidth: 7, opacity: 0.85 },
    emblemRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 4 },
    placedItem: {
        position: 'absolute', bottom: 6, alignSelf: 'center', width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFFDF5',
        alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#2E7D32',
    },
    placedEmoji: { fontSize: 40 },
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
