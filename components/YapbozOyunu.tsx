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
    correctIndex: number;
    currentIndex: number;
    row: number;
    col: number;
}

const GRID_SIZE = 3;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

// Mevcut assetlerden bir meyve görseli kullan
const PUZZLE_IMAGE = require('@/assets/images/karpuz.png');

export default function YapbozOyunu({ onGameEnd, onExit }: YapbozOyunuProps) {
    const [tiles, setTiles] = useState<Tile[]>([]);
    const [emptyIndex, setEmptyIndex] = useState<number>(TOTAL_TILES - 1);
    const [moves, setMoves] = useState(0);
    const [errors, setErrors] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [startTime] = useState(Date.now());
    const [showPreview, setShowPreview] = useState(true);
    const [imageSize, setImageSize] = useState({ width: 300, height: 300 });

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
    const puzzleSize = Math.min(screenWidth * 0.85, screenHeight * 0.55, 400);
    const tileSize = puzzleSize / GRID_SIZE;

    // Tile'ları karıştır (çözülebilir olmasını garanti et)
    const shuffleTiles = useCallback(() => {
        const initialTiles: Tile[] = [];
        for (let i = 0; i < TOTAL_TILES; i++) {
            initialTiles.push({
                id: i,
                correctIndex: i,
                currentIndex: i,
                row: Math.floor(i / GRID_SIZE),
                col: i % GRID_SIZE,
            });
        }

        // Fisher-Yates shuffle with solvability check
        let shuffled = [...initialTiles];
        let attempts = 0;

        do {
            shuffled = [...initialTiles];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                // Swap currentIndex
                const tempIndex = shuffled[i].currentIndex;
                shuffled[i] = { ...shuffled[i], currentIndex: shuffled[j].currentIndex };
                shuffled[j] = { ...shuffled[j], currentIndex: tempIndex };
            }
            attempts++;
        } while (!isSolvable(shuffled) && attempts < 100);

        // Sort by currentIndex for rendering
        shuffled.sort((a, b) => a.currentIndex - b.currentIndex);

        setTiles(shuffled);
        setEmptyIndex(shuffled.findIndex(t => t.id === TOTAL_TILES - 1));
    }, []);

    // Çözülebilirlik kontrolü
    const isSolvable = (tiles: Tile[]): boolean => {
        let inversions = 0;
        const arr = tiles.map(t => t.id).filter(id => id !== TOTAL_TILES - 1);

        for (let i = 0; i < arr.length; i++) {
            for (let j = i + 1; j < arr.length; j++) {
                if (arr[i] > arr[j]) inversions++;
            }
        }

        // 3x3 için çift sayıda inversiyon gerekli
        return inversions % 2 === 0;
    };

    // Tamamlanma kontrolü
    const checkComplete = useCallback((currentTiles: Tile[]) => {
        const sorted = [...currentTiles].sort((a, b) => a.currentIndex - b.currentIndex);
        const complete = sorted.every((tile, index) => tile.id === index);

        if (complete && !isComplete) {
            setIsComplete(true);
            triggerConfetti();
            const duration = Math.floor((Date.now() - startTime) / 1000);
            setTimeout(() => {
                onGameEnd('Yapboz Oyunu', duration, moves, errors);
            }, 2000);
        }
    }, [isComplete, moves, errors, startTime, onGameEnd]);

    // Tile'a tıklama
    const handleTilePress = useCallback((tileIndex: number) => {
        if (isComplete) return;

        const emptyRow = Math.floor(emptyIndex / GRID_SIZE);
        const emptyCol = emptyIndex % GRID_SIZE;
        const tileRow = Math.floor(tileIndex / GRID_SIZE);
        const tileCol = tileIndex % GRID_SIZE;

        // Sadece bitişik tile'lar hareket edebilir
        const isAdjacent =
            (Math.abs(emptyRow - tileRow) === 1 && emptyCol === tileCol) ||
            (Math.abs(emptyCol - tileCol) === 1 && emptyRow === tileRow);

        if (!isAdjacent) {
            setErrors(e => e + 1);
            return;
        }

        setMoves(m => m + 1);

        // Swap tiles
        const newTiles = [...tiles];
        const clickedTileArrayIndex = newTiles.findIndex(t => t.currentIndex === tileIndex);
        const emptyTileArrayIndex = newTiles.findIndex(t => t.currentIndex === emptyIndex);

        if (clickedTileArrayIndex !== -1 && emptyTileArrayIndex !== -1) {
            newTiles[clickedTileArrayIndex] = {
                ...newTiles[clickedTileArrayIndex],
                currentIndex: emptyIndex,
            };
            newTiles[emptyTileArrayIndex] = {
                ...newTiles[emptyTileArrayIndex],
                currentIndex: tileIndex,
            };

            setTiles(newTiles);
            setEmptyIndex(tileIndex);
            checkComplete(newTiles);
        }
    }, [tiles, emptyIndex, isComplete, checkComplete]);

    // Confetti animasyonu
    const triggerConfetti = () => {
        confettiAnims.forEach((anim, i) => {
            const startX = Math.random() * puzzleSize;
            anim.x.setValue(startX);
            anim.y.setValue(-20);
            anim.rotate.setValue(0);
            anim.opacity.setValue(1);

            Animated.parallel([
                Animated.timing(anim.y, {
                    toValue: puzzleSize + 100,
                    duration: 2000 + Math.random() * 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(anim.x, {
                    toValue: startX + (Math.random() - 0.5) * 100,
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
            shuffleTiles();
        }, 3000);

        return () => clearTimeout(timer);
    }, [shuffleTiles]);

    // Tile render
    const renderTile = (tile: Tile) => {
        const isEmptyTile = tile.id === TOTAL_TILES - 1;
        if (isEmptyTile) return null;

        const tileIndex = tile.currentIndex;
        const displayRow = Math.floor(tileIndex / GRID_SIZE);
        const displayCol = tileIndex % GRID_SIZE;

        // Orijinal konumdan görsel kesimi
        const originalRow = tile.row;
        const originalCol = tile.col;

        return (
            <TouchableOpacity
                key={tile.id}
                style={[
                    styles.tile,
                    {
                        width: tileSize - 2,
                        height: tileSize - 2,
                        left: displayCol * tileSize + 1,
                        top: displayRow * tileSize + 1,
                    },
                ]}
                onPress={() => handleTilePress(tileIndex)}
                activeOpacity={0.8}
            >
                <View style={[styles.tileInner, { width: tileSize - 4, height: tileSize - 4 }]}>
                    <Image
                        source={PUZZLE_IMAGE}
                        style={{
                            width: puzzleSize,
                            height: puzzleSize,
                            position: 'absolute',
                            left: -originalCol * tileSize,
                            top: -originalRow * tileSize,
                        }}
                        resizeMode="cover"
                    />
                </View>
                {/* Tile numarası (debug için) */}
                {/* <Text style={styles.tileNumber}>{tile.id + 1}</Text> */}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.exitButton} onPress={onExit}>
                    <Ionicons name="arrow-back" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>🧩 Yapboz Oyunu</Text>
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Ionicons name="hand-left" size={20} color="#FFD54F" />
                        <Text style={styles.statText}>{moves}</Text>
                    </View>
                </View>
            </View>

            {/* Önizleme veya Oyun Alanı */}
            <View style={styles.gameArea}>
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
                    <View style={styles.puzzleWrapper}>
                        <Text style={styles.instruction}>
                            {isComplete ? '🎉 Tebrikler!' : 'Parçaları yerine koy!'}
                        </Text>
                        <View style={[styles.puzzleContainer, { width: puzzleSize, height: puzzleSize }]}>
                            {tiles.map(renderTile)}

                            {/* Boş kutunun yeri */}
                            <View
                                style={[
                                    styles.emptyTile,
                                    {
                                        width: tileSize - 2,
                                        height: tileSize - 2,
                                        left: (emptyIndex % GRID_SIZE) * tileSize + 1,
                                        top: Math.floor(emptyIndex / GRID_SIZE) * tileSize + 1,
                                    },
                                ]}
                            />
                        </View>

                        {/* Mini önizleme */}
                        <View style={styles.miniPreview}>
                            <Text style={styles.miniPreviewLabel}>Hedef:</Text>
                            <Image
                                source={PUZZLE_IMAGE}
                                style={styles.miniPreviewImage}
                                resizeMode="cover"
                            />
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
        gap: 15,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
    },
    statText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    gameArea: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    previewContainer: {
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
    puzzleWrapper: {
        alignItems: 'center',
        gap: 20,
    },
    instruction: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 10,
    },
    puzzleContainer: {
        backgroundColor: '#2d2d44',
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 3,
        borderColor: '#4ECDC4',
    },
    tile: {
        position: 'absolute',
        borderRadius: 6,
        overflow: 'hidden',
        backgroundColor: '#fff',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    tileInner: {
        overflow: 'hidden',
        borderRadius: 4,
    },
    tileNumber: {
        position: 'absolute',
        top: 5,
        left: 5,
        backgroundColor: 'rgba(0,0,0,0.5)',
        color: '#fff',
        fontSize: 12,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        overflow: 'hidden',
    },
    emptyTile: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 6,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        borderStyle: 'dashed',
    },
    miniPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 10,
        borderRadius: 12,
        gap: 10,
    },
    miniPreviewLabel: {
        color: '#aaa',
        fontSize: 14,
    },
    miniPreviewImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    confetti: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 3,
    },
});
