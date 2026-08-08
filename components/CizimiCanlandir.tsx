import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// ✨ ÇİZİMİNİ CANLANDIR - Çiz, sonra çizimin oynasın (Sanat)
// Serbest çizim + "Canlandır" düğmesi: çizim hafifçe sallanıp zıplar (sadece
// animasyon; oyunu bitirmez). Kaydet düğmesi eseri panele gönderir.
// ============================================

const USE_NATIVE = true;
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const CANVAS_BG = '#fffef9';
const COLORS = ['#ef476f', '#f78c6b', '#ffd166', '#06d6a0', '#118ab2', '#5f4b8b', '#FF6EC7', '#000000'];
const SIZES = [6, 12, 20];
const MIN_STEP = 2;

type Point = { x: number; y: number };
type Stroke = { color: string; size: number; points: Point[] };

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; cizimResimBase64?: string; cizimResimFormat?: 'png' | 'jpeg'; zorlukSeviyesi?: number; kazanimOdagi?: string },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function CizimiCanlandir({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [liveStroke, setLiveStroke] = useState<Stroke | null>(null);
  const liveStrokeRef = useRef<Stroke | null>(null);
  const canvasRef = useRef<View>(null);
  const [canvas, setCanvas] = useState({ w: 0, h: 0 });
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [playing, setPlaying] = useState(false);
  const [saved, setSaved] = useState(false);
  const startTimeRef = useRef(Date.now());
  const colorRef = useRef(color); colorRef.current = color;
  const sizeRef = useRef(size); sizeRef.current = size;
  const wiggle = useRef(new Animated.Value(0)).current;

  const allStrokes = useMemo(() => (liveStroke ? [...strokes, liveStroke] : strokes), [strokes, liveStroke]);

  useEffect(() => {
    if (playing) {
      const loop = Animated.loop(Animated.sequence([
        Animated.timing(wiggle, { toValue: 1, duration: 380, useNativeDriver: USE_NATIVE }),
        Animated.timing(wiggle, { toValue: -1, duration: 380, useNativeDriver: USE_NATIVE }),
        Animated.timing(wiggle, { toValue: 0, duration: 380, useNativeDriver: USE_NATIVE }),
      ]));
      loop.start();
      return () => { loop.stop(); wiggle.setValue(0); };
    }
  }, [playing, wiggle]);

  const addPoint = (x: number, y: number) => {
    const base = liveStrokeRef.current ?? { color: colorRef.current, size: sizeRef.current, points: [] as Point[] };
    const points = [...base.points];
    const last = base.points[base.points.length - 1];
    if (last) {
      const dx = x - last.x, dy = y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = Math.max(MIN_STEP, base.size * 0.6);
      const steps = Math.floor(dist / step);
      for (let i = 1; i <= steps; i++) { const r = i / (steps + 1); points.push({ x: last.x + dx * r, y: last.y + dy * r }); }
    }
    points.push({ x, y });
    const next = { ...base, points };
    liveStrokeRef.current = next;
    setLiveStroke(next);
    setSaved(false);
  };
  const finishStroke = () => {
    const c = liveStrokeRef.current;
    if (c) setStrokes((p) => [...p, c]);
    setLiveStroke(null); liveStrokeRef.current = null;
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !playing,
    onMoveShouldSetPanResponder: () => !playing,
    onPanResponderGrant: (e) => addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY),
    onPanResponderMove: (e) => addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY),
    onPanResponderRelease: (e) => { addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY); finishStroke(); },
    onPanResponderTerminate: (e) => { addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY); finishStroke(); },
  }), [playing]);

  const toPath = (pts: Point[]): string => {
    if (!pts.length) return '';
    if (pts.length === 1) { const p = pts[0]; return `M ${p.x} ${p.y} L ${p.x} ${p.y}`; }
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  const clearCanvas = () => { setStrokes([]); setLiveStroke(null); liveStrokeRef.current = null; setPlaying(false); setSaved(false); };
  const hasContent = strokes.length > 0 || !!liveStroke;

  // SADECE animasyon; oyunu BİTİRMEZ.
  const togglePlay = () => {
    if (!hasContent) return;
    const next = !playing;
    setPlaying(next);
    if (next) speak('Bak, çizimin oynuyor!', { instructions: HAPPY_VOICE });
  };

  // Kaydet: eseri panele gönderir (oyunu bitirir).
  const saveDrawing = async () => {
    const bundle = liveStrokeRef.current ? [...strokes, liveStrokeRef.current] : strokes;
    if (bundle.length === 0) return;
    setPlaying(false);
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    const totalPoints = bundle.reduce((s, st) => s + st.points.length, 0);
    let base64: string | undefined;
    try {
      if (canvasRef.current) {
        let data: string | undefined;
        if (Platform.OS === 'web') {
          const { toPng } = await import('html-to-image');
          data = await toPng(canvasRef.current as unknown as HTMLElement, { pixelRatio: 2, cacheBust: true, backgroundColor: CANVAS_BG });
        } else {
          data = await captureRef(canvasRef, { format: 'png', quality: 0.9, result: 'base64' });
        }
        if (data) base64 = data.includes(',') ? data.split(',')[1] : data;
      }
    } catch (e) { console.warn('Resim olusturulamadi:', e); }
    speak('Çizimini kaydettim! Aferin.', { instructions: HAPPY_VOICE });
    onGameEnd('cizimi-canlandir', duration, totalPoints, 0, undefined, {
      cizimVerisi: JSON.stringify({ strokes: bundle }),
      cizimResimBase64: base64,
      cizimResimFormat: 'png',
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sanat: Yaratıcı İfade (çizim + canlandırma)',
    });
    setSaved(true);
  };

  const rotate = wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-5deg', '5deg'] });
  const translateY = wiggle.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, -10, 0] });

  return (
    <View style={styles.container}>
      {!gameReady && (
        <CountdownOverlay
          message="Parmağınla bir resim çiz, sonra çizimini canlandır!"
          childName={childName}
          countdownSeconds={5}
          interaction="draw"
          onComplete={() => { startTimeRef.current = Date.now(); setGameReady(true); }}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#EC407A" />
        </TouchableOpacity>
        <Text style={styles.title}>✨ Çizimini Canlandır</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.smallBtn} onPress={clearCanvas} disabled={!hasContent} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={20} color={hasContent ? '#e53935' : '#ccc'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, styles.saveBtnSm, saved && styles.savedBtnSm]} onPress={saveDrawing} disabled={!hasContent} activeOpacity={0.8}>
            <Ionicons name={saved ? 'checkmark' : 'save'} size={20} color={saved ? '#fff' : hasContent ? '#43A047' : '#ccc'} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.hint}>{playing ? 'Çizimin dans ediyor! 💃' : 'Bir şey çiz, sonra "Canlandır"a bas!'}</Text>

      <View
        ref={canvasRef}
        style={styles.canvas}
        onLayout={(e) => setCanvas({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        {...panResponder.panHandlers}
      >
        {canvas.w > 0 && (
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate }, { translateY }] }]}>
            <Svg width={canvas.w} height={canvas.h} pointerEvents="none">
              {allStrokes.filter((s): s is Stroke => Boolean(s && s.points)).map((s, i) => (
                <Path key={i} d={toPath(s.points)} stroke={s.color} strokeWidth={s.size} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </Svg>
          </Animated.View>
        )}
      </View>

      <TouchableOpacity style={[styles.playBtn, playing && styles.playBtnOn, !hasContent && styles.playBtnDisabled]} onPress={togglePlay} disabled={!hasContent} activeOpacity={0.85}>
        <Ionicons name={playing ? 'pause' : 'play'} size={24} color="#fff" />
        <Text style={styles.playText}>{playing ? 'Durdur' : 'Canlandır'}</Text>
      </TouchableOpacity>

      <View style={styles.palette}>
        {COLORS.map((c) => (
          <TouchableOpacity key={c} style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]} onPress={() => { setColor(c); setPlaying(false); }} activeOpacity={0.85}>
            {color === c && <Ionicons name="checkmark" size={20} color="#fff" />}
          </TouchableOpacity>
        ))}
        {SIZES.map((s, idx) => (
          <TouchableOpacity key={s} style={[styles.sizeOpt, size === s && styles.sizeOptActive]} onPress={() => setSize(s)} activeOpacity={0.85}>
            <View style={{ width: 8 + idx * 8, height: 8 + idx * 8, borderRadius: 20, backgroundColor: color }} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF0F5', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  title: { fontSize: 18, fontWeight: '900', color: '#EC407A' },
  headerActions: { flexDirection: 'row', gap: 8 },
  smallBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  saveBtnSm: { borderWidth: 2, borderColor: '#43A047' },
  savedBtnSm: { backgroundColor: '#43A047', borderColor: '#2E7D32' },
  hint: { fontSize: 15, fontWeight: '700', color: '#C2185B', marginVertical: 6, textAlign: 'center', paddingHorizontal: 16 },
  canvas: { flex: 1, width: '94%', backgroundColor: CANVAS_BG, borderRadius: 20, borderWidth: 3, borderColor: '#F8BBD0', overflow: 'hidden' },
  playBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EC407A', paddingVertical: 12, paddingHorizontal: 30, borderRadius: 26, marginTop: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 4 },
  playBtnOn: { backgroundColor: '#7E57C2' },
  playBtnDisabled: { backgroundColor: '#ccc' },
  playText: { color: '#fff', fontSize: 17, fontWeight: '900' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, maxWidth: 520 },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(0,0,0,0.12)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 3 },
  swatchActive: { borderColor: '#212121', transform: [{ scale: 1.12 }] },
  sizeOpt: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#E0E0E0' },
  sizeOptActive: { borderColor: '#EC407A', backgroundColor: '#FCE4EC' },
});
