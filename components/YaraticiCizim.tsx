import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
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
    extraData?: { cizimVerisi?: string; cizimResimBase64?: string; cizimResimFormat?: 'png' | 'jpeg' },
  ) => void;
  onExit?: () => void;
}

// Pencil colors with fun names
const PENCIL_COLORS = [
  { color: '#ef476f', name: 'Pembe' },
  { color: '#f78c6b', name: 'Turuncu' },
  { color: '#ffd166', name: 'Sarı' },
  { color: '#06d6a0', name: 'Yeşil' },
  { color: '#118ab2', name: 'Mavi' },
  { color: '#5f4b8b', name: 'Mor' },
  { color: '#000000', name: 'Siyah' },
  { color: '#8B4513', name: 'Kahve' },
];

// Brush sizes
const BRUSH_SIZES = [
  { size: 4, label: 'İnce' },
  { size: 8, label: 'Normal' },
  { size: 14, label: 'Kalın' },
  { size: 22, label: 'Çok Kalın' },
];

const MIN_STEP = 2;

export default function YaraticiCizim({ onGameEnd, onExit }: Props) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [liveStroke, setLiveStroke] = useState<Stroke | null>(null);
  const liveStrokeRef = useRef<Stroke | null>(null);
  const canvasRef = useRef<View>(null);
  const [selectedColor, setSelectedColor] = useState(PENCIL_COLORS[0].color);
  const [brushSize, setBrushSize] = useState(8);
  const [saved, setSaved] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 400 });
  const startTimeRef = useRef(Date.now());
  const saveAnim = useRef(new Animated.Value(1)).current;

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const isLandscape = screenWidth > screenHeight;
  const toolbarWidth = isLandscape ? 80 : 70;

  const allStrokes = useMemo(
    () => (liveStroke ? [...strokes, liveStroke] : strokes),
    [strokes, liveStroke],
  );
  const safeStrokes = useMemo(
    () => allStrokes.filter((s): s is Stroke => Boolean(s && s.points)),
    [allStrokes],
  );

  const addPoint = (x: number, y: number) => {
    const baseStroke =
      liveStrokeRef.current ?? { color: selectedColor, size: brushSize, points: [] as Point[] };
    const last = baseStroke.points[baseStroke.points.length - 1];
    const points: Point[] = [...baseStroke.points];
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
    const nextStroke = { ...baseStroke, points };
    liveStrokeRef.current = nextStroke;
    setLiveStroke(nextStroke);
    setSaved(false);
  };

  const finishStroke = () => {
    const completed = liveStrokeRef.current ?? liveStroke;
    if (completed) {
      setStrokes(prev => [...prev, completed]);
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
        onPanResponderRelease: e => {
          const { locationX, locationY } = e.nativeEvent;
          addPoint(locationX, locationY);
          finishStroke();
        },
        onPanResponderTerminate: e => {
          const { locationX, locationY } = e.nativeEvent;
          addPoint(locationX, locationY);
          finishStroke();
        },
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

  const saveDrawing = async () => {
    const bundle = liveStrokeRef.current ? [...strokes, liveStrokeRef.current] : strokes;
    if (bundle.length === 0) return;

    // Animate save button
    Animated.sequence([
      Animated.timing(saveAnim, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.timing(saveAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    const serialized = JSON.stringify({ strokes: bundle, size: canvasSize, savedAt: Date.now() });
    const totalPoints = bundle.reduce((sum, s) => sum + s.points.length, 0);
    let cizimResimBase64: string | undefined;
    try {
      if (canvasRef.current) {
        const base64Result = await captureRef(canvasRef, {
          format: 'png',
          quality: 0.9,
          result: 'base64',
        });
        if (base64Result) {
          cizimResimBase64 = base64Result.includes(',') ? base64Result.split(',')[1] : base64Result;
        }
      }
    } catch (error) {
      console.warn('Cizim resmi olusturulamadi:', error);
    }
    onGameEnd('yaratici-cizim', duration, totalPoints, 0, undefined, {
      cizimVerisi: serialized,
      cizimResimBase64,
      cizimResimFormat: 'png',
    });
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

  // Pencil component
  const Pencil = ({ color, isSelected, onPress }: { color: string; isSelected: boolean; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} style={styles.pencilContainer}>
      <View style={[styles.pencilTip, { borderBottomColor: color }]} />
      <View style={[styles.pencilBody, { backgroundColor: color }, isSelected && styles.pencilSelected]} />
      <View style={[styles.pencilEraser, { backgroundColor: color === '#000000' ? '#333' : '#ffb6c1' }]} />
      {isSelected && (
        <View style={styles.pencilCheckmark}>
          <Ionicons name="checkmark" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <DynamicBackground>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
            <Ionicons name="close" size={24} color="#d84315" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>🎨 Hayal Defteri</Text>
            <Text style={styles.subtitle}>Renkli kalemlerle özgürce çiz!</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Main content area with canvas and toolbar */}
        <View style={styles.mainContent}>
          {/* Canvas wrapper */}
          <View
            style={styles.canvasWrapper}
            onLayout={e => setCanvasSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
          >
            <View style={styles.paperShadow} />
            <View
              ref={canvasRef}
              style={[styles.canvas, { width: canvasSize.width, height: canvasSize.height }]}
              {...panResponder.panHandlers}
            >
              {safeStrokes.map((s, i) => renderStrokeDots(s, i))}
            </View>
          </View>

          {/* Right side toolbar */}
          <View style={[styles.toolbar, { width: toolbarWidth }]}>
            {/* Pencil colors */}
            <View style={styles.toolSection}>
              <Text style={styles.toolSectionTitle}>🖍️</Text>
              <View style={styles.pencilRow}>
                {PENCIL_COLORS.map(p => (
                  <Pencil
                    key={p.color}
                    color={p.color}
                    isSelected={selectedColor === p.color}
                    onPress={() => setSelectedColor(p.color)}
                  />
                ))}
              </View>
            </View>

            {/* Brush sizes */}
            <View style={styles.toolSection}>
              <Text style={styles.toolSectionTitle}>📏</Text>
              <View style={styles.sizeRow}>
                {BRUSH_SIZES.map(b => (
                  <TouchableOpacity
                    key={b.size}
                    style={[styles.sizeBtn, brushSize === b.size && styles.sizeBtnSelected]}
                    onPress={() => setBrushSize(b.size)}
                  >
                    <View
                      style={{
                        width: Math.min(b.size, 20),
                        height: Math.min(b.size, 20),
                        borderRadius: b.size / 2,
                        backgroundColor: selectedColor,
                      }}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actionSection}>
              {/* Clear button */}
              <TouchableOpacity style={styles.actionBtn} onPress={clearCanvas}>
                <Ionicons name="trash-outline" size={26} color="#e53935" />
              </TouchableOpacity>

              {/* Save button */}
              <Animated.View style={{ transform: [{ scale: saveAnim }] }}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.saveBtn, saved && styles.savedBtn]}
                  onPress={saveDrawing}
                  disabled={allStrokes.length === 0}
                >
                  <Ionicons
                    name={saved ? 'checkmark-circle' : 'save-outline'}
                    size={26}
                    color={saved ? '#fff' : '#4CAF50'}
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </View>
      </View>
    </DynamicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exitBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ffe5e0',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#3e2723',
    fontFamily: Platform.select({ ios: 'Helvetica Neue', android: 'sans-serif-medium', default: 'System' }),
  },
  subtitle: {
    fontSize: 13,
    color: '#6d4c41',
    marginTop: 2,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  canvasWrapper: {
    flex: 1,
    position: 'relative',
  },
  paperShadow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#e8dfd5',
    borderRadius: 20,
    transform: [{ rotate: '-0.5deg' }],
    opacity: 0.6,
  },
  canvas: {
    backgroundColor: '#fffef9',
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#f2e4cf',
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  toolbar: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    alignItems: 'center',
  },
  toolSection: {
    alignItems: 'center',
    gap: 8,
  },
  toolSectionTitle: {
    fontSize: 18,
  },
  pencilRow: {
    flexDirection: 'column',
    gap: 4,
    alignItems: 'center',
  },
  pencilContainer: {
    alignItems: 'center',
    width: 30,
    height: 50,
  },
  pencilTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#000',
  },
  pencilBody: {
    width: 12,
    height: 28,
    borderRadius: 2,
  },
  pencilEraser: {
    width: 14,
    height: 8,
    borderRadius: 2,
  },
  pencilSelected: {
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    transform: [{ scale: 1.1 }],
  },
  pencilCheckmark: {
    position: 'absolute',
    bottom: 15,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeRow: {
    flexDirection: 'column',
    gap: 6,
    alignItems: 'center',
  },
  sizeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  sizeBtnSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
    transform: [{ scale: 1.05 }],
  },
  actionSection: {
    marginTop: 'auto',
    gap: 12,
    alignItems: 'center',
  },
  actionBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    elevation: 2,
  },
  saveBtn: {
    borderColor: '#4CAF50',
  },
  savedBtn: {
    backgroundColor: '#4CAF50',
    borderColor: '#2E7D32',
  },
});
