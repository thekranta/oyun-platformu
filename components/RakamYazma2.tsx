import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import GameExitButton from './GameExitButton';
import { speak, stopSpeech } from '../services/speechService';
import ListenButton from './ListenButton';
import { createTracker, numberParts, scaleParts } from '../lib/rakamIzleme';

// Rakam Yazma 6-10 — "Rakam Yazma" oyununun büyük sayılarla temalı varyantı.
// Kabul (Oyun_Test_Listesi #81, 2026-10-25: "çizimin kabulü ile ilgili sorun var, farklı bir değerlendirme yapmalıyız"):
// eskiden "hedef noktaların %85'ine herhangi bir sırayla değmek" yeterliydi (karalama da geçiyordu) ve ekrandaki soluk rakam bir
// yazı tipi harfiydi, kabul edilen yol ise ona bağlı olmayan ideal noktalardı. Artık rehber = değerlendirilen yol (aynı noktalardan
// çizilen kalın iz); çocuk izi SIRAYLA takip eder (ters yön ve halkada herhangi bir başlangıç serbest), karalama/yanlış rakam/aşırı
// mürekkep kabul edilmez. Mantık lib/rakamIzleme.ts'te (testli).

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

const FIRST_NUMBER = 6;
const LAST_NUMBER = 10;
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

const PEN_COLORS = [
    { color: '#2196F3', name: 'Mavi' },
    { color: '#E91E63', name: 'Pembe' },
    { color: '#4CAF50', name: 'Yeşil' },
    { color: '#FF9800', name: 'Turuncu' },
    { color: '#9C27B0', name: 'Mor' },
    { color: '#F44336', name: 'Kırmızı' },
];

