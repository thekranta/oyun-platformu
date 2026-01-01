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
    onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number, algilananKelime?: string, extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string }) => void;
    onExit: () => void;
}

const GRID_SIZE = 3;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;
const PUZZLE_IMAGE = require('@/assets/images/karpuz.png');

// Karıştırma sırası (her parçanın başlangıç pozisyonu)
const SHUFFLE_ORDER = [4, 7, 2, 8, 5, 0, 1, 6, 3];

interface PieceData {
    id: number;
    row: number; // Hedef satır
    col: number; // Hedef sütun
    isLocked: boolean;
}

export default function YapbozOyunu({ onGameEnd, onExit }: YapbozOyunuProps) {
    const { isMuted, toggleMute } = useSound();
    const [pieces, setPieces] = useState<PieceData[]>(() =>
        Array.from({ length: TOTAL_TILES }, (_, i) => ({
            id: i,
            row: Math.floor(i / GRID_SIZE),
            col: i % GRID_SIZE,
            isLocked: false,
        }))
    );
    const [moves, setMoves] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [showPreview, setShowPreview] = useState(true);
    const [startTime] = useState(Date.now());
    const [gameAreaLayout, setGameAreaLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

    const { width: screenW, height: screenH } = Dimensions.get('window');
    const puzzleSize = Math.min(screenW * 0.75, screenH * 0.4, 300);
    const tileSize = puzzleSize / GRID_SIZE;
    const pieceSize = tileSize - 4;

    // Animation values for each piece
    const panRefs = useRef<Animated.ValueXY[]>(
        Array.from({ length: TOTAL_TILES }, () => new Animated.ValueXY({ x: 0, y: 0 }))
    ).current;

    // Initialize piece positions
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => setShowPreview(false), 2500);
        return () => clearTimeout(t);
    }, []);

    // Set initial positions when game area layout is known
    useEffect(() => {
        if (gameAreaLayout && !initialized && !showPreview) {
            const gridTop = 60; // instruction text height + margin
            const gridLeft = (gameAreaLayout.width - puzzleSize) / 2;

            // Start pieces below the grid and hint area
            const startY = gridTop + puzzleSize + 100;
            const spacing = pieceSize + 12;
            const startX = (gameAreaLayout.width - 3 * spacing) / 2;

            pieces.forEach((piece, i) => {
                const shuffleIdx = SHUFFLE_ORDER.indexOf(piece.id);
                const pRow = Math.floor(shuffleIdx / 3);
                const pCol = shuffleIdx % 3;
                panRefs[piece.id].setValue({
                    x: startX + pCol * spacing,
                    y: startY + pRow * spacing,
                });
            });
            setInitialized(true);
        }
    }, [gameAreaLayout, initialized, showPreview, puzzleSize, pieceSize]);

    const handleLock = (id: number) => {
        setPieces(prev => {
            const next = prev.map(p => (p.id === id ? { ...p, isLocked: true } : p));
            const lockedCount = next.filter(p => p.isLocked).length;
            if (lockedCount === TOTAL_TILES) {
                setIsComplete(true);
                setTimeout(() => {
                    const dur = Math.floor((Date.now() - startTime) / 1000);
                    onGameEnd('Yapboz Oyunu', dur, moves, 0, undefined, {
                        zorlukSeviyesi: 1,
                        kazanimOdagi: 'Uzamsal Algı ve Problem Çözme',
                    });
                }, 1500);
            }
            return next;
        });
    };

    const createPanResponder = (piece: PieceData) => {
        const pan = panRefs[piece.id];

        return PanResponder.create({
            onStartShouldSetPanResponder: () => !piece.isLocked && !isComplete,
            onMoveShouldSetPanResponder: () => !piece.isLocked && !isComplete,
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

                if (gameAreaLayout) {
                    const gridTop = 60;
                    const gridLeft = (gameAreaLayout.width - puzzleSize) / 2;

                    // Target position for this piece
                    const targetX = gridLeft + piece.col * tileSize + (tileSize - pieceSize) / 2;
                    const targetY = gridTop + piece.row * tileSize + (tileSize - pieceSize) / 2;

                    // Center of current piece
                    const centerX = currentX + pieceSize / 2;
                    const centerY = currentY + pieceSize / 2;

                    // Center of target cell
                    const targetCenterX = targetX + pieceSize / 2;
                    const targetCenterY = targetY + pieceSize / 2;

                    const dist = Math.sqrt(
                        Math.pow(centerX - targetCenterX, 2) + Math.pow(centerY - targetCenterY, 2)
                    );

                    // Snap if close enough
                    if (dist < 50) {
                        Animated.spring(pan, {
                            toValue: { x: targetX, y: targetY },
                            useNativeDriver: false,
                            speed: 20,
                            bounciness: 0,
                        }).start(() => {
                            handleLock(piece.id);
                        });
                    }
                }
            },
        });
    };

    // Create pan responders for all pieces
    const panResponders = useRef<{ [key: number]: ReturnType<typeof PanResponder.create> }>({}).current;

    pieces.forEach(piece => {
        if (!panResponders[piece.id]) {
            panResponders[piece.id] = createPanResponder(piece);
        }
    });

    const renderGrid = () => {
        const gridTop = 60;
        const gridLeft = gameAreaLayout ? (gameAreaLayout.width - puzzleSize) / 2 : 0;

        return (
            <View
                style={[
                    styles.grid,
                    {
                        width: puzzleSize,
                        height: puzzleSize,
                        position: 'absolute',
                        top: gridTop,
                        left: gridLeft,
                    },
                ]}
            >
                {Array.from({ length: TOTAL_TILES }).map((_, i) => {
                    const isLocked = pieces.find(p => p.id === i)?.isLocked;
                    return (
                        <View key={i} style={[styles.cell, { width: tileSize, height: tileSize }]}>
                            {!isLocked && <View style={styles.cellGuide} />}
                        </View>
                    );
                })}
            </View>
        );
    };

    const renderPieces = () => {
        return pieces.map(piece => {
            const pan = panRefs[piece.id];
            const responder = panResponders[piece.id];

            return (
                <Animated.View
                    key={piece.id}
                    {...(piece.isLocked ? {} : responder?.panHandlers)}
                    style={[
                        styles.piece,
                        {
                            width: pieceSize,
                            height: pieceSize,
                            transform: pan.getTranslateTransform(),
                            zIndex: piece.isLocked ? 1 : 100,
                            borderColor: piece.isLocked ? '#4CAF50' : '#fff',
                            borderWidth: 2,
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
                                left: -piece.col * tileSize,
                                top: -piece.row * tileSize,
                            }}
                            resizeMode="cover"
                        />
                    </View>
                </Animated.View>
            );
        });
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
                <View
                    style={styles.gameArea}
                    onLayout={(e) => {
                        const { x, y, width, height } = e.nativeEvent.layout;
                        setGameAreaLayout({ x, y, width, height });
                    }}
                >
                    <Text style={styles.instruction}>
                        {isComplete ? '🎉 Mükemmel!' : 'Parçaları sürükle ve birleştir!'}
                    </Text>

                    {/* Hint */}
                    <View style={styles.hintContainer}>
                        <Text style={styles.hintText}>Hedef:</Text>
                        <Image source={PUZZLE_IMAGE} style={styles.hintImage} />
                        <Text style={styles.movesText}>Hamle: {moves}</Text>
                    </View>

                    {/* Grid */}
                    {renderGrid()}

                    {/* Pieces */}
                    {initialized && renderPieces()}
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
    },

    hintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        zIndex: 200,
        position: 'absolute',
        top: 30,
        right: 20,
    },
    hintText: { color: '#aaa', fontSize: 12 },
    hintImage: { width: 40, height: 40, borderRadius: 4, opacity: 0.8 },
    movesText: { color: '#4ECDC4', fontSize: 12, fontWeight: 'bold' },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderWidth: 3,
        borderColor: '#4ECDC4',
        borderRadius: 8,
        backgroundColor: 'rgba(78, 205, 196, 0.1)',
        zIndex: 1,
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
        backgroundColor: 'rgba(255,255,255,0.15)',
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
