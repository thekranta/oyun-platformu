import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

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
}

interface Position {
    x: number;
    y: number;
}

const GRID_SIZE = 3;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

// Mevcut assetlerden bir meyve görseli kullan
const PUZZLE_IMAGE = require('@/assets/images/karpuz.png');

export default function YapbozOyunu({ onGameEnd, onExit }: YapbozOyunuProps) {
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [placedTiles, setPlacedTiles] = useState<Set<number>>(new Set());
    const [moves, setMoves] = useState(0);
    const [errors, setErrors] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [startTime] = useState(Date.now());
    const [showPreview, setShowPreview] = useState(true);
    const [selectedTile, setSelectedTile] = useState<number | null>(null);

    // Her tile için pozisyon animasyonu
    const tilePositions = useRef<{ [key: number]: Animated.ValueXY }>({}).current;
    const [scatteredPositions, setScatteredPositions] = useState<{ [key: number]: Position }>({});

    const confettiAnims = useRef(
        Array.from({ length: 30 }, () => ({
            x: new Animated.Value(0),
            y: new Animated.Value(0),
            rotate: new Animated.Value(0),
            opacity: new Animated.Value(1),
        }))
    ).current;

    // Ekran boyutuna göre puzzle boyutunu hesapla
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const puzzleSize = Math.min(screenWidth * 0.6, screenHeight * 0.4, 300);
    const tileSize = puzzleSize / GRID_SIZE;

    // Dağınık parçalar için alan
    const scatterAreaWidth = screenWidth - 40;
    const scatterAreaHeight = screenHeight * 0.35;

    // Parçaları dağıt
    const scatterTiles = useCallback(() => {
        const newTiles: Tile[] = [];
        const newPositions: { [key: number]: Position } = {};

        for (let i = 0; i < TOTAL_TILES; i++) {
            const row = Math.floor(i / GRID_SIZE);
            const col = i % GRID_SIZE;

            newTiles.push({
                id: i,
                row,
                col,
                isPlaced: false,
            });

            // Rastgele pozisyon (alt alanda)
            const maxX = scatterAreaWidth - tileSize - 20;
            const maxY = scatterAreaHeight - tileSize - 20;
            const randomX = Math.random() * maxX + 10;
            const randomY = Math.random() * maxY + 10;

            newPositions[i] = { x: randomX, y: randomY };

            if (!tilePositions[i]) {
                tilePositions[i] = new Animated.ValueXY({ x: randomX, y: randomY });
            } else {
                tilePositions[i].setValue({ x: randomX, y: randomY });
            }
        }

        setTiles(newTiles);
        setScatteredPositions(newPositions);
    }, [scatterAreaWidth, scatterAreaHeight, tileSize]);

    // Tile'ı doğru yere yerleştir
    const placeTile = useCallback((tileId: number, targetRow: number, targetCol: number) => {
        const tile = tiles.find(t => t.id === tileId);
        if (!tile || tile.isPlaced) return;

        setMoves(m => m + 1);

        // Doğru yere mi yerleştirildi?
        if (tile.row === targetRow && tile.col === targetCol) {
            // Doğru yer - parçayı yerleştir
            setPlacedTiles(prev => new Set([...prev, tileId]));
            setTiles(prev => prev.map(t =>
                t.id === tileId ? { ...t, isPlaced: true } : t
            ));
            setSelectedTile(null);

            // Tamamlandı mı kontrol et
            if (placedTiles.size + 1 === TOTAL_TILES) {
                setIsComplete(true);
                triggerConfetti();
                const duration = Math.floor((Date.now() - startTime) / 1000);
                setTimeout(() => {
                    onGameEnd('Yapboz Oyunu', duration, moves + 1, errors);
                }, 2000);
            }
        } else {
            // Yanlış yer
            setErrors(e => e + 1);
        }
    }, [tiles, placedTiles, moves, errors, startTime, onGameEnd]);

    // Tile seçimi
    const handleTileSelect = (tileId: number) => {
        const tile = tiles.find(t => t.id === tileId);
        if (tile?.isPlaced) return;

        setSelectedTile(selectedTile === tileId ? null : tileId);
    };

    // Hedef hücreye tıklama
    const handleCellPress = (row: number, col: number) => {
        if (selectedTile === null) return;

        // Zaten dolu mu?
        const existingTile = tiles.find(t => t.isPlaced && t.row === row && t.col === col);
        if (existingTile) return;

        placeTile(selectedTile, row, col);
    };

    // Confetti animasyonu
    const triggerConfetti = () => {
        confettiAnims.forEach((anim, i) => {
            const startX = Math.random() * puzzleSize + (screenWidth - puzzleSize) / 2;
            anim.x.setValue(startX);
            anim.y.setValue(100);
            anim.rotate.setValue(0);
            anim.opacity.setValue(1);

            Animated.parallel([
                Animated.timing(anim.y, {
                    toValue: screenHeight,
                    duration: 2000 + Math.random() * 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.x, {
                    toValue: startX + (Math.random() - 0.5) * 150,
                    duration: 2000 + Math.random() * 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.rotate, {
                    toValue: Math.random() * 10,
                    duration: 2000,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.opacity, {
                    toValue: 0,
                    duration: 2500,
                    useNativeDriver: true,
                }),
            ]).start();
        });
    };

    // Oyunu başlat
    useEffect(() => {
        // 3 saniye önizleme göster
        const timer = setTimeout(() => {
            setShowPreview(false);
            scatterTiles();
        }, 3000);

        return () => clearTimeout(timer);
    }, [scatterTiles]);

    // Dağınık parça render
    const renderScatteredTile = (tile: Tile) => {
        if (tile.isPlaced) return null;

        const position = scatteredPositions[tile.id];
        if (!position) return null;

        const isSelected = selectedTile === tile.id;

        return (
            <TouchableOpacity
                key={tile.id}
                style={[
                    styles.scatteredTile,
                    {
                        width: tileSize,
                        height: tileSize,
                        left: position.x,
                        top: position.y,
                        borderWidth: isSelected ? 3 : 1,
                        borderColor: isSelected ? '#FFD700' : '#fff',
                        transform: [{ scale: isSelected ? 1.1 : 1 }],
                        zIndex: isSelected ? 100 : 1,
                    },
                ]}
                onPress={() => handleTileSelect(tile.id)}
                activeOpacity={0.8}
            >
                <View style={[styles.tileInner, { width: tileSize - 6, height: tileSize - 6 }]}>
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
            </TouchableOpacity>
        );
    };

    // Puzzle grid hücresi render
    const renderGridCell = (row: number, col: number) => {
        const placedTile = tiles.find(t => t.isPlaced && t.row === row && t.col === col);
        const index = row * GRID_SIZE + col;

        return (
            <TouchableOpacity
                key={index}
                style={[
                    styles.gridCell,
                    {
                        width: tileSize,
                        height: tileSize,
                        backgroundColor: placedTile ? 'transparent' : 'rgba(255,255,255,0.1)',
                    },
                ]}
                onPress={() => handleCellPress(row, col)}
                activeOpacity={0.7}
            >
                {placedTile ? (
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
                ) : (
                    <View style={styles.emptyCell}>
                        <Text style={styles.cellNumber}>{index + 1}</Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    // Grid oluştur
    const renderGrid = () => {
        const rows = [];
        for (let row = 0; row < GRID_SIZE; row++) {
            const cells = [];
            for (let col = 0; col < GRID_SIZE; col++) {
                cells.push(renderGridCell(row, col));
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
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                        <Text style={styles.statText}>{placedTiles.size}/{TOTAL_TILES}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Ionicons name="hand-left" size={20} color="#FFD54F" />
                        <Text style={styles.statText}>{moves}</Text>
                    </View>
                </View>
            </View>

            {showPreview ? (
                <View style={styles.previewContainer}>
                    <Text style={styles.previewText}>Resmi iyi hatırla! 👀</Text>
                    <View style={[styles.puzzleContainer, { width: puzzleSize, height: puzzleSize }]}>
                        <Image
                            source={PUZZLE_IMAGE}
                            style={{ width: puzzleSize, height: puzzleSize, borderRadius: 12 }}
                            resizeMode="cover"
                        />
                    </View>
                    <Text style={styles.countdownText}>Oyun yakında başlıyor...</Text>
                </View>
            ) : (
                <View style={styles.gameArea}>
                    {/* Üstte hedef puzzle alanı */}
                    <View style={styles.targetArea}>
                        <Text style={styles.instruction}>
                            {isComplete ? '🎉 Tebrikler! Yapbozu tamamladın!' : 'Parçayı seç, sonra yerine koy!'}
                        </Text>
                        <View style={[styles.puzzleGrid, { width: puzzleSize + 10, height: puzzleSize + 10 }]}>
                            {renderGrid()}
                        </View>
                    </View>

                    {/* Altta dağınık parçalar */}
                    <View style={[styles.scatterArea, { height: scatterAreaHeight }]}>
                        <Text style={styles.scatterLabel}>📦 Parçalar</Text>
                        {tiles.map(renderScatteredTile)}
                    </View>
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
                                backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'][i % 5],
                                transform: [
                                    { translateX: anim.x },
                                    { translateY: anim.y },
                                    {
                                        rotate: anim.rotate.interpolate({
                                            inputRange: [0, 10],
                                            outputRange: ['0deg', '360deg'],
                                        }),
                                    },
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
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 30,
        paddingBottom: 15,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    exitButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        padding: 10,
        borderRadius: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        gap: 5,
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
        gap: 20,
    },
    previewText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFD54F',
        textAlign: 'center',
    },
    countdownText: {
        fontSize: 18,
        color: '#aaa',
        marginTop: 10,
    },
    puzzleContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: '#4ECDC4',
    },
    gameArea: {
        flex: 1,
        padding: 20,
    },
    targetArea: {
        alignItems: 'center',
        marginBottom: 20,
    },
    instruction: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 15,
    },
    puzzleGrid: {
        backgroundColor: '#2d2d44',
        borderRadius: 12,
        padding: 5,
        borderWidth: 3,
        borderColor: '#4ECDC4',
    },
    gridRow: {
        flexDirection: 'row',
    },
    gridCell: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        borderRadius: 4,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyCell: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cellNumber: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 20,
        fontWeight: 'bold',
    },
    placedTileInner: {
        overflow: 'hidden',
        borderRadius: 3,
    },
    scatterArea: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 15,
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        borderStyle: 'dashed',
    },
    scatterLabel: {
        position: 'absolute',
        top: 10,
        left: 15,
        color: '#aaa',
        fontSize: 14,
        fontWeight: 'bold',
        zIndex: 0,
    },
    scatteredTile: {
        position: 'absolute',
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#fff',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    tileInner: {
        overflow: 'hidden',
        borderRadius: 5,
    },
    confetti: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 3,
    },
});
