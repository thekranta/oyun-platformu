import React, { useEffect, useMemo, useRef, useState } from 'react';
import GameExitButton from './GameExitButton';
import {
    Animated,
    Image,
    ImageBackground,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import CountdownOverlay from './CountdownOverlay';
import { asset } from '../lib/assetMap';
import { speak, stopSpeech } from '../services/speechService';
import ListenButton from './ListenButton';

// Arka plan görseli
const BACKGROUND_IMAGE = asset('/backgrounds/games/yapboz_bg.webp');

interface YapbozOyunuProps {
    onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number, algilananKelime?: string, extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string }) => void;
    onExit: () => void;
}

const GRID_SIZE = 3;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;
const HAPPY_VOICE = 'Speak in Turkish like a cheerful, loving preschool teacher. Warm and encouraging.';

// 10 farklı yapboz tanımı
const PUZZLES = [
    {
        id: 1,
        name: 'Karpuz',
        icon: '🍉',
        source: asset('/images/karpuz.webp'),
    },
    {
        id: 2,
        name: 'Elma',
        icon: '🍎',
        source: asset('/images/elma.webp'),
    },
    {
        id: 3,
        name: 'Çilek',
        icon: '🍓',
        source: asset('/images/cilek.webp'),
    },
    {
        id: 4,
        name: 'Kedi',
        icon: '🐱',
        source: asset('/images/kedi.webp'),
    },
    {
        id: 5,
        name: 'Top',
        icon: '⚽',
        source: asset('/images/top.webp'),
    },
    {
        id: 6,
        name: 'Ev',
        icon: '🏠',
        source: asset('/images/ev.webp'),
    },
    {
        id: 7,
        name: 'Araba',
        icon: '🚗',
        source: asset('/images/araba.webp'),
    },
    {
        id: 8,
        name: 'Orman',
        icon: '🌳',
        source: asset('/images/stories/ceviz_macera/intro_scene.webp'),
    },
    {
        id: 9,
        name: 'Nehir',
        icon: '🏞️',
        source: asset('/images/stories/ceviz_macera/scene_a_river.webp'),
    },
    {
        id: 10,
        name: 'Aile',
        icon: '👨‍👩‍👧',
        source: asset('/images/stories/aile_sepeti_macerasi/s02_final_bg_birlikte_aile.webp'),
    },
];

// Karıştırma sırası
const SHUFFLE_ORDER = [4, 7, 2, 8, 5, 0, 1, 6, 3];

// Parça doğru hücrenin bu uzaklığı (px, merkezden merkeze) içinde bırakılırsa yerine oturur.
const SNAP_DISTANCE = 50;

type Pos = { x: number; y: number };

