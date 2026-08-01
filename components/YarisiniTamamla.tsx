import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { speak } from '../services/speechService';

// ============================================
// 🦋 YARISINI TAMAMLA - Simetrik tamamlama (Sanat)
// Resmin SOL yarısı verili (soluk); çocuk sağ yarısını çizerek tamamlar.
// Yaratıcı ifade + simetri farkındalığı. Çizim motoru YaraticiCizim ile aynı.
// ============================================

const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const CANVAS_BG = '#fffef9';
const COLORS = ['#ef476f', '#f78c6b', '#ffd166', '#06d6a0', '#118ab2', '#5f4b8b', '#8B4513', '#000000'];
const SIZES = [6, 12, 20];
const MIN_STEP = 2;
const GL = { fill: '#E4E4EA', stroke: '#AEB6BF', strokeWidth: 2 };
const CENTER = { stroke: '#B0BEC5', strokeWidth: 2, strokeDasharray: '8 6' };

type Point = { x: number; y: number };
type Stroke = { color: string; size: number; points: Point[] };

const THEMES: { key: string; name: string; emoji: string; guide: React.ReactNode }[] = [
  {
    key: 'kelebek', name: 'Kelebek', emoji: '🦋',
    guide: (
      <>
        <Ellipse cx={150} cy={150} rx={10} ry={56} {...GL} />
        <Circle cx={108} cy={120} r={42} {...GL} />
        <Circle cx={116} cy={190} r={33} {...GL} />
        <Line x1={150} y1={18} x2={150} y2={282} {...CENTER} />
      </>
    ),
  },
  {
    key: 'kalp', name: 'Kalp', emoji: '❤️',
    guide: (
      <>
        <Path d="M150 214 C 66 156 90 74 150 118 L150 214 Z" {...GL} />
        <Line x1={150} y1={18} x2={150} y2={282} {...CENTER} />
      </>
    ),
  },
  {
    key: 'agac', name: 'Ağaç', emoji: '🌳',
    guide: (
      <>
        <Circle cx={116} cy={122} r={62} {...GL} />
        <Rect x={135} y={180} width={30} height={95} {...GL} />
        <Line x1={150} y1={18} x2={150} y2={282} {...CENTER} />
      </>
    ),
  },
];

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; cizimResimBase64?: string; cizimResimFormat?: 'png' | 'jpeg'; zorlukSeviyesi?: number; kazanimOdagi?: string },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function YarisiniTamamla({ onGameEnd, onExit }: Props) {
  const [themeIdx, setThemeIdx] = useState(0);
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
  const changeTheme = (i: number) => { setThemeIdx(i); clearCanvas(); startTimeRef.current = Date.now(); };

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
    speak('Diğer yarısını da tamamladın! Aferin.', { instructions: HAPPY_VOICE });
    onGameEnd('yarisini-tamamla', duration, totalPoints, 0, undefined, {
      cizimVerisi: JSON.stringify({ tema: THEMES[themeIdx].key, strokes: bundle }),
      cizimResimBase64: base64,
      cizimResimFormat: 'png',
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sanat: Simetri Farkındalığı ve Yaratıcı İfade (yarısını tamamlama)',
    });
    setSaved(true);
  };

  const theme = THEMES[themeIdx];
  const hasContent = strokes.length > 0 || !!liveStroke;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#5E35B1" />
        </TouchableOpacity>
        <Text style={styles.title}>🦋 Yarısını Tamamla</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.smallBtn} onPress={clearCanvas} disabled={!hasContent} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={20} color={hasContent ? '#e53935' : '#ccc'} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.smallBtn, styles.saveBtn, saved && styles.savedBtn]} onPress={save} disabled={!hasContent} activeOpacity={0.8}>
            <Ionicons name={saved ? 'checkmark' : 'save'} size={20} color={saved ? '#fff' : hasContent ? '#43A047' : '#ccc'} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.picRow}>
        {THEMES.map((t, i) => (
          <TouchableOpacity key={t.key} style={[styles.picBtn, themeIdx === i && styles.picActive]} onPress={() => changeTheme(i)} activeOpacity={0.85}>
            <Text style={styles.picEmoji}>{t.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.hint}>Soldaki yarısı hazır — sen sağ yarısını çiz!</Text>

      <View
        ref={canvasRef}
        style={styles.canvas}
        onLayout={(e) => setCanvas({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        {...panResponder.panHandlers}
      >
        {canvas.w > 0 && (
          <>
            <Svg width={canvas.w} height={canvas.h} viewBox="-18 -18 336 336" preserveAspectRatio="xMidYMid meet" pointerEvents="none" style={StyleSheet.absoluteFill}>
              {theme.guide}
            </Svg>
            <Svg width={canvas.w} height={canvas.h} pointerEvents="none" style={StyleSheet.absoluteFill}>
              {allStrokes.filter((s): s is Stroke => Boolean(s && s.points)).map((s, i) => (
                <Path key={i} d={toPath(s.points)} stroke={s.color} strokeWidth={s.size} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </Svg>
          </>
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
  title: { fontSize: 18, fontWeight: '900', color: '#5E35B1' },
  headerActions: { flexDirection: 'row', gap: 8 },
  smallBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  saveBtn: { borderWidth: 2, borderColor: '#43A047' },
  savedBtn: { backgroundColor: '#43A047', borderColor: '#2E7D32' },
  picRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingTop: 6 },
  picBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent', elevation: 2 },
  picActive: { borderColor: '#7E57C2', transform: [{ scale: 1.08 }] },
  picEmoji: { fontSize: 26 },
  hint: { fontSize: 14, fontWeight: '700', color: '#7E57C2', marginVertical: 6 },
  canvas: { flex: 1, width: '94%', backgroundColor: CANVAS_BG, borderRadius: 20, borderWidth: 3, borderColor: '#D1C4E9', overflow: 'hidden' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, maxWidth: 520 },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(0,0,0,0.12)', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 3 },
  swatchActive: { borderColor: '#212121', transform: [{ scale: 1.12 }] },
  sizeOpt: { width: 46, height: 46, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#E0E0E0' },
  sizeOptActive: { borderColor: '#7E57C2', backgroundColor: '#EDE7F6' },
});
