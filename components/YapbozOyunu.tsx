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

export default function YapbozOyunu({ onGameEnd, onExit }: YapbozOyunuProps) {
    const { isMuted, toggleMute } = useSound();
    const [lockedPieces, setLockedPieces] = useState<Set<number>>(new Set());
    const [moves, setMoves] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [showPreview, setShowPreview] = useState(true);
    const [startTime] = useState(Date.now());

    const { width: screenW, height: screenH } = Dimensions.get('window');
    const puzzleSize = Math.min(screenW * 0.6, screenH * 0.35, 280);
    const tileSize = puzzleSize / GRID_SIZE;
    const pieceSize = tileSize - 4;

    // Animation values for each piece
    const panRefs = useRef<Animated.ValueXY[]>(
        Array.from({ length: TOTAL_TILES }, () => new Animated.ValueXY({ x: 0, y: 0 }))
    ).current;

    // Grid position ref (center of screen)
    const gridLeft = (screenW - puzzleSize) / 2;
    const gridTop = 120; // Fixed position from top

    // Piece starting positions (below the grid)
    const pieceAreaTop = gridTop + puzzleSize + 40;
    const pieceSpacing = pieceSize + 15;
    const pieceAreaLeft = (screenW - 3 * pieceSpacing) / 2;

    useEffect(() => {
        const t = setTimeout(() => setShowPreview(false), 2500);
        return () => clearTimeout(t);
    }, []);

    // Initialize piece positions on mount
    useEffect(() => {
        if (!showPreview) {
            // Set initial positions for each piece based on shuffle order
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
    }, [showPreview]);

    const handleLock = (id: number) => {
        setLockedPieces(prev => {
            const next = new Set(prev).add(id);
            if (next.size === TOTAL_TILES) {
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

                // Target position for this piece in the grid
                const targetX = gridLeft + targetCol * tileSize + (tileSize - pieceSize) / 2;
                const targetY = gridTop + targetRow * tileSize + (tileSize - pieceSize) / 2;

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
                        handleLock(pieceId);
                    });
                }
            },
        });
    };

    const renderPieces = () => {
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
                            source={PUZZLE_IMAGE}
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

                    {/* Hint */}
                    <View style={[styles.hintContainer, { right: 20, top: gridTop }]}>
                        <Text style={styles.hintText}>Hedef:</Text>
                        <Image source={PUZZLE_IMAGE} style={styles.hintImage} />
                        <Text style={styles.movesText}>Hamle: {moves}</Text>
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
                                            style={[
                                                styles.cell,
                                                {
                                                    width: tileSize,
                                                    height: tileSize,
                                                },
                                            ]}
                                        >
                                            {!isLocked && <View style={styles.cellGuide} />}
                                        </View>
                                    );
                                })}
                            </View>
                        ))}
                    </View>

                    {/* Puzzle Pieces */}
                    {renderPieces()}
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
        zIndex: 200,
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
    hintImage: { width: 60, height: 60, borderRadius: 8, borderWidth: 2, borderColor: '#4ECDC4' },
    movesText: { color: '#4ECDC4', fontSize: 14, fontWeight: 'bold' },

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