export default function YapbozOyunu({ onGameEnd, onExit }: YapbozOyunuProps) {
    const [gameReady, setGameReady] = useState(false);
    const [selectedPuzzle, setSelectedPuzzle] = useState<number | null>(null);
    const [lockedPieces, setLockedPieces] = useState<Set<number>>(new Set());
    const [isComplete, setIsComplete] = useState(false);
    const [showDoneCard, setShowDoneCard] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [draggingId, setDraggingId] = useState<number | null>(null);
    // Bu açılışta tamamlanan yapbozlar (seçim ekranında ✅ ile gösterilir; "Bitir"de tek kayıt olarak gönderilir).
    const [solved, setSolved] = useState<string[]>([]);

    // Sayaçlar ve sürükleme durumu render dışında tutulur: sürükleme işleyicileri bayat state okumasın.
    const lockedRef = useRef<Set<number>>(new Set());
    const completeRef = useRef(false);
    const movesRef = useRef(0);
    const errorsRef = useRef(0);
    const puzzleStartRef = useRef(Date.now());
    const sessionRef = useRef({ seconds: 0, moves: 0, errors: 0 });
    const endedRef = useRef(false);
    const dragRef = useRef<{ id: number; start: Pos } | null>(null);
    const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const { width: screenW, height: screenH } = useWindowDimensions();
    // Mobil için daha küçük boyutlar
    const isSmallScreen = screenH < 700;
    const puzzleSize = Math.min(screenW * 0.55, screenH * 0.28, isSmallScreen ? 200 : 260);
    const tileSize = puzzleSize / GRID_SIZE;
    const pieceSize = tileSize - 4;

    // Her parçanın MUTLAK konumu (ofset kullanılmaz: eski sürümde yarıda kesilen sürüklemede ofset ile
    // konum üst üste biniyor ve parça ekranın sağ altına kaçıyordu).
    const panRefs = useRef<Animated.ValueXY[]>(
        Array.from({ length: TOTAL_TILES }, () => new Animated.ValueXY({ x: 0, y: 0 }))
    ).current;
    const posRef = useRef<Pos[]>(Array.from({ length: TOTAL_TILES }, () => ({ x: 0, y: 0 }))).current;
    useEffect(() => {
        const ids = panRefs.map((pan, i) => pan.addListener((v) => { posRef[i] = { x: v.x, y: v.y }; }));
        return () => panRefs.forEach((pan, i) => pan.removeListener(ids[i]));
    }, [panRefs, posRef]);
    useEffect(() => () => {
        if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
        if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    }, []);

    // Grid position ref (center of screen)
    const gridLeft = (screenW - puzzleSize) / 2;
    const gridTop = isSmallScreen ? 60 : 80;

    // Piece starting positions (below the grid)
    const pieceAreaTop = gridTop + puzzleSize + (isSmallScreen ? 20 : 30);
    const pieceSpacing = pieceSize + (isSmallScreen ? 8 : 12);
    const pieceAreaLeft = (screenW - 3 * pieceSpacing) / 2;

    const currentPuzzle = selectedPuzzle !== null ? PUZZLES.find(p => p.id === selectedPuzzle) : null;

    // Her parçanın tepsideki "ev" konumu (karışık sıra) ve doğru hücredeki konumu; ekran boyutundan türetilir.
    const homeOf = (i: number): Pos => {
        const shuffleIdx = SHUFFLE_ORDER.indexOf(i);
        return {
            x: pieceAreaLeft + (shuffleIdx % 3) * pieceSpacing,
            y: pieceAreaTop + Math.floor(shuffleIdx / 3) * pieceSpacing,
        };
    };
    const targetOf = (i: number): Pos => ({
        x: gridLeft + (i % GRID_SIZE) * tileSize + (tileSize - pieceSize) / 2,
        y: gridTop + Math.floor(i / GRID_SIZE) * tileSize + (tileSize - pieceSize) / 2,
    });

    // Tüm parçaları konumlar: yerine oturanlar hücresine, diğerleri tepsiye (sürüklenen hariç).
    const layoutPieces = () => {
        for (let i = 0; i < TOTAL_TILES; i++) {
            if (dragRef.current?.id === i) continue;
            panRefs[i].setValue(lockedRef.current.has(i) ? targetOf(i) : homeOf(i));
        }
    };

    const springTo = (i: number, to: Pos) => {
        Animated.spring(panRefs[i], {
            toValue: to,
            useNativeDriver: false,
            speed: 20,
            bounciness: 0,
        }).start();
    };

    const completePuzzle = () => {
        if (completeRef.current) return;
        completeRef.current = true;
        const name = currentPuzzle?.name || 'Yapboz';
        sessionRef.current.seconds += Math.floor((Date.now() - puzzleStartRef.current) / 1000);
        sessionRef.current.moves += movesRef.current;
        sessionRef.current.errors += errorsRef.current;
        setIsComplete(true);
        setSolved(prev => (prev.includes(name) ? prev : [...prev, name]));
        // Çocuk bitmiş resmi bir an görsün, sonra seçenekler çıksın.
        doneTimerRef.current = setTimeout(() => setShowDoneCard(true), 700);
    };

    const lockPiece = (i: number) => {
        lockedRef.current.add(i);
        setLockedPieces(new Set(lockedRef.current));
        speak('Aferin!');
        if (lockedRef.current.size === TOTAL_TILES) completePuzzle();
    };

    // Seçim ekranına dön. Çıkış düğmesiyle dönülürse giriş yönergesi yeniden çalar; "Başka Yapboz"da çalmaz.
    const goBackToSelection = (replayIntro: boolean) => {
        if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
        if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
        dragRef.current = null;
        setDraggingId(null);
        setSelectedPuzzle(null);
        setGameStarted(false);
        setShowPreview(false);
        setIsComplete(false);
        setShowDoneCard(false);
        setLockedPieces(new Set());
        lockedRef.current = new Set();
        completeRef.current = false;
        if (replayIntro) setGameReady(false);
    };

    // Oturumu TEK kayıt olarak gönderir (sonuç ekranına geçer). Hiç yapboz bitmediyse kayıt yok, düz çıkış.
    const finishSession = () => {
        stopSpeech();
        if (endedRef.current) return;
        if (solved.length === 0) {
            onExit();
            return;
        }
        endedRef.current = true;
        const s = sessionRef.current;
        const shown = solved.slice(0, 3).join(', ') + (solved.length > 3 ? ` +${solved.length - 3}` : '');
        onGameEnd(`Yapboz - ${shown}`, s.seconds, s.moves, s.errors, undefined, {
            zorlukSeviyesi: 1,
            kazanimOdagi: 'Uzamsal Algı ve Problem Çözme',
        });
    };

    const handleExit = () => {
        stopSpeech();
        if (selectedPuzzle !== null) {
            goBackToSelection(true);
            return;
        }
        // Seçim ekranında çıkarken: biten yapbozlar kaybolmasın.
        finishSession();
    };

    // Start a puzzle
    const startPuzzle = (puzzleId: number) => {
        lockedRef.current = new Set();
        completeRef.current = false;
        movesRef.current = 0;
        errorsRef.current = 0;
        puzzleStartRef.current = Date.now();
        dragRef.current = null;
        setSelectedPuzzle(puzzleId);
        setShowPreview(true);
        setLockedPieces(new Set());
        setIsComplete(false);
        setShowDoneCard(false);
        setGameStarted(false);
        layoutPieces();

        if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
        previewTimerRef.current = setTimeout(() => {
            puzzleStartRef.current = Date.now();
            setShowPreview(false);
            setGameStarted(true);
        }, 2500);
    };

    // Sürükleme işleyicileri her render'da yenilenen H.current üzerinden çalışır; PanResponder'lar bir kez kurulur.
    const H = useRef<{
        layout: () => void;
        canDrag: (i: number) => boolean;
        grant: (i: number) => void;
        move: (i: number, dx: number, dy: number) => void;
        release: (i: number) => void;
        terminate: (i: number) => void;
    }>({
        layout: () => { }, canDrag: () => false, grant: () => { }, move: () => { }, release: () => { }, terminate: () => { },
    });

    H.current = {
        layout: layoutPieces,
        canDrag: (i) => !lockedRef.current.has(i) && !completeRef.current,
        grant: (i) => {
            panRefs[i].stopAnimation();
            dragRef.current = { id: i, start: { ...posRef[i] } };
            setDraggingId(i);
        },
        move: (i, dx, dy) => {
            const drag = dragRef.current;
            if (!drag || drag.id !== i) return;
            panRefs[i].setValue({ x: drag.start.x + dx, y: drag.start.y + dy });
        },
        release: (i) => {
            if (dragRef.current?.id !== i) return;
            dragRef.current = null;
            setDraggingId(null);
            movesRef.current += 1;

            const cur = posRef[i];
            const target = targetOf(i);
            const dist = Math.hypot(cur.x - target.x, cur.y - target.y);
            if (dist < SNAP_DISTANCE) {
                // Doğru yere bırakıldı: hemen kilitle, yerine oturt.
                lockPiece(i);
                springTo(i, target);
            } else {
                // Yanlış yere bırakıldı: hata say ve tepsideki evine geri döndür.
                errorsRef.current += 1;
                springTo(i, homeOf(i));
            }
        },
        terminate: (i) => {
            if (dragRef.current?.id !== i) return;
            dragRef.current = null;
            setDraggingId(null);
            springTo(i, homeOf(i));
        },
    };

    // Ekran boyutu değişince (pencere yeniden boyutlandı, cihaz döndü) parçaları yeniden konumla.
    useEffect(() => {
        if (gameStarted) H.current.layout();
    }, [gameStarted, screenW, screenH]);

    const responders = useMemo(
        () => Array.from({ length: TOTAL_TILES }, (_, i) => PanResponder.create({
            onStartShouldSetPanResponder: () => H.current.canDrag(i),
            onMoveShouldSetPanResponder: () => H.current.canDrag(i),
            // 9 parça aynı anda sürüklenebilir olduğu için, bu tanımlanmadan bırakılırsa
            // hızlı/kısa bir sürüklemede yanıtlayıcı rolü başka bir view'e "çalınabiliyor".
            onPanResponderTerminationRequest: () => false,
            onPanResponderGrant: () => H.current.grant(i),
            onPanResponderMove: (_e, g) => H.current.move(i, g.dx, g.dy),
            onPanResponderRelease: () => H.current.release(i),
            onPanResponderTerminate: () => H.current.terminate(i),
        })),
        [],
    );

    const renderPieces = () => {
        if (!currentPuzzle) return null;
        const pieces = [];
        for (let i = 0; i < TOTAL_TILES; i++) {
            const targetRow = Math.floor(i / GRID_SIZE);
            const targetCol = i % GRID_SIZE;
            const pan = panRefs[i];
            const isLocked = lockedPieces.has(i);

            pieces.push(
                <Animated.View
                    key={i}
                    {...(isLocked ? {} : responders[i].panHandlers)}
                    style={[
                        styles.piece,
                        {
                            width: pieceSize,
                            height: pieceSize,
                            transform: pan.getTranslateTransform(),
                            zIndex: isLocked ? 1 : draggingId === i ? 300 : 100,
                            borderColor: isLocked ? '#4CAF50' : '#fff',
                            borderWidth: 2,
                        },
                    ]}
                >
                    <View style={styles.pieceInner}>
                        <Image
                            source={currentPuzzle.source}
                            style={{
                                width: puzzleSize,
                                height: puzzleSize,
                                position: 'absolute',
                                left: -targetCol * tileSize,
                                top: -targetRow * tileSize,
                            }}
                            resizeMode="cover"
                        />
                    </View>
                </Animated.View>
            );
        }
        return pieces;
    };

    // Puzzle Selection Screen
    const renderPuzzleSelection = () => (
        <View style={styles.selectionContainer}>
            <Text style={styles.selectionTitle}>🧩 Bir Yapboz Seç!</Text>
            <Text style={styles.selectionSubtitle}>Hangi resmi tamamlamak istersin?</Text>

            <ListenButton onPress={() => speak('Bir yapboz seç, parçaları sürükleyip resmi tamamla!', { instructions: HAPPY_VOICE })} color="#4ECDC4" style={{ marginTop: 12, alignSelf: 'center' }} />

            <ScrollView
                contentContainerStyle={styles.puzzleGrid}
                showsVerticalScrollIndicator={false}
            >
                {PUZZLES.map(puzzle => (
                    <TouchableOpacity
                        key={puzzle.id}
                        style={styles.puzzleCard}
                        onPress={() => startPuzzle(puzzle.id)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.puzzleImageContainer}>
                            <Image
                                source={puzzle.source}
                                style={styles.puzzleThumbnail}
                                resizeMode="cover"
                            />
                        </View>
                        <Text style={styles.puzzleIcon}>{puzzle.icon}</Text>
                        <Text style={styles.puzzleName}>{puzzle.name}</Text>
                        {solved.includes(puzzle.name) && <Text style={styles.solvedBadge}>✅</Text>}
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );

    // Preview Screen
    const renderPreview = () => (
        <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Resmi Hatırla! 👀</Text>
            <View style={[styles.previewFrame, { width: puzzleSize, height: puzzleSize }]}>
                <Image
                    source={currentPuzzle?.source}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                />
            </View>
            <Text style={styles.loadingText}>Oyun Hazırlanıyor...</Text>
        </View>
    );

    // Game Screen
    const renderGame = () => (
        <View style={styles.gameArea}>
            <Text style={styles.instruction}>
                {isComplete ? '🎉 Mükemmel!' : 'Parçaları sürükle ve birleştir!'}
            </Text>

            {/* Hint */}
            <View style={[styles.hintContainer, { right: 15, top: gridTop }]}>
                <Text style={styles.hintText}>Hedef:</Text>
                <Image source={currentPuzzle?.source} style={styles.hintImage} />
            </View>

            {/* Grid - 3x3 */}
            <View
                style={[
                    styles.grid,
                    {
                        width: puzzleSize,
                        height: puzzleSize,
                        left: gridLeft,
                        top: gridTop,
                    },
                ]}
            >
                {[0, 1, 2].map(row => (
                    <View key={row} style={styles.gridRow}>
                        {[0, 1, 2].map(col => {
                            const idx = row * 3 + col;
                            const isLocked = lockedPieces.has(idx);
                            return (
                                <View
                                    key={col}
                                    style={[styles.cell, { width: tileSize, height: tileSize }]}
                                >
                                    {!isLocked && <View style={styles.cellGuide} />}
                                </View>
                            );
                        })}
                    </View>
                ))}
            </View>

            {/* Puzzle Pieces */}
            {gameStarted && renderPieces()}

            {/* Yapboz bitti: başka yapboza geç ya da oyunu bitir */}
            {showDoneCard && (
                <View
                    style={[
                        styles.doneCard,
                        { top: pieceAreaTop - 6, width: Math.min(screenW - 32, 360), left: (screenW - Math.min(screenW - 32, 360)) / 2 },
                    ]}
                >
                    <Text style={styles.doneTitle}>🎉 Yapbozu tamamladın!</Text>
                    <View style={styles.doneButtons}>
                        <TouchableOpacity
                            style={[styles.doneBtn, styles.doneBtnPrimary]}
                            onPress={() => goBackToSelection(false)}
                            accessibilityRole="button"
                            accessibilityLabel="Başka yapboz seç"
                            activeOpacity={0.8}
                        >
                            <Text style={styles.doneBtnText}>🧩 Başka Yapboz</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.doneBtn, styles.doneBtnGhost]}
                            onPress={finishSession}
                            accessibilityRole="button"
                            accessibilityLabel="Oyunu bitir"
                            activeOpacity={0.8}
                        >
                            <Text style={styles.doneBtnText}>✅ Bitir</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );

    return (
        <ImageBackground source={BACKGROUND_IMAGE} style={styles.container} resizeMode="cover">
            <View style={styles.darkOverlay} />
            {!gameReady && (
                <CountdownOverlay
                    message="Bir yapboz seç, parçaları sürükleyip resmi tamamla!"
                    countdownSeconds={5}
                    interaction="drag"
                    onComplete={() => setGameReady(true)}
                />
            )}
            <View style={styles.header}>
                <GameExitButton
                    onPress={handleExit}
                    accessibilityLabel={selectedPuzzle !== null ? 'Seçim ekranına dön' : 'Oyundan çık'}
                />
                <Text style={styles.title}>
                    {currentPuzzle ? `🧩 ${currentPuzzle.name}` : '🧩 Yapboz'}
                </Text>
                {/* Sağ üstte ana ekranın ses düğmesi durur (GameSoundButton); başlığı ortada tutan boşluk. */}
                <View style={styles.headerSpacer} />
            </View>

            {selectedPuzzle === null && renderPuzzleSelection()}
            {selectedPuzzle !== null && showPreview && renderPreview()}
            {selectedPuzzle !== null && !showPreview && renderGame()}
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, width: '100%', ...(Platform.OS === 'web' ? { height: '100vh' as any } : {}) },
    darkOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(26, 26, 46, 0.7)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'web' ? 20 : 50,
        paddingBottom: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 200,
    },
    headerSpacer: { width: 44, height: 44 },
    title: { color: '#fff', fontSize: 20, fontWeight: 'bold' },

    // Selection Screen
    selectionContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    selectionTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFD54F',
        textAlign: 'center',
        marginBottom: 8,
    },
    selectionSubtitle: {
        fontSize: 16,
        color: '#aaa',
        textAlign: 'center',
        marginBottom: 20,
    },
    puzzleGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 15,
        paddingBottom: 40,
    },
    puzzleCard: {
        width: 100,
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 10,
        borderWidth: 2,
        borderColor: 'rgba(78,205,196,0.3)',
    },
    puzzleImageContainer: {
        width: 80,
        height: 80,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 8,
    },
    puzzleThumbnail: {
        width: '100%',
        height: '100%',
    },
    puzzleIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    puzzleName: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
    },
    solvedBadge: {
        position: 'absolute',
        top: 4,
        right: 6,
        fontSize: 18,
    },

    // Preview Screen
    previewContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    previewTitle: { color: '#FFD54F', fontSize: 24, marginBottom: 20, fontWeight: 'bold' },
    previewFrame: { borderWidth: 3, borderColor: '#4ECDC4', borderRadius: 12, overflow: 'hidden' },
    loadingText: { color: '#aaa', marginTop: 20, fontSize: 16 },

    // Game Screen
    gameArea: {
        flex: 1,
        position: 'relative',
    },
    instruction: {
        textAlign: 'center',
        color: '#fff',
        fontSize: 16,
        marginTop: 10,
        marginBottom: 10,
        fontWeight: '600',
        zIndex: 150,
    },

    hintContainer: {
        position: 'absolute',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        zIndex: 150,
    },
    hintText: { color: '#aaa', fontSize: 12 },
    hintImage: { width: 50, height: 50, borderRadius: 6, borderWidth: 2, borderColor: '#4ECDC4' },

    grid: {
        position: 'absolute',
        borderWidth: 3,
        borderColor: '#4ECDC4',
        borderRadius: 8,
        backgroundColor: 'rgba(78, 205, 196, 0.1)',
        zIndex: 1,
        overflow: 'hidden',
    },
    gridRow: {
        flexDirection: 'row',
    },
    cell: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cellGuide: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },

    piece: {
        position: 'absolute',
        borderRadius: 6,
        backgroundColor: '#fff',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    pieceInner: { flex: 1, overflow: 'hidden', borderRadius: 4 },

    // Yapboz bitti kartı
    doneCard: {
        position: 'absolute',
        zIndex: 400,
        alignItems: 'center',
        gap: 14,
        paddingVertical: 18,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: 'rgba(26, 26, 46, 0.92)',
        borderWidth: 2,
        borderColor: '#4ECDC4',
    },
    doneTitle: { color: '#FFD54F', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
    doneButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
    doneBtn: { minHeight: 48, paddingHorizontal: 18, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    doneBtnPrimary: { backgroundColor: '#4ECDC4' },
    doneBtnGhost: { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
    doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

