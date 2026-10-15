import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, ImageSourcePropType, Platform, Pressable, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Painting } from '../../constants/minikMuze';
import { HUNT_HELP, HUNT_WRONG } from '../../constants/minikMuzeHunt';
import { PUZZLE_DONE, PUZZLE_HARDER, PUZZLE_INTRO } from '../../constants/minikMuzeYapboz';
import { fitContain } from '../../lib/minikMuzeMath';
import { gridForLevel, hasNextLevel, isCorrectSlot, pieceCount, pieceRect, showHint, shuffleOrder, trayScale } from '../../lib/tabloYapbozu';
import { speak, speakThenWait, stopSpeech } from '../../services/speechService';
import GameExitButton from '../GameExitButton';
import ListenButton from '../ListenButton';
import { PAINTING_IMAGES } from './paintingImages';
import { useStageSize } from './useStageSize';

// ============================================
// 🧩 TABLO YAPBOZU — tablonun parçalarını yerine koy (Minik Müze, Sanat + parça-bütün MAB.2).
// Dokunarak oynanır: önce tepsiden bir parçaya, sonra tablodaki yerine dokun (sürükleme yok: küçük çocuk ve iPhone için güvenli).
// Tablo kendi en-boy oranında bölünür; 4 parça ile başlar, bitirince 9 parçaya geçilebilir.
// Mantık (saf, testli): lib/tabloYapbozu.ts. Sesler: constants/minikMuzeYapboz.ts (+ Detay Avı'nın yanlış/yardım cümleleri).
// ============================================

const HAPPY_VOICE = 'Speak in Turkish like a warm, gentle museum guide for small children. Calm and friendly.';
const WALL = '#2B2119';

interface PieceCropProps {
    source: ImageSourcePropType;
    board: { w: number; h: number };
    id: number;
    cols: number;
    rows: number;
    scale: number;
}

/** Tablonun bir parçası: tam boy görsel, parçanın penceresinde kırpılmış olarak. */
function PieceCrop({ source, board, id, cols, rows, scale }: PieceCropProps) {
    const r = pieceRect(id, { cols, rows }, board.w, board.h);
    return (
        <View style={{ width: r.w * scale, height: r.h * scale, overflow: 'hidden' }} pointerEvents="none">
            <Image
                source={source}
                style={{ position: 'absolute', width: board.w * scale, height: board.h * scale, left: -r.left * scale, top: -r.top * scale }}
                resizeMode="cover"
            />
        </View>
    );
}

interface Props {
    painting: Painting;
    onExit: () => void;
    /** Tablo tamamlanınca (her seviyede) çağrılır. */
    onCompleted: (paintingId: string) => void;
}

