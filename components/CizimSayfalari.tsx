import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View, PanResponder } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Rect } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { speak } from '../services/speechService';

// ============================================
// ✏️ ÇİZİM SAYFALARI - Kılavuz çizgili temalı çizim/boyama (Sanat)
// 6 farklı tema; her sayfada kesik (kılavuz) çizgiler var. Çocuk çizgileri
// takip ederek çizer/boyar. Yazma öncesi çizgi çalışması + yaratıcı ifade.
// Motor: parmakla çizim (SVG path), web'de html-to-image ile kaydeder.
// ============================================

const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';
const CANVAS_BG = '#fffef9';

type Point = { x: number; y: number };
type Stroke = { color: string; size: number; points: Point[] };

const COLORS = ['#ef476f', '#f78c6b', '#ffd166', '#06d6a0', '#118ab2', '#5f4b8b', '#8B4513', '#000000'];
const SIZES = [6, 12, 20];

// Kesik kılavuz çizgi ortak stili
const G = { stroke: '#9AA7B2', strokeWidth: 3.5, strokeDasharray: '9 7', fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

interface Theme { key: string; name: string; emoji: string; guide: React.ReactNode }

const THEMES: Theme[] = [
  {
    key: 'ev', name: 'Ev', emoji: '🏠',
    guide: (
      <>
        <Rect x={95} y={140} width={120} height={110} {...G} />
        <Polygon points="80,140 155,78 230,140" {...G} />
        <Rect x={135} y={195} width={40} height={55} {...G} />
        <Rect x={108} y={155} width={32} height={30} {...G} />
      </>
    ),
  },
  {
    key: 'cicek', name: 'Çiçek', emoji: '🌸',
    guide: (
      <>
        <Circle cx={150} cy={120} r={26} {...G} />
        <Circle cx={192} cy={120} r={24} {...G} />
        <Circle cx={171} cy={157} r={24} {...G} />
        <Circle cx={129} cy={157} r={24} {...G} />
        <Circle cx={108} cy={120} r={24} {...G} />
        <Circle cx={129} cy={83} r={24} {...G} />
        <Circle cx={171} cy={83} r={24} {...G} />
        <Line x1={150} y1={150} x2={150} y2={255} {...G} />
        <Ellipse cx={185} cy={215} rx={28} ry={14} {...G} />
      </>
    ),
  },
  {
    key: 'balik', name: 'Balık', emoji: '🐟',
    guide: (
      <>
        <Ellipse cx={140} cy={155} rx={82} ry={48} {...G} />
        <Polygon points="212,155 262,112 262,198" {...G} />
        <Circle cx={108} cy={140} r={9} {...G} />
      </>
    ),
  },
  {
    key: 'araba', name: 'Araba', emoji: '🚗',
    guide: (
      <>
        <Rect x={58} y={150} width={184} height={52} rx={16} {...G} />
        <Rect x={102} y={112} width={92} height={44} rx={12} {...G} />
        <Circle cx={102} cy={206} r={24} {...G} />
        <Circle cx={200} cy={206} r={24} {...G} />
      </>
    ),
  },
  {
    key: 'kelebek', name: 'Kelebek', emoji: '🦋',
    guide: (
      <>
        <Ellipse cx={150} cy={155} rx={10} ry={56} {...G} />
        <Circle cx={110} cy={122} r={40} {...G} />
        <Circle cx={190} cy={122} r={40} {...G} />
        <Circle cx={116} cy={188} r={32} {...G} />
        <Circle cx={184} cy={188} r={32} {...G} />
        <Line x1={150} y1={100} x2={130} y2={70} {...G} />
        <Line x1={150} y1={100} x2={170} y2={70} {...G} />
      </>
    ),
  },
  {
    key: 'yildiz', name: 'Yıldız', emoji: '⭐',
    guide: (
      <>
        <Polygon points="150,20 183,116 288,116 204,178 236,282 150,220 64,282 96,178 12,116 117,116" {...G} />
      </>
    ),
  },
];

const MIN_STEP = 2;

interface Props {
  onGameEnd: (
    oyunAdi: string, sure: number, finalHamle: number, finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; cizimResimBase64?: string; cizimResimFormat?: 'png' | 'jpeg'; zorlukSeviyesi?: number; kazanimOdagi?: string },
  ) => void;
  onExit?: () => void;
  childName?: string;
}

