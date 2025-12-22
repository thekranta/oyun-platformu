import React, { useMemo, useRef, useState } from 'react';
import { Dimensions, PanResponder, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import DynamicBackground from './DynamicBackground';

type Point = { x: number; y: number };
type Stroke = { color: string; size: number; points: Point[] };

interface Props {
  onGameEnd: (
    oyunAdi: string,
    sure: number,
    finalHamle: number,
    finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string },
  ) => void;
  onExit?: () => void;
}

const { width } = Dimensions.get('window');
const DEFAULT_COLORS = ['#ef476f', '#f78c6b', '#ffd166', '#06d6a0', '#118ab2', '#5f4b8b', '#000000'];
const TITLE_TEXT = 'YARATICI \u00c7\u0130Z\u0130M';
const SUBTITLE_TEXT = 'Renkli kalemlerle \u00e7iz, kaydet ve payla\u015f.';
const MIN_STEP = 2; // px, dense points avoid gaps at fast drawing

export default function YaraticiCizim({ onGameEnd, onExit }: Props) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [liveStroke, setLiveStroke] = useState<Stroke | null>(null);
  const liveStrokeRef = useRef<Stroke | null>(null);
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0]);
  const [brushSize, setBrushSize] = useState(8);
  const [saved, setSaved] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: width * 0.92, height: width * 0.65 });
  const startTimeRef = useRef(Date.now());

  const allStrokes = useMemo(
    () => (liveStroke ? [...strokes, liveStroke] : strokes),
    [strokes, liveStroke],
  );
  const safeStrokes = useMemo(
    () => allStrokes.filter((s): s is Stroke => Boolean(s && s.points)),
    [allStrokes],
  );

  const addPoint = (x: number, y: number) => {
    setLiveStroke(prev => {
      if (!prev) {
        const firstStroke = { color: selectedColor, size: brushSize, points: [{ x, y }] };
        liveStrokeRef.current = firstStroke;
        return firstStroke;
      }

      const last = prev.points[prev.points.length - 1];
      const points: Point[] = [...prev.points];
      if (last) {
        const dx = x - last.x;
        const dy = y - last.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const step = Math.max(MIN_STEP, brushSize * 0.6);
        const steps = Math.floor(dist / step);
        for (let i = 1; i <= steps; i++) {
          const ratio = i / (steps + 1);
          points.push({ x: last.x + dx * ratio, y: last.y + dy * ratio });
        }
      }
      points.push({ x, y });
      const nextStroke = { ...prev, points };
      liveStrokeRef.current = nextStroke;
      return nextStroke;
    });
    setSaved(false);
  };

  const finishStroke = () => {
    if (liveStrokeRef.current) {
      setStrokes(prev => [...prev, liveStrokeRef.current as Stroke]);
    }
    setLiveStroke(null);
    liveStrokeRef.current = null;
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: e => {
          const { locationX, locationY } = e.nativeEvent;
          addPoint(locationX, locationY);
        },
        onPanResponderMove: e => {
          const { locationX, locationY } = e.nativeEvent;
          addPoint(locationX, locationY);
        },
        onPanResponderRelease: finishStroke,
        onPanResponderTerminate: finishStroke,
      }),
    [selectedColor, brushSize],
  );

  const clearCanvas = () => {
    setStrokes([]);
    setLiveStroke(null);
    liveStrokeRef.current = null;
    setSaved(false);
    startTimeRef.current = Date.now();
  };

  const saveDrawing = () => {
    const bundle = liveStroke ? [...strokes, liveStroke] : strokes;
    if (bundle.length === 0) return;
    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    const serialized = JSON.stringify({ strokes: bundle, size: canvasSize, savedAt: Date.now() });
    const totalPoints = bundle.reduce((sum, s) => sum + s.points.length, 0);
    onGameEnd('yaratici-cizim', duration, totalPoints, 0, undefined, { cizimVerisi: serialized });
    setSaved(true);
  };

  const renderStrokeDots = (stroke: Stroke, strokeIndex: number) =>
    (stroke?.points ?? []).map((pt, idx) => (
      <View
        key={`${strokeIndex}-${idx}`}
        style={{
          position: 'absolute',
          left: pt.x - stroke.size / 2,
          top: pt.y - stroke.size / 2,
          width: stroke.size,
          height: stroke.size,
          borderRadius: stroke.size / 2,
          backgroundColor: stroke.color,
          opacity: 0.94,
        }}
      />
    ));

  return (
    <DynamicBackground>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
            <Text style={styles.exitTxt}>X</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>{TITLE_TEXT}</Text>
            <Text style={styles.subtitle}>{SUBTITLE_TEXT}</Text>
          </View>
          <TouchableOpacity style={[styles.saveBtn, (allStrokes.length === 0) && styles.disabledBtn]} onPress={saveDrawing} disabled={allStrokes.length === 0}>
            <Text style={styles.saveTxt}>{saved ? 'Kaydedildi' : 'Kaydet'}</Text>
          </TouchableOpacity>
        </View>

        <View
          style={styles.canvasWrapper}
          onLayout={e => setCanvasSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        >
          <View style={styles.paperShadow} />
          <View style={[styles.canvas, { width: canvasSize.width, height: canvasSize.height }]} {...panResponder.panHandlers}>
            {safeStrokes.map((s, i) => renderStrokeDots(s, i))}
          </View>
        </View>

        <View style={styles.toolbar}>
          <View style={styles.colorRow}>
            {DEFAULT_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorSwatch, { backgroundColor: c }, selectedColor === c && styles.colorActive]}
                onPress={() => setSelectedColor(c)}
              />
            ))}
          </View>
          <View style={styles.brushRow}>
            {[6, 9, 12, 16].map(size => (
              <TouchableOpacity
                key={size}
                style={[styles.brushBtn, brushSize === size && styles.brushActive]}
                onPress={() => setBrushSize(size)}
              >
                <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: selectedColor }} />
                <Text style={styles.brushLabel}>{size}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={clearCanvas}>
              <Text style={styles.actionTxt}>Temizle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#000', borderColor: '#000' }, saved && styles.savedState]}
              onPress={saveDrawing}
              disabled={allStrokes.length === 0}
            >
              <Text style={[styles.actionTxt, { color: '#fff' }]}>{saved ? 'Kaydedildi' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </DynamicBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 24, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  exitBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#ffe5e0', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffb3a7' },
  exitTxt: { fontSize: 22, color: '#d84315', fontWeight: 'bold', fontFamily: Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif-medium', default: 'System' }) },
  title: { fontSize: 20, fontWeight: '700', color: '#3e2723', letterSpacing: 0.2, fontFamily: Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif-medium', default: 'System' }) },
  subtitle: { fontSize: 13, color: '#6d4c41', marginTop: 4, fontFamily: Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif', default: 'System' }) },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#06d6a0', borderRadius: 12, borderWidth: 2, borderColor: '#118ab2' },
  saveTxt: { color: '#fff', fontWeight: '700', fontFamily: Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif-medium', default: 'System' }) },
  disabledBtn: { opacity: 0.5 },
  canvasWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  paperShadow: { position: 'absolute', width: '92%', height: '100%', backgroundColor: '#e8dfd5', borderRadius: 26, transform: [{ rotate: '-1deg' }], opacity: 0.6 },
  canvas: {
    backgroundColor: '#fdfaf3',
    borderRadius: 24,
    width: '92%',
    height: '100%',
    borderWidth: 2,
    borderColor: '#f2e4cf',
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  toolbar: { gap: 12, paddingBottom: 8 },
  colorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  colorSwatch: { width: 36, height: 36, borderRadius: 12, borderWidth: 2, borderColor: 'transparent' },
  colorActive: { borderColor: '#222', transform: [{ scale: 1.05 }] },
  brushRow: { flexDirection: 'row', justifyContent: 'space-between' },
  brushBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff' },
  brushActive: { borderColor: '#118ab2', backgroundColor: '#e3f2fd' },
  brushLabel: { fontSize: 12, color: '#333', fontWeight: '600', fontFamily: Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif-medium', default: 'System' }) },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  actionBtn: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  actionTxt: { fontWeight: '700', color: '#4e342e', fontFamily: Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif-medium', default: 'System' }) },
  savedState: { backgroundColor: '#4caf50', borderColor: '#2e7d32' },
});



