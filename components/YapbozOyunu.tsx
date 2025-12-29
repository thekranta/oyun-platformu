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

    // Grid layout handler
    const onGridLayout = (e: LayoutChangeEvent) => {
        const { x, y } = e.nativeEvent.layout;
        setGridFrame({ x, y });
    };

    // Game Area layout handler
    const [gameAreaFrame, setGameAreaFrame] = useState<{ x: number; y: number } | null>(null);
    const onGameAreaLayout = (e: LayoutChangeEvent) => {
        setGameAreaFrame(e.nativeEvent.layout);
    };

    const DraggablePiece = ({ id, row, col }: { id: number; row: number; col: number }) => {
        const getInitPos = () => {
            const gridBottom = (gridFrame?.y || 0) + puzzleSize;
            const startY = gridBottom + 40;
            const spacing = pieceSize + 15;
            const totalRowWidth = 3 * spacing;

            // Shuffle logic
            const shuffle = [4, 7, 2, 8, 5, 0, 1, 6, 3];
            const idx = shuffle.indexOf(id);

            const r = Math.floor(idx / 3);
            const c = idx % 3;

            // Center relative to the container width (screenW in this simple logic or parent width)
            const offsetX = (screenW - (3 * spacing)) / 2;

            return {
                x: offsetX + c * spacing,
                y: startY + r * spacing
            };
        };

        const initialPos = useRef({ x: 0, y: 0 }).current;
        const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
        const [isPlaced, setIsPlaced] = useState(false);

        useEffect(() => {
            if (gridFrame) {
                const pos = getInitPos();
                pan.setValue(pos);
                // @ts-ignore
                pan.setOffset({ x: 0, y: 0 });
                initialPos.x = pos.x;
                initialPos.y = pos.y;
            }
        }, [gridFrame]);

        const panResponder = useRef(
            PanResponder.create({
                onStartShouldSetPanResponder: () => !isPlaced && !isComplete,
                onMoveShouldSetPanResponder: () => !isPlaced && !isComplete,
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

                    // @ts-ignore
                    const currentX = pan.x._value;
                    // @ts-ignore
                    const currentY = pan.y._value;

                    setMoves(m => m + 1);

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

                        if (dist < 60) {
                            Animated.spring(pan, {
                                toValue: { x: targetX, y: targetY },
                                useNativeDriver: false,
                                speed: 20,
                                bounciness: 0
                            }).start();

                            setIsPlaced(true);
                            handleLock(id);
                            return;
                        }
                    }
                },
            })
        ).current;

        // If locked/placed, ensure it stays at target
        useEffect(() => {
            if (lockedIds.has(id)) {
                if (gridFrame) {
                    const targetX = gridFrame.x + col * tileSize + (tileSize - pieceSize) / 2;
                    const targetY = gridFrame.y + row * tileSize + (tileSize - pieceSize) / 2;
                    pan.setValue({ x: targetX, y: targetY });
                }
            }
        }, [lockedIds, gridFrame]);

        return (
            <Animated.View
                {...(!lockedIds.has(id) ? panResponder.panHandlers : {})}
                style={[
                    styles.piece,
                    {
                        width: pieceSize,
                        height: pieceSize,
                        transform: pan.getTranslateTransform(),
                        zIndex: lockedIds.has(id) ? 1 : 100,
                        borderColor: lockedIds.has(id) ? '#4CAF50' : '#fff',
                        borderWidth: lockedIds.has(id) ? 2 : 2,
                        opacity: lockedIds.has(id) ? 1 : 1,
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
                <View style={styles.gameArea} onLayout={onGameAreaLayout}>
                    <Text style={styles.instruction}>
                        {isComplete ? '🎉 Mükemmel!' : 'Parçaları sürükle ve birleştir!'}
                    </Text>

                    <View style={styles.gridWrapper}>
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
                    </View>

                    <View style={styles.hintContainer}>
                        <Text style={styles.hintText}>Hedef:</Text>
                        <Image source={PUZZLE_IMAGE} style={styles.hintImage} />
                    </View>

                    {(!showPreview && gridFrame) && Array.from({ length: TOTAL_TILES }).map((_, i) => {
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

    gameArea: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 20 },
    instruction: { textAlign: 'center', color: '#fff', fontSize: 16, marginBottom: 20, fontWeight: '600' },

    gridWrapper: { alignItems: 'center', zIndex: 1 },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderWidth: 2,
        borderColor: '#4ECDC4',
        backgroundColor: 'rgba(255,255,255,0.1)'
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
