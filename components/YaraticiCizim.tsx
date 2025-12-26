import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import DynamicBackground from './DynamicBackground';

type Point = { x: number; y: number };
type Stroke = { color: string; size: number; points: Point[]; isEraser?: boolean };

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
const BRUSH_SIZES = [4, 8, 14, 22];

const MIN_STEP = 2;

export default function YaraticiCizim({ onGameEnd, onExit }: Props) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [liveStroke, setLiveStroke] = useState<Stroke | null>(null);
  const liveStrokeRef = useRef<Stroke | null>(null);
  const canvasRef = useRef<View>(null);
  const [selectedColor, setSelectedColor] = useState(PENCIL_COLORS[0]);
  const [brushSize, setBrushSize] = useState(8);
  const [saved, setSaved] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const startTimeRef = useRef(Date.now());

  // Animations
  const colorPickerAnim = useRef(new Animated.Value(0)).current;
  const sizePickerAnim = useRef(new Animated.Value(0)).current;
  const saveAnim = useRef(new Animated.Value(1)).current;

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

  const allStrokes = useMemo(
    () => (liveStroke ? [...strokes, liveStroke] : strokes),
    [strokes, liveStroke],
  );
  const safeStrokes = useMemo(
    () => allStrokes.filter((s): s is Stroke => Boolean(s && s.points)),
    [allStrokes],
  );

  const addPoint = (x: number, y: number) => {
    const currentColor = isEraser ? '#fffef9' : selectedColor; // Eraser uses canvas bg color
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

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: e => {
          setShowColorPicker(false);
          setShowSizePicker(false);
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
    [selectedColor, brushSize, isEraser],
  );

  const clearCanvas = () => {
    setStrokes([]);
    setLiveStroke(null);
    liveStrokeRef.current = null;
    setSaved(false);
    startTimeRef.current = Date.now();
  };

  const undoLast = () => {
    if (strokes.length > 0) {
      setStrokes(prev => prev.slice(0, -1));
      setSaved(false);
    }
  };

  const saveDrawing = async () => {
    const bundle = liveStrokeRef.current ? [...strokes, liveStrokeRef.current] : strokes;
    if (bundle.length === 0) return;

    // Animate save button
    Animated.sequence([
      Animated.timing(saveAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.timing(saveAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();

    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
    const serialized = JSON.stringify({ strokes: bundle, savedAt: Date.now() });
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
        }}
      />
    ));

  const toggleColorPicker = () => {
    setShowSizePicker(false);
    setShowColorPicker(!showColorPicker);
  };

  const toggleSizePicker = () => {
    setShowColorPicker(false);
    setShowSizePicker(!showSizePicker);
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

  const toggleEraser = () => {
    setIsEraser(!isEraser);
    setShowColorPicker(false);
    setShowSizePicker(false);
  };

  return (
    <DynamicBackground>
      <View style={styles.container}>
        {/* Exit button */}
        <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
          <Ionicons name="close" size={28} color="#d84315" />
        </TouchableOpacity>

        {/* Canvas - full screen */}
        <View
          ref={canvasRef}
          style={styles.canvas}
          {...panResponder.panHandlers}
        >
          {safeStrokes.map((s, i) => renderStrokeDots(s, i))}
        </View>

        {/* Floating toolbar at bottom */}
        <View style={styles.floatingToolbar}>
          {/* Color picker button */}
          <TouchableOpacity
            style={[styles.toolBtn, !isEraser && styles.toolBtnActive]}
            onPress={toggleColorPicker}
          >
            <View style={[styles.colorPreview, { backgroundColor: selectedColor }]} />
          </TouchableOpacity>

          {/* Size picker button */}
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={toggleSizePicker}
          >
            <View style={[styles.sizePreview, {
              width: Math.min(brushSize, 24),
              height: Math.min(brushSize, 24),
              backgroundColor: isEraser ? '#ccc' : selectedColor
            }]} />
          </TouchableOpacity>

          {/* Eraser button */}
          <TouchableOpacity
            style={[styles.toolBtn, isEraser && styles.eraserActive]}
            onPress={toggleEraser}
          >
            <Ionicons name="bandage-outline" size={24} color={isEraser ? '#fff' : '#666'} />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Undo button */}
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={undoLast}
            disabled={strokes.length === 0}
          >
            <Ionicons name="arrow-undo" size={24} color={strokes.length > 0 ? '#FF9800' : '#ccc'} />
          </TouchableOpacity>

          {/* Clear all button */}
          <TouchableOpacity
            style={styles.toolBtn}
            onPress={clearCanvas}
            disabled={strokes.length === 0}
          >
            <Ionicons name="trash-outline" size={24} color={strokes.length > 0 ? '#e53935' : '#ccc'} />
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Save button */}
          <Animated.View style={{ transform: [{ scale: saveAnim }] }}>
            <TouchableOpacity
              style={[styles.toolBtn, styles.saveBtn, saved && styles.savedBtn]}
              onPress={saveDrawing}
              disabled={strokes.length === 0}
            >
              <Ionicons
                name={saved ? 'checkmark-circle' : 'save'}
                size={26}
                color={saved ? '#fff' : strokes.length > 0 ? '#4CAF50' : '#ccc'}
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
          {BRUSH_SIZES.map(size => (
            <TouchableOpacity
              key={size}
              style={[styles.sizeOption, brushSize === size && styles.sizeOptionSelected]}
              onPress={() => selectSize(size)}
            >
              <View
                style={{
                  width: Math.min(size, 20),
                  height: Math.min(size, 20),
                  borderRadius: size / 2,
                  backgroundColor: selectedColor,
                }}
              />
            </TouchableOpacity>
          ))}
        </Animated.View>
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
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    gap: 8,
  },
  toolBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
  colorPreview: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 2,
  },
  sizePreview: {
    borderRadius: 12,
  },
  eraserActive: {
    backgroundColor: '#FF9800',
    borderColor: '#F57C00',
  },
  divider: {
    width: 2,
    height: 32,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
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
    bottom: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 50,
  },
  colorPickerPopup: {
    left: 20,
    width: 200,
  },
  sizePickerPopup: {
    left: 80,
    width: 180,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#333',
    transform: [{ scale: 1.1 }],
  },
  sizeOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  sizeOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
});
