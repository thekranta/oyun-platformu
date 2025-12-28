import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
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
    isPlaced: boolean;
    startX: number;
    startY: number;
}

const GRID_SIZE = 3;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

const PUZZLE_IMAGE = require('@/assets/images/karpuz.png');

export default function YapbozOyunu({ onGameEnd, onExit }: YapbozOyunuProps) {
    const { isMuted, toggleMute } = useSound();
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [moves, setMoves] = useState(0);
    const [errors, setErrors] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [startTime] = useState(Date.now());
    const [showPreview, setShowPreview] = useState(true);
    const [placedCount, setPlacedCount] = useState(0);
    const [gridLayout, setGridLayout] = useState({ x: 0, y: 0 });

    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const puzzleSize = Math.min(screenWidth * 0.6, screenHeight * 0.35, 280);
    const tileSize = puzzleSize / GRID_SIZE;

    // Dağınık parçalar için alan boyutları
    const piecesAreaWidth = Math.min(screenWidth - 40, 400);
    const pieceDisplaySize = tileSize * 0.9;

    const confettiAnims = useRef(
        Array.from({ length: 30 }, () => ({
            x: new Animated.Value(0),
            y: new Animated.Value(0),
            rotate: new Animated.Value(0),
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

        // Karıştırılmış sıra oluştur
        const shuffledIndices = [...Array(TOTAL_TILES).keys()];
        for (let i = shuffledIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledIndices[i], shuffledIndices[j]] = [shuffledIndices[j], shuffledIndices[i]];
        }

        // Parçaları 3x3 grid şeklinde alt alanda düzenli yerleştir
        const pieceSpacing = pieceDisplaySize + 15;
        const startX = (screenWidth - (GRID_SIZE * pieceSpacing - 15)) / 2;
        const startY = screenHeight * 0.58;

        shuffledIndices.forEach((originalIndex, shuffledPos) => {
            const row = Math.floor(originalIndex / GRID_SIZE);
            const col = originalIndex % GRID_SIZE;

            // Düzenli grid pozisyonu
            const displayRow = Math.floor(shuffledPos / GRID_SIZE);
            const displayCol = shuffledPos % GRID_SIZE;

            newTiles.push({
                id: originalIndex,
                row,
                col,
                isPlaced: false,
                startX: startX + displayCol * pieceSpacing,
                startY: startY + displayRow * pieceSpacing,
            });
        });

        setTiles(newTiles);
    };

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
                    useNativeDriver: true,
                }),
                Animated.timing(anim.rotate, {
                    toValue: 10,
                    duration: 2500,
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.delay(1500),
                    Animated.timing(anim.opacity, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();
        });
    };

    const handlePlacement = (placed: number) => {
        if (placed === TOTAL_TILES && !isComplete) {
            setIsComplete(true);
            triggerConfetti();
            const duration = Math.floor((Date.now() - startTime) / 1000);
            setTimeout(() => {
                onGameEnd('Yapboz Oyunu', duration, moves, errors);
            }, 2500);
        }
    };

    // Drag edilebilir parça komponenti
    const DraggableTile = ({ tile, onPlace }: { tile: Tile; onPlace: () => void }) => {
        const pan = useRef(new Animated.ValueXY({ x: tile.startX, y: tile.startY })).current;
        const scale = useRef(new Animated.Value(1)).current;
        const [placed, setPlaced] = useState(false);

        const panResponder = useRef(
            PanResponder.create({
                onStartShouldSetPanResponder: () => !placed,
                onMoveShouldSetPanResponder: () => !placed,
                onPanResponderGrant: () => {
                    Animated.spring(scale, {
                        toValue: 1.15,
                        useNativeDriver: true,
                    }).start();
                },
                onPanResponderMove: Animated.event(
                    [null, { moveX: pan.x, moveY: pan.y }],
                    { useNativeDriver: false }
                ),
                onPanResponderRelease: (_, gesture) => {
                    Animated.spring(scale, {
                        toValue: 1,
                        useNativeDriver: true,
                    }).start();

                    const dropX = gesture.moveX;
                    const dropY = gesture.moveY;

                    const gridTop = gridLayout.y;
                    const gridLeft = gridLayout.x;
                    const gridRight = gridLeft + puzzleSize;
                    const gridBottom = gridTop + puzzleSize;

                    if (dropX >= gridLeft && dropX <= gridRight && dropY >= gridTop && dropY <= gridBottom) {
                        const relX = dropX - gridLeft;
                        const relY = dropY - gridTop;
                        const dropCol = Math.floor(relX / tileSize);
                        const dropRow = Math.floor(relY / tileSize);

                        setMoves(m => m + 1);

                        if (dropRow === tile.row && dropCol === tile.col) {
                            const targetX = gridLeft + tile.col * tileSize + 2;
                            const targetY = gridTop + tile.row * tileSize + 2;

                            Animated.spring(pan, {
                                toValue: { x: targetX, y: targetY },
                                useNativeDriver: false,
                            }).start(() => {
                                setPlaced(true);
                                onPlace();
                            });
                        } else {
                            setErrors(e => e + 1);
                            Animated.spring(pan, {
                                toValue: { x: tile.startX, y: tile.startY },
                                friction: 5,
                                useNativeDriver: false,
                            }).start();
                        }
                    } else {
                        Animated.spring(pan, {
                            toValue: { x: tile.startX, y: tile.startY },
                            friction: 5,
                            useNativeDriver: false,
                        }).start();
                    }
                },
            })
        ).current;

        return (
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.draggableTile,
                    {
                        width: pieceDisplaySize,
                        height: pieceDisplaySize,
                        left: pan.x,
                        top: pan.y,
                        transform: [{ scale }],
                        zIndex: placed ? 1 : 50,
                        opacity: placed ? 0 : 1,
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
            </Animated.View>
        );
    };

    // Grid hücrelerini oluştur - 3x3 düzgün grid
    const renderGrid = () => {
        const rows = [];
        for (let row = 0; row < GRID_SIZE; row++) {
            const cells = [];
            for (let col = 0; col < GRID_SIZE; col++) {
                const isPlaced = tiles.find(t => t.row === row && t.col === col && t.isPlaced);
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
                    >
                        {isPlaced && (
                            <View style={[styles.placedTileInner, { width: tileSize - 4, height: tileSize - 4 }]}>
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
                        )}
                    </View>
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

    const handleTilePlaced = (tileId: number) => {
        setTiles(prev => prev.map(t => t.id === tileId ? { ...t, isPlaced: true } : t));
        setPlacedCount(prev => {
            const newCount = prev + 1;
            handlePlacement(newCount);
            return newCount;
        });
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
                        <Text style={styles.statText}>{placedCount}/{TOTAL_TILES}</Text>
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

                    {/* Hedef Grid - 3x3 düzgün */}
                    <View
                        style={[styles.puzzleGrid, { width: puzzleSize, height: puzzleSize }]}
                        onLayout={(e) => {
                            e.target.measure((fx, fy, width, height, px, py) => {
                                setGridLayout({ x: px, y: py });
                            });
                        }}
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

                    {/* Parçalar alt bölümde düzenli sıralanmış */}
                    <View style={styles.piecesArea}>
                        <Text style={styles.piecesLabel}>📦 Parçalar</Text>
                    </View>

                    {/* Dağınık parçalar */}
                    {tiles.filter(t => !t.isPlaced).map((tile) => (
                        <DraggableTile
                            key={tile.id}
                            tile={tile}
                            onPlace={() => handleTilePlaced(tile.id)}
                        />
                    ))}
                </View>
            )}

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
        overflow: 'hidden',
    },
    placedTileInner: {
        overflow: 'hidden',
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
    piecesArea: {
        marginTop: 15,
        paddingHorizontal: 20,
        alignSelf: 'flex-start',
    },
    piecesLabel: {
        color: '#aaa',
        fontSize: 14,
        fontWeight: 'bold',
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
