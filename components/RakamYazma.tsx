import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
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

const { width, height } = Dimensions.get('window');
const CANVAS_WIDTH = width * 0.9;
const CANVAS_HEIGHT = height * 0.5;
const MIN_STEP = 2;
const SUCCESS_THRESHOLD = 0.7; // Lowered to 70% for better UX

// Simplified number templates for easier tracing
const NUMBER_TEMPLATES: Record<number, Point[]> = {
    1: Array.from({ length: 25 }, (_, i) => ({ x: 0.5, y: 0.15 + (i * 0.7) / 24 })),
    2: [
        // Top arc
        ...Array.from({ length: 12 }, (_, i) => {
            const angle = Math.PI + (i * Math.PI) / 11;
            return { x: 0.5 + 0.18 * Math.cos(angle), y: 0.32 + 0.14 * Math.sin(angle) };
        }),
        // Diagonal down
        ...Array.from({ length: 12 }, (_, i) => ({ x: 0.68 - (i * 0.36) / 11, y: 0.32 + (i * 0.42) / 11 })),
        // Bottom line
        ...Array.from({ length: 12 }, (_, i) => ({ x: 0.32 + (i * 0.36) / 11, y: 0.74 })),
    ],
    3: [
        // Top curve
        ...Array.from({ length: 12 }, (_, i) => {
            const angle = -Math.PI * 0.7 + (i * Math.PI * 1.2) / 11;
            return { x: 0.5 + 0.16 * Math.cos(angle), y: 0.32 + 0.14 * Math.sin(angle) };
        }),
        // Bottom curve
        ...Array.from({ length: 12 }, (_, i) => {
            const angle = -Math.PI * 0.7 + (i * Math.PI * 1.2) / 11;
            return { x: 0.5 + 0.16 * Math.cos(angle), y: 0.58 + 0.16 * Math.sin(angle) };
        }),
    ],
    4: [
        // Down stroke on left
        ...Array.from({ length: 10 }, (_, i) => ({ x: 0.55 - (i * 0.22) / 9, y: 0.18 + (i * 0.35) / 9 })),
        // Horizontal line
        ...Array.from({ length: 10 }, (_, i) => ({ x: 0.33 + (i * 0.35) / 9, y: 0.53 })),
        // Vertical line
        ...Array.from({ length: 18 }, (_, i) => ({ x: 0.55, y: 0.18 + (i * 0.65) / 17 })),
    ],
    5: [
        // Top horizontal
        ...Array.from({ length: 10 }, (_, i) => ({ x: 0.65 - (i * 0.28) / 9, y: 0.2 })),
        // Down stroke
        ...Array.from({ length: 8 }, (_, i) => ({ x: 0.37, y: 0.2 + (i * 0.22) / 7 })),
        // Bottom curve
        ...Array.from({ length: 14 }, (_, i) => {
            const angle = -Math.PI * 0.6 + (i * Math.PI * 1.3) / 13;
            return { x: 0.5 + 0.16 * Math.cos(angle), y: 0.58 + 0.16 * Math.sin(angle) };
        }),
    ],
};

// Child-friendly number display (using dotted pattern display)
const DISPLAY_NUMBERS: Record<number, string> = {
    1: '1',
    2: '2',
    3: '3',
    4: '4',
    5: '5',
};

export default function RakamYazma({ onGameEnd, onExit }: Props) {
    const [currentNumber, setCurrentNumber] = useState(1);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [liveStroke, setLiveStroke] = useState<Stroke | null>(null);
    const liveStrokeRef = useRef<Stroke | null>(null);
    const coveredPointsRef = useRef<Set<number>>(new Set());
    const [coveredCount, setCoveredCount] = useState(0);
    const startTimeRef = useRef(Date.now());
    const [successAnim] = useState(new Animated.Value(0));
    const [showSuccess, setShowSuccess] = useState(false);

    const targetPoints = useMemo(() => {
        return NUMBER_TEMPLATES[currentNumber].map(p => ({
            x: p.x * CANVAS_WIDTH,
            y: p.y * CANVAS_HEIGHT,
        }));
    }, [currentNumber]);

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

    const checkAndUpdateCoverage = useCallback((x: number, y: number, points: Point[]) => {
        let updated = false;
        points.forEach((p, idx) => {
            if (!coveredPointsRef.current.has(idx)) {
                const dist = Math.sqrt(Math.pow(x - p.x, 2) + Math.pow(y - p.y, 2));
                if (dist < 30) { // Increased hit area for easier detection
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

    const addPoint = useCallback((x: number, y: number, points: Point[]) => {
        const baseStroke = liveStrokeRef.current ?? { color: '#4FC3F7', size: 18, points: [] as Point[] };
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
                checkAndUpdateCoverage(px, py, points);
            }
        }
        currentPoints.push({ x, y });
        checkAndUpdateCoverage(x, y, points);

        const nextStroke = { ...baseStroke, points: currentPoints };
        liveStrokeRef.current = nextStroke;
        setLiveStroke(nextStroke);
    }, [checkAndUpdateCoverage]);

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
                    addPoint(locationX, locationY, targetPoints);
                },
                onPanResponderMove: e => {
                    if (showSuccess) return;
                    const { locationX, locationY } = e.nativeEvent;
                    addPoint(locationX, locationY, targetPoints);
                },
                onPanResponderRelease: () => {
                    if (showSuccess) return;
                    finishStroke(targetPoints);
                },
            }),
        [targetPoints, addPoint, finishStroke, showSuccess],
    );

    const clearCanvas = () => {
        setStrokes([]);
        setLiveStroke(null);
        liveStrokeRef.current = null;
        coveredPointsRef.current = new Set();
        setCoveredCount(0);
    };

    const progress = Math.round((coveredCount / targetPoints.length) * 100);

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

                <View style={styles.canvasContainer}>
                    {/* Dotted guide showing where to trace */}
                    <View style={styles.guideLayer}>
                        {targetPoints.map((p, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.guidePoint,
                                    {
                                        left: p.x - 8,
                                        top: p.y - 8,
                                        backgroundColor: coveredPointsRef.current.has(i) ? '#81C784' : '#E0E0E0',
                                    },
                                ]}
                            />
                        ))}
                    </View>

                    {/* Template number overlay */}
                    <View style={styles.templateOverlay}>
                        <Text style={styles.templateText}>{DISPLAY_NUMBERS[currentNumber]}</Text>
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
                                    transform: [{ scale: successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
                                },
                            ]}
                        >
                            <Ionicons name="checkmark-circle" size={100} color="#4CAF50" />
                            <Text style={styles.successText}>Harika! 🎉</Text>
                        </Animated.View>
                    )}
                </View>

                {/* Progress bar */}
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressLabel}>%{progress} tamamlandı</Text>

                <View style={styles.footer}>
                    <Text style={styles.infoText}>
                        {currentNumber}. rakamı noktaları takip ederek çiz! ✨
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
    title: { fontSize: 26, fontWeight: 'bold', color: '#3e2723' },
    progressBadge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
    },
    progressText: { fontSize: 16, fontWeight: 'bold', color: '#1976D2' },
    canvasContainer: {
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
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
    guideLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    guidePoint: {
        position: 'absolute',
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#BDBDBD',
    },
    templateOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        opacity: 0.08,
        zIndex: 0,
    },
    templateText: {
        fontSize: 280,
        fontWeight: '300',
        color: '#000',
        fontFamily: 'System',
        letterSpacing: -10,
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
    successText: { fontSize: 36, fontWeight: 'bold', color: '#4CAF50', marginTop: 10 },
    progressBarContainer: {
        width: CANVAS_WIDTH,
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