export default function TabloYapbozu({ painting, onExit, onCompleted }: Props) {
    const win = useWindowDimensions();
    const sideBySide = win.width > win.height && win.height < 620;
    const { ref: stageRef, size: stage, onLayout } = useStageSize(
        sideBySide
            ? { w: win.width * 0.6 - 16, h: Math.max(120, win.height - 90) }
            : { w: win.width - 16, h: Math.max(200, win.height - 400) },
    );

    const [level, setLevel] = useState(0);
    const [round, setRound] = useState(0);
    const [placed, setPlaced] = useState<number[]>([]);
    const [selected, setSelected] = useState<number | null>(null);
    const [wrong, setWrong] = useState(0);
    const [hintSlot, setHintSlot] = useState<number | null>(null);
    const [done, setDone] = useState(false);
    const [tip, setTip] = useState<string | null>(null);
    const mountedRef = useRef(true);
    const runRef = useRef(0);
    const tipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pulse = useRef(new Animated.Value(0)).current;

    const g = gridForLevel(level);
    const n = pieceCount(g);
    const source = PAINTING_IMAGES[painting.id];
    const board = fitContain(stage.w - 16, stage.h - 16, painting.aspect);
    const seed = useMemo(() => Array.from(painting.id).reduce((a, c) => a + c.charCodeAt(0), 0) * 31 + round * 7 + level * 3 + 1, [painting.id, round, level]);
    const order = useMemo(() => shuffleOrder(n, seed), [n, seed]);
    const tray = order.filter((id) => !placed.includes(id));
    const sampleRect = pieceRect(0, g, board.w, board.h);
    const scale = trayScale(sampleRect, g);

    useEffect(() => () => {
        mountedRef.current = false;
        runRef.current++;
        stopSpeech();
        if (tipTimer.current) clearTimeout(tipTimer.current);
    }, []);

    // Doğru yeri gösteren ipucu halkası nabız gibi atar
    useEffect(() => {
        if (hintSlot === null) return;
        const loop = Animated.loop(Animated.sequence([
            Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
            Animated.timing(pulse, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: Platform.OS !== 'web' }),
        ]));
        loop.start();
        return () => loop.stop();
    }, [hintSlot, pulse]);

    // Açılış yönergesi (yalnız ilk açılışta)
    useEffect(() => {
        speak(PUZZLE_INTRO, { instructions: HAPPY_VOICE });
    }, []);

    const showTip = (text: string) => {
        setTip(text);
        if (tipTimer.current) clearTimeout(tipTimer.current);
        tipTimer.current = setTimeout(() => { if (mountedRef.current) setTip(null); }, 2500);
    };

    const resetBoard = () => {
        runRef.current++;
        stopSpeech();
        setPlaced([]);
        setSelected(null);
        setWrong(0);
        setHintSlot(null);
        setDone(false);
        setTip(null);
    };

    const onPiece = (id: number) => {
        if (done) return;
        setSelected((prev) => (prev === id ? null : id));
        setWrong(0);
        setHintSlot(null);
        setTip(null);
    };

    const onSlot = (slot: number) => {
        if (done || placed.includes(slot)) return;
        if (selected === null) {
            showTip('Önce bir parçaya dokun!');
            return;
        }
        if (isCorrectSlot(selected, slot)) {
            const nextPlaced = [...placed, selected];
            setPlaced(nextPlaced);
            setSelected(null);
            setWrong(0);
            setHintSlot(null);
            setTip(null);
            if (nextPlaced.length === n) {
                setDone(true);
                onCompleted(painting.id);
                const run = ++runRef.current;
                stopSpeech();
                (async () => {
                    await speakThenWait('Aferin!', 200, { instructions: HAPPY_VOICE });
                    if (run !== runRef.current || !mountedRef.current) return;
                    speak(PUZZLE_DONE, { instructions: HAPPY_VOICE });
                })();
            } else {
                stopSpeech();
                speak('Aferin!', { instructions: HAPPY_VOICE });
            }
            return;
        }
        const w = wrong + 1;
        setWrong(w);
        stopSpeech();
        if (showHint(w)) {
            setHintSlot(selected);
            speak(HUNT_HELP, { instructions: HAPPY_VOICE });
        } else {
            speak(HUNT_WRONG, { instructions: HAPPY_VOICE });
        }
    };

    const goHarder = () => {
        resetBoard();
        setLevel((l) => l + 1);
        speak(PUZZLE_HARDER, { instructions: HAPPY_VOICE });
    };

    const playAgain = () => {
        resetBoard();
        setRound((r) => r + 1);
    };

    const subtitle = done ? PUZZLE_DONE : tip ?? (selected !== null ? 'Şimdi bu parçanın yerine dokun!' : 'Tablonun parçalarını yerine koy!');

    return (
        <View key="puzzle" style={styles.container}>
            <View style={[styles.header, sideBySide && styles.headerSide]}>
                <GameExitButton onPress={onExit} accessibilityLabel="Tabloya dön" />
                <View style={styles.plaque}>
                    <Text style={styles.plaqueTitle} numberOfLines={1}>🧩 Tablo Yapbozu</Text>
                    <Text style={styles.plaqueArtist} numberOfLines={1}>{painting.title}</Text>
                </View>
                <View style={{ width: 44 }} />
            </View>

            <View style={[styles.body, sideBySide && styles.bodyRow]}>
                <View ref={stageRef} style={styles.stage} onLayout={onLayout}>
                    {board.w > 0 && (
                        <View style={{ position: 'absolute', left: (stage.w - board.w) / 2, top: (stage.h - board.h) / 2, width: board.w, height: board.h }}>
                            {/* Silik tablo: parçaların nereye oturacağına dair görsel ipucu (okuma bilmeyen çocuk için) */}
                            <Image source={source} style={{ width: board.w, height: board.h, opacity: done ? 1 : 0.2 }} resizeMode="cover" />
                            {Array.from({ length: n }, (_, id) => {
                                const r = pieceRect(id, g, board.w, board.h);
                                const isPlaced = placed.includes(id);
                                return (
                                    <Pressable
                                        key={id}
                                        onPress={() => onSlot(id)}
                                        accessibilityRole="button"
                                        accessibilityLabel={isPlaced ? `Parça yerleşti, ${id + 1}. yer` : `Boş yer, ${id + 1}. yer`}
                                        style={{
                                            position: 'absolute', left: r.left, top: r.top, width: r.w, height: r.h,
                                            borderWidth: isPlaced || done ? 0 : 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.45)',
                                        }}
                                    >
                                        {isPlaced && <PieceCrop source={source} board={board} id={id} cols={g.cols} rows={g.rows} scale={1} />}
                                        {hintSlot === id && !isPlaced && (
                                            <Animated.View
                                                pointerEvents="none"
                                                style={[StyleSheet.absoluteFill, { borderWidth: 6, borderColor: '#FFE066', opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }) }]}
                                            />
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}
                </View>

                <View style={[styles.bottom, sideBySide && { ...styles.bottomSide, width: Math.min(380, win.width * 0.4) }]}>
                    {!done && (
                        <View style={styles.tray}>
                            {tray.map((id) => {
                                const sel = selected === id;
                                return (
                                    <Pressable
                                        key={id}
                                        onPress={() => onPiece(id)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Yapboz parçası ${id + 1}`}
                                        accessibilityState={{ selected: sel }}
                                        style={[styles.trayItem, sel && styles.trayItemSel]}
                                    >
                                        <PieceCrop source={source} board={board} id={id} cols={g.cols} rows={g.rows} scale={scale} />
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}
                    <View style={[styles.subtitle, sideBySide && styles.subtitleSide]}>
                        <Text style={[styles.subtitleText, sideBySide && styles.subtitleTextSide]}>{subtitle}</Text>
                    </View>
                    {done ? (
                        <View style={styles.controls}>
                            {hasNextLevel(level) ? (
                                <TouchableOpacity style={styles.bigBtn} onPress={goHarder} accessibilityRole="button" accessibilityLabel="Daha çok parçalı yapboz">
                                    <Ionicons name="grid" size={24} color="#fff" />
                                    <Text style={styles.bigBtnText}>Daha çok parça</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={styles.bigBtn} onPress={playAgain} accessibilityRole="button" accessibilityLabel="Tekrar oyna">
                                    <Ionicons name="refresh" size={24} color="#fff" />
                                    <Text style={styles.bigBtnText}>Tekrar oyna</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={[styles.bigBtn, { backgroundColor: '#6A8F5B' }]} onPress={onExit} accessibilityRole="button" accessibilityLabel="Tabloya dön">
                                <Ionicons name="images" size={24} color="#fff" />
                                <Text style={styles.bigBtnText}>Tabloya dön</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.controls}>
                            <ListenButton onPress={() => { stopSpeech(); speak(PUZZLE_INTRO, { instructions: HAPPY_VOICE }); }} color="#8D6E63" />
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
    plaque: { flex: 1, marginHorizontal: 12, alignItems: 'center', backgroundColor: '#3C2F23', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 14, borderWidth: 1, borderColor: '#6B5538' },
    plaqueTitle: { fontSize: 17, fontWeight: '900', color: '#F4E7CF' },
    plaqueArtist: { fontSize: 12, color: '#CDB892', marginTop: 1, fontWeight: '600' },
    body: { flex: 1 },
    bodyRow: { flexDirection: 'row' },
    stage: { flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8, borderRadius: 14, backgroundColor: '#1E1711', overflow: 'hidden' },
    bottom: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: Platform.OS === 'web' ? 14 : 24, alignItems: 'center', gap: 10 },
    bottomSide: { justifyContent: 'center', paddingHorizontal: 10, paddingTop: 0, paddingBottom: 12 },
    tray: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, minHeight: 56 },
    trayItem: { padding: 3, borderRadius: 8, borderWidth: 3, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: '#1E1711' },
    trayItemSel: { borderColor: '#FFE066', backgroundColor: '#3C2F23', transform: [{ scale: 1.08 }] },
    subtitle: { width: '100%', maxWidth: 760, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 16, paddingVertical: 10, paddingHorizontal: 16, minHeight: 52, justifyContent: 'center' },
    subtitleSide: { minHeight: 0, paddingVertical: 10, paddingHorizontal: 12 },
    subtitleText: { color: '#FFF8EA', fontSize: 18, lineHeight: 25, fontWeight: '700', textAlign: 'center' },
    subtitleTextSide: { fontSize: 16, lineHeight: 22 },
    controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' },
    bigBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#B5742F', borderRadius: 26, paddingVertical: 13, paddingHorizontal: 22 },
    bigBtnText: { color: '#fff', fontSize: 17, fontWeight: '900' },
});
