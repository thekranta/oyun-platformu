import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import DynamicBackground from './DynamicBackground';

type Point = { x: number; y: number };
type Stroke = { color: string; size: number; points: Point[]; isEraser?: boolean };
type ShapeType = 'circle' | 'square' | 'triangle' | 'star' | 'heart';
type PlacedShape = { type: ShapeType; x: number; y: number; color: string; size: number };

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

// Pencil colors
const PENCIL_COLORS = [
  '#ef476f', // Pink
  '#f78c6b', // Orange
  '#ffd166', // Yellow
  '#06d6a0', // Green
  '#118ab2', // Blue
  '#5f4b8b', // Purple
  '#000000', // Black
  '#8B4513', // Brown
];

// Brush sizes
const BRUSH_SIZES = [
  { size: 4, label: 'S' },
  { size: 8, label: 'M' },
  { size: 14, label: 'L' },
  { size: 22, label: 'XL' },
];

// Geometric shapes
const SHAPES: { type: ShapeType; icon: string; label: string }[] = [
  { type: 'circle', icon: 'ellipse', label: 'Daire' },
  { type: 'square', icon: 'square', label: 'Kare' },
  { type: 'triangle', icon: 'triangle', label: 'Üçgen' },
  { type: 'star', icon: 'star', label: 'Yıldız' },
  { type: 'heart', icon: 'heart', label: 'Kalp' },
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
  const [saved, setSaved] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [selectedShape, setSelectedShape] = useState<ShapeType | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [showShapePicker, setShowShapePicker] = useState(false);
  const startTimeRef = useRef(Date.now());

  // Animations
  const colorPickerAnim = useRef(new Animated.Value(0)).current;
  const sizePickerAnim = useRef(new Animated.Value(0)).current;
  const shapePickerAnim = useRef(new Animated.Value(0)).current;
  const saveAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(colorPickerAnim, {
      toValue: showColorPicker ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showColorPicker]);

  useEffect(() => {
    Animated.timing(sizePickerAnim, {
      toValue: showSizePicker ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showSizePicker]);

  useEffect(() => {
    Animated.timing(shapePickerAnim, {
      toValue: showShapePicker ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [showShapePicker]);

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
  };

  const addPoint = (x: number, y: number) => {
    const currentColor = isEraser ? '#fffef9' : selectedColor;
    const baseStroke =
      liveStrokeRef.current ?? { color: currentColor, size: brushSize, points: [] as Point[], isEraser };
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

  const placeShape = (x: number, y: number) => {
    if (selectedShape) {
      setPlacedShapes(prev => [...prev, {
        type: selectedShape,
        x,
        y,
        color: selectedColor,
        size: brushSize * 3, // Shapes are larger
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
    [selectedColor, brushSize, isEraser, selectedShape],
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
      setSaved(false);
    } else if (strokes.length > 0) {
      setStrokes(prev => prev.slice(0, -1));
      setSaved(false);
    }
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
        key={`stroke-${strokeIndex}-${idx}`}
        style={{
          position: 'absolute',
          left: pt.x - stroke.size / 2,
          top: pt.y - stroke.size / 2,
          width: stroke.size,
          height: stroke.size,
          borderRadius: stroke.size / 2,
          backgroundColor: stroke.color,
        }}
      />
    ));

  const renderShape = (shape: PlacedShape, index: number) => {
    const halfSize = shape.size / 2;

    switch (shape.type) {
      case 'circle':
        return (
          <View
            key={`shape-${index}`}
            style={{
              position: 'absolute',
              left: shape.x - halfSize,
              top: shape.y - halfSize,
              width: shape.size,
              height: shape.size,
              borderRadius: halfSize,
              backgroundColor: shape.color,
            }}
          />
        );
      case 'square':
        return (
          <View
            key={`shape-${index}`}
            style={{
              position: 'absolute',
              left: shape.x - halfSize,
              top: shape.y - halfSize,
              width: shape.size,
              height: shape.size,
              backgroundColor: shape.color,
              borderRadius: 4,
            }}
          />
        );
      case 'triangle':
        return (
          <View
            key={`shape-${index}`}
            style={{
              position: 'absolute',
              left: shape.x - halfSize,
              top: shape.y - halfSize,
              width: 0,
              height: 0,
              borderLeftWidth: halfSize,
              borderRightWidth: halfSize,
              borderBottomWidth: shape.size,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: shape.color,
            }}
          />
        );
      case 'star':
      case 'heart':
        return (
          <View
            key={`shape-${index}`}
            style={{
              position: 'absolute',
              left: shape.x - halfSize,
              top: shape.y - halfSize,
              width: shape.size,
              height: shape.size,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={shape.type} size={shape.size} color={shape.color} />
          </View>
        );
      default:
        return null;
    }
  };

  const toggleColorPicker = () => {
    setShowSizePicker(false);
    setShowShapePicker(false);
    setShowColorPicker(!showColorPicker);
  };

  const toggleSizePicker = () => {
    setShowColorPicker(false);
    setShowShapePicker(false);
    setShowSizePicker(!showSizePicker);
  };

  const toggleShapePicker = () => {
    setShowColorPicker(false);
    setShowSizePicker(false);
    setShowShapePicker(!showShapePicker);
  };

  const selectColor = (color: string) => {
    setSelectedColor(color);
    setIsEraser(false);
    setShowColorPicker(false);
  };

  const selectSize = (size: number) => {
    setBrushSize(size);
    setShowSizePicker(false);
  };

  const selectShape = (type: ShapeType | null) => {
    setSelectedShape(type);
    setIsEraser(false);
    setShowShapePicker(false);
  };

  const toggleEraser = () => {
    setIsEraser(!isEraser);
    setSelectedShape(null);
    closeAllPickers();
  };

  const switchToPen = () => {
    setSelectedShape(null);
    setIsEraser(false);
  };

  const hasContent = strokes.length > 0 || placedShapes.length > 0;

  return (
    <DynamicBackground>
      <View style={styles.container}>
        {/* Exit button */}
        <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
          <Ionicons name="close" size={28} color="#d84315" />
        </TouchableOpacity>

        {/* Canvas */}
        <View
          ref={canvasRef}
          style={styles.canvas}
          {...panResponder.panHandlers}
        >
          {safeStrokes.map((s, i) => renderStrokeDots(s, i))}
          {placedShapes.map((shape, i) => renderShape(shape, i))}
        </View>

        {/* Floating toolbar */}
        <View style={styles.floatingToolbar}>
          {/* Pen/Brush button */}
          <TouchableOpacity
            style={[styles.toolBtn, !isEraser && !selectedShape && styles.toolBtnActive]}
            onPress={switchToPen}
          >
            <Ionicons name="brush" size={22} color={!isEraser && !selectedShape ? '#4CAF50' : '#666'} />
          </TouchableOpacity>

          {/* Color picker button */}
          <TouchableOpacity
            style={[styles.colorBtn]}
            onPress={toggleColorPicker}
          >
            <View style={[styles.colorPreview, { backgroundColor: selectedColor }]}>
              <Ionicons name="color-palette" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Size picker button */}
          <TouchableOpacity
            style={[styles.sizeButton]}
            onPress={toggleSizePicker}
          >
            <Text style={styles.sizeButtonText}>
              {BRUSH_SIZES.find(b => b.size === brushSize)?.label || 'M'}
            </Text>
          </TouchableOpacity>

          {/* Shapes button */}
          <TouchableOpacity
            style={[styles.toolBtn, selectedShape && styles.shapeActive]}
            onPress={toggleShapePicker}
          >
            <Ionicons name="shapes" size={22} color={selectedShape ? '#fff' : '#666'} />
          </TouchableOpacity>

          {/* Eraser button */}
          <TouchableOpacity
            style={[styles.toolBtn, isEraser && styles.eraserActive]}
            onPress={toggleEraser}
          >
            <Ionicons name="bandage-outline" size={22} color={isEraser ? '#fff' : '#666'} />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Undo button */}
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={undoLast}
            disabled={!hasContent}
          >
            <Ionicons name="arrow-undo" size={22} color={hasContent ? '#FF9800' : '#ccc'} />
          </TouchableOpacity>

          {/* Clear all button */}
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={clearCanvas}
            disabled={!hasContent}
          >
            <Ionicons name="trash-outline" size={22} color={hasContent ? '#e53935' : '#ccc'} />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Save button */}
          <Animated.View style={{ transform: [{ scale: saveAnim }] }}>
            <TouchableOpacity
              style={[styles.toolBtn, styles.saveBtn, saved && styles.savedBtn]}
              onPress={saveDrawing}
              disabled={!hasContent}
            >
              <Ionicons
                name={saved ? 'checkmark-circle' : 'save'}
                size={24}
                color={saved ? '#fff' : hasContent ? '#4CAF50' : '#ccc'}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Color picker popup */}
        <Animated.View
          style={[
            styles.pickerPopup,
            styles.colorPickerPopup,
            {
              opacity: colorPickerAnim,
              transform: [
                { translateY: colorPickerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                { scale: colorPickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
              ],
            },
          ]}
          pointerEvents={showColorPicker ? 'auto' : 'none'}
        >
          {PENCIL_COLORS.map(color => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                selectedColor === color && styles.colorOptionSelected,
              ]}
              onPress={() => selectColor(color)}
            />
          ))}
        </Animated.View>

        {/* Size picker popup */}
        <Animated.View
          style={[
            styles.pickerPopup,
            styles.sizePickerPopup,
            {
              opacity: sizePickerAnim,
              transform: [
                { translateY: sizePickerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                { scale: sizePickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
              ],
            },
          ]}
          pointerEvents={showSizePicker ? 'auto' : 'none'}
        >
          {BRUSH_SIZES.map(b => (
            <TouchableOpacity
              key={b.size}
              style={[styles.sizeOption, brushSize === b.size && styles.sizeOptionSelected]}
              onPress={() => selectSize(b.size)}
            >
              <Text style={[styles.sizeOptionText, brushSize === b.size && styles.sizeOptionTextSelected]}>
                {b.label}
              </Text>
              <View
                style={{
                  width: Math.min(b.size, 18),
                  height: Math.min(b.size, 18),
                  borderRadius: b.size / 2,
                  backgroundColor: selectedColor,
                }}
              />
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Shape picker popup */}
        <Animated.View
          style={[
            styles.pickerPopup,
            styles.shapePickerPopup,
            {
              opacity: shapePickerAnim,
              transform: [
                { translateY: shapePickerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
                { scale: shapePickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
              ],
            },
          ]}
          pointerEvents={showShapePicker ? 'auto' : 'none'}
        >
          {SHAPES.map(shape => (
            <TouchableOpacity
              key={shape.type}
              style={[styles.shapeOption, selectedShape === shape.type && styles.shapeOptionSelected]}
              onPress={() => selectShape(shape.type)}
            >
              <Ionicons
                name={shape.icon as any}
                size={28}
                color={selectedShape === shape.type ? '#fff' : selectedColor}
              />
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Mode indicator */}
        {selectedShape && (
          <View style={styles.modeIndicator}>
            <Ionicons name={SHAPES.find(s => s.type === selectedShape)?.icon as any} size={16} color="#fff" />
            <Text style={styles.modeText}>Şekil modu - Tuvale dokun</Text>
          </View>
        )}
      </View>
    </DynamicBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  exitBtn: {
    position: 'absolute',
    top: 50,
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 229, 224, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  canvas: {
    flex: 1,
    backgroundColor: '#fffef9',
    marginTop: 10,
    marginHorizontal: 10,
    marginBottom: 90,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#f2e4cf',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  floatingToolbar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 28,
    paddingVertical: 8,
    paddingHorizontal: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    gap: 6,
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  toolBtnActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  colorBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 2,
  },
  sizeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  sizeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  shapeActive: {
    backgroundColor: '#9C27B0',
    borderColor: '#7B1FA2',
  },
  eraserActive: {
    backgroundColor: '#FF9800',
    borderColor: '#F57C00',
  },
  divider: {
    width: 2,
    height: 28,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 2,
    borderRadius: 1,
  },
  saveBtn: {
    borderColor: '#4CAF50',
  },
  savedBtn: {
    backgroundColor: '#4CAF50',
    borderColor: '#2E7D32',
  },
  pickerPopup: {
    position: 'absolute',
    bottom: 85,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 50,
  },
  colorPickerPopup: {
    left: 60,
    width: 190,
  },
  sizePickerPopup: {
    left: 110,
    width: 200,
  },
  shapePickerPopup: {
    left: 150,
    width: 220,
  },
  colorOption: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#333',
    transform: [{ scale: 1.1 }],
  },
  sizeOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    flexDirection: 'column',
    gap: 2,
  },
  sizeOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  sizeOptionText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
  },
  sizeOptionTextSelected: {
    color: '#4CAF50',
  },
  shapeOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  shapeOptionSelected: {
    borderColor: '#9C27B0',
    backgroundColor: '#9C27B0',
  },
  modeIndicator: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(156, 39, 176, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  modeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