export default function CizimSayfalari({ onGameEnd, onExit }: Props) {
  const [themeIdx, setThemeIdx] = useState<number | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [liveStroke, setLiveStroke] = useState<Stroke | null>(null);
  const liveStrokeRef = useRef<Stroke | null>(null);
  const canvasRef = useRef<View>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [erase, setErase] = useState(false);
  const [saved, setSaved] = useState(false);
  const startTimeRef = useRef(Date.now());

  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  const eraseRef = useRef(erase);
  colorRef.current = color;
  sizeRef.current = size;
  eraseRef.current = erase;

  const allStrokes = useMemo(() => (liveStroke ? [...strokes, liveStroke] : strokes), [strokes, liveStroke]);

  const addPoint = (x: number, y: number) => {
    const base = liveStrokeRef.current ?? {
      color: eraseRef.current ? CANVAS_BG : colorRef.current,
      size: eraseRef.current ? Math.max(sizeRef.current, 18) : sizeRef.current,
      points: [] as Point[],
    };
    const points = [...base.points];
    const last = base.points[base.points.length - 1];
    if (last) {
      const dx = x - last.x, dy = y - last.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = Math.max(MIN_STEP, base.size * 0.6);
      const steps = Math.floor(dist / step);
      for (let i = 1; i <= steps; i++) {
        const ratio = i / (steps + 1);
        points.push({ x: last.x + dx * ratio, y: last.y + dy * ratio });
      }
    }
    points.push({ x, y });
    const next = { ...base, points };
    liveStrokeRef.current = next;
    setLiveStroke(next);
    setSaved(false);
  };

  const finishStroke = () => {
    const completed = liveStrokeRef.current;
    if (completed) setStrokes((prev) => [...prev, completed]);
    setLiveStroke(null);
    liveStrokeRef.current = null;
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY),
    onPanResponderMove: (e) => addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY),
    onPanResponderRelease: (e) => { addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY); finishStroke(); },
    onPanResponderTerminate: (e) => { addPoint(e.nativeEvent.locationX, e.nativeEvent.locationY); finishStroke(); },
  }), []);

  const strokeToPath = (points: Point[]): string => {
    if (!points || points.length === 0) return '';
    if (points.length === 1) { const p = points[0]; return `M ${p.x} ${p.y} L ${p.x} ${p.y}`; }
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  };

  const clearCanvas = () => {
    setStrokes([]); setLiveStroke(null); liveStrokeRef.current = null; setSaved(false);
  };
  const undoLast = () => { setStrokes((prev) => prev.slice(0, -1)); setSaved(false); };

  const openTheme = (i: number) => {
    setThemeIdx(i);
    clearCanvas();
    startTimeRef.current = Date.now();
    speak(`${THEMES[i].name} çizelim! Kesik çizgileri takip et.`, { instructions: HAPPY_VOICE });
  };

  const saveDrawing = async () => {
    const bundle = liveStrokeRef.current ? [...strokes, liveStrokeRef.current] : strokes;
    if (bundle.length === 0) return;
    const theme = themeIdx !== null ? THEMES[themeIdx] : null;
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
    speak('Ne güzel çizdin! Aferin.', { instructions: HAPPY_VOICE });
    onGameEnd('cizim-sayfalari', duration, totalPoints, 0, undefined, {
      cizimVerisi: JSON.stringify({ tema: theme?.key, strokes: bundle }),
      cizimResimBase64: base64,
      cizimResimFormat: 'png',
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Sanat / Erken Okuryazarlık: Yazma Öncesi Çizgi Çalışması (TAEOB.6)',
    });
    setSaved(true);
  };

  // ---- Tema seçici ----
  if (themeIdx === null) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={onExit} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color="#00695C" />
          </TouchableOpacity>
          <Text style={styles.title}>✏️ Çizim Sayfaları</Text>
          <View style={{ width: 44 }} />
        </View>
        <Text style={styles.pickPrompt}>Bir tema seç, çizmeye başla!</Text>
        <View style={styles.themeGrid}>
          {THEMES.map((t, i) => (
            <TouchableOpacity key={t.key} style={styles.themeCard} onPress={() => openTheme(i)} activeOpacity={0.85}>
              <Svg width={92} height={92} viewBox="0 0 300 300">{t.guide}</Svg>
              <Text style={styles.themeName}>{t.emoji} {t.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // ---- Çizim ekranı ----
  const theme = THEMES[themeIdx];
  const hasContent = strokes.length > 0 || !!liveStroke;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setThemeIdx(null)} activeOpacity={0.8}>
          <Ionicons name="grid" size={22} color="#00695C" />
        </TouchableOpacity>
        <Text style={styles.title}>{theme.emoji} {theme.name}</Text>
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

      <View ref={canvasRef} style={styles.canvas} {...panResponder.panHandlers}>
        {/* Kılavuz (kesik) çizgiler - altta */}
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 300 300" preserveAspectRatio="xMidYMid meet" pointerEvents="none">
          {theme.guide}
        </Svg>
        {/* Çocuğun çizimi - üstte */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          {allStrokes.filter((s): s is Stroke => Boolean(s && s.points)).map((s, i) => (
            <Path key={i} d={strokeToPath(s.points)} stroke={s.color} strokeWidth={s.size} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </Svg>
      </View>

      {/* Renk paleti + silgi + kalınlık */}
      <View style={styles.palette}>
        {COLORS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.swatch, { backgroundColor: c }, color === c && !erase && styles.swatchActive]}
            onPress={() => { setColor(c); setErase(false); }}
            activeOpacity={0.85}
          />
        ))}
        <TouchableOpacity style={[styles.swatch, styles.eraser, erase && styles.swatchActive]} onPress={() => setErase(true)} activeOpacity={0.85}>
          <Ionicons name="bandage-outline" size={20} color="#607D8B" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.sizeBtn} onPress={() => setSize((s) => SIZES[(SIZES.indexOf(s) + 1) % SIZES.length])} activeOpacity={0.85}>
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: erase ? '#90A4AE' : color }} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F6F3', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingHorizontal: 16, paddingTop: 44, paddingBottom: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 },
  title: { fontSize: 20, fontWeight: '900', color: '#00695C' },
  headerActions: { flexDirection: 'row', gap: 8 },
  smallBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  saveBtn: { borderWidth: 2, borderColor: '#43A047' },
  savedBtn: { backgroundColor: '#43A047', borderColor: '#2E7D32' },

  pickPrompt: { fontSize: 17, fontWeight: '700', color: '#00897B', marginTop: 6, marginBottom: 14 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, maxWidth: 440, paddingHorizontal: 12 },
  themeCard: { width: 130, height: 150, borderRadius: 22, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.14, shadowRadius: 1, elevation: 4 },
  themeName: { fontSize: 16, fontWeight: '900', color: '#00695C' },

  canvas: { flex: 1, width: '94%', backgroundColor: CANVAS_BG, borderRadius: 20, borderWidth: 3, borderColor: '#B2DFDB', overflow: 'hidden', marginTop: 4 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, maxWidth: 460 },
  swatch: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 1, elevation: 3 },
  swatchActive: { borderColor: '#212121', transform: [{ scale: 1.12 }] },
  eraser: { backgroundColor: '#ECEFF1' },
  sizeBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#B0BEC5' },
});
