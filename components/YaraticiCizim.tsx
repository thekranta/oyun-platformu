import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ImageBackground, PanResponder, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { asset } from '../lib/assetMap';

// Arka plan g�rseli
const BACKGROUND_IMAGE = asset('/backgrounds/games/yaratici_cizim_bg.png');

type Point = { x: number; y: number };
type BrushMode = 'pen' | 'spray' | 'marker' | 'glow';
type Stroke = { color: string; size: number; points: Point[]; isEraser?: boolean; mode?: BrushMode };
type ShapeType = 'circle' | 'square' | 'triangle' | 'star' | 'heart';
type PlacedShape = { type: ShapeType; x: number; y: number; color: string; size: number };

interface Props {
  onGameEnd: (
    oyunAdi: string,
    sure: number,
    finalHamle: number,
    finalHata: number,
    algilananKelime?: string,
    extraData?: { cizimVerisi?: string; cizimResimBase64?: string; cizimResimFormat?: 'png' | 'jpeg'; zorlukSeviyesi?: number; kazanimOdagi?: string },
  ) => void;
  onExit?: () => void;
}

// Pencil colors
const PENCIL_COLORS = [
  '#ef476f', '#f78c6b', '#ffd166', '#06d6a0',
  '#118ab2', '#5f4b8b', '#000000', '#8B4513',
];

// Brush sizes - visual dots only, no text
const BRUSH_SIZES = [4, 8, 14, 22];

// Shape sizes - visual only
const SHAPE_SIZES = [30, 50, 80, 120];

// Geometric shapes
const SHAPES: { type: ShapeType; icon: string }[] = [
  { type: 'circle', icon: 'ellipse' },
  { type: 'square', icon: 'square' },
  { type: 'triangle', icon: 'triangle' },
  { type: 'star', icon: 'star' },
  { type: 'heart', icon: 'heart' },
];

// Brush modes
const BRUSH_MODES: { mode: BrushMode; icon: string; label: string }[] = [
  { mode: 'pen', icon: 'pencil', label: 'Kalem' },
  { mode: 'marker', icon: 'create', label: 'Ke�eli' },
  { mode: 'spray', icon: 'color-fill', label: 'Sprey' },
  { mode: 'glow', icon: 'sunny', label: 'Parlak' },
];

const MIN_STEP = 2;

