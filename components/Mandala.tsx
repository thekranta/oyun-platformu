import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import CountdownOverlay from './CountdownOverlay';
import { speak } from '../services/speechService';

// ============================================
// 🌀 MANDALA - Radyal simetrik çizim (Sanat)
// Çocuk çizer, çizgi merkez etrafında 6 yöne (+ aynası) çoğalır -> mandala.
// Yaratıcı ifade + simetri. Çizim motoru YaraticiCizim ile aynı.
// ============================================

const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const CANVAS_BG = '#1A1A2E';
const COLORS = ['#FF6EC7', '#FFD166', '#06D6A0', '#4CC9F0', '#F72585', '#B5179E', '#FEE440', '#ffffff'];
const SIZES = [4, 8, 14];
const N = 6;
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

export default function Mandala({ onGameEnd, onExit, childName }: Props) {
  const [gameReady, setGameReady] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [liveStroke, setLiveStroke] = useState<Stroke | null>(null);
  const liveStrokeRef = useRef<Stroke | null>(null);
  const canvasRef = useRef<View>(null);
  const [canvas, setCanvas] = useState({ w: 0, h: 0 });
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [saved, setSaved] = useState(false);
  const startTimeRef = useRef(Date.now());
  const colorRef = useRef(color); colorRef.current = color;
  const sizeRef = useRef(size); sizeRef.current = size;

  const allStrokes = useMemo(() => (liveStroke ? [...strokes, liveStroke] : strokes), [strokes, liveStroke]);

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
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY),
    onPanResponderMove: (e) => addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY),
    onPanResponderRelease: (e) => { addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY); finishStroke(); },
    onPanResponderTerminate: (e) => { addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY); finishStroke(); },
  }), []);

  const cx = canvas.w / 2, cy = canvas.h / 2;
  const rot = (x: number, y: number, deg: number) => {
    const a = (deg * Math.PI) / 180, dx = x - cx, dy = y - cy;
    return { x: cx + dx * Math.cos(a) - dy * Math.sin(a), y: cy + dx * Math.sin(a) + dy * Math.cos(a) };
  };
  const toPath = (pts: Point[], fn: (x: number, y: number) => Point): string => {
    if (!pts.length) return '';
    if (pts.length === 1) { const q = fn(pts[0].x, pts[0].y); return `M ${q.x} ${q.y} L ${q.x} ${q.y}`; }
    return pts.map((p, i) => { const q = fn(p.x, p.y); return `${i === 0 ? 'M' : 'L'} ${q.x} ${q.y}`; }).join(' ');
  };

  const clearCanvas = () => { setStrokes([]); setLiveStroke(null); liveStrokeRef.current = null; setSaved(false); };
  const undoLast = () => { setStrokes((p) => p.slice(0, -1)); setSaved(false); };

  const saveDrawing = async () => {
    const bundle = liveStrokeRef.current ? [...strokes, liveStrokeRef.current] : strokes;
    if (bundle.length === 0) return;
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
    speak('Muhteşem bir mandala! Aferin.', { instructions: HAPPY_VOICE });
    onGameEnd('mandala', duration, totalPoints, 0, undefined, {
      cizimVerisi: JSON.stringify({ strokes: bundle }),
      cizimResimBase64: base64,
      cizimResimFormat: 'png',
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sanat: Yaratıcı İfade ve Radyal Simetri (mandala)',
    });
    setSaved(true);
  };

  const hasContent = strokes.length > 0 || !!liveStroke;
  const spokes = Array.from({ length: N }, (_, k) => (k * 360) / N);

  return (
    <View style={styles.container}>
      {!gameReady && (
        <CountdownOverlay
          message="Parmağınla çiz, deseninin altı kopyası birden oluşsun!"
          childName={childName}
          countdownSeconds={5}
          interaction="draw"
          onComplete={() => { startTimeRef.current = Date.now(); setGameReady(true); }}
        />
      )}

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#7E57C2" />
        </TouchableOpacity>
        <Text style={styles.title}>🌀 Mandala</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.smallBtn} onPress={undoLast} disabled={!hasContent} activeOpacity={0.8}>
            <Ionicons name="arrow-undo" size={20} color={hasContent ? '#FF9800' : '#ccc'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallBtn} onPress={clearCanvas} disabled={!hasContent} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={20} color={hasContent ? '#e53935' : '#ccc'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, styles.saveBtn, saved && styles.savedBtn]} onPress={saveDrawing} disabled={!hasContent} activeOpacity={0.8}>
            <Ionicons name={saved ? 'checkmark' : 'save'} size={20} color={saved ? '#fff' : hasContent ? '#43A047' : '#ccc'} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.hint}>Çiz — deseninin 6 kopyası birden oluşur! 🌀</Text>

      <View
        ref={canvasRef}
        style={styles.canvas}
        onLayout={(e) => setCanvas({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        {...panResponder.panHandlers}
      >
        {canvas.w > 0 && (
          <Svg width={canvas.w} height={canvas.h} pointerEvents="none" style={StyleSheet.absoluteFill}>
            {/* merkez kılavuz ışınları */}
            {spokes.map((deg, i) => { const p = rot(cx, 8, deg); return <Line key={`s${i}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />; })}
            {allStrokes.filter((s): s is Stroke => Boolean(s && s.points)).map((s, si) => (
              <React.Fragment key={si}>
                {spokes.map((deg, k) => (
                  <React.Fragment key={k}>
                    <Path d={toPath(s.points, (x, y) => rot(x, y, deg))} stroke={s.color} strokeWidth={s.size} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    <Path d={toPath(s.points, (x, y) => rot(2 * cx - x, y, deg))} stroke={s.color} strokeWidth={s.size} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </Svg>
        )}
      </View>

      <View style={styles.palette}>
        {COLORS.map((c) => (
          <TouchableOpacity key={c} style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]} onPress={() => setColor(c)} activeOpacity={0.85}>
            {color === c && <Ionicons name="checkmark" size={20} color={c === '#ffffff' ? '#333' : '#fff'} />}
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
  container: { flex: 1, backgroundColor: '#F3F0FB', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  title: { fontSize: 19, fontWeight: '900', color: '#7E57C2' },
  headerActions: { flexDirection: 'row', gap: 8 },
  smallBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  saveBtn: { borderWidth: 2, borderColor: '#43A047' },
  savedBtn: { backgroundColor: '#43A047', borderColor: '#2E7D32' },
  hint: { fontSize: 15, fontWeight: '700', color: '#7E57C2', marginVertical: 6 },
  canvas: { flex: 1, width: '94%', backgroundColor: CANVAS_BG, borderRadius: 20, borderWidth: 3, borderColor: '#5E35B1', overflow: 'hidden' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, maxWidth: 520 },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(0,0,0,0.15)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 3 },
  swatchActive: { borderColor: '#212121', transform: [{ scale: 1.12 }] },
  sizeOpt: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#E0E0E0' },
  sizeOptActive: { borderColor: '#7E57C2', backgroundColor: '#EDE7F6' },
});
