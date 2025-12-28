import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
    isLocked: boolean; // Doğru yere kilitlendiyse
}

const GRID_SIZE = 3;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

const PUZZLE_IMAGE = require('@/assets/images/karpuz.png');

export default function YapbozOyunu({ onGameEnd, onExit }: YapbozOyunuProps) {
    const { isMuted, toggleMute } = useSound();
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [moves, setMoves] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [startTime] = useState(Date.now());
    const [showPreview, setShowPreview] = useState(true);
    const [lockedCount, setLockedCount] = useState(0);
    const [gridLayout, setGridLayout] = useState({ x: 0, y: 0, ready: false });

    const gridRef = useRef<View>(null);

    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const puzzleSize = Math.min(screenWidth * 0.6, screenHeight * 0.35, 280);
    const tileSize = puzzleSize / GRID_SIZE;

    const pieceDisplaySize = tileSize * 0.9;

    const confettiAnims = useRef(
        Array.from({ length: 30 }, () => ({
            x: new Animated.Value(0),
            y: new Animated.Value(0),
            rotate: new Animated.Value(0),
            opacity: new Animated.Value(1),
        }))
    ).current;

    // Grid pozisyonunu hesapla
    const handleGridLayout = useCallback((event: LayoutChangeEvent) => {
        if (Platform.OS === 'web') {
            const headerHeight = 80;
            const instructionHeight = 50;
            const paddingTop = 10;

            const gridX = (screenWidth - puzzleSize) / 2;
            const gridY = headerHeight + instructionHeight + paddingTop;

            setGridLayout({ x: gridX, y: gridY, ready: true });
        } else {
            if (gridRef.current) {
                gridRef.current.measure((fx, fy, w, h, px, py) => {
                    setGridLayout({ x: px, y: py, ready: true });
                });
            }
        }
    }, [screenWidth, puzzleSize]);

    // Oyunu başlat
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowPreview(false);
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    // Grid hazır olunca parçaları oluştur
    useEffect(() => {
        if (!showPreview && gridLayout.ready) {
            initializeTiles();
        }
    }, [showPreview, gridLayout.ready]);

    const initializeTiles = () => {
        const newTiles: Tile[] = [];

        for (let i = 0; i < TOTAL_TILES; i++) {
            const row = Math.floor(i / GRID_SIZE);
            const col = i % GRID_SIZE;

            newTiles.push({
                id: i,
                row,
                col,
                isLocked: false,
            });
        }

        setTiles(newTiles);
    };

    // Başlangıç pozisyonlarını karıştırılmış olarak hesapla
    const getInitialPositions = useCallback(() => {
        const positions: { [key: number]: { x: number; y: number } } = {};

        const shuffledIndices = [...Array(TOTAL_TILES).keys()];
        for (let i = shuffledIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
        }

        const pieceSpacing = pieceDisplaySize + 15;
        const startX = (screenWidth - (GRID_SIZE * pieceSpacing - 15)) / 2;
        const startY = screenHeight * 0.55;

        shuffledIndices.forEach((originalIndex, shuffledPos) => {
            const displayRow = Math.floor(shuffledPos / GRID_SIZE);
            const displayCol = shuffledPos % GRID_SIZE;

            positions[originalIndex] = {
                x: startX + displayCol * pieceSpacing,
                y: startY + displayRow * pieceSpacing,
            };
        });

        return positions;
    }, [screenWidth, screenHeight, pieceDisplaySize]);

    const [initialPositions] = useState(getInitialPositions);

    const triggerConfetti = () => {
        confettiAnims.forEach((anim, i) => {
            const startX = Math.random() * screenWidth;
            anim.x.setValue(startX);
            anim.y.setValue(0);
            anim.rotate.setValue(0);
            anim.opacity.setValue(1);

            Animated.parallel([
                Animated.timing(anim.y, {
                    toValue: screenHeight,
                    duration: 2500,
                    useNativeDriver: false,
                }),
                Animated.timing(anim.rotate, {
                    toValue: 10,
                    duration: 2500,
                    useNativeDriver: false,
                }),
                Animated.sequence([
                    Animated.delay(1500),
                    Animated.timing(anim.opacity, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: false,
                    }),
                ]),
            ]).start();
        });
    };

    const handleTileLocked = (tileId: number) => {
        setTiles(prev => prev.map(t => t.id === tileId ? { ...t, isLocked: true } : t));
        setLockedCount(prev => {
            const newCount = prev + 1;
            if (newCount === TOTAL_TILES && !isComplete) {
                setIsComplete(true);
                triggerConfetti();
                const duration = Math.floor((Date.now() - startTime) / 1000);
                setTimeout(() => {
                    onGameEnd('Yapboz Oyunu', duration, moves, 0);
                }, 2500);
            }
            return newCount;
        });
    };

    // Sürüklenebilir parça komponenti
    const DraggableTile = ({ tile }: { tile: Tile }) => {
        const initPos = initialPositions[tile.id] || { x: 100, y: 400 };
        const pan = useRef(new Animated.ValueXY({ x: initPos.x, y: initPos.y })).current;
        const scale = useRef(new Animated.Value(1)).current;
        const [isDragging, setIsDragging] = useState(false);
        const [isLocked, setIsLocked] = useState(false);

        const panResponder = useRef(
            PanResponder.create({
                onStartShouldSetPanResponder: () => !isLocked,
                onMoveShouldSetPanResponder: () => !isLocked,
                onPanResponderGrant: () => {
                    setIsDragging(true);
                    Animated.spring(scale, {
                        toValue: 1.1,
                        useNativeDriver: false,
                    }).start();

                    pan.setOffset({
                        x: (pan.x as any)._value,
                        y: (pan.y as any)._value,
                    });
                    pan.setValue({ x: 0, y: 0 });
                },
                onPanResponderMove: (evt, gestureState) => {
                    pan.setValue({ x: gestureState.dx, y: gestureState.dy });
                },
                onPanResponderRelease: (evt, gesture) => {
                    pan.flattenOffset();
                    setIsDragging(false);

                    Animated.spring(scale, {
                        toValue: 1,
                        useNativeDriver: false,
                    }).start();

                    setMoves(m => m + 1);

                    const dropX = gesture.moveX;
                    const dropY = gesture.moveY;

                    const gridTop = gridLayout.y;
                    const gridLeft = gridLayout.x;
                    const gridRight = gridLeft + puzzleSize;
                    const gridBottom = gridTop + puzzleSize;

                    // Grid içine bırakıldı mı?
                    if (dropX >= gridLeft && dropX <= gridRight && dropY >= gridTop && dropY <= gridBottom) {
                        const relX = dropX - gridLeft;
                        const relY = dropY - gridTop;
                        const dropCol = Math.floor(relX / tileSize);
                        const dropRow = Math.floor(relY / tileSize);

                        // Doğru yere mi bırakıldı?
                        if (dropRow === tile.row && dropCol === tile.col) {
                            // DOĞRU! Kilitle
                            const targetX = gridLayout.x + tile.col * tileSize + (tileSize - pieceDisplaySize) / 2;
                            const targetY = gridLayout.y + tile.row * tileSize + (tileSize - pieceDisplaySize) / 2;

                            Animated.spring(pan, {
                                toValue: { x: targetX, y: targetY },
                                useNativeDriver: false,
                                friction: 7,
                            }).start(() => {
                                setIsLocked(true);
                                handleTileLocked(tile.id);
                            });
                        }
                        // Yanlış yere bırakıldıysa - parça orada kalır, geri dönmez
                    }
                    // Grid dışına bırakıldıysa - parça orada kalır
                },
            })
        ).current;

        if (isLocked) {
            // Kilitli parça - grid içinde sabit
            const lockedX = gridLayout.x + tile.col * tileSize + (tileSize - pieceDisplaySize) / 2;
            const lockedY = gridLayout.y + tile.row * tileSize + (tileSize - pieceDisplaySize) / 2;

            return (
                <View
                    style={[
                        styles.lockedTile,
                        {
                            width: pieceDisplaySize,
                            height: pieceDisplaySize,
                            left: lockedX,
                            top: lockedY,
                        },
                    ]}
                >
                    <View style={[styles.tileImageWrapper, { width: pieceDisplaySize - 6, height: pieceDisplaySize - 6 }]}>
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
                </View>
            );
        }

        return (
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.draggableTile,
                    {
                        width: pieceDisplaySize,
                        height: pieceDisplaySize,
                        transform: [
                            { translateX: pan.x },
                            { translateY: pan.y },
                            { scale: scale },
                        ],
                        zIndex: isDragging ? 1000 : 50,
                        cursor: 'grab',
                    } as any,
                ]}
            >
                <View style={[styles.tileImageWrapper, { width: pieceDisplaySize - 6, height: pieceDisplaySize - 6 }]}>
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

    // Grid hücrelerini oluştur - sadece kılavuz çizgiler
    const renderGrid = () => {
        const rows = [];
        for (let row = 0; row < GRID_SIZE; row++) {
            const cells = [];
            for (let col = 0; col < GRID_SIZE; col++) {
                cells.push(
                    <View
                        key={`${row}-${col}`}
                        style={[
                            styles.gridCell,
                            {
                                width: tileSize,
                                height: tileSize,
                            },
                        ]}
                    />
                );
            }
            rows.push(
                <View key={row} style={styles.gridRow}>
                    {cells}
                </View>
            );
        }
        return rows;
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.exitButton} onPress={onExit}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>🧩 Yapboz</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity style={styles.soundButton} onPress={toggleMute}>
                        <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.statItem}>
                        <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                        <Text style={styles.statText}>{lockedCount}/{TOTAL_TILES}</Text>
                    </View>
                </View>
            </View>

            {showPreview ? (
                <View style={styles.previewContainer}>
                    <Text style={styles.previewText}>Resmi iyi hatırla! 👀</Text>
                    <Image
                        source={PUZZLE_IMAGE}
                        style={[styles.previewImage, { width: puzzleSize, height: puzzleSize }]}
                        resizeMode="cover"
                    />
                    <Text style={styles.countdownText}>Oyun yakında başlıyor...</Text>
                </View>
            ) : (
                <View style={styles.gameContainer}>
                    {/* Talimat */}
                    <Text style={styles.instruction}>
                        {isComplete ? '🎉 Harika! Tamamladın!' : 'Parçaları sürükleyip yerine bırak!'}
                    </Text>

                    {/* Hedef Grid */}
                    <View
                        ref={gridRef}
                        style={[styles.puzzleGrid, { width: puzzleSize, height: puzzleSize }]}
                        onLayout={handleGridLayout}
                    >
                        {renderGrid()}
                    </View>

                    {/* Mini referans */}
                    <View style={styles.referenceContainer}>
                        <Text style={styles.referenceLabel}>Hedef:</Text>
                        <Image
                            source={PUZZLE_IMAGE}
                            style={styles.referenceImage}
                            resizeMode="cover"
                        />
                    </View>

                    {/* Parçalar etiketi */}
                    <View style={styles.piecesLabelContainer}>
                        <Text style={styles.piecesLabel}>📦 Parçaları yukarı sürükle</Text>
                    </View>
                </View>
            )}

            {/* Sürüklenebilir parçalar */}
            {!showPreview && tiles.map((tile) => (
                <DraggableTile key={tile.id} tile={tile} />
            ))}

            {/* Confetti */}
            {isComplete &&
                confettiAnims.map((anim, i) => (
                    <Animated.View
                        key={i}
                        style={[
                            styles.confetti,
                            {
                                backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA'][i % 6],
                                transform: [
                                    { translateX: anim.x },
                                    { translateY: anim.y },
                                    { rotate: anim.rotate.interpolate({ inputRange: [0, 10], outputRange: ['0deg', '720deg'] }) },
                                ],
                                opacity: anim.opacity,
                            },
                        ]}
                    />
                ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'ios' ? 50 : 25,
        paddingBottom: 10,
        backgroundColor: 'rgba(0,0,0,0.3)',
        zIndex: 100,
    },
    exitButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 8,
        borderRadius: 12,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    soundButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 8,
        borderRadius: 12,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        gap: 4,
    },
    statText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    previewContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    previewText: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#FFD54F',
        marginBottom: 20,
    },
    previewImage: {
        borderRadius: 15,
        borderWidth: 4,
        borderColor: '#4ECDC4',
    },
    countdownText: {
        fontSize: 16,
        color: '#aaa',
        marginTop: 20,
    },
    gameContainer: {
        flex: 1,
        alignItems: 'center',
        paddingTop: 10,
    },
    instruction: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 15,
        textAlign: 'center',
        height: 30,
    },
    puzzleGrid: {
        backgroundColor: '#2d2d44',
        borderRadius: 12,
        borderWidth: 3,
        borderColor: '#4ECDC4',
        overflow: 'hidden',
    },
    gridRow: {
        flexDirection: 'row',
    },
    gridCell: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    referenceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 8,
        borderRadius: 10,
        marginTop: 12,
        gap: 8,
    },
    referenceLabel: {
        color: '#aaa',
        fontSize: 12,
    },
    referenceImage: {
        width: 45,
        height: 45,
        borderRadius: 6,
    },
    piecesLabelContainer: {
        marginTop: 20,
        paddingHorizontal: 20,
    },
    piecesLabel: {
        color: '#aaa',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    draggableTile: {
        position: 'absolute',
        borderRadius: 8,
        backgroundColor: '#fff',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
        borderWidth: 2,
        borderColor: '#4ECDC4',
    },
    lockedTile: {
        position: 'absolute',
        borderRadius: 8,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#4CAF50',
        zIndex: 10,
    },
    tileImageWrapper: {
        overflow: 'hidden',
        borderRadius: 6,
    },
    confetti: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 3,
    },
});
