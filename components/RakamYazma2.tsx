import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';

// Rakam Yazma 6-10 — "Rakam Yazma" oyununun büyük sayılarla temalı varyantı.
// Aynı çizim/kapsama mekaniği; 6, 7, 8, 9 ve iki basamaklı 10 için yeni şablonlar.

type Point = { x: number; y: number };
type Stroke = { color: string; size: number; points: Point[] };

interface Props {
    onGameEnd: (
        oyunAdi: string,
        sure: number,
        finalHamle: number,
        finalHata: number,
        algilananKelime?: string,
        extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string },
    ) => void;
    onExit?: () => void;
}

const MIN_STEP = 2;
const SUCCESS_THRESHOLD = 0.85; // iki basamaklı 10 için biraz daha hoşgörülü

const FIRST_NUMBER = 6;
const LAST_NUMBER = 10;

const PEN_COLORS = [
    { color: '#2196F3', name: 'Mavi' },
    { color: '#E91E63', name: 'Pembe' },
    { color: '#4CAF50', name: 'Yeşil' },
    { color: '#FF9800', name: 'Turuncu' },
    { color: '#9C27B0', name: 'Mor' },
    { color: '#F44336', name: 'Kırmızı' },
];

// --- Şablon yardımcıları (normalize 0-1 koordinatlar) ---
const seg = (x0: number, y0: number, x1: number, y1: number, num: number): Point[] =>
    Array.from({ length: num }, (_, i) => {
        const t = num <= 1 ? 0 : i / (num - 1);
        return { x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t };
    });

const qbez = (x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, num: number): Point[] =>
    Array.from({ length: num }, (_, i) => {
        const t = i / (num - 1);
        const u = 1 - t;
        return { x: u * u * x0 + 2 * u * t * x1 + t * t * x2, y: u * u * y0 + 2 * u * t * y1 + t * t * y2 };
    });

const ring = (cx: number, cy: number, rx: number, ry: number, num: number): Point[] =>
    Array.from({ length: num }, (_, i) => {
        const a = (i / num) * 2 * Math.PI;
        return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
    });

// Tek bir basamağın (0,1,6,7,8,9) çizim noktaları — cx/cy merkez, s ölçek
const digitPoints = (d: number, cx: number, cy: number, s: number): Point[] => {
    switch (d) {
        case 0:
            return ring(cx, cy, s * 0.55, s * 0.82, 26);
        case 1:
            return [
                ...seg(cx, cy - s * 0.85, cx, cy + s * 0.85, 20),
                ...seg(cx, cy - s * 0.85, cx - s * 0.32, cy - s * 0.52, 4), // üst bayrak
            ];
        case 6:
            return [
                ...qbez(cx + s * 0.38, cy - s * 0.78, cx - s * 0.62, cy - s * 0.35, cx - s * 0.46, cy + s * 0.3, 14),
                ...ring(cx, cy + s * 0.36, s * 0.48, s * 0.5, 16),
            ];
        case 7:
            return [
                ...seg(cx - s * 0.48, cy - s * 0.78, cx + s * 0.5, cy - s * 0.78, 12),
                ...seg(cx + s * 0.5, cy - s * 0.78, cx - s * 0.18, cy + s * 0.82, 16),
            ];
        case 8:
            return [
                ...ring(cx, cy - s * 0.42, s * 0.4, s * 0.42, 14),
                ...ring(cx, cy + s * 0.4, s * 0.52, s * 0.5, 16),
            ];
        case 9:
            return [
                ...ring(cx, cy - s * 0.35, s * 0.48, s * 0.5, 16),
                ...qbez(cx + s * 0.46, cy - s * 0.35, cx + s * 0.5, cy + s * 0.4, cx - s * 0.22, cy + s * 0.82, 12),
            ];
        default:
            return [];
    }
};

