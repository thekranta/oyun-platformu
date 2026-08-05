import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    ImageBackground,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSound } from './SoundContext';
import { asset } from '../lib/assetMap';

// Arka plan görseli
const BACKGROUND_IMAGE = asset('/backgrounds/games/yapboz_bg.webp');

interface YapbozOyunuProps {
    onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number, algilananKelime?: string, extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string }) => void;
    onExit: () => void;
}

const GRID_SIZE = 3;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

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

export default function YapbozOyunu({ onGameEnd, onExit }: YapbozOyunuProps) {
    const { isMuted, toggleMute } = useSound();
    const [selectedPuzzle, setSelectedPuzzle] = useState<number | null>(null);
    const [lockedPieces, setLockedPieces] = useState<Set<number>>(new Set());
    const [moves, setMoves] = useState(0);
    const [errors, setErrors] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [startTime, setStartTime] = useState(Date.now());

    const { width: screenW, height: screenH } = Dimensions.get('window');
    // Mobil için daha küçük boyutlar
    const isSmallScreen = screenH < 700;
    const puzzleSize = Math.min(screenW * 0.55, screenH * 0.28, isSmallScreen ? 200 : 260);
    const tileSize = puzzleSize / GRID_SIZE;
    const pieceSize = tileSize - 4;

    // Animation values for each piece
    const panRefs = useRef<Animated.ValueXY[]>(
        Array.from({ length: TOTAL_TILES }, () => new Animated.ValueXY({ x: 0, y: 0 }))
    ).current;

    // Grid position ref (center of screen)
    const gridLeft = (screenW - puzzleSize) / 2;
    const gridTop = isSmallScreen ? 60 : 80;

    // Piece starting positions (below the grid)
    const pieceAreaTop = gridTop + puzzleSize + (isSmallScreen ? 20 : 30);
    const pieceSpacing = pieceSize + (isSmallScreen ? 8 : 12);
    const pieceAreaLeft = (screenW - 3 * pieceSpacing) / 2;

    const currentPuzzle = selectedPuzzle !== null ? PUZZLES.find(p => p.id === selectedPuzzle) : null;

    // Start a puzzle
    const startPuzzle = (puzzleId: number) => {
        setSelectedPuzzle(puzzleId);
        setShowPreview(true);
        setLockedPieces(new Set());
        setMoves(0);
        setIsComplete(false);
        setGameStarted(false);
        setStartTime(Date.now());

        // Reset piece positions
        panRefs.forEach(pan => pan.setValue({ x: 0, y: 0 }));

        setTimeout(() => {
            setShowPreview(false);
            setGameStarted(true);
        }, 2500);
    };

    // Initialize piece positions when game starts
    useEffect(() => {
        if (gameStarted && !showPreview) {
            for (let i = 0; i < TOTAL_TILES; i++) {
                const shuffleIdx = SHUFFLE_ORDER.indexOf(i);
                const row = Math.floor(shuffleIdx / 3);
                const col = shuffleIdx % 3;
                panRefs[i].setValue({
                    x: pieceAreaLeft + col * pieceSpacing,
                    y: pieceAreaTop + row * pieceSpacing,
                });
            }
        }
    }, [gameStarted, showPreview]);

    const handleLock = (id: number) => {
        setLockedPieces(prev => {
            const next = new Set(prev).add(id);
            if (next.size === TOTAL_TILES) {
                setIsComplete(true);
                setTimeout(() => {
                    const dur = Math.floor((Date.now() - startTime) / 1000);
                    const puzzleName = currentPuzzle?.name || 'Yapboz';

                    // Verileri kaydet (arka planda)
                    // onGameEnd yerine sadece veriyi kaydetmek için çağır ama çıkış yapma
                    // Not: onGameEnd normalde oyundan çıkış yapar, bu yüzden özel işlem
                    // Burada veriyi kaydetmek için çağırıyoruz ama sonra seçim ekranına dönüyoruz
                    onGameEnd(`Yapboz - ${puzzleName}`, dur, moves + 1, errors, undefined, {
                        zorlukSeviyesi: 1,
                        kazanimOdagi: 'Uzamsal Algı ve Problem Çözme',
                    });

                    // 2 saniye sonra seçim ekranına dön
                    setTimeout(() => {
                        goBackToSelection();
                    }, 500);
                }, 1500);
            }
            return next;
        });
    };

    const goBackToSelection = () => {
        setSelectedPuzzle(null);
        setGameStarted(false);
        setShowPreview(false);
        setIsComplete(false);
        setLockedPieces(new Set());
        setMoves(0);
        setErrors(0);
    };

    const createPanResponder = (pieceId: number, targetRow: number, targetCol: number) => {
        const pan = panRefs[pieceId];

        return PanResponder.create({
            onStartShouldSetPanResponder: () => !lockedPieces.has(pieceId) && !isComplete,
            onMoveShouldSetPanResponder: () => !lockedPieces.has(pieceId) && !isComplete,
            onPanResponderGrant: () => {
                // @ts-ignore
                pan.setOffset({ x: pan.x._value, y: pan.y._value });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
                useNativeDriver: false,
            }),
            onPanResponderRelease: () => {
                pan.flattenOffset();
                setMoves(m => m + 1);

                // @ts-ignore
                const currentX = pan.x._value;
                // @ts-ignore
                const currentY = pan.y._value;

                const targetX = gridLeft + targetCol * tileSize + (tileSize - pieceSize) / 2;
                const targetY = gridTop + targetRow * tileSize + (tileSize - pieceSize) / 2;

                const centerX = currentX + pieceSize / 2;
                const centerY = currentY + pieceSize / 2;
                const targetCenterX = targetX + pieceSize / 2;
                const targetCenterY = targetY + pieceSize / 2;

                const dist = Math.sqrt(
                    Math.pow(centerX - targetCenterX, 2) + Math.pow(centerY - targetCenterY, 2)
                );

                if (dist < 50) {
                    // Dogru yere bırakıldı - kilitle
                    Animated.spring(pan, {
                        toValue: { x: targetX, y: targetY },
                        useNativeDriver: false,
                        speed: 20,
                        bounciness: 0,
                    }).start(() => {
                        handleLock(pieceId);
                    });
                } else {
                    // Yanlış yere bırakıldı - hata say
                    setErrors(e => e + 1);
                }
            },
        });
    };

    const renderPieces = () => {
        if (!currentPuzzle) return null;
        const pieces = [];
        for (let i = 0; i < TOTAL_TILES; i++) {
            const targetRow = Math.floor(i / GRID_SIZE);
            const targetCol = i % GRID_SIZE;
            const pan = panRefs[i];
            const isLocked = lockedPieces.has(i);
            const responder = createPanResponder(i, targetRow, targetCol);

            pieces.push(
                <Animated.View
                    key={i}
                    {...(isLocked ? {} : responder.panHandlers)}
                    style={[
                        styles.piece,
                        {
                            width: pieceSize,
                            height: pieceSize,
                            transform: pan.getTranslateTransform(),
                            zIndex: isLocked ? 1 : 100,
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
        </View>
    );

    return (
        <ImageBackground source={BACKGROUND_IMAGE} style={styles.container} resizeMode="cover">
            <View style={styles.darkOverlay} />
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.btn}
                    onPress={selectedPuzzle !== null ? goBackToSelection : onExit}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>
                    {currentPuzzle ? `🧩 ${currentPuzzle.name}` : '🧩 Yapboz'}
                </Text>
                <TouchableOpacity style={styles.btn} onPress={toggleMute}>
                    <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {selectedPuzzle === null && renderPuzzleSelection()}
            {selectedPuzzle !== null && showPreview && renderPreview()}
            {selectedPuzzle !== null && !showPreview && renderGame()}
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
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
    btn: { padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
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
});

