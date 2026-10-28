import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { HUNT_DONE, HUNT_HELP, HUNT_INTRO, HUNT_WRONG } from '../../constants/minikMuzeHunt';
import { Painting } from '../../constants/minikMuze';
import { HuntSpot, HuntTarget, hintLevel, hitTest, nearestSpot, nextTargetIndex } from '../../lib/minikMuzeHunt';
import { fitContain } from '../../lib/minikMuzeMath';
import { speak, speakThenWait, stopSpeech } from '../../services/speechService';
import GameExitButton from '../GameExitButton';
import ListenButton from '../ListenButton';
import { paintingSource, usePreferSmallPaintings } from './paintingImages';
import { useStageSize } from './useStageSize';

// ============================================
// 🔍 DETAY AVI — tabloda söylenen ayrıntıyı bul ve dokun (Minik Müze, Sanat: SNAB.2 sanat eseri inceleme).
// Yönerge sesli okunur; doğru dokunuşta halka + kısa bilgi, yanlışta nazik ipucu, iki yanlıştan sonra parlayan halka.
// Hedef verisi: constants/minikMuzeHunt.ts; dokunuş mantığı (saf, testli): lib/minikMuzeHunt.ts.
// ============================================

const HAPPY_VOICE = 'Speak in Turkish like a warm, gentle museum guide for small children. Calm and friendly.';
const WALL = '#2B2119';
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

interface Props {
    painting: Painting;
    targets: HuntTarget[];
    onExit: () => void;
    /** Üç hedef de bulununca bir kez çağrılır. */
    onCompleted: (paintingId: string) => void;
}