const createNumberPoints = (num: number): Point[] => {
    if (num >= 10) {
        // İki basamaklı: "1" solda, "0" sağda
        return [
            ...digitPoints(1, 0.34, 0.5, 0.24),
            ...digitPoints(0, 0.66, 0.5, 0.24),
        ];
    }
    return digitPoints(num, 0.5, 0.5, 0.35);
};

export default function RakamYazma2({ onGameEnd, onExit }: Props) {
    const [canvasSize, setCanvasSize] = useState({ width: 300, height: 300 });
    const [currentNumber, setCurrentNumber] = useState(FIRST_NUMBER);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [liveStroke, setLiveStroke] = useState<Stroke | null>(null);
    const liveStrokeRef = useRef<Stroke | null>(null);
    const coveredPointsRef = useRef<Set<number>>(new Set());
    const [coveredCount, setCoveredCount] = useState(0);
    const startTimeRef = useRef(Date.now());
    const [successAnim] = useState(new Animated.Value(0));
    const [showSuccess, setShowSuccess] = useState(false);
    const [gameReady, setGameReady] = useState(false);

    const [selectedColor, setSelectedColor] = useState(PEN_COLORS[0].color);

    useEffect(() => {
        const updateDimensions = () => {
            const { width, height } = Dimensions.get('window');
            const canvasWidth = Math.min(width * 0.9, 500);
            const canvasHeight = Math.min(height * 0.45, 380);
            setCanvasSize({ width: canvasWidth, height: canvasHeight });
        };
        updateDimensions();
        const subscription = Dimensions.addEventListener('change', updateDimensions);
        return () => subscription?.remove();
    }, []);

    const targetPoints = useMemo(() => {
        const points = createNumberPoints(currentNumber);
        return points.map(p => ({ x: p.x * canvasSize.width, y: p.y * canvasSize.height }));
    }, [currentNumber, canvasSize]);

    const hitRadius = useMemo(() => {
        return Math.max(Math.min(canvasSize.width, canvasSize.height) * 0.12, 35);
    }, [canvasSize]);

    const resetForNextNumber = useCallback((nextNum: number) => {
        coveredPointsRef.current = new Set();
        setCoveredCount(0);
        setStrokes([]);
        setLiveStroke(null);
        liveStrokeRef.current = null;
        setCurrentNumber(nextNum);
    }, []);

    const handleSuccess = useCallback(() => {
        setShowSuccess(true);
        Animated.sequence([
            Animated.timing(successAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
            Animated.delay(600),
            Animated.timing(successAnim, { toValue: 0, duration: 300, useNativeDriver: false }),
        ]).start(() => {
            setShowSuccess(false);
            if (currentNumber < LAST_NUMBER) {
                resetForNextNumber(currentNumber + 1);
            } else {
                const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
                onGameEnd('rakam-yazma-2', duration, LAST_NUMBER - FIRST_NUMBER + 1, 0, undefined, {
                    zorlukSeviyesi: 2,
                    kazanimOdagi: 'El-Göz Koordinasyonu ve Yazı Becerileri (6-10)',
                });
            }
        });
    }, [currentNumber, onGameEnd, resetForNextNumber, successAnim]);

    const checkAndUpdateCoverage = useCallback((x: number, y: number, points: Point[], radius: number) => {
        let updated = false;
        points.forEach((p, idx) => {
            if (!coveredPointsRef.current.has(idx)) {
                const dist = Math.sqrt(Math.pow(x - p.x, 2) + Math.pow(y - p.y, 2));
                if (dist < radius) {
                    coveredPointsRef.current.add(idx);
                    updated = true;
                }
            }
        });
        if (updated) {
            setCoveredCount(coveredPointsRef.current.size);
        }
    }, []);

    const addPoint = useCallback((x: number, y: number, points: Point[], radius: number, color: string) => {
        const strokeSize = Math.max(canvasSize.width * 0.04, 12);
        const baseStroke = liveStrokeRef.current ?? { color, size: strokeSize, points: [] as Point[] };
        const currentPoints: Point[] = [...baseStroke.points];
        const last = currentPoints[currentPoints.length - 1];

        if (last) {
            const dx = x - last.x;
            const dy = y - last.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const steps = Math.floor(dist / MIN_STEP);
            for (let i = 1; i <= steps; i++) {
                const ratio = i / (steps + 1);
                const px = last.x + dx * ratio;
                const py = last.y + dy * ratio;
                currentPoints.push({ x: px, y: py });
                checkAndUpdateCoverage(px, py, points, radius);
            }
        }
        currentPoints.push({ x, y });
        checkAndUpdateCoverage(x, y, points, radius);

        const nextStroke = { ...baseStroke, color, points: currentPoints };
        liveStrokeRef.current = nextStroke;
        setLiveStroke(nextStroke);
    }, [checkAndUpdateCoverage, canvasSize]);

    const finishStroke = useCallback((points: Point[]) => {
        const completed = liveStrokeRef.current;
        if (completed) {
            setStrokes(prev => [...prev, completed]);
        }
        setLiveStroke(null);
        liveStrokeRef.current = null;

        const coverage = coveredPointsRef.current.size / points.length;
        if (coverage >= SUCCESS_THRESHOLD) {
            handleSuccess();
        }
    }, [handleSuccess]);

    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => !showSuccess,
                onMoveShouldSetPanResponder: () => !showSuccess,
                onPanResponderGrant: e => {
                    if (showSuccess) return;
                    const { locationX, locationY } = e.nativeEvent;
                    addPoint(locationX, locationY, targetPoints, hitRadius, selectedColor);
                },
                onPanResponderMove: e => {
                    if (showSuccess) return;
                    const { locationX, locationY } = e.nativeEvent;
                    addPoint(locationX, locationY, targetPoints, hitRadius, selectedColor);
                },
                onPanResponderRelease: () => {
                    if (showSuccess) return;
                    finishStroke(targetPoints);
                },
            }),
        [targetPoints, hitRadius, selectedColor, addPoint, finishStroke, showSuccess],
    );

    const clearCanvas = () => {
        setStrokes([]);
        setLiveStroke(null);
        liveStrokeRef.current = null;
        coveredPointsRef.current = new Set();
        setCoveredCount(0);
    };

    const progress = Math.round((coveredCount / targetPoints.length) * 100);
    const isTwoDigit = currentNumber >= 10;
    const templateFontSize = isTwoDigit
        ? Math.min(canvasSize.height * 0.6, canvasSize.width * 0.42)
        : Math.min(canvasSize.height * 0.85, canvasSize.width * 0.75);
    const step = currentNumber - FIRST_NUMBER + 1;
    const totalSteps = LAST_NUMBER - FIRST_NUMBER + 1;

    return (
        <DynamicBackground>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                        <Ionicons name="close" size={28} color="#d84315" />
                    </TouchableOpacity>
                    <Text style={styles.title}>✏️ Rakam Yazma 6-10</Text>
                    <View style={styles.progressBadge}>
                        <Text style={styles.progressText}>{step}/{totalSteps}</Text>
                    </View>
                </View>

                {/* Color Palette */}
                <View style={styles.colorPalette}>
                    {PEN_COLORS.map((pen) => (
                        <TouchableOpacity
                            key={pen.color}
                            onPress={() => setSelectedColor(pen.color)}
                            style={[
                                styles.colorBtn,
                                { backgroundColor: pen.color },
                                selectedColor === pen.color && styles.colorBtnSelected,
                            ]}
                        >
                            {selectedColor === pen.color && (
                                <Ionicons name="checkmark" size={18} color="#fff" />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                <View
                    style={[
                        styles.canvasContainer,
                        { width: canvasSize.width, height: canvasSize.height },
                    ]}
                >
                    {/* Faded number template */}
                    <View style={styles.templateOverlay}>
                        <Text
                            style={[
                                styles.templateText,
                                { fontSize: templateFontSize, lineHeight: templateFontSize * 1.05 },
                            ]}
                        >
                            {currentNumber}
                        </Text>
                    </View>

                    {/* Drawing canvas */}
                    <View {...panResponder.panHandlers} style={styles.canvas}>
                        {strokes.map((stroke, i) => (
                            <React.Fragment key={i}>
                                {stroke.points.map((p, j) => (
                                    <View
                                        key={`${i}-${j}`}
                                        style={[
                                            styles.point,
                                            {
                                                left: p.x - stroke.size / 2,
                                                top: p.y - stroke.size / 2,
                                                width: stroke.size,
                                                height: stroke.size,
                                                borderRadius: stroke.size / 2,
                                                backgroundColor: stroke.color,
                                            },
                                        ]}
                                    />
                                ))}
                            </React.Fragment>
                        ))}
                        {liveStroke?.points.map((p, i) => (
                            <View
                                key={`live-${i}`}
                                style={[
                                    styles.point,
                                    {
                                        left: p.x - liveStroke.size / 2,
                                        top: p.y - liveStroke.size / 2,
                                        width: liveStroke.size,
                                        height: liveStroke.size,
                                        borderRadius: liveStroke.size / 2,
                                        backgroundColor: liveStroke.color,
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    {/* Success overlay */}
                    {showSuccess && (
                        <Animated.View
                            style={[
                                styles.successOverlay,
                                {
                                    opacity: successAnim,
                                    transform: [
                                        {
                                            scale: successAnim.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0.5, 1],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        >
                            <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
                            <Text style={styles.successText}>Harika! 🎉</Text>
                        </Animated.View>
                    )}
                </View>

                {/* Progress bar */}
                <View style={[styles.progressBarContainer, { width: canvasSize.width }]}>
                    <View style={[styles.progressBar, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressLabel}>%{progress} tamamlandı</Text>

                <View style={styles.footer}>
                    <Text style={styles.infoText}>{currentNumber} sayısının üzerini çiz! ✨</Text>
                    <TouchableOpacity style={styles.clearBtn} onPress={clearCanvas}>
                        <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.clearBtnText}>Temizle</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    interaction="draw"
                    message="6'dan 10'a rakamları parmağınla çiz!"
                    countdownSeconds={5}
                    onComplete={() => setGameReady(true)}
                />
            )}
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, alignItems: 'center' },
    header: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
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
    title: { fontSize: 22, fontWeight: 'bold', color: '#3e2723' },
    progressBadge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    progressText: { fontSize: 14, fontWeight: 'bold', color: '#1976D2' },

    colorPalette: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 12,
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        elevation: 2,
    },
    colorBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    colorBtnSelected: {
        borderWidth: 3,
        borderColor: '#fff',
        transform: [{ scale: 1.15 }],
        elevation: 4,
    },

    canvasContainer: {
        backgroundColor: '#FFFEF7',
        borderRadius: 24,
        position: 'relative',
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        borderWidth: 3,
        borderColor: '#FFE0B2',
    },
    templateOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 0,
    },
    templateText: {
        fontWeight: '900',
        color: 'rgba(0, 0, 0, 0.18)',
        textAlign: 'center',
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    canvas: { flex: 1, zIndex: 5 },
    point: { position: 'absolute' },
    successOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    successText: { fontSize: 32, fontWeight: 'bold', color: '#4CAF50', marginTop: 10 },
    progressBarContainer: {
        height: 10,
        backgroundColor: '#E0E0E0',
        borderRadius: 5,
        marginTop: 12,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#66BB6A',
        borderRadius: 5,
    },
    progressLabel: {
        fontSize: 13,
        color: '#757575',
        marginTop: 4,
    },
    footer: { marginTop: 14, alignItems: 'center' },
    infoText: { fontSize: 16, color: '#5D4037', marginBottom: 12, fontWeight: '500' },
    clearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF7043',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 16,
        elevation: 3,
    },
    clearBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
