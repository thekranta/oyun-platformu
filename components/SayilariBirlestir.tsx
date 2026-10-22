
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import CountdownOverlay from './CountdownOverlay';
import DynamicBackground from './DynamicBackground';
import GameExitButton from './GameExitButton';
import { useSound } from './SoundContext';
import { speak } from '../services/speechService';
import ListenButton from './ListenButton';

const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

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

// Her aşamanın kendi rengi var (kırmızı / mor / yeşil): rakamlar düz renkli yuvarlaklardır, altlarında resim yoktur.
const STAGE_THEMES = [
    { fill: '#E5533D', dark: '#B83A27', line: '#F08A78' },
    { fill: '#7E57C2', dark: '#5E3C9E', line: '#A98BDB' },
    { fill: '#2F9E5B', dark: '#1E7A42', line: '#74C597' },
];

type Point = { x: number; y: number };
type NumberDot = { number: number; x: number; y: number };

const TOTAL_STAGES = 3;
const NUMBERS_COUNT = 5;
const LINE_WIDTH = 9;
// Çizgi hedef rakamın bu yarıçapına (yuvarlağın yarıçapının katı) girdiği anda bağlanır; parmak
// yuvarlağın tam üstünde bitmek zorunda değil, kenarına dokunması yeter.
const TARGET_HIT = 0.65;
const START_HIT = 0.8;

const INSTRUCTION = "Sayıları 1'den 5'e çizgi çizerek birleştir!";

// Türkçe ünsüz uyumu: sert ünsüzle biten sayı okunuşları (üç, dört, beş) '-ten' alır
const ayrilmaEki = (n: number) => ([3, 4, 5].includes(n) ? 'ten' : 'den');

// Pre-defined layouts for each stage (relative positions 0-1)
const STAGE_LAYOUTS: { x: number; y: number }[][] = [
    // Stage 1 - Zigzag
    [
        { x: 0.2, y: 0.12 },
        { x: 0.8, y: 0.28 },
        { x: 0.2, y: 0.50 },
        { x: 0.8, y: 0.68 },
        { x: 0.5, y: 0.88 },
    ],
    // Stage 2 - Star pattern
    [
        { x: 0.5, y: 0.08 },
        { x: 0.88, y: 0.38 },
        { x: 0.7, y: 0.88 },
        { x: 0.3, y: 0.88 },
        { x: 0.12, y: 0.38 },
    ],
    // Stage 3 - Random spread
    [
        { x: 0.15, y: 0.15 },
        { x: 0.85, y: 0.20 },
        { x: 0.5, y: 0.50 },
        { x: 0.18, y: 0.80 },
        { x: 0.82, y: 0.85 },
    ],
];

// Sıradaki rakamın çevresinde dışa doğru yayılan halka (dikkati ona çeker).
function PulseRing({ size, color }: { size: number; color: string }) {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(v, {
                toValue: 1,
                duration: 1100,
                easing: Easing.out(Easing.quad),
                useNativeDriver: Platform.OS !== 'web',
            }),
        );
        loop.start();
        return () => loop.stop();
    }, [v]);
    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 4,
                borderColor: color,
                opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.75, 0] }),
                transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] }) }],
            }}
        />
    );
}

