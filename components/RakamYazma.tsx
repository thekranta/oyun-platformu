import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import CountdownOverlay from './CountdownOverlay';
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
        extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string },
    ) => void;
    onExit?: () => void;
}

const MIN_STEP = 2;
const SUCCESS_THRESHOLD = 0.9;

// Color palette for pen selection
const PEN_COLORS = [
    { color: '#2196F3', name: 'Mavi' },
    { color: '#E91E63', name: 'Pembe' },
    { color: '#4CAF50', name: 'Yeşil' },
    { color: '#FF9800', name: 'Turuncu' },
    { color: '#9C27B0', name: 'Mor' },
    { color: '#F44336', name: 'Kırmızı' },
];

// Detection points - balanced distribution for each number
const createNumberPoints = (num: number): Point[] => {
    const centerX = 0.5;
    const centerY = 0.5;
    const scale = 0.35;

    switch (num) {
        case 1:
            // Simple vertical line - evenly distributed
            return Array.from({ length: 25 }, (_, i) => ({
                x: centerX,
                y: centerY - scale + (i * scale * 2) / 24,
            }));

        case 2:
            // Top curve + diagonal + bottom line (balanced)
            return [
                // Top arc
                ...Array.from({ length: 12 }, (_, i) => {
                    const angle = Math.PI * 1.1 + (i * Math.PI * 0.9) / 11;
                    return {
                        x: centerX + 0.05 + scale * 0.5 * Math.cos(angle),
                        y: centerY - scale * 0.45 + scale * 0.45 * Math.sin(angle),
                    };
                }),
                // Diagonal
                ...Array.from({ length: 12 }, (_, i) => ({
                    x: centerX + scale * 0.55 - (i * scale * 1.1) / 11,
                    y: centerY - scale * 0.05 + (i * scale * 0.75) / 11,
                })),
                // Bottom horizontal
                ...Array.from({ length: 12 }, (_, i) => ({
                    x: centerX - scale * 0.55 + (i * scale * 1.1) / 11,
                    y: centerY + scale * 0.7,
                })),
            ];

        case 3:
            // Two curves stacked (balanced)
            return [
                // Top curve
                ...Array.from({ length: 14 }, (_, i) => {
                    const angle = -Math.PI * 0.7 + (i * Math.PI * 1.2) / 13;
                    return {
                        x: centerX + scale * 0.45 * Math.cos(angle),
                        y: centerY - scale * 0.5 + scale * 0.4 * Math.sin(angle),
                    };
                }),
                // Bottom curve
                ...Array.from({ length: 14 }, (_, i) => {
                    const angle = -Math.PI * 0.6 + (i * Math.PI * 1.3) / 13;
                    return {
                        x: centerX + scale * 0.5 * Math.cos(angle),
                        y: centerY + scale * 0.35 + scale * 0.45 * Math.sin(angle),
                    };
                }),
            ];

        case 4:
            // FIXED: Balanced distribution - fewer vertical points, more on diagonal and horizontal
            return [
                // Diagonal from top-right going down-left (main stroke)
                ...Array.from({ length: 12 }, (_, i) => ({
                    x: centerX + scale * 0.2 - (i * scale * 0.7) / 11,
                    y: centerY - scale * 0.85 + (i * scale * 1.0) / 11,
                })),
                // Horizontal line in middle
                ...Array.from({ length: 14 }, (_, i) => ({
                    x: centerX - scale * 0.5 + (i * scale * 0.95) / 13,
                    y: centerY + scale * 0.15,
                })),
                // Vertical line - ONLY the parts not covered by diagonal
                // Upper part (above horizontal)
                ...Array.from({ length: 6 }, (_, i) => ({
                    x: centerX + scale * 0.2,
                    y: centerY - scale * 0.85 + (i * scale * 0.5) / 5,
                })),
                // Lower part (below horizontal)
                ...Array.from({ length: 8 }, (_, i) => ({
                    x: centerX + scale * 0.2,
                    y: centerY + scale * 0.25 + (i * scale * 0.6) / 7,
                })),
            ];

        case 5:
            // Top horizontal + down stroke + bottom curve (balanced)
            return [
                // Top horizontal
                ...Array.from({ length: 10 }, (_, i) => ({
                    x: centerX + scale * 0.5 - (i * scale * 0.9) / 9,
                    y: centerY - scale * 0.75,
                })),
                // Down stroke on left
                ...Array.from({ length: 10 }, (_, i) => ({
                    x: centerX - scale * 0.4,
                    y: centerY - scale * 0.75 + (i * scale * 0.6) / 9,
                })),
                // Bottom curve
                ...Array.from({ length: 16 }, (_, i) => {
                    const angle = -Math.PI * 0.55 + (i * Math.PI * 1.3) / 15;
                    return {
                        x: centerX + scale * 0.5 * Math.cos(angle),
                        y: centerY + scale * 0.35 + scale * 0.45 * Math.sin(angle),
                    };
                }),
            ];

        default:
            return [];
    }
};

export default function RakamYazma({ onGameEnd, onExit }: Props) {
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
    const [gameReady, setGameReady] = useState(false);

    // Selected pen color
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
        return points.map(p => ({
            x: p.x * canvasSize.width,
            y: p.y * canvasSize.height,
        }));
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
            if (currentNumber < 5) {
                resetForNextNumber(currentNumber + 1);
            } else {
                const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
                onGameEnd('rakam-yazma', duration, 5, 0, undefined, {
                    zorlukSeviyesi: currentNumber,
                    kazanimOdagi: 'El-Göz Koordinasyonu ve Yazı Becerileri',
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
    const templateFontSize = Math.min(canvasSize.height * 0.85, canvasSize.width * 0.75);

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
                    <Text style={styles.infoText}>{currentNumber}. rakamın üzerini çiz! ✨</Text>
                    <TouchableOpacity style={styles.clearBtn} onPress={clearCanvas}>
                        <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.clearBtnText}>Temizle</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {!gameReady && (
                <CountdownOverlay
                    message="Rakamları parmağınla çiz!"
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

    // Color palette
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
