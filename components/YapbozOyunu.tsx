import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSound } from './SoundContext';

interface YapbozOyunuProps {
    onGameEnd: (
        oyunAdi: string,
        sure: number,
        hamle: number,
        hata: number
    ) => void;
    onExit: () => void;
}

interface Tile {
    id: number;
    row: number;
    col: number;
}

const GRID_SIZE = 3;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

const PUZZLE_IMAGE = require('@/assets/images/karpuz.png');

export default function YapbozOyunu({ onGameEnd, onExit }: YapbozOyunuProps) {
    const { isMuted, toggleMute } = useSound();
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [lockedTiles, setLockedTiles] = useState<Set<number>>(new Set());
    const [moves, setMoves] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [startTime] = useState(Date.now());
    const [showPreview, setShowPreview] = useState(true);
    const [gridPosition, setGridPosition] = useState({ x: 0, y: 0 });

    const gridRef = useRef<View>(null);

    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const puzzleSize = Math.min(screenWidth * 0.6, screenHeight * 0.35, 280);
    const tileSize = puzzleSize / GRID_SIZE;
    const pieceSize = tileSize - 4;

    const confettiAnims = useRef(
        Array.from({ length: 30 }, () => ({
            x: new Animated.Value(0),
            y: new Animated.Value(0),
            opacity: new Animated.Value(1),
        }))
    ).current;

    // Oyunu başlat
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowPreview(false);
            initializeTiles();
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const initializeTiles = () => {
        const newTiles: Tile[] = [];
        for (let i = 0; i < TOTAL_TILES; i++) {
            newTiles.push({
                id: i,
                row: Math.floor(i / GRID_SIZE),
                col: i % GRID_SIZE,
            });
        }
        setTiles(newTiles);
    };

    // Başlangıç pozisyonlarını karıştırılmış hesapla
    const getShuffledPositions = useCallback(() => {
        const positions: { [key: number]: { x: number; y: number } } = {};
        const indices = [...Array(TOTAL_TILES).keys()];

        // Karıştır
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        const spacing = pieceSize + 12;
        const totalWidth = GRID_SIZE * spacing;
        const startX = (screenWidth - totalWidth) / 2;
        const startY = screenHeight * 0.58;

        indices.forEach((origIdx, shuffleIdx) => {
            const row = Math.floor(shuffleIdx / GRID_SIZE);
            const col = shuffleIdx % GRID_SIZE;
            positions[origIdx] = {
                x: startX + col * spacing,
                y: startY + row * spacing,
            };
        });

        return positions;
    }, [screenWidth, screenHeight, pieceSize]);

    const [shuffledPositions] = useState(getShuffledPositions);

    const triggerConfetti = () => {
        confettiAnims.forEach((anim, i) => {
            anim.x.setValue(Math.random() * screenWidth);
            anim.y.setValue(0);
            anim.opacity.setValue(1);

            Animated.parallel([
                Animated.timing(anim.y, {
                    toValue: screenHeight,
                    duration: 2000 + Math.random() * 1000,
                    useNativeDriver: false,
                }),
                Animated.timing(anim.opacity, {
                    toValue: 0,
                    duration: 2500,
                    delay: 1000,
                    useNativeDriver: false,
                }),
            ]).start();
        });
    };

    const checkComplete = useCallback((locked: Set<number>) => {
        if (locked.size === TOTAL_TILES && !isComplete) {
            setIsComplete(true);
            triggerConfetti();
            const duration = Math.floor((Date.now() - startTime) / 1000);
            setTimeout(() => {
                onGameEnd('Yapboz Oyunu', duration, moves, 0);
            }, 2500);
        }
    }, [isComplete, startTime, moves, onGameEnd]);

    // Sürüklenebilir parça
    const DraggablePiece = ({ tile }: { tile: Tile }) => {
        const initPos = shuffledPositions[tile.id] || { x: 50, y: 400 };
        const position = useRef(new Animated.ValueXY(initPos)).current;
        const zIndex = useRef(new Animated.Value(1)).current;
        const [locked, setLocked] = useState(false);
        const currentPos = useRef(initPos);

        const panResponder = useRef(
            PanResponder.create({
                onStartShouldSetPanResponder: () => !locked,
                onMoveShouldSetPanResponder: () => !locked,

                onPanResponderGrant: () => {
                    zIndex.setValue(100);
                    position.setOffset({
                        x: currentPos.current.x,
                        y: currentPos.current.y,
                    });
                    position.setValue({ x: 0, y: 0 });
                },

                onPanResponderMove: Animated.event(
                    [null, { dx: position.x, dy: position.y }],
                    { useNativeDriver: false }
                ),

                onPanResponderRelease: (e, gesture) => {
                    position.flattenOffset();
                    zIndex.setValue(1);

                    // Yeni pozisyonu kaydet
                    const newX = currentPos.current.x + gesture.dx;
                    const newY = currentPos.current.y + gesture.dy;
                    currentPos.current = { x: newX, y: newY };

                    setMoves(m => m + 1);

                    // Drop pozisyonu
                    const dropX = gesture.moveX;
                    const dropY = gesture.moveY;

                    // Grid sınırları (hesaplanmış)
                    const gridX = gridPosition.x;
                    const gridY = gridPosition.y;

                    // Grid içinde mi?
                    if (
                        dropX >= gridX &&
                        dropX <= gridX + puzzleSize &&
                        dropY >= gridY &&
                        dropY <= gridY + puzzleSize
                    ) {
                        // Hangi hücre?
                        const cellCol = Math.floor((dropX - gridX) / tileSize);
                        const cellRow = Math.floor((dropY - gridY) / tileSize);

                        // Doğru hücre mi?
                        if (cellRow === tile.row && cellCol === tile.col) {
                            // Doğru! Kilitle
                            const snapX = gridX + tile.col * tileSize + (tileSize - pieceSize) / 2;
                            const snapY = gridY + tile.row * tileSize + (tileSize - pieceSize) / 2;

                            Animated.spring(position, {
                                toValue: { x: snapX, y: snapY },
                                useNativeDriver: false,
                                friction: 8,
                            }).start();

                            currentPos.current = { x: snapX, y: snapY };
                            setLocked(true);

                            setLockedTiles(prev => {
                                const newSet = new Set(prev).add(tile.id);
                                checkComplete(newSet);
                                return newSet;
                            });
                        }
                    }
                    // Yanlış yere bırakıldıysa orada kalır
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
                        transform: position.getTranslateTransform(),
                        zIndex: zIndex as any,
                        borderColor: locked ? '#4CAF50' : '#4ECDC4',
                        opacity: locked ? 1 : 0.95,
                    },
                ]}
            >
                <View style={[styles.pieceInner, { width: pieceSize - 4, height: pieceSize - 4 }]}>
                    <Image
                        source={PUZZLE_IMAGE}
                        style={{
                            width: puzzleSize,
                            height: puzzleSize,
                            position: 'absolute',
                            left: -tile.col * tileSize,
                            top: -tile.row * tileSize,
                        }}
                        resizeMode="cover"
                    />
                </View>
            </Animated.View>
        );
    };

    // Grid
    const renderGrid = () => {
        const cells = [];
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                cells.push(
                    <View
                        key={`${r}-${c}`}
                        style={[styles.cell, { width: tileSize, height: tileSize }]}
                    />
                );
            }
        }
        return cells;
    };

    // Grid pozisyonunu ölç
    const measureGrid = useCallback(() => {
        if (Platform.OS === 'web' && gridRef.current) {
            // Web için DOM element pozisyonu
            const element = gridRef.current as any;
            if (element.getBoundingClientRect) {
                const rect = element.getBoundingClientRect();
                setGridPosition({ x: rect.left, y: rect.top });
            } else {
                // Fallback: hesaplanmış pozisyon
                const x = (screenWidth - puzzleSize) / 2;
                const y = 140; // header + instruction
                setGridPosition({ x, y });
            }
        } else if (gridRef.current) {
            gridRef.current.measure((fx, fy, w, h, px, py) => {
                setGridPosition({ x: px, y: py });
            });
        }
    }, [screenWidth, puzzleSize]);

    useEffect(() => {
        if (!showPreview) {
            // Grid ölçümünü biraz geciktir
            const timer = setTimeout(measureGrid, 100);
            return () => clearTimeout(timer);
        }
    }, [showPreview, measureGrid]);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={onExit}>
                    <Ionicons name="arrow-back" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>🧩 Yapboz</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.soundBtn} onPress={toggleMute}>
                        <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.counter}>
                        <Text style={styles.counterText}>{lockedTiles.size}/{TOTAL_TILES}</Text>
                    </View>
                </View>
            </View>

            {showPreview ? (
                <View style={styles.preview}>
                    <Text style={styles.previewTitle}>Resmi iyi hatırla! 👀</Text>
                    <Image
                        source={PUZZLE_IMAGE}
                        style={[styles.previewImg, { width: puzzleSize, height: puzzleSize }]}
                        resizeMode="cover"
                    />
                    <Text style={styles.previewSub}>Oyun başlıyor...</Text>
                </View>
            ) : (
                <View style={styles.game}>
                    <Text style={styles.instruction}>
                        {isComplete ? '🎉 Tebrikler!' : 'Parçaları sürükle, yerine bırak!'}
                    </Text>

                    {/* Grid */}
                    <View
                        ref={gridRef}
                        style={[styles.grid, { width: puzzleSize, height: puzzleSize }]}
                        onLayout={measureGrid}
                    >
                        {renderGrid()}
                    </View>

                    {/* Hedef görseli */}
                    <View style={styles.hint}>
                        <Text style={styles.hintLabel}>Hedef:</Text>
                        <Image source={PUZZLE_IMAGE} style={styles.hintImg} resizeMode="cover" />
                    </View>

                    <Text style={styles.bottomLabel}>⬆️ Parçaları yukarı sürükle</Text>
                </View>
            )}

            {/* Parçalar */}
            {!showPreview && tiles.map(tile => (
                <DraggablePiece key={tile.id} tile={tile} />
            ))}

            {/* Confetti */}
            {isComplete && confettiAnims.map((anim, i) => (
                <Animated.View
                    key={i}
                    style={[
                        styles.confetti,
                        {
                            backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'][i % 5],
                            transform: [{ translateX: anim.x }, { translateY: anim.y }],
                            opacity: anim.opacity,
                        },
                    ]}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a2e' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 10,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 200,
    },
    backBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    soundBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 },
    counter: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    counterText: { color: '#4CAF50', fontSize: 14, fontWeight: 'bold' },
    preview: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    previewTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFD54F', marginBottom: 20 },
    previewImg: { borderRadius: 12, borderWidth: 3, borderColor: '#4ECDC4' },
    previewSub: { fontSize: 16, color: '#aaa', marginTop: 20 },
    game: { flex: 1, alignItems: 'center', paddingTop: 15 },
    instruction: { fontSize: 17, fontWeight: 'bold', color: '#fff', marginBottom: 15 },
    grid: {
        backgroundColor: '#2d2d44',
        borderRadius: 10,
        borderWidth: 3,
        borderColor: '#4ECDC4',
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    cell: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
    hint: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 8,
        borderRadius: 10,
        marginTop: 15,
        gap: 8,
    },
    hintLabel: { color: '#aaa', fontSize: 12 },
    hintImg: { width: 40, height: 40, borderRadius: 5 },
    bottomLabel: { color: '#888', fontSize: 14, marginTop: 20 },
    piece: {
        position: 'absolute',
        borderRadius: 6,
        backgroundColor: '#fff',
        borderWidth: 2,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    pieceInner: { overflow: 'hidden', borderRadius: 4 },
    confetti: { position: 'absolute', width: 12, height: 12, borderRadius: 2 },
});
