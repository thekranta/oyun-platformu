import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

const MIN_STEP = 2;
const SUCCESS_THRESHOLD = 0.65; // 65% coverage required

// Normalized coordinates (0-1) for number detection - matches visual template
const NUMBER_TEMPLATES: Record<number, Point[]> = {
    1: Array.from({ length: 30 }, (_, i) => ({ x: 0.5, y: 0.1 + (i * 0.8) / 29 })),
    2: [
        // Top arc
        ...Array.from({ length: 15 }, (_, i) => {
            const angle = Math.PI + (i * Math.PI) / 14;
            return { x: 0.5 + 0.2 * Math.cos(angle), y: 0.28 + 0.16 * Math.sin(angle) };
        }),
        // Diagonal line
        ...Array.from({ length: 15 }, (_, i) => ({ x: 0.7 - (i * 0.4) / 14, y: 0.28 + (i * 0.52) / 14 })),
        // Bottom horizontal
        ...Array.from({ length: 12 }, (_, i) => ({ x: 0.3 + (i * 0.4) / 11, y: 0.8 })),
    ],
    3: [
        // Top curve
        ...Array.from({ length: 15 }, (_, i) => {
            const angle = -Math.PI * 0.6 + (i * Math.PI * 1.1) / 14;
            return { x: 0.5 + 0.18 * Math.cos(angle), y: 0.28 + 0.15 * Math.sin(angle) };
        }),
        // Bottom curve
        ...Array.from({ length: 15 }, (_, i) => {
            const angle = -Math.PI * 0.6 + (i * Math.PI * 1.2) / 14;
            return { x: 0.5 + 0.18 * Math.cos(angle), y: 0.62 + 0.18 * Math.sin(angle) };
        }),
    ],
    4: [
        // Down stroke left
        ...Array.from({ length: 12 }, (_, i) => ({ x: 0.55 - (i * 0.25) / 11, y: 0.12 + (i * 0.4) / 11 })),
        // Horizontal line
        ...Array.from({ length: 12 }, (_, i) => ({ x: 0.3 + (i * 0.4) / 11, y: 0.52 })),
        // Vertical line
        ...Array.from({ length: 22 }, (_, i) => ({ x: 0.55, y: 0.12 + (i * 0.76) / 21 })),
    ],
    5: [
        // Top horizontal
        ...Array.from({ length: 10 }, (_, i) => ({ x: 0.68 - (i * 0.32) / 9, y: 0.14 })),
        // Down stroke
        ...Array.from({ length: 10 }, (_, i) => ({ x: 0.36, y: 0.14 + (i * 0.26) / 9 })),
        // Bottom curve
        ...Array.from({ length: 16 }, (_, i) => {
            const angle = -Math.PI * 0.55 + (i * Math.PI * 1.25) / 15;
            return { x: 0.52 + 0.18 * Math.cos(angle), y: 0.62 + 0.18 * Math.sin(angle) };
        }),
    ],
};

