import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
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
const MIN_STEP = 2; // px, dense points avoid gaps at fast drawing
const SUCCESS_THRESHOLD = 0.8; // 80% of target points must be covered

// Define target points for numbers 1-5 (simplified scaled coordinates 0-1)
const NUMBER_TEMPLATES: Record<number, Point[]> = {
    1: Array.from({ length: 20 }, (_, i) => ({ x: 0.5, y: 0.2 + (i * 0.6) / 19 })),
    2: [
        ...Array.from({ length: 15 }, (_, i) => {
            const angle = Math.PI + (i * Math.PI) / 14;
            return { x: 0.5 + 0.15 * Math.cos(angle), y: 0.35 + 0.15 * Math.sin(angle) };
        }),
        ...Array.from({ length: 10 }, (_, i) => ({ x: 0.65 - (i * 0.3) / 9, y: 0.35 + (i * 0.35) / 9 })),
        ...Array.from({ length: 10 }, (_, i) => ({ x: 0.35 + (i * 0.3) / 9, y: 0.7 })),
    ],
    3: [
        ...Array.from({ length: 15 }, (_, i) => {
            const angle = -Math.PI / 2 + (i * 1.5 * Math.PI) / 14;
            return { x: 0.5 + 0.15 * Math.cos(angle), y: 0.35 + 0.15 * Math.sin(angle) };
        }),
        ...Array.from({ length: 15 }, (_, i) => {
            const angle = -Math.PI / 2 + (i * 1.5 * Math.PI) / 14;
            return { x: 0.5 + 0.15 * Math.cos(angle), y: 0.6 + 0.15 * Math.sin(angle) };
        }),
    ],
    4: [
        ...Array.from({ length: 10 }, (_, i) => ({ x: 0.5 - (i * 0.2) / 9, y: 0.2 + (i * 0.3) / 9 })),
        ...Array.from({ length: 10 }, (_, i) => ({ x: 0.3 + (i * 0.4) / 9, y: 0.5 })),
        ...Array.from({ length: 15 }, (_, i) => ({ x: 0.5, y: 0.2 + (i * 0.6) / 14 })),
    ],
    5: [
        ...Array.from({ length: 10 }, (_, i) => ({ x: 0.65 - (i * 0.3) / 9, y: 0.25 })),
        ...Array.from({ length: 10 }, (_, i) => ({ x: 0.35, y: 0.25 + (i * 0.2) / 9 })),
        ...Array.from({ length: 15 }, (_, i) => {
            const angle = -Math.PI / 2 + (i * 1.2 * Math.PI) / 14;
            return { x: 0.5 + 0.15 * Math.cos(angle), y: 0.6 + 0.15 * Math.sin(angle) };
        }),
    ],
};

