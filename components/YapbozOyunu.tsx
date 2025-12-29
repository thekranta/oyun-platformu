import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    LayoutChangeEvent,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSound } from './SoundContext';

interface YapbozOyunuProps {
    onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number) => void;
    onExit: () => void;
}

const GRID_SIZE = 3;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;
const PUZZLE_IMAGE = require('@/assets/images/karpuz.png');

interface DraggablePieceProps {
    id: number;
    row: number;
    col: number;
    puzzleSize: number;
    pieceSize: number;
    tileSize: number;
    gridFrame: { x: number; y: number } | null;
    isLocked: boolean;
    onLock: (id: number) => void;
    onMove: () => void;
    screenW: number;
    isComplete: boolean;
}

// 1. Move Component Outside to prevent re-creation on every render
const DraggablePiece = ({
    id, row, col, puzzleSize, pieceSize, tileSize, gridFrame, isLocked, onLock, onMove, screenW, isComplete
}: DraggablePieceProps) => {

    // Calculate initial position only once or when dimensions change
    // Using useMemo to keep it stable
    const initialPos = useMemo(() => {
        // Grid bottom edge (approx)
        // If gridFrame is not ready, we use a safe default
        const gridBottom = (gridFrame?.y || 0) + puzzleSize;
        const startY = gridBottom + 40;
        const spacing = pieceSize + 15;
        const totalRowWidth = 3 * spacing;

        // Shuffle logic
        const shuffle = [4, 7, 2, 8, 5, 0, 1, 6, 3];
        const idx = shuffle.indexOf(id);

        const r = Math.floor(idx / 3);
        const c = idx % 3;

        // Center relative to the container width (screenW)
        const offsetX = (screenW - (3 * spacing)) / 2;

        return {
            x: offsetX + c * spacing,
            y: startY + r * spacing
        };
    }, [screenW, pieceSize, puzzleSize, gridFrame?.y]); // Depend on Y mainly

    const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

    // Local state to track if we placed it, to avoid "transporting" it again
    const [hasBeenPlaced, setHasBeenPlaced] = useState(false);
    // Track if we have set the initial position
    const [initialized, setInitialized] = useState(false);

    // Initialize position when gridFrame becomes available
    useEffect(() => {
        if (gridFrame && !initialized && !isLocked) {
            pan.setValue(initialPos);
            setInitialized(true);
        }
    }, [gridFrame, initialPos, initialized, isLocked]);

    // PanResponder
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !isLocked && !isComplete && !hasBeenPlaced,
            onMoveShouldSetPanResponder: () => !isLocked && !isComplete && !hasBeenPlaced,
            onPanResponderGrant: () => {
                // @ts-ignore
                pan.setOffset({
                    // @ts-ignore
                    x: pan.x._value,
                    // @ts-ignore
                    y: pan.y._value
                });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gestureState) => {
                pan.flattenOffset();
                onMove(); // Notify parent of move (increments counter)

                // @ts-ignore
                const currentX = pan.x._value;
                // @ts-ignore
                const currentY = pan.y._value;

                if (gridFrame) {
                    const targetX = gridFrame.x + col * tileSize + (tileSize - pieceSize) / 2;
                    const targetY = gridFrame.y + row * tileSize + (tileSize - pieceSize) / 2;

                    const centerX = currentX + pieceSize / 2;
                    const centerY = currentY + pieceSize / 2;

                    const targetCenterX = targetX + pieceSize / 2;
                    const targetCenterY = targetY + pieceSize / 2;

                    const dist = Math.sqrt(
                        Math.pow(centerX - targetCenterX, 2) +
                        Math.pow(centerY - targetCenterY, 2)
                    );

                    // Drop threshold
                    if (dist < 60) {
                        Animated.spring(pan, {
                            toValue: { x: targetX, y: targetY },
                            useNativeDriver: false,
                            speed: 20,
                            bounciness: 0
                        }).start();

                        setHasBeenPlaced(true);
                        onLock(id);
                        return;
                    }
                }
            },
        })
    ).current;

    // React to external lock (e.g. from saved state or logic)
    useEffect(() => {
        if (isLocked && gridFrame) {
            const targetX = gridFrame.x + col * tileSize + (tileSize - pieceSize) / 2;
            const targetY = gridFrame.y + row * tileSize + (tileSize - pieceSize) / 2;

            // Snap visual to target if not already there
            pan.setValue({ x: targetX, y: targetY });
            setHasBeenPlaced(true);
        }
    }, [isLocked, gridFrame]);

    return (
        <Animated.View
            {...(!isLocked ? panResponder.panHandlers : {})}
            style={[
                styles.piece,
                {
                    width: pieceSize,
                    height: pieceSize,
                    transform: pan.getTranslateTransform(),
                    zIndex: isLocked ? 1 : 100,
                    borderColor: isLocked ? '#4CAF50' : '#fff',
                    borderWidth: isLocked ? 2 : 2,
                    opacity: isLocked ? 1 : 1,
                },
            ]}
        >
            <View style={styles.pieceInner}>
                <Image
                    source={PUZZLE_IMAGE}
                    style={{
                        width: puzzleSize,
                        height: puzzleSize,
                        position: 'absolute',
                        left: -col * tileSize,
                        top: -row * tileSize,
                    }}
                    resizeMode="cover"
                />
            </View>
        </Animated.View>
    );
};

