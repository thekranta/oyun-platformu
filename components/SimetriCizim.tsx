import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { speak } from '../services/speechService';

// ============================================
// 🪞 SİMETRİ ÇİZİM - Aynalı (simetrik) serbest çizim (Sanat)
// Çocuk bir tarafa çizer, çizgi diğer tarafa AYNALANIR -> kelebek/simetri
// deseni. Yaratıcı ifade + simetri sezgisi. Çizim motoru YaraticiCizim ile aynı.
// ============================================

const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const CANVAS_BG = '#fffef9';
const COLORS = ['#ef476f', '#f78c6b', '#ffd166', '#06d6a0', '#118ab2', '#5f4b8b', '#8B4513', '#000000'];
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

export default function SimetriCizim({ onGameEnd, onExit }: Props) {
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

  const toPath = (points: Point[], mirror: boolean, w: number): string => {
    if (!points || points.length === 0) return '';
    const mapx = (x: number) => (mirror ? w - x : x);
    if (points.length === 1) { const p = points[0]; return `M ${mapx(p.x)} ${p.y} L ${mapx(p.x)} ${p.y}`; }
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapx(p.x)} ${p.y}`).join(' ');
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
    } catch (e) { console.warn('Cizim resmi olusturulamadi:', e); }
    speak('Ne güzel bir simetri! Aferin.', { instructions: HAPPY_VOICE });
    onGameEnd('simetri-cizim', duration, totalPoints, 0, undefined, {
      cizimVerisi: JSON.stringify({ strokes: bundle }),
      cizimResimBase64: base64,
      cizimResimFormat: 'png',
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sanat: Yaratıcı İfade ve Simetri Sezgisi (aynalı çizim)',
    });
    setSaved(true);
  };

  const hasContent = strokes.length > 0 || !!liveStroke;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#5E35B1" />
        </TouchableOpacity>
        <Text style={styles.title}>🪞 Simetri Çizim</Text>
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

      <Text style={styles.hint}>Bir tarafa çiz — diğer taraf aynalanır! 🦋</Text>

      <View
        ref={canvasRef}
        style={styles.canvas}
        onLayout={(e) => setCanvas({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        {...panResponder.panHandlers}
      >
        {canvas.w > 0 && (
          <Svg width={canvas.w} height={canvas.h} pointerEvents="none" style={StyleSheet.absoluteFill}>
            {/* orta simetri çizgisi */}
            <Line x1={canvas.w / 2} y1={0} x2={canvas.w / 2} y2={canvas.h} stroke="#CBD5E1" strokeWidth={2} strokeDasharray="8 8" />
            {allStrokes.filter((s): s is Stroke => Boolean(s && s.points)).map((s, i) => (
              <React.Fragment key={i}>
                <Path d={toPath(s.points, false, canvas.w)} stroke={s.color} strokeWidth={s.size} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                <Path d={toPath(s.points, true, canvas.w)} stroke={s.color} strokeWidth={s.size} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </React.Fragment>
            ))}
          </Svg>
        )}
      </View>

      <View style={styles.palette}>
        {COLORS.map((c) => (
          <TouchableOpacity key={c} style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]} onPress={() => setColor(c)} activeOpacity={0.85}>
            {color === c && <Ionicons name="checkmark" size={22} color="#fff" />}
          </TouchableOpacity>
        ))}
        {SIZES.map((s, idx) => (
          <TouchableOpacity key={s} style={[styles.sizeOpt, size === s && styles.sizeOptActive]} onPress={() => setSize(s)} activeOpacity={0.85}>
            <View style={{ width: 8 + idx * 9, height: 8 + idx * 9, borderRadius: 20, backgroundColor: color }} />
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
  title: { fontSize: 19, fontWeight: '900', color: '#5E35B1' },
  headerActions: { flexDirection: 'row', gap: 8 },
  smallBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  saveBtn: { borderWidth: 2, borderColor: '#43A047' },
  savedBtn: { backgroundColor: '#43A047', borderColor: '#2E7D32' },
  hint: { fontSize: 15, fontWeight: '700', color: '#7E57C2', marginVertical: 6 },
  canvas: { flex: 1, width: '94%', backgroundColor: CANVAS_BG, borderRadius: 20, borderWidth: 3, borderColor: '#D1C4E9', overflow: 'hidden' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, maxWidth: 520 },
  swatch: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(0,0,0,0.08)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 3 },
  swatchActive: { borderColor: '#212121', transform: [{ scale: 1.12 }] },
  sizeOpt: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#E0E0E0' },
  sizeOptActive: { borderColor: '#5E35B1', backgroundColor: '#EDE7F6' },
});