export default function SayilariBirlestir({ onGameEnd, onExit }: Props) {
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const isPortrait = screenHeight > screenWidth;
    const { playSound } = useSound();

    const [stage, setStage] = useState(1);
    const [completedLines, setCompletedLines] = useState<{ from: number; to: number }[]>([]);
    const [currentNumber, setCurrentNumber] = useState(1);
    const [drawingPath, setDrawingPath] = useState<Point[]>([]);
    const [stageComplete, setStageComplete] = useState(false);
    const [gameReady, setGameReady] = useState(false);
    const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

    const startTimeRef = useRef(Date.now());
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
    const movesRef = useRef(0);
    const errorsRef = useRef(0);
    // Sürükleme anlık bilgisi ref'te tutulur: hızlı art arda gelen hareket olayları state güncellenmeden okunabilsin.
    const drawingRef = useRef(false);
    const pathRef = useRef<Point[]>([]);

    const progressAnim = useRef(new Animated.Value(0)).current;
    const successAnim = useRef(new Animated.Value(0)).current;

    const tokenSize = isPortrait ? Math.min(screenWidth * 0.22, 100) : Math.min(screenWidth * 0.12, 90);
    const theme = STAGE_THEMES[(stage - 1) % STAGE_THEMES.length];

    const dots = useMemo<NumberDot[]>(
        () => STAGE_LAYOUTS[(stage - 1) % STAGE_LAYOUTS.length].map((pos, i) => ({ number: i + 1, x: pos.x, y: pos.y })),
        [stage],
    );

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: stage / TOTAL_STAGES,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [stage, progressAnim]);

    useEffect(() => {
        const timers = timersRef.current;
        return () => {
            timers.forEach(clearTimeout);
        };
    }, []);

    const center = (dot: NumberDot): Point => ({ x: dot.x * canvasSize.width, y: dot.y * canvasSize.height });

    // Verilen noktaya yarıçap içinde en yakın rakam (yoksa null).
    const dotAt = (x: number, y: number, radius: number): NumberDot | null => {
        let best: NumberDot | null = null;
        let bestDist = radius;
        for (const dot of dots) {
            const c = center(dot);
            const d = Math.hypot(x - c.x, y - c.y);
            if (d < bestDist) {
                best = dot;
                bestDist = d;
            }
        }
        return best;
    };

    const clearDrawing = () => {
        drawingRef.current = false;
        pathRef.current = [];
        setDrawingPath([]);
    };

    const advanceStage = () => {
        successAnim.setValue(0);
        setCompletedLines([]);
        setCurrentNumber(1);
        setStageComplete(false);
        setStage((prev) => prev + 1);
    };

    const connect = (to: NumberDot) => {
        clearDrawing();
        movesRef.current += 1;
        setCompletedLines((prev) => [...prev, { from: currentNumber, to: to.number }]);
        playSound('correct');
        speak('Harika!');

        if (to.number === NUMBERS_COUNT) {
            setStageComplete(true);
            setCurrentNumber(NUMBERS_COUNT + 1); // sonraki girişi engelle

            Animated.spring(successAnim, {
                toValue: 1,
                useNativeDriver: Platform.OS !== 'web',
            }).start();

            timersRef.current.push(setTimeout(() => {
                if (stage < TOTAL_STAGES) {
                    advanceStage();
                } else {
                    const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
                    onGameEnd('sayilari-birlestir', duration, movesRef.current, errorsRef.current, undefined, {
                        zorlukSeviyesi: stage,
                        kazanimOdagi: 'Sayı Sırası ve El-Göz Koordinasyonu',
                    });
                }
            }, 1500));
        } else {
            setCurrentNumber(to.number);
        }
    };

    // Dokunuş olayları her render'da yenilenen H.current üzerinden çalışır: PanResponder bir kez kurulur,
    // bayat state okumaz (eski sürümde her hareketle yeniden kurulduğu için sürükleme yarıda kopuyordu).
    const H = useRef<{
        grant: (x: number, y: number) => void;
        move: (x: number, y: number) => void;
        release: () => void;
        terminate: () => void;
    }>({ grant: () => { }, move: () => { }, release: () => { }, terminate: () => { } });

    H.current = {
        grant: (x, y) => {
            if (!gameReady || stageComplete) return;
            const start = dotAt(x, y, tokenSize * START_HIT);
            // Çizgi yalnız sıradaki rakamdan başlar.
            if (!start || start.number !== currentNumber) return;
            drawingRef.current = true;
            pathRef.current = [center(start)];
            setDrawingPath(pathRef.current);
        },
        move: (x, y) => {
            if (!drawingRef.current || !gameReady || stageComplete) return;
            // Çizgi sıradaki rakama değdiği anda bağlanır (parmağı tam üstünde bırakmak gerekmez).
            const target = dots.find((d) => d.number === currentNumber + 1);
            if (target) {
                const c = center(target);
                if (Math.hypot(x - c.x, y - c.y) < tokenSize * TARGET_HIT) {
                    connect(target);
                    return;
                }
            }
            const last = pathRef.current[pathRef.current.length - 1];
            if (last && Math.hypot(x - last.x, y - last.y) < 3) return;
            pathRef.current = [...pathRef.current, { x, y }];
            setDrawingPath(pathRef.current);
        },
        release: () => {
            if (!drawingRef.current) return;
            // Bırakılan yer: son çizilen nokta (parmak tuvalin dışına çıksa bile güvenilir).
            const last = pathRef.current[pathRef.current.length - 1];
            const end = last ? dotAt(last.x, last.y, tokenSize * TARGET_HIT) : null;
            clearDrawing();
            // Yalnız YANLIŞ bir rakamda bırakmak hata sayılır; boşlukta ya da başladığı yerde bırakmak sayılmaz.
            if (end && end.number !== currentNumber) {
                errorsRef.current += 1;
                playSound('wrong');
            }
        },
        terminate: () => clearDrawing(),
    };

    const panResponder = useRef(PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => H.current.grant(e.nativeEvent.locationX, e.nativeEvent.locationY),
        onPanResponderMove: (e) => H.current.move(e.nativeEvent.locationX, e.nativeEvent.locationY),
        onPanResponderRelease: () => H.current.release(),
        onPanResponderTerminate: () => H.current.terminate(),
    })).current;

    const toPath = (points: Point[]) => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

    return (
        <DynamicBackground>
            <View style={styles.container}>
                {/* Exit button */}
                <GameExitButton onPress={onExit ?? (() => {})} style={{ position: 'absolute', top: 16, left: 16, zIndex: 20 }} />

                {/* Progress bar */}
                <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBg}>
                        <Animated.View
                            style={[
                                styles.progressBarFill,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: ['0%', '100%'],
                                    }),
                                },
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>{stage} / {TOTAL_STAGES}</Text>
                </View>

                {/* Instructions */}
                <View style={styles.instructionContainer}>
                    <Text style={styles.instructionText}>{INSTRUCTION}</Text>
                    <Text style={styles.hintText}>
                        {currentNumber <= NUMBERS_COUNT ? `Şimdi ${currentNumber}'${ayrilmaEki(currentNumber)} başla` : ''}
                    </Text>
                </View>

                <ListenButton onPress={() => speak(INSTRUCTION, { instructions: HAPPY_VOICE })} color="#4CAF50" style={{ marginTop: 12, alignSelf: 'center' }} />

                {/* Canvas */}
                <View
                    style={styles.canvas}
                    onLayout={(e) => {
                        const { width, height } = e.nativeEvent.layout;
                        setCanvasSize({ width, height });
                    }}
                    {...panResponder.panHandlers}
                >
                    {/* Tüm içerik dokunuşa kapalı: olayın hedefi her zaman tuvalin kendisi olur, böylece
                        locationX/Y tuval koordinatıdır (üstündeki rakam/çizgi parçasına göre değil). */}
                    {canvasSize.width > 0 && canvasSize.height > 0 && (
                        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                            <Svg width={canvasSize.width} height={canvasSize.height} style={StyleSheet.absoluteFill}>
                                {completedLines.map((line, i) => {
                                    const a = center(dots[line.from - 1]);
                                    const b = center(dots[line.to - 1]);
                                    return (
                                        <Path
                                            key={`line-${stage}-${i}`}
                                            d={toPath([a, b])}
                                            stroke={theme.fill}
                                            strokeWidth={LINE_WIDTH}
                                            strokeLinecap="round"
                                            fill="none"
                                            opacity={0.9}
                                        />
                                    );
                                })}
                                {drawingPath.length > 1 && (
                                    <Path
                                        d={toPath(drawingPath)}
                                        stroke={theme.line}
                                        strokeWidth={LINE_WIDTH}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        fill="none"
                                    />
                                )}
                            </Svg>

                            {dots.map((dot) => {
                                const c = center(dot);
                                const isActive = dot.number === currentNumber;
                                const isCompleted = dot.number < currentNumber;
                                return (
                                    <View
                                        key={`${stage}-${dot.number}`}
                                        style={[
                                            styles.token,
                                            {
                                                left: c.x - tokenSize / 2,
                                                top: c.y - tokenSize / 2,
                                                width: tokenSize,
                                                height: tokenSize,
                                                borderRadius: tokenSize / 2,
                                                backgroundColor: isCompleted ? theme.dark : isActive ? theme.fill : '#FFFFFF',
                                                borderColor: isCompleted ? theme.dark : theme.fill,
                                            },
                                            isActive && styles.tokenActive,
                                        ]}
                                    >
                                        {isActive && !stageComplete && <PulseRing size={tokenSize} color={theme.fill} />}
                                        <Text
                                            style={[
                                                styles.tokenText,
                                                { fontSize: tokenSize * 0.5, color: isCompleted || isActive ? '#FFFFFF' : theme.fill },
                                            ]}
                                            selectable={false}
                                        >
                                            {dot.number}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Success message */}
                {stageComplete && (
                    <Animated.View
                        style={[
                            styles.successContainer,
                            {
                                opacity: successAnim,
                                transform: [{ scale: successAnim }],
                            },
                        ]}
                    >
                        <Text style={styles.successText}>🎉 Harika!</Text>
                    </Animated.View>
                )}
            </View>

            {!gameReady && (
                <CountdownOverlay
                    interaction="draw"
                    message="Sayıları küçükten büyüğe doğru çizerek birleştir!"
                    countdownSeconds={5}
                    onComplete={() => setGameReady(true)}
                />
            )}
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 45,
        paddingHorizontal: 12,
    },
    progressBarContainer: {
        marginTop: 50,
        marginBottom: 8,
        marginHorizontal: 50,
        alignItems: 'center',
    },
    progressBarBg: {
        width: '100%',
        height: 10,
        backgroundColor: '#e0e0e0',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 5,
    },
    progressText: {
        marginTop: 4,
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    instructionContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 16,
        padding: 14,
        marginHorizontal: 12,
        marginBottom: 10,
        elevation: 4,
    },
    instructionText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: '#333',
    },
    hintText: {
        fontSize: 14,
        textAlign: 'center',
        color: '#666',
        marginTop: 4,
    },
    canvas: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 20,
        marginBottom: 16,
        overflow: 'hidden',
        // Webde fareyle sürüklerken bazen rakam/metin seçili hale geliyordu — sürükleme
        // hep tuvalin üzerinde olduğundan tarayıcının metin seçimini burada kapatıyoruz.
        ...(Platform.OS === 'web' && {
            userSelect: 'none',
            WebkitUserSelect: 'none',
            touchAction: 'none',
        }),
    } as any,
    token: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18,
        shadowRadius: 4,
        elevation: 3,
    },
    tokenActive: {
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    tokenText: {
        fontWeight: '800',
    },
    successContainer: {
        position: 'absolute',
        bottom: 80,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    successText: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#4CAF50',
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingHorizontal: 35,
        paddingVertical: 18,
        borderRadius: 28,
        overflow: 'hidden',
    },
});