export default function YapbozOyunu({ onGameEnd, onExit }: YapbozOyunuProps) {
    const { isMuted, toggleMute } = useSound();
    const [lockedIds, setLockedIds] = useState<Set<number>>(new Set());
    const [moves, setMoves] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [showPreview, setShowPreview] = useState(true);
    const [startTime] = useState(Date.now());

    // Coordinates
    const [gridFrame, setGridFrame] = useState<{ x: number; y: number } | null>(null);

    const { width: screenW, height: screenH } = Dimensions.get('window');
    const puzzleSize = Math.min(screenW * 0.75, screenH * 0.45, 320);
    const tileSize = puzzleSize / GRID_SIZE;
    const pieceSize = tileSize - 6;

    useEffect(() => {
        const t = setTimeout(() => setShowPreview(false), 2500);
        return () => clearTimeout(t);
    }, []);

    const handleLock = (id: number) => {
        setLockedIds(prev => {
            if (prev.has(id)) return prev;
            const next = new Set(prev).add(id);
            if (next.size === TOTAL_TILES) {
                setIsComplete(true);
                setTimeout(() => {
                    const dur = Math.floor((Date.now() - startTime) / 1000);
                    onGameEnd('Yapboz Oyunu', dur, moves, 0);
                }, 1500);
            }
            return next;
        });
    };

    const handleMove = () => {
        setMoves(m => m + 1);
    };

    const onGridLayout = (e: LayoutChangeEvent) => {
        const { x, y } = e.nativeEvent.layout;
        setGridFrame({ x, y });
    };

    // We do NOT use onGameAreaLayout anymore because we put pieces in same flow container or
    // we just use the relative coordinates inside GameArea directly. 
    // Actually, DraggablePiece is absolute positioned.
    // If we make Grid and Pieces siblings inside 'GameArea', and Grid has margin/padding,
    // onLayout of Grid gives X,Y relative to GameArea.
    // Pieces are absolute 0,0 relative to GameArea.
    // So Grid X,Y is exactly the offset we need. Correct.

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.btn} onPress={onExit}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>🧩 Yapboz</Text>
                <TouchableOpacity style={styles.btn} onPress={toggleMute}>
                    <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {showPreview ? (
                <View style={styles.previewContainer}>
                    <Text style={styles.previewTitle}>Resmi Hatırla! 👀</Text>
                    <View style={[styles.previewFrame, { width: puzzleSize, height: puzzleSize }]}>
                        <Image
                            source={PUZZLE_IMAGE}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    </View>
                    <Text style={styles.loadingText}>Oyun Hazırlanıyor...</Text>
                </View>
            ) : (
                <View style={styles.gameArea}>
                    <Text style={styles.instruction}>
                        {isComplete ? '🎉 Mükemmel!' : 'Parçaları sürükle ve birleştir!'}
                    </Text>

                    {/* Grid - Directly inside GameArea to ensure simple coordinates */}
                    <View
                        style={[styles.grid, { width: puzzleSize, height: puzzleSize }]}
                        onLayout={onGridLayout}
                    >
                        {Array.from({ length: TOTAL_TILES }).map((_, i) => (
                            <View key={i} style={[styles.cell, { width: tileSize, height: tileSize }]}>
                                {!lockedIds.has(i) && <View style={styles.cellGuide} />}
                            </View>
                        ))}
                    </View>

                    <View style={styles.hintContainer}>
                        <Text style={styles.hintText}>Hedef:</Text>
                        <Image source={PUZZLE_IMAGE} style={styles.hintImage} />
                    </View>

                    {/* Render Pieces - Only when gridFrame is ready */}
                    {/* They are Absolute positioned relative to GameArea */}
                    {gridFrame && Array.from({ length: TOTAL_TILES }).map((_, i) => {
                        const row = Math.floor(i / GRID_SIZE);
                        const col = i % GRID_SIZE;
                        return (
                            <DraggablePiece
                                key={i}
                                id={i}
                                row={row}
                                col={col}
                                puzzleSize={puzzleSize}
                                pieceSize={pieceSize}
                                tileSize={tileSize}
                                gridFrame={gridFrame}
                                isLocked={lockedIds.has(i)}
                                onLock={handleLock}
                                onMove={handleMove}
                                screenW={screenW}
                                isComplete={isComplete}
                            />
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'web' ? 20 : 50,
        paddingBottom: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 100,
    },
    btn: { padding: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
    title: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
    previewContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    previewTitle: { color: '#FFD54F', fontSize: 24, marginBottom: 20, fontWeight: 'bold' },
    previewFrame: { borderWidth: 3, borderColor: '#4ECDC4', borderRadius: 12, overflow: 'hidden' },
    loadingText: { color: '#aaa', marginTop: 20, fontSize: 16 },

    gameArea: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 20 },
    instruction: { textAlign: 'center', color: '#fff', fontSize: 16, marginBottom: 20, fontWeight: '600' },

    // Grid styles
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderWidth: 2,
        borderColor: '#4ECDC4',
        backgroundColor: 'rgba(255,255,255,0.1)',
        zIndex: 1, // Ensure grid is below pieces (pieces are zIndex 100)
    },
    cell: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    cellGuide: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: 'rgba(255,255,255,0.1)'
    },

    hintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        gap: 10,
        zIndex: 1,
    },
    hintText: { color: '#aaa', fontSize: 12 },
    hintImage: { width: 50, height: 50, borderRadius: 4, opacity: 0.8 },

    piece: {
        position: 'absolute',
        borderRadius: 4,
        backgroundColor: '#fff',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    pieceInner: { flex: 1, overflow: 'hidden', borderRadius: 4 },
});