export default function YaraticiCizim({ onGameEnd, onExit }: Props) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [placedShapes, setPlacedShapes] = useState<PlacedShape[]>([]);
  const [liveStroke, setLiveStroke] = useState<Stroke | null>(null);
  const liveStrokeRef = useRef<Stroke | null>(null);
  const canvasRef = useRef<View>(null);
  const [selectedColor, setSelectedColor] = useState(PENCIL_COLORS[0]);
  const [brushSize, setBrushSize] = useState(8);
  const [shapeSize, setShapeSize] = useState(50);
  const [brushMode, setBrushMode] = useState<BrushMode>('pen');
  const [saved, setSaved] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [selectedShape, setSelectedShape] = useState<ShapeType | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [showBrushPicker, setShowBrushPicker] = useState(false);
  const [showShapeSizePicker, setShowShapeSizePicker] = useState(false);
  const startTimeRef = useRef(Date.now());

  const colorPickerAnim = useRef(new Animated.Value(0)).current;
  const sizePickerAnim = useRef(new Animated.Value(0)).current;
  const shapePickerAnim = useRef(new Animated.Value(0)).current;
  const brushPickerAnim = useRef(new Animated.Value(0)).current;
  const shapeSizePickerAnim = useRef(new Animated.Value(0)).current;
  const saveAnim = useRef(new Animated.Value(1)).current;

  const animatePicker = (anim: Animated.Value, show: boolean) => {
    Animated.timing(anim, {
      toValue: show ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => animatePicker(colorPickerAnim, showColorPicker), [showColorPicker]);
  useEffect(() => animatePicker(sizePickerAnim, showSizePicker), [showSizePicker]);
  useEffect(() => animatePicker(shapePickerAnim, showShapePicker), [showShapePicker]);
  useEffect(() => animatePicker(brushPickerAnim, showBrushPicker), [showBrushPicker]);
  useEffect(() => animatePicker(shapeSizePickerAnim, showShapeSizePicker), [showShapeSizePicker]);

  const allStrokes = useMemo(
    () => (liveStroke ? [...strokes, liveStroke] : strokes),
    [strokes, liveStroke],
  );
  const safeStrokes = useMemo(
    () => allStrokes.filter((s): s is Stroke => Boolean(s && s.points)),
    [allStrokes],
  );

  const closeAllPickers = () => {
    setShowColorPicker(false);
    setShowSizePicker(false);
    setShowShapePicker(false);
    setShowBrushPicker(false);
    setShowShapeSizePicker(false);
  };

  // Generate spray points around a center point
  const generateSprayPoints = (x: number, y: number, radius: number): Point[] => {
    const points: Point[] = [];
    const numPoints = Math.floor(radius * 2);
    for (let i = 0; i < numPoints; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      points.push({
        x: x + Math.cos(angle) * r,
        y: y + Math.sin(angle) * r,
      });
    }
    return points;
  };

  const addPoint = (x: number, y: number) => {
    const currentColor = isEraser ? '#fffef9' : selectedColor;
    const baseStroke = liveStrokeRef.current ?? {
      color: currentColor,
      size: brushMode === 'spray' ? 3 : brushSize,
      points: [] as Point[],
      isEraser,
      mode: brushMode,
    };

    let points: Point[] = [...baseStroke.points];

    if (brushMode === 'spray') {
      // Spray adds multiple random points
      const sprayPoints = generateSprayPoints(x, y, brushSize);
      points = [...points, ...sprayPoints];
    } else {
      // Normal drawing with interpolation
      const last = baseStroke.points[baseStroke.points.length - 1];
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
    }

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

  const placeShape = (x: number, y: number) => {
    if (selectedShape) {
      setPlacedShapes(prev => [...prev, {
        type: selectedShape,
        x,
        y,
        color: selectedColor,
        size: shapeSize,
      }]);
      setSaved(false);
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: e => {
          closeAllPickers();
          const { locationX, locationY } = e.nativeEvent;
          if (selectedShape) {
            placeShape(locationX, locationY);
          } else {
            addPoint(locationX, locationY);
          }
        },
        onPanResponderMove: e => {
          if (!selectedShape) {
            const { locationX, locationY } = e.nativeEvent;
            addPoint(locationX, locationY);
          }
        },
        onPanResponderRelease: e => {
          if (!selectedShape) {
            const { locationX, locationY } = e.nativeEvent;
            addPoint(locationX, locationY);
            finishStroke();
          }
        },
        onPanResponderTerminate: e => {
          if (!selectedShape) {
            const { locationX, locationY } = e.nativeEvent;
            addPoint(locationX, locationY);
            finishStroke();
          }
        },
      }),
    [selectedColor, brushSize, isEraser, selectedShape, brushMode, shapeSize],
  );

  const clearCanvas = () => {
    setStrokes([]);
    setPlacedShapes([]);
    setLiveStroke(null);
    liveStrokeRef.current = null;
    setSaved(false);
    startTimeRef.current = Date.now();
  };

  const undoLast = () => {
    if (placedShapes.length > 0) {
      setPlacedShapes(prev => prev.slice(0, -1));
    } else if (strokes.length > 0) {
      setStrokes(prev => prev.slice(0, -1));
    }
    setSaved(false);
  };

  const saveDrawing = async () => {
    const bundle = liveStrokeRef.current ? [...strokes, liveStrokeRef.current] : strokes;
    if (bundle.length === 0 && placedShapes.length === 0) return;

    Animated.sequence([
      Animated.timing(saveAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.timing(saveAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    const serialized = JSON.stringify({ strokes: bundle, shapes: placedShapes, savedAt: Date.now() });
    const totalPoints = bundle.reduce((sum, s) => sum + s.points.length, 0) + placedShapes.length;
    let cizimResimBase64: string | undefined;
    try {
      if (canvasRef.current) {
        let dataOrBase64: string | undefined;
        if (Platform.OS === 'web') {
          // react-native-view-shot web'de findNodeHandle kullanir ve calismaz
          // ("findNodeHandle is not supported on web"). Web'de canvas View'inin
          // DOM dugumunu dogrudan PNG'ye ceviriyoruz (html-to-image, yalnizca web'de import edilir).
          const { toPng } = await import('html-to-image');
          const node = canvasRef.current as unknown as HTMLElement;
          dataOrBase64 = await toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: '#fffef9' });
        } else {
          dataOrBase64 = await captureRef(canvasRef, { format: 'png', quality: 0.9, result: 'base64' });
        }
        if (dataOrBase64) {
          cizimResimBase64 = dataOrBase64.includes(',') ? dataOrBase64.split(',')[1] : dataOrBase64;
        }
      }
    } catch (error) {
      console.warn('Cizim resmi olusturulamadi:', error);
    }
    onGameEnd('yaratici-cizim', duration, totalPoints, 0, undefined, {
      cizimVerisi: serialized,
      cizimResimBase64,
      cizimResimFormat: 'png',
      zorlukSeviyesi: 1,
      kazanimOdagi: 'Yarat�c�l�k ve G�rsel �fade',
    });
    setSaved(true);
  };

  const getStrokeOpacity = (mode?: BrushMode) => {
    switch (mode) {
      case 'marker': return 0.7;
      case 'glow': return 0.5;
      case 'spray': return 0.8;
      default: return 1;
    }
  };

  const getStrokeExtra = (mode?: BrushMode, color: string = '#000') => {
    if (mode === 'glow') {
      return {
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      };
    }
    return {};
  };

  const renderStrokeDots = (stroke: Stroke, strokeIndex: number) =>
    (stroke?.points ?? []).map((pt, idx) => (
      <View
        key={`stroke-${strokeIndex}-${idx}`}
        style={[{
          position: 'absolute',
          left: pt.x - stroke.size / 2,
          top: pt.y - stroke.size / 2,
          width: stroke.size,
          height: stroke.size,
          borderRadius: stroke.size / 2,
          backgroundColor: stroke.color,
          opacity: getStrokeOpacity(stroke.mode),
        }, getStrokeExtra(stroke.mode, stroke.color)]}
      />
    ));

  const renderShape = (shape: PlacedShape, index: number) => {
    const halfSize = shape.size / 2;

    switch (shape.type) {
      case 'circle':
        return (
          <View key={`shape-${index}`} style={{
            position: 'absolute', left: shape.x - halfSize, top: shape.y - halfSize,
            width: shape.size, height: shape.size, borderRadius: halfSize, backgroundColor: shape.color,
          }} />
        );
      case 'square':
        return (
          <View key={`shape-${index}`} style={{
            position: 'absolute', left: shape.x - halfSize, top: shape.y - halfSize,
            width: shape.size, height: shape.size, backgroundColor: shape.color, borderRadius: 4,
          }} />
        );
      case 'triangle':
        return (
          <View key={`shape-${index}`} style={{
            position: 'absolute', left: shape.x - halfSize, top: shape.y - halfSize * 0.8,
            width: 0, height: 0,
            borderLeftWidth: halfSize, borderRightWidth: halfSize, borderBottomWidth: shape.size * 0.9,
            borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: shape.color,
          }} />
        );
      case 'star':
      case 'heart':
        return (
          <View key={`shape-${index}`} style={{
            position: 'absolute', left: shape.x - halfSize, top: shape.y - halfSize,
            width: shape.size, height: shape.size, alignItems: 'center', justifyContent: 'center',
          }}>
            <Ionicons name={shape.type} size={shape.size * 0.9} color={shape.color} />
          </View>
        );
      default:
        return null;
    }
  };

  const togglePicker = (picker: string) => {
    closeAllPickers();
    switch (picker) {
      case 'color': setShowColorPicker(!showColorPicker); break;
      case 'size': setShowSizePicker(!showSizePicker); break;
      case 'shape': setShowShapePicker(!showShapePicker); break;
      case 'brush': setShowBrushPicker(!showBrushPicker); break;
      case 'shapeSize': setShowShapeSizePicker(!showShapeSizePicker); break;
    }
  };

  const selectColor = (color: string) => { setSelectedColor(color); setIsEraser(false); closeAllPickers(); };
  const selectSize = (size: number) => { setBrushSize(size); closeAllPickers(); };
  const selectShapeSize = (size: number) => { setShapeSize(size); closeAllPickers(); };
  const selectShape = (type: ShapeType | null) => { setSelectedShape(type); setIsEraser(false); closeAllPickers(); };
  const selectBrushMode = (mode: BrushMode) => { setBrushMode(mode); setSelectedShape(null); setIsEraser(false); closeAllPickers(); };
  const toggleEraser = () => { setIsEraser(!isEraser); setSelectedShape(null); closeAllPickers(); };

  const hasContent = strokes.length > 0 || placedShapes.length > 0;
  const currentBrushIcon = BRUSH_MODES.find(b => b.mode === brushMode)?.icon || 'pencil';

  const renderPickerPopup = (anim: Animated.Value, show: boolean, style: any, children: React.ReactNode) => (
    <Animated.View
      style={[styles.pickerPopup, style, {
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
          { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
        ],
      }]}
      pointerEvents={show ? 'auto' : 'none'}
    >
      {children}
    </Animated.View>
  );

  return (
    <ImageBackground source={BACKGROUND_IMAGE} style={styles.bgContainer} resizeMode="cover">
      <View style={styles.darkOverlay} />
      <View style={styles.container}>
        <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
          <Ionicons name="close" size={28} color="#d84315" />
        </TouchableOpacity>

        <View ref={canvasRef} style={styles.canvas} {...panResponder.panHandlers}>
          {safeStrokes.map((s, i) => renderStrokeDots(s, i))}
          {placedShapes.map((shape, i) => renderShape(shape, i))}
        </View>

        {/* Floating toolbar */}
        <View style={styles.floatingToolbar}>
          {/* Brush mode */}
          <TouchableOpacity
            style={[styles.toolBtn, !isEraser && !selectedShape && styles.toolBtnActive]}
            onPress={() => togglePicker('brush')}
          >
            <Ionicons name={currentBrushIcon as any} size={20} color={!isEraser && !selectedShape ? '#4CAF50' : '#666'} />
          </TouchableOpacity>

          {/* Color */}
          <TouchableOpacity style={styles.colorBtn} onPress={() => togglePicker('color')}>
            <View style={[styles.colorPreview, { backgroundColor: selectedColor }]}>
              <Ionicons name="color-palette" size={12} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Brush Size - shows visual dot */}
          <TouchableOpacity style={styles.sizeButton} onPress={() => togglePicker('size')}>
            <View style={[styles.sizePreviewDot, { width: Math.min(brushSize, 20), height: Math.min(brushSize, 20), borderRadius: brushSize / 2, backgroundColor: selectedColor }]} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Shapes */}
          <TouchableOpacity
            style={[styles.toolBtn, selectedShape && styles.shapeActive]}
            onPress={() => togglePicker('shape')}
          >
            <Ionicons name="shapes" size={20} color={selectedShape ? '#fff' : '#666'} />
          </TouchableOpacity>

          {/* Shape Size - shows visual shape preview */}
          {selectedShape && (
            <TouchableOpacity style={styles.shapeSizeBtn} onPress={() => togglePicker('shapeSize')}>
              <Ionicons name={SHAPES.find(s => s.type === selectedShape)?.icon as any} size={Math.min(shapeSize / 4, 20)} color="#9C27B0" />
            </TouchableOpacity>
          )}

          {/* Eraser */}
          <TouchableOpacity
            style={[styles.toolBtn, isEraser && styles.eraserActive]}
            onPress={toggleEraser}
          >
            <Ionicons name="bandage-outline" size={20} color={isEraser ? '#fff' : '#666'} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Undo */}
          <TouchableOpacity style={styles.toolBtn} onPress={undoLast} disabled={!hasContent}>
            <Ionicons name="arrow-undo" size={20} color={hasContent ? '#FF9800' : '#ccc'} />
          </TouchableOpacity>

          {/* Clear */}
          <TouchableOpacity style={styles.toolBtn} onPress={clearCanvas} disabled={!hasContent}>
            <Ionicons name="trash-outline" size={20} color={hasContent ? '#e53935' : '#ccc'} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Save */}
          <Animated.View style={{ transform: [{ scale: saveAnim }] }}>
            <TouchableOpacity
              style={[styles.toolBtn, styles.saveBtn, saved && styles.savedBtn]}
              onPress={saveDrawing}
              disabled={!hasContent}
            >
              <Ionicons name={saved ? 'checkmark-circle' : 'save'} size={22} color={saved ? '#fff' : hasContent ? '#4CAF50' : '#ccc'} />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Color picker */}
        {renderPickerPopup(colorPickerAnim, showColorPicker, styles.colorPickerPopup,
          PENCIL_COLORS.map(color => (
            <TouchableOpacity
              key={color}
              style={[styles.colorOption, { backgroundColor: color }, selectedColor === color && styles.optionSelected]}
              onPress={() => selectColor(color)}
            />
          ))
        )}

        {/* Brush size picker - visual dots */}
        {renderPickerPopup(sizePickerAnim, showSizePicker, styles.sizePickerPopup,
          BRUSH_SIZES.map(size => (
            <TouchableOpacity
              key={size}
              style={[styles.sizeOption, brushSize === size && styles.optionSelected]}
              onPress={() => selectSize(size)}
            >
              <View style={{ width: Math.min(size, 18), height: Math.min(size, 18), borderRadius: size / 2, backgroundColor: selectedColor }} />
            </TouchableOpacity>
          ))
        )}

        {/* Shape picker */}
        {renderPickerPopup(shapePickerAnim, showShapePicker, styles.shapePickerPopup,
          <>
            <TouchableOpacity
              style={[styles.shapeOption, !selectedShape && styles.optionSelected]}
              onPress={() => selectShape(null)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
            {SHAPES.map(shape => (
              <TouchableOpacity
                key={shape.type}
                style={[styles.shapeOption, selectedShape === shape.type && styles.shapeOptionActive]}
                onPress={() => selectShape(shape.type)}
              >
                <Ionicons name={shape.icon as any} size={24} color={selectedShape === shape.type ? '#fff' : selectedColor} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Shape size picker - visual shapes in different sizes */}
        {renderPickerPopup(shapeSizePickerAnim, showShapeSizePicker, styles.shapeSizePickerPopup,
          SHAPE_SIZES.map(size => (
            <TouchableOpacity
              key={size}
              style={[styles.shapeSizeOption, shapeSize === size && styles.optionSelected]}
              onPress={() => selectShapeSize(size)}
            >
              <Ionicons
                name={selectedShape ? (SHAPES.find(s => s.type === selectedShape)?.icon as any) : 'ellipse'}
                size={Math.min(size / 3, 28)}
                color={selectedColor}
              />
            </TouchableOpacity>
          ))
        )}

        {/* Brush mode picker */}
        {renderPickerPopup(brushPickerAnim, showBrushPicker, styles.brushPickerPopup,
          BRUSH_MODES.map(b => (
            <TouchableOpacity
              key={b.mode}
              style={[styles.brushOption, brushMode === b.mode && styles.optionSelected]}
              onPress={() => selectBrushMode(b.mode)}
            >
              <Ionicons name={b.icon as any} size={22} color={brushMode === b.mode ? '#4CAF50' : '#666'} />
              <Text style={[styles.brushLabel, brushMode === b.mode && styles.optionLabelActive]}>{b.label}</Text>
            </TouchableOpacity>
          ))
        )}

        {/* Mode indicator */}
        {(selectedShape || brushMode !== 'pen') && (
          <View style={[styles.modeIndicator, selectedShape ? styles.shapeModeIndicator : styles.brushModeIndicator]}>
            <Ionicons
              name={(selectedShape ? SHAPES.find(s => s.type === selectedShape)?.icon : currentBrushIcon) as any}
              size={14}
              color="#fff"
            />
            <Text style={styles.modeText}>
              {selectedShape ? 'Dokun: �ekil ekle' : BRUSH_MODES.find(b => b.mode === brushMode)?.label}
            </Text>
          </View>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bgContainer: { flex: 1 },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  container: { flex: 1 },
  exitBtn: {
    position: 'absolute', top: 50, left: 16, width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,229,224,0.95)', alignItems: 'center', justifyContent: 'center',
    elevation: 4, zIndex: 100,
  },
  canvas: {
    flex: 1, backgroundColor: '#fffef9', marginTop: 10, marginHorizontal: 10, marginBottom: 85,
    borderRadius: 20, borderWidth: 3, borderColor: '#f2e4cf', overflow: 'hidden', elevation: 4,
  },
  floatingToolbar: {
    position: 'absolute', bottom: 16, left: 12, right: 12, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 26,
    paddingVertical: 6, paddingHorizontal: 8, elevation: 8, gap: 4, flexWrap: 'wrap',
  },
  toolBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e0e0e0',
  },
  toolBtnActive: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  colorBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e0e0e0',
  },
  colorPreview: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff', elevation: 2,
  },
  sizeButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#E3F2FD',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2196F3',
  },
  sizeButtonText: { fontSize: 13, fontWeight: 'bold', color: '#2196F3' },
  shapeSizeBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3E5F5',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#9C27B0',
  },
  shapeSizeBtnText: { fontSize: 13, fontWeight: 'bold', color: '#9C27B0' },
  shapeActive: { backgroundColor: '#9C27B0', borderColor: '#7B1FA2' },
  eraserActive: { backgroundColor: '#FF9800', borderColor: '#F57C00' },
  divider: { width: 2, height: 24, backgroundColor: '#e0e0e0', marginHorizontal: 2, borderRadius: 1 },
  saveBtn: { borderColor: '#4CAF50' },
  savedBtn: { backgroundColor: '#4CAF50', borderColor: '#2E7D32' },
  pickerPopup: {
    position: 'absolute', bottom: 80, backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: 18,
    padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6, elevation: 10, zIndex: 50,
  },
  colorPickerPopup: { left: 50, width: 180 },
  sizePickerPopup: { left: 90, width: 180 },
  shapePickerPopup: { left: 130, width: 230 },
  shapeSizePickerPopup: { left: 170, width: 180 },
  brushPickerPopup: { left: 10, width: 200 },
  colorOption: { width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: 'transparent' },
  optionSelected: { borderColor: '#333', transform: [{ scale: 1.1 }] },
  sizeOption: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e0e0e0',
  },
  shapeSizeOption: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e0e0e0',
  },
  sizePreviewDot: {
    // Dynamic size set inline
  },
  optionLabel: { fontSize: 10, fontWeight: 'bold', color: '#666' },
  optionLabelActive: { color: '#4CAF50' },
  shapeOption: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e0e0e0',
  },
  shapeOptionActive: { borderColor: '#9C27B0', backgroundColor: '#9C27B0' },
  brushOption: {
    width: 44, height: 50, borderRadius: 12, backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e0e0e0', gap: 2,
  },
  brushLabel: { fontSize: 9, fontWeight: '600', color: '#666' },
  modeIndicator: {
    position: 'absolute', top: 50, alignSelf: 'center', flexDirection: 'row', alignItems: 'center',
    paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, gap: 6,
  },
  shapeModeIndicator: { backgroundColor: 'rgba(156,39,176,0.9)' },
  brushModeIndicator: { backgroundColor: 'rgba(76,175,80,0.9)' },
  modeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});

