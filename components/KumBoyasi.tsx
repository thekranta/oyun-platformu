import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { speak } from '../services/speechService';

// ============================================
// 🏖️ KUM BOYASI - Akan/yumuşak boya (Sanat, duyusal)
// Renk seç, parmağını sürükle -> geniş, yumuşak, saydam renk bantları akar
// ve üst üste gelince karışır. Duyusal, rahatlatıcı yaratıcı ifade.
// ============================================

const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const CANVAS_BG = '#FFF8EC';
const COLORS = ['#FF8A65', '#FFD54F', '#4DD0E1', '#81C784', '#BA68C8', '#F06292', '#A1887F', '#4FC3F7'];
const SIZES = [22, 36, 54];
const MIN_STEP = 3;

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

export default function KumBoyasi({ onGameEnd, onExit }: Props) {
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
      const step = Math.max(MIN_STEP, base.size * 0.5);
      const steps = Math.floor(dist / step);
      for (let i = 1; i <= steps; i++) { const r = i / (steps + 1); points.push({ x: last.x + dx * r, y: last.y + dy * r }); }
    }
    points.push({ x, y });
    const next = { ...base, points };
    liveStrokeRef.current = next; setLiveStroke(next); setSaved(false);
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

  const toPath = (pts: Point[]): string => {
    if (!pts.length) return '';
    if (pts.length === 1) { const p = pts[0]; return `M ${p.x} ${p.y} L ${p.x} ${p.y}`; }
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };
  const clearCanvas = () => { setStrokes([]); setLiveStroke(null); liveStrokeRef.current = null; setSaved(false); };
  const undoLast = () => { setStrokes((p) => p.slice(0, -1)); setSaved(false); };

  const save = async () => {
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
    speak('Rengarenk bir kum resmi! Aferin.', { instructions: HAPPY_VOICE });
    onGameEnd('kum-boyasi', duration, totalPoints, 0, undefined, {
      cizimVerisi: JSON.stringify({ strokes: bundle }),
      cizimResimBase64: base64,
      cizimResimFormat: 'png',
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sanat: Duyusal Yaratıcı İfade (akan/kum boyası)',
    });
    setSaved(true);
  };

  const hasContent = strokes.length > 0 || !!liveStroke;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F57C00" />
        </TouchableOpacity>
        <Text style={styles.title}>🏖️ Kum Boyası</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.smallBtn} onPress={undoLast} disabled={!hasContent} activeOpacity={0.8}>
            <Ionicons name="arrow-undo" size={20} color={hasContent ? '#FF9800' : '#ccc'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.smallBtn} onPress={clearCanvas} disabled={!hasContent} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={20} color={hasContent ? '#e53935' : '#ccc'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, styles.saveBtn, saved && styles.savedBtn]} onPress={save} disabled={!hasContent} activeOpacity={0.8}>
            <Ionicons name={saved ? 'checkmark' : 'save'} size={20} color={saved ? '#fff' : hasContent ? '#43A047' : '#ccc'} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.hint}>Parmağını sürükle — rengarenk kum aksın! 🌈</Text>

      <View
        ref={canvasRef}
        style={styles.canvas}
        onLayout={(e) => setCanvas({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        {...panResponder.panHandlers}
      >
        {canvas.w > 0 && (
          <Svg width={canvas.w} height={canvas.h} pointerEvents="none" style={StyleSheet.absoluteFill}>
            {allStrokes.filter((s): s is Stroke => Boolean(s && s.points)).map((s, i) => (
              <Path key={i} d={toPath(s.points)} stroke={s.color} strokeWidth={s.size} strokeOpacity={0.55} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </Svg>
        )}
      </View>

      <View style={styles.palette}>
        {COLORS.map((c) => (
          <TouchableOpacity key={c} style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]} onPress={() => setColor(c)} activeOpacity={0.85}>
            {color === c && <Ionicons name="checkmark" size={20} color="#fff" />}
          </TouchableOpacity>
        ))}
        {SIZES.map((s, idx) => (
          <TouchableOpacity key={s} style={[styles.sizeOpt, size === s && styles.sizeOptActive]} onPress={() => setSize(s)} activeOpacity={0.85}>
            <View style={{ width: 10 + idx * 9, height: 10 + idx * 9, borderRadius: 20, backgroundColor: color, opacity: 0.7 }} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF3E0', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  title: { fontSize: 19, fontWeight: '900', color: '#F57C00' },
  headerActions: { flexDirection: 'row', gap: 8 },
  smallBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  saveBtn: { borderWidth: 2, borderColor: '#43A047' },
  savedBtn: { backgroundColor: '#43A047', borderColor: '#2E7D32' },
  hint: { fontSize: 15, fontWeight: '700', color: '#EF6C00', marginVertical: 6 },
  canvas: { flex: 1, width: '94%', backgroundColor: CANVAS_BG, borderRadius: 20, borderWidth: 3, borderColor: '#FFE0B2', overflow: 'hidden' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, maxWidth: 520 },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(0,0,0,0.12)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 3 },
  swatchActive: { borderColor: '#212121', transform: [{ scale: 1.12 }] },
  sizeOpt: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#E0E0E0' },
  sizeOptActive: { borderColor: '#F57C00', backgroundColor: '#FFF3E0' },
});