export default function RakamYazma2({ onGameEnd, onExit }: Props) {
    const [canvasSize, setCanvasSize] = useState({ width: 300, height: 300 });
    const [currentNumber, setCurrentNumber] = useState(FIRST_NUMBER);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [liveStroke, setLiveStroke] = useState<Stroke | null>(null);
    const liveStrokeRef = useRef<Stroke | null>(null);
    const [progress, setProgress] = useState(0);          // % (sırayla izlenen kısım)
    const progressRef = useRef(0);
    const [visited, setVisited] = useState<Point[][]>([]); // yeşil gösterilen, sırayla geçilmiş noktalar (parça başına)
    const startTimeRef = useRef(Date.now());
    const [successAnim] = useState(new Animated.Value(0));
    const [showSuccess, setShowSuccess] = useState(false);
    const [showRetry, setShowRetry] = useState(false);
    const [gameReady, setGameReady] = useState(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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

    useEffect(() => () => {
        timersRef.current.forEach(clearTimeout);
        stopSpeech();
    }, []);

    // Rehber = değerlendirilen yol: rakamın parçaları tuval ölçüsünde; izleme yarıçapı tuvalin kısa kenarına göre.
    const parts = useMemo(() => scaleParts(numberParts(currentNumber), canvasSize.width, canvasSize.height), [currentNumber, canvasSize]);
    const radius = useMemo(() => Math.max(Math.min(canvasSize.width, canvasSize.height) * 0.093, 24), [canvasSize]);
    const tracker = useMemo(() => createTracker(parts, { radius }), [parts, radius]);

    // İlerleme yüzdesi değişince (en çok %100 kez) yeşil iz ve çubuk güncellenir.
    const syncProgress = useCallback(() => {
        const pct = Math.round(tracker.progress() * 100);
        if (pct === progressRef.current) return;
        progressRef.current = pct;
        setProgress(pct);
        setVisited(tracker.visited());
    }, [tracker]);

    const clearCanvas = useCallback(() => {
        setStrokes([]);
        setLiveStroke(null);
        liveStrokeRef.current = null;
        tracker.reset();
        progressRef.current = 0;
        setProgress(0);
        setVisited([]);
    }, [tracker]);

    const resetForNextNumber = useCallback((nextNum: number) => {
        setStrokes([]);
        setLiveStroke(null);
        liveStrokeRef.current = null;
        progressRef.current = 0;
        setProgress(0);
        setVisited([]);
        setCurrentNumber(nextNum);   // yeni rakamın izleyicisi parts/radius değişince useMemo ile yeniden kurulur
    }, []);

    const handleSuccess = useCallback(() => {
        setShowSuccess(true);
        speak('Harika!');
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

    // Çizim noktası ekle: iki nokta arası MIN_STEP px'te bir doldurulur, her nokta izleyiciye verilir.
    const addPoint = useCallback((x: number, y: number, color: string) => {
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
                tracker.feed({ x: px, y: py });
            }
        }
        currentPoints.push({ x, y });
        tracker.feed({ x, y });
        syncProgress();

        const nextStroke = { ...baseStroke, color, points: currentPoints };
        liveStrokeRef.current = nextStroke;
        setLiveStroke(nextStroke);
    }, [tracker, syncProgress, canvasSize]);

    const finishStroke = useCallback(() => {
        const completed = liveStrokeRef.current;
        if (completed) {
            setStrokes(prev => [...prev, completed]);
        }
        setLiveStroke(null);
        liveStrokeRef.current = null;

        if (tracker.complete()) {
            handleSuccess();
        } else if (tracker.shouldReset()) {
            // Karalama (çok mürekkep ya da çoğu iz dışı): temizle, kısa bir "tekrar dene" göster.
            clearCanvas();
            setShowRetry(true);
            timersRef.current.push(setTimeout(() => setShowRetry(false), 1500));
        }
    }, [tracker, handleSuccess, clearCanvas]);

    // PanResponder bir kez kurulur; işleyiciler her render'da H.current'ta tazelenir (sürükleme sırasında state değişse de kopmaz).
    const H = useRef({ showSuccess, selectedColor, addPoint, finishStroke, tracker });
    H.current = { showSuccess, selectedColor, addPoint, finishStroke, tracker };
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !H.current.showSuccess,
            onMoveShouldSetPanResponder: () => !H.current.showSuccess,
            onPanResponderGrant: e => {
                if (H.current.showSuccess) return;
                H.current.tracker.lift();
                const { locationX, locationY } = e.nativeEvent;
                H.current.addPoint(locationX, locationY, H.current.selectedColor);
            },
            onPanResponderMove: e => {
                if (H.current.showSuccess) return;
                const { locationX, locationY } = e.nativeEvent;
                H.current.addPoint(locationX, locationY, H.current.selectedColor);
            },
            onPanResponderRelease: () => {
                if (H.current.showSuccess) return;
                H.current.finishStroke();
            },
            // Tek tuval PanResponder'i ama savunma amacli: yaniti birakmaz; zorla calinirsa release gibi sonuclandirir.
            onPanResponderTerminationRequest: () => false,
            onPanResponderTerminate: () => {
                if (H.current.showSuccess) return;
                H.current.finishStroke();
            },
        }),
    ).current;

    const step = currentNumber - FIRST_NUMBER + 1;
    const totalSteps = LAST_NUMBER - FIRST_NUMBER + 1;
    const trackWidth = radius * 1.1;
    const toPoints = (pts: Point[], closed: boolean) => (closed && pts.length ? [...pts, pts[0]] : pts).map((p) => `${p.x},${p.y}`).join(' ');

    return (
        <DynamicBackground>
            <View style={styles.container}>
                <View style={styles.header}>
                    <GameExitButton onPress={onExit ?? (() => {})} style={styles.exitBtn} />
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
                    {/* İzlenecek rakam: kalın soluk iz + kesikli orta çizgi; sırayla geçilen kısım yeşile döner */}
                    <View style={styles.templateOverlay} pointerEvents="none">
                        <Svg width={canvasSize.width} height={canvasSize.height}>
                            {parts.map((part, i) => (
                                <Polyline
                                    key={`iz-${currentNumber}-${i}`}
                                    points={toPoints(part.points, part.closed)}
                                    fill="none"
                                    stroke="#D7DCE0"
                                    strokeWidth={trackWidth}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            ))}
                            {visited.map((pts, i) => (pts.length > 1 ? (
                                <Polyline
                                    key={`yesil-${currentNumber}-${i}`}
                                    points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                                    fill="none"
                                    stroke="#A5D6A7"
                                    strokeWidth={trackWidth}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            ) : pts.length === 1 ? (
                                <Circle key={`yesil-${currentNumber}-${i}`} cx={pts[0].x} cy={pts[0].y} r={trackWidth / 2} fill="#A5D6A7" />
                            ) : null))}
                            {parts.map((part, i) => (
                                <Polyline
                                    key={`orta-${currentNumber}-${i}`}
                                    points={toPoints(part.points, part.closed)}
                                    fill="none"
                                    stroke="#90A4AE"
                                    strokeWidth={2}
                                    strokeDasharray="2 8"
                                    strokeLinecap="round"
                                />
                            ))}
                        </Svg>
                    </View>

                    {/* Drawing canvas: çizilenler tek bir pointerEvents="none" kabında → dokunuş hedefi hep tuval (locationX/Y tuvale göre) */}
                    <View {...panResponder.panHandlers} style={styles.canvas}>
                        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
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
                    </View>

                    {/* Karalama temizlendi: kısa ipucu (yazısız çocuk için de görsel: sarı kutu) */}
                    {showRetry && (
                        <View style={styles.retryBox} pointerEvents="none">
                            <Text style={styles.retryText}>Rakamın izinden git 🙂</Text>
                        </View>
                    )}

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
                    <ListenButton onPress={() => speak(`${currentNumber} sayısının üzerini çiz!`, { instructions: HAPPY_VOICE })} color="#1976D2" style={{ marginBottom: 12 }} />
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
    container: { flex: 1, padding: 16, alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingRight: 40,
    },
    exitBtn: {
        position: 'absolute',
        top: 16,
        left: 16,
        zIndex: 20,
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
        zIndex: 0,
    },
    canvas: { flex: 1, zIndex: 5 },
    point: { position: 'absolute' },
    retryBox: {
        position: 'absolute',
        alignSelf: 'center',
        top: 12,
        backgroundColor: '#FFF59D',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        zIndex: 15,
    },
    retryText: { fontSize: 16, fontWeight: '800', color: '#5D4037' },
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
