import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { speak } from '../services/speechService';

// ============================================
// 📝 ADIM ADIM ÇİZİM - Rehberli çizim (Sanat)
// Her adımda ne çizeceğini kesik kılavuzla gösterir; çocuk çizer, "Sonraki
// Adım"la ilerler; sonunda tam resim çıkar. Yazma öncesi + yönerge takibi.
// ============================================

const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const CANVAS_BG = '#fffef9';
const COLORS = ['#000000', '#ef476f', '#f78c6b', '#ffd166', '#06d6a0', '#118ab2', '#5f4b8b', '#8B4513'];
const SIZES = [6, 12, 20];
const MIN_STEP = 2;
const GG = { stroke: '#90A4AE', strokeWidth: 3, strokeDasharray: '8 6', fill: 'none', strokeLinecap: 'round' as const };

type Point = { x: number; y: number };
type Stroke = { color: string; size: number; points: Point[] };

const PICTURES: { key: string; name: string; emoji: string; steps: { text: string; el: React.ReactNode }[] }[] = [
  {
    key: 'kedi', name: 'Kedi', emoji: '🐱',
    steps: [
      { text: 'Yuvarlak bir kafa çiz', el: <Circle cx={150} cy={158} r={72} {...GG} /> },
      { text: 'İki kulak ekle', el: <><Polygon points="90,100 122,52 130,108" {...GG} /><Polygon points="210,100 178,52 170,108" {...GG} /></> },
      { text: 'Gözleri ve burnu çiz', el: <><Circle cx={126} cy={152} r={10} {...GG} /><Circle cx={174} cy={152} r={10} {...GG} /><Polygon points="144,172 156,172 150,184" {...GG} /></> },
      { text: 'Bıyıkları çiz', el: <><Line x1={150} y1={184} x2={150} y2={196} {...GG} /><Line x1={82} y1={168} x2={122} y2={174} {...GG} /><Line x1={82} y1={188} x2={122} y2={182} {...GG} /><Line x1={218} y1={168} x2={178} y2={174} {...GG} /><Line x1={218} y1={188} x2={178} y2={182} {...GG} /></> },
    ],
  },
  {
    key: 'kardan-adam', name: 'Kardan Adam', emoji: '⛄',
    steps: [
      { text: 'Alt topu çiz', el: <Circle cx={150} cy={228} r={56} {...GG} /> },
      { text: 'Orta topu çiz', el: <Circle cx={150} cy={150} r={42} {...GG} /> },
      { text: 'Kafayı çiz', el: <Circle cx={150} cy={86} r={32} {...GG} /> },
      { text: 'Yüz ve düğmeleri ekle', el: <><Circle cx={140} cy={80} r={5} {...GG} /><Circle cx={160} cy={80} r={5} {...GG} /><Polygon points="150,90 168,94 150,100" {...GG} /><Circle cx={150} cy={140} r={5} {...GG} /><Circle cx={150} cy={160} r={5} {...GG} /></> },
    ],
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

export default function AdimAdim({ onGameEnd, onExit }: Props) {
  const [picIdx, setPicIdx] = useState(0);
  const [cur, setCur] = useState(0);
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

  const pic = PICTURES[picIdx];
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
  const clearStrokes = () => { setStrokes([]); setLiveStroke(null); liveStrokeRef.current = null; setSaved(false); };
  const changePic = (i: number) => { setPicIdx(i); setCur(0); clearStrokes(); startTimeRef.current = Date.now(); };

  const save = async () => {
    const bundle = liveStrokeRef.current ? [...strokes, liveStrokeRef.current] : strokes;
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
    speak(`Bir ${pic.name.toLowerCase()} çizdin! Aferin.`, { instructions: HAPPY_VOICE });
    onGameEnd('adim-adim', duration, totalPoints, 0, undefined, {
      cizimVerisi: JSON.stringify({ resim: pic.key, strokes: bundle }),
      cizimResimBase64: base64,
      cizimResimFormat: 'png',
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sanat: Yönerge Takibiyle Adım Adım Çizim (yazma öncesi)',
    });
    setSaved(true);
  };

  const isLast = cur >= pic.steps.length - 1;
  const hasContent = strokes.length > 0 || !!liveStroke;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#00838F" />
        </TouchableOpacity>
        <Text style={styles.title}>📝 Adım Adım</Text>
        <TouchableOpacity style={styles.smallBtn} onPress={clearStrokes} disabled={!hasContent} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={20} color={hasContent ? '#e53935' : '#ccc'} />
        </TouchableOpacity>
      </View>

      <View style={styles.picRow}>
        {PICTURES.map((p, i) => (
          <TouchableOpacity key={p.key} style={[styles.picBtn, picIdx === i && styles.picActive]} onPress={() => changePic(i)} activeOpacity={0.85}>
            <Text style={styles.picEmoji}>{p.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.stepText}>Adım {cur + 1}/{pic.steps.length}: {pic.steps[cur].text}</Text>

      <View
        ref={canvasRef}
        style={styles.canvas}
        onLayout={(e) => setCanvas({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        {...panResponder.panHandlers}
      >
        {canvas.w > 0 && (
          <>
            <Svg width={canvas.w} height={canvas.h} viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet" pointerEvents="none" style={StyleSheet.absoluteFill}>
              {pic.steps.slice(0, cur + 1).map((st, i) => (
                <G key={i} opacity={i === cur ? 1 : 0.28}>{st.el}</G>
              ))}
            </Svg>
            <Svg width={canvas.w} height={canvas.h} pointerEvents="none" style={StyleSheet.absoluteFill}>
              {allStrokes.filter((s): s is Stroke => Boolean(s && s.points)).map((s, i) => (
                <Path key={i} d={toPath(s.points)} stroke={s.color} strokeWidth={s.size} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </Svg>
          </>
        )}
      </View>

      <TouchableOpacity
        style={[styles.nextBtn, isLast && styles.doneBtn, saved && styles.savedBtn]}
        onPress={() => { if (isLast) save(); else setCur((c) => c + 1); }}
        activeOpacity={0.85}
      >
        <Ionicons name={isLast ? (saved ? 'checkmark-circle' : 'save') : 'arrow-forward'} size={22} color="#fff" />
        <Text style={styles.nextText}>{isLast ? (saved ? 'Kaydedildi' : 'Bitti') : 'Sonraki Adım'}</Text>
      </TouchableOpacity>

      <View style={styles.palette}>
        {COLORS.map((c) => (
          <TouchableOpacity key={c} style={[styles.swatch, { backgroundColor: c }, color === c && styles.swatchActive]} onPress={() => setColor(c)} activeOpacity={0.85}>
            {color === c && <Ionicons name="checkmark" size={18} color="#fff" />}
          </TouchableOpacity>
        ))}
        {SIZES.map((s, idx) => (
          <TouchableOpacity key={s} style={[styles.sizeOpt, size === s && styles.sizeOptActive]} onPress={() => setSize(s)} activeOpacity={0.85}>
            <View style={{ width: 8 + idx * 7, height: 8 + idx * 7, borderRadius: 20, backgroundColor: color }} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0F7FA', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 6 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  title: { fontSize: 19, fontWeight: '900', color: '#00838F' },
  smallBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  picRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingTop: 6 },
  picBtn: { width: 50, height: 50, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent', elevation: 2 },
  picActive: { borderColor: '#00ACC1', transform: [{ scale: 1.08 }] },
  picEmoji: { fontSize: 26 },
  stepText: { fontSize: 15, fontWeight: '800', color: '#00695C', marginVertical: 6, textAlign: 'center', paddingHorizontal: 16 },
  canvas: { flex: 1, width: '94%', backgroundColor: CANVAS_BG, borderRadius: 20, borderWidth: 3, borderColor: '#B2EBF2', overflow: 'hidden' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#00ACC1', paddingVertical: 11, paddingHorizontal: 26, borderRadius: 24, marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 1, elevation: 4 },
  doneBtn: { backgroundColor: '#43A047' },
  savedBtn: { backgroundColor: '#2E7D32' },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 9, paddingVertical: 10, paddingHorizontal: 12, maxWidth: 520 },
  swatch: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(0,0,0,0.12)', elevation: 3 },
  swatchActive: { borderColor: '#212121', transform: [{ scale: 1.12 }] },
  sizeOpt: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#E0E0E0' },
  sizeOptActive: { borderColor: '#00ACC1', backgroundColor: '#E0F7FA' },
});