export default function RakamYazma({ onGameEnd, onExit }: Props) {
    const [currentNumber, setCurrentNumber] = useState(1);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [liveStroke, setLiveStroke] = useState<Stroke | null>(null);
    const liveStrokeRef = useRef<Stroke | null>(null);
    const [coveredPoints, setCoveredPoints] = useState<Set<number>>(new Set());
    const startTimeRef = useRef(Date.now());
    const [successAnim] = useState(new Animated.Value(0));

    const targetPoints = useMemo(() => {
        return NUMBER_TEMPLATES[currentNumber].map(p => ({
            x: p.x * CANVAS_WIDTH,
            y: p.y * CANVAS_HEIGHT,
        }));
    }, [currentNumber]);

    const addPoint = (x: number, y: number) => {
        const baseStroke = liveStrokeRef.current ?? { color: '#2196F3', size: 15, points: [] as Point[] };
        const last = baseStroke.points[baseStroke.points.length - 1];
        const points: Point[] = [...baseStroke.points];

        if (last) {
            const dx = x - last.x;
            const dy = y - last.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const step = MIN_STEP;
            const steps = Math.floor(dist / step);
            for (let i = 1; i <= steps; i++) {
                const ratio = i / (steps + 1);
                const px = last.x + dx * ratio;
                const py = last.y + dy * ratio;
                points.push({ x: px, y: py });
                checkPointCoverage(px, py);
            }
        }
        points.push({ x, y });
        checkPointCoverage(x, y);

        const nextStroke = { ...baseStroke, points };
        liveStrokeRef.current = nextStroke;
        setLiveStroke(nextStroke);
    };

    const checkPointCoverage = (x: number, y: number) => {
        targetPoints.forEach((p, idx) => {
            if (!coveredPoints.has(idx)) {
                const dist = Math.sqrt(Math.pow(x - p.x, 2) + Math.pow(y - p.y, 2));
                if (dist < 25) {
                    setCoveredPoints(prev => new Set(prev).add(idx));
                }
            }
        });
    };

    const finishStroke = () => {
        const completed = liveStrokeRef.current;
        if (completed) {
            setStrokes(prev => [...prev, completed]);
        }
        setLiveStroke(null);
        liveStrokeRef.current = null;

        if (coveredPoints.size / targetPoints.length >= SUCCESS_THRESHOLD) {
            handleSuccess();
        }
    };

    const handleSuccess = () => {
        Animated.sequence([
            Animated.timing(successAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(successAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start(() => {
            if (currentNumber < 5) {
                setCurrentNumber(prev => prev + 1);
                setStrokes([]);
                setCoveredPoints(new Set());
            } else {
                const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
                onGameEnd('rakam-yazma', duration, 5, 0);
            }
        });
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
                onPanResponderRelease: () => {
                    finishStroke();
                },
            }),
        [targetPoints, coveredPoints, currentNumber],
    );

    const clearCanvas = () => {
        setStrokes([]);
        setCoveredPoints(new Set());
    };

    return (
        <DynamicBackground>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
                        <Ionicons name="close" size={28} color="#d84315" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Rakam Yazma</Text>
                    <View style={{ width: 42 }} />
                </View>

                <View style={styles.canvasContainer}>
                    <View style={styles.templateOverlay}>
                        <Text style={styles.templateText}>{currentNumber}</Text>
                    </View>

                    <View {...panResponder.panHandlers} style={styles.canvas}>
                        {strokes.map((stroke, i) => (
                            <React.Fragment key={i}>
                                {stroke.points.map((p, j) => (
                                    <View
                                        key={`${i}-${j}`}
                                        style={[styles.point, { left: p.x - 7.5, top: p.y - 7.5, backgroundColor: stroke.color }]}
                                    />
                                ))}
                            </React.Fragment>
                        ))}
                        {liveStroke?.points.map((p, i) => (
                            <View
                                key={`live-${i}`}
                                style={[styles.point, { left: p.x - 7.5, top: p.y - 7.5, backgroundColor: liveStroke.color }]}
                            />
                        ))}
                    </View>

                    {Animated.parallel([
                        { transform: [{ scale: successAnim }] },
                        { opacity: successAnim }
                    ]) && (
                            <Animated.View style={[styles.successOverlay, { transform: [{ scale: successAnim }], opacity: successAnim }]}>
                                <Ionicons name="checkmark-circle" size={100} color="#4CAF50" />
                                <Text style={styles.successText}>Harika!</Text>
                            </Animated.View>
                        )}
                </View>

                <View style={styles.footer}>
                    <Text style={styles.infoText}>{currentNumber}. rakamı çizmeye çalış!</Text>
                    <TouchableOpacity style={styles.clearBtn} onPress={clearCanvas}>
                        <Text style={styles.clearBtnText}>Temizle</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, alignItems: 'center' },
    header: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    exitBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#ffe5e0', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#3e2723' },
    canvasContainer: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, backgroundColor: '#fff', borderRadius: 20, position: 'relative', overflow: 'hidden', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    templateOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', opacity: 0.1 },
    templateText: { fontSize: 300, fontWeight: 'bold', color: '#000' },
    canvas: { flex: 1 },
    point: { position: 'absolute', width: 15, height: 15, borderRadius: 7.5 },
    successOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
    successText: { fontSize: 32, fontWeight: 'bold', color: '#4CAF50', marginTop: 10 },
    footer: { marginTop: 30, alignItems: 'center' },
    infoText: { fontSize: 18, color: '#546E7A', marginBottom: 15 },
    clearBtn: { backgroundColor: '#FF8A65', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 15 },
    clearBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
