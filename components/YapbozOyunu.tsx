import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
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

export default function YapbozOyunu({ onGameEnd, onExit }: YapbozOyunuProps) {
    const { isMuted, toggleMute } = useSound();
    const [lockedIds, setLockedIds] = useState<Set<number>>(new Set());
    const [moves, setMoves] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [showPreview, setShowPreview] = useState(true);
    const [startTime] = useState(Date.now());
    const [gridFrame, setGridFrame] = useState<{ x: number; y: number } | null>(null);

    const { width: screenW, height: screenH } = Dimensions.get('window');
    // Dynamic sizing
    const puzzleSize = Math.min(screenW * 0.75, screenH * 0.45, 320);
    const tileSize = puzzleSize / GRID_SIZE;
    const pieceSize = tileSize - 6;

    useEffect(() => {
        const t = setTimeout(() => setShowPreview(false), 2500);
        return () => clearTimeout(t);
    }, []);

    const handleLock = (id: number) => {
        setLockedIds(prev => {
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

    const DraggablePiece = ({ id, row, col }: { id: number; row: number; col: number }) => {
        // Initial random position at the bottom
        const getInitPos = () => {
            const spacing = pieceSize + 10;
            const totalW = GRID_SIZE * spacing;
            const startX = (screenW - totalW) / 2;
            // Start below the grid area (approx)
            const startY = screenH * 0.55;

            // Fixed shuffle order for consistency
            const shuffle = [4, 7, 2, 8, 5, 0, 1, 6, 3];
            const idx = shuffle.indexOf(id);
            const r = Math.floor(idx / GRID_SIZE);
            const c = idx % GRID_SIZE;

            return {
                x: startX + c * spacing,
                y: startY + r * spacing
            };
        };

        const initialPos = useRef(getInitPos()).current;
        const pan = useRef(new Animated.ValueXY(initialPos)).current;

        // We track the absolute value manually because .flattenOffset() can be tricky 
        // if not managed perfectly in all RN versions
        const currentOffset = useRef(initialPos);

        const [locked, setLocked] = useState(false);
        const [dragging, setDragging] = useState(false);

        const panResponder = useRef(
            PanResponder.create({
                onStartShouldSetPanResponder: () => !locked && !isComplete,
                onMoveShouldSetPanResponder: () => !locked && !isComplete,
                onPanResponderGrant: () => {
                    setDragging(true);
                    // Set the offset to current position so the movement starts from here
                    pan.setOffset({
                        x: currentOffset.current.x,
                        y: currentOffset.current.y,
                    });
                    pan.setValue({ x: 0, y: 0 });
                },
                onPanResponderMove: Animated.event(
                    [null, { dx: pan.x, dy: pan.y }],
                    { useNativeDriver: false }
                ),
                onPanResponderRelease: (_, gestureState) => {
                    pan.flattenOffset();
                    setDragging(false);

                    // Update current absolute position
                    const finalX = currentOffset.current.x + gestureState.dx;
                    const finalY = currentOffset.current.y + gestureState.dy;
                    currentOffset.current = { x: finalX, y: finalY };

                    setMoves(m => m + 1);

                    // Drop detection loop
                    if (gridFrame) {
                        // Target coordinates for this specific piece
                        const targetX = gridFrame.x + col * tileSize + (tileSize - pieceSize) / 2;
                        const targetY = gridFrame.y + row * tileSize + (tileSize - pieceSize) / 2;

                        // Distance based check (more reliable than Rect intersection)
                        // If piece center is close to target slot center
                        const centerX = finalX + pieceSize / 2;
                        const centerY = finalY + pieceSize / 2;
                        const targetCenterX = targetX + pieceSize / 2;
                        const targetCenterY = targetY + pieceSize / 2;

                        const dist = Math.sqrt(
                            Math.pow(centerX - targetCenterX, 2) +
                            Math.pow(centerY - targetCenterY, 2)
                        );

                        // Threshold: snap if within 40 pixels
                        if (dist < 45) {
                            // Snap to target
                            Animated.spring(pan, {
                                toValue: { x: targetX, y: targetY },
                                useNativeDriver: false,
                                tension: 40,
                                friction: 7
                            }).start();

                            currentOffset.current = { x: targetX, y: targetY };
                            setLocked(true);
                            handleLock(id);
                            return;
                        }
                    }

                    // No snap: stays where it was dropped (real puzzle behavior)
                },
            })
        ).current;

        return (
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.piece,
                    {
                        width: pieceSize,
                        height: pieceSize,
                        transform: pan.getTranslateTransform(),
                        zIndex: dragging ? 999 : locked ? 1 : 10,
                        borderColor: locked ? '#4CAF50' : '#fff',
                        borderWidth: locked ? 3 : 2,
                        opacity: locked ? 1 : 0.95,
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

    // Grid layout handler
    const onGridLayout = (e: LayoutChangeEvent) => {
        const { x, y } = e.nativeEvent.layout;
        // We only care about the top-left of the grid relative to the GameArea
        setGridFrame({ x, y });
    };

    return (
        <View style={styles.container}>
            {/* Header */}
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

                    {/* Grid Container */}
                    <View style={styles.gridWrapper}>
                        <View
                            style={[styles.grid, { width: puzzleSize, height: puzzleSize }]}
                            onLayout={onGridLayout}
                        >
                            {Array.from({ length: TOTAL_TILES }).map((_, i) => (
                                <View key={i} style={[styles.cell, { width: tileSize, height: tileSize }]} />
                            ))}
                        </View>
                    </View>

                    {/* Reference */}
                    <View style={styles.hintContainer}>
                        <Text style={styles.hintText}>Hedef:</Text>
                        <Image source={PUZZLE_IMAGE} style={styles.hintImage} />
                    </View>

                    {/* Pieces are rendered as direct children of GameArea to share coordinate space */}
                    {(!showPreview) && Array.from({ length: TOTAL_TILES }).map((_, i) => {
                        const row = Math.floor(i / GRID_SIZE);
                        const col = i % GRID_SIZE;
                        return <DraggablePiece key={i} id={i} row={row} col={col} />;
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

    gameArea: { flex: 1 },
    instruction: { textAlign: 'center', color: '#fff', fontSize: 16, marginTop: 15, marginBottom: 15, fontWeight: '600' },

    gridWrapper: { alignItems: 'center', zIndex: 1 },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    cell: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

    hintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 15,
        gap: 10,
        zIndex: 1,
    },
    hintText: { color: '#aaa', fontSize: 12 },
    hintImage: { width: 40, height: 40, borderRadius: 4 },

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