export default function RakamYazma({ onGameEnd, onExit }: Props) {
    // Dynamic dimensions
    const [canvasSize, setCanvasSize] = useState({ width: 300, height: 300 });
    const [currentNumber, setCurrentNumber] = useState(1);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [liveStroke, setLiveStroke] = useState<Stroke | null>(null);
    const liveStrokeRef = useRef<Stroke | null>(null);
    const coveredPointsRef = useRef<Set<number>>(new Set());
    const [coveredCount, setCoveredCount] = useState(0);
    const startTimeRef = useRef(Date.now());
    const [successAnim] = useState(new Animated.Value(0));
    const [showSuccess, setShowSuccess] = useState(false);

    // Recalculate on dimension change
    useEffect(() => {
        const updateDimensions = () => {
            const { width, height } = Dimensions.get('window');
            const canvasWidth = Math.min(width * 0.9, 500);
            const canvasHeight = Math.min(height * 0.5, 400);
            setCanvasSize({ width: canvasWidth, height: canvasHeight });
        };
        updateDimensions();
        const subscription = Dimensions.addEventListener('change', updateDimensions);
        return () => subscription?.remove();
    }, []);

    // Convert normalized points to actual canvas coordinates
    const targetPoints = useMemo(() => {
        return NUMBER_TEMPLATES[currentNumber].map(p => ({
            x: p.x * canvasSize.width,
            y: p.y * canvasSize.height,
        }));
    }, [currentNumber, canvasSize]);

    // Hit radius scales with canvas size
    const hitRadius = useMemo(() => Math.max(canvasSize.width * 0.08, 25), [canvasSize]);

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
            if (currentNumber < 5) {
                resetForNextNumber(currentNumber + 1);
            } else {
                const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
                onGameEnd('rakam-yazma', duration, 5, 0);
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
        return coveredPointsRef.current.size;
    }, []);

    const addPoint = useCallback((x: number, y: number, points: Point[], radius: number) => {
        const strokeSize = Math.max(canvasSize.width * 0.04, 12);
        const baseStroke = liveStrokeRef.current ?? { color: '#4FC3F7', size: strokeSize, points: [] as Point[] };
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

        const nextStroke = { ...baseStroke, points: currentPoints };
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
                    addPoint(locationX, locationY, targetPoints, hitRadius);
                },
                onPanResponderMove: e => {
                    if (showSuccess) return;
                    const { locationX, locationY } = e.nativeEvent;
                    addPoint(locationX, locationY, targetPoints, hitRadius);
                },
                onPanResponderRelease: () => {
                    if (showSuccess) return;
                    finishStroke(targetPoints);
                },
            }),
        [targetPoints, hitRadius, addPoint, finishStroke, showSuccess],
    );

    const clearCanvas = () => {
        setStrokes([]);
        setLiveStroke(null);
        liveStrokeRef.current = null;
        coveredPointsRef.current = new Set();
        setCoveredCount(0);
    };

    const progress = Math.round((coveredCount / targetPoints.length) * 100);

    // Dynamic font size based on canvas
    const templateFontSize = Math.min(canvasSize.height * 0.85, canvasSize.width * 0.7);

    return (
        <DynamicBackground>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                        <Ionicons name="close" size={28} color="#d84315" />
                    </TouchableOpacity>
                    <Text style={styles.title}>✏️ Rakam Yazma</Text>
                    <View style={styles.progressBadge}>
                        <Text style={styles.progressText}>{currentNumber}/5</Text>
                    </View>
                </View>

                <View
                    style={[
                        styles.canvasContainer,
                        { width: canvasSize.width, height: canvasSize.height },
                    ]}
                >
                    {/* Faded number template only */}
                    <View style={styles.templateOverlay}>
                        <Text
                            style={[
                                styles.templateText,
                                { fontSize: templateFontSize, lineHeight: templateFontSize * 1.1 },
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
                    <Text style={styles.infoText}>
                        {currentNumber}. rakamın üzerini çiz! ✨
                    </Text>
                    <TouchableOpacity style={styles.clearBtn} onPress={clearCanvas}>
                        <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.clearBtnText}>Temizle</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, alignItems: 'center' },
    header: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
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
    title: { fontSize: 24, fontWeight: 'bold', color: '#3e2723' },
    progressBadge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    progressText: { fontSize: 16, fontWeight: 'bold', color: '#1976D2' },
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
        fontWeight: '300',
        color: 'rgba(0, 0, 0, 0.12)',
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
        marginTop: 15,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#66BB6A',
        borderRadius: 5,
    },
    progressLabel: {
        fontSize: 14,
        color: '#757575',
        marginTop: 6,
    },
    footer: { marginTop: 20, alignItems: 'center' },
    infoText: { fontSize: 18, color: '#5D4037', marginBottom: 15, fontWeight: '500' },
    clearBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF7043',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 18,
        elevation: 3,
    },
    clearBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