export default function DetayAvi({ painting, targets, onExit, onCompleted }: Props) {
    // İlk tahmin: ölçü (onLayout) gecikirse / hiç gelmezse görsel yine de çizilir; gerçek ölçü gelince düzelir.
    const win = useWindowDimensions();
    const preferSmall = usePreferSmallPaintings();
    // Yatay ve kısa ekran (telefon yan): alt panel tablonun yanına geçer, tablo şerit kalmaz (MinikMuze ile aynı eşik).
    const sideBySide = win.width > win.height && win.height < 620;
    const { ref: stageRef, size: stage, onLayout: onStageLayout } = useStageSize(sideBySide
        ? { w: win.width * 0.6 - 16, h: Math.max(120, win.height - 90) }
        : { w: win.width - 16, h: Math.max(200, win.height - 270) });
    const [idx, setIdx] = useState(0);
    const [wrong, setWrong] = useState(0);
    const [foundRings, setFoundRings] = useState<HuntSpot[]>([]);
    const [busy, setBusy] = useState(false);          // "bulundu" konuşması sürerken yeni dokunuş alınmaz
    const [done, setDone] = useState(false);
    const [hintSpot, setHintSpot] = useState<HuntSpot | null>(null);
    const [round, setRound] = useState(0);            // "Tekrar oyna" için
    const runRef = useRef(0);
    const mountedRef = useRef(true);
    const pulse = useRef(new Animated.Value(0)).current;

    const target = targets[idx];
    const img = fitContain(stage.w - 16, stage.h - 16, painting.aspect);

    useEffect(() => () => { mountedRef.current = false; runRef.current++; stopSpeech(); }, []);

    // Parlayan ipucu halkası nabız gibi atar
    useEffect(() => {
        if (!hintSpot) return;
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(pulse, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        ]));
        loop.start();
        return () => loop.stop();
    }, [hintSpot, pulse]);

    // Av başlangıcı / yeniden oynama: giriş cümlesi, sonra ilk yönerge
    const begin = useCallback(() => {
        const run = ++runRef.current;
        stopSpeech();
        setIdx(0); setWrong(0); setFoundRings([]); setDone(false); setBusy(false); setHintSpot(null);
        (async () => {
            await speakThenWait(HUNT_INTRO, 500, { instructions: HAPPY_VOICE });
            if (run !== runRef.current || !mountedRef.current) return;
            speak(targets[0].prompt, { instructions: HAPPY_VOICE });
        })();
    }, [targets]);

    useEffect(() => { begin(); }, [begin, round]);

    const onTap = (px: number, py: number) => {
        if (busy || done || !target || img.w <= 0) return;
        if (hitTest(target, px, py, img.w, img.h)) {
            const run = ++runRef.current;
            stopSpeech();
            setBusy(true);
            setHintSpot(null);
            setFoundRings((prev) => [...prev, nearestSpot(target, px, py, img.w, img.h)]);
            (async () => {
                await speakThenWait(target.found, 900, { instructions: HAPPY_VOICE });
                if (run !== runRef.current || !mountedRef.current) return;
                await wait(400);
                if (run !== runRef.current || !mountedRef.current) return;
                const next = nextTargetIndex(idx, targets.length);
                if (next === null) {
                    setDone(true);
                    setBusy(false);
                    onCompleted(painting.id);
                    speak(HUNT_DONE, { instructions: HAPPY_VOICE });
                } else {
                    setIdx(next);
                    setWrong(0);
                    setFoundRings([]);
                    setBusy(false);
                    speak(targets[next].prompt, { instructions: HAPPY_VOICE });
                }
            })();
            return;
        }
        // Yanlış dokunuş: nazik ipucu; ikinci yanlıştan sonra hedefe en yakın alanda parlayan halka
        const w = wrong + 1;
        setWrong(w);
        const lvl = hintLevel(w);
        stopSpeech();
        if (lvl >= 2) {
            setHintSpot(nearestSpot(target, px, py, img.w, img.h));
            speak(HUNT_HELP, { instructions: HAPPY_VOICE });
        } else {
            speak(HUNT_WRONG, { instructions: HAPPY_VOICE });
        }
    };

    const ringStyle = (s: HuntSpot, color: string, extra?: object) => {
        const r = Math.max(s.r * img.w * 1.1, 24);
        return { position: 'absolute' as const, left: s.x * img.w - r, top: s.y * img.h - r, width: r * 2, height: r * 2, borderRadius: r, borderWidth: 4, borderColor: color, ...extra };
    };

    return (
        <View key="hunt" style={styles.container}>
            <View style={[styles.header, sideBySide && styles.headerSide]}>
                <GameExitButton onPress={onExit} accessibilityLabel="Tabloya dön" />
                <View style={styles.plaque}>
                    <Text style={styles.plaqueTitle} numberOfLines={1}>🔍 Detay Avı</Text>
                    <Text style={styles.plaqueArtist} numberOfLines={1}>{painting.title}</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <View style={[styles.body, sideBySide && styles.bodyRow]}>
            <View ref={stageRef} style={styles.stage} onLayout={onStageLayout}>
                {img.w > 0 && (
                    // Mutlak konum: görsel kutusu sahnenin (flex) boyutunu belirlemez; sahne ölçüsü hep gerçek yerleşimden gelir.
                    <View style={{ position: 'absolute', left: (stage.w - img.w) / 2, top: (stage.h - img.h) / 2, width: img.w, height: img.h }}>
                        <Image source={paintingSource(painting.id, preferSmall)} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityLabel={painting.title + ' tablosu'} />
                        {foundRings.map((s, i) => <View key={'f' + i} pointerEvents="none" style={ringStyle(s, '#7CFF8A')} />)}
                        {hintSpot && (
                            <Animated.View
                                pointerEvents="none"
                                style={ringStyle(hintSpot, '#FFE066', { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }), borderWidth: 6 })}
                            />
                        )}
                        <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={(e) => {
                                // RN-web'de onPress olayi click'tir: locationX yok, offsetX/Y (hedefe gore) var.
                                const ne = e.nativeEvent as unknown as { locationX?: number; locationY?: number; offsetX?: number; offsetY?: number };
                                onTap(ne.locationX ?? ne.offsetX ?? -1, ne.locationY ?? ne.offsetY ?? -1);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Tabloya dokun"
                        />
                    </View>
                )}
            </View>

            <View style={[styles.bottom, sideBySide && { ...styles.bottomSide, width: Math.min(380, win.width * 0.4) }]}>
                <View style={[styles.subtitle, sideBySide && styles.subtitleSide]}>
                    <Text style={[styles.subtitleText, sideBySide && styles.subtitleTextSide]}>{done ? HUNT_DONE : target?.prompt}</Text>
                </View>
                <View style={styles.dots}>
                    {targets.map((_, i) => (
                        <Ionicons key={i} name={i < idx || done ? 'star' : 'star-outline'} size={26} color={i < idx || done ? '#FFD27A' : '#8A7557'} />
                    ))}
                </View>
                {done ? (
                    <View style={styles.controls}>
                        <TouchableOpacity style={styles.bigBtn} onPress={() => setRound((r) => r + 1)} accessibilityRole="button" accessibilityLabel="Tekrar oyna">
                            <Ionicons name="refresh" size={26} color="#fff" />
                            <Text style={styles.bigBtnText}>Tekrar oyna</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.bigBtn, { backgroundColor: '#6A8F5B' }]} onPress={onExit} accessibilityRole="button" accessibilityLabel="Tabloya dön">
                            <Ionicons name="images" size={26} color="#fff" />
                            <Text style={styles.bigBtnText}>Tabloya dön</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.controls}>
                        <ListenButton onPress={() => { stopSpeech(); if (target) speak(target.prompt, { instructions: HAPPY_VOICE }); }} color="#8D6E63" />
                    </View>
                )}
            </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: WALL },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 16 : 44, paddingBottom: 8 },
    headerSide: { paddingTop: Platform.OS === 'web' ? 8 : 12, paddingBottom: 4 },
    body: { flex: 1 },
    bodyRow: { flexDirection: 'row' },
    bottomSide: { justifyContent: 'center', paddingHorizontal: 10, paddingTop: 0, paddingBottom: 12 },
    subtitleSide: { minHeight: 0, paddingVertical: 10, paddingHorizontal: 12 },
    subtitleTextSide: { fontSize: 17, lineHeight: 23 },
    plaque: { flex: 1, marginHorizontal: 12, alignItems: 'center', backgroundColor: '#3C2F23', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: '#6B5538' },
    plaqueTitle: { fontSize: 17, fontWeight: '900', color: '#F4E7CF' },
    plaqueArtist: { fontSize: 12, color: '#CDB892', marginTop: 1, fontWeight: '600' },
    stage: { flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8, borderRadius: 14, backgroundColor: '#1E1711', overflow: 'hidden' },
    bottom: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'web' ? 16 : 26, alignItems: 'center', gap: 10 },
    subtitle: { width: '100%', maxWidth: 760, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, minHeight: 64, justifyContent: 'center' },
    subtitleText: { color: '#FFF8EA', fontSize: 19, lineHeight: 27, fontWeight: '700', textAlign: 'center' },
    dots: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' },
    bigBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#B5742F', borderRadius: 26, paddingVertical: 14, paddingHorizontal: 24 },
    bigBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});
