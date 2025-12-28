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

    const { width: screenW, height: screenH } = Dimensions.get('window');
    const puzzleSize = Math.min(screenW * 0.65, screenH * 0.38, 300);
    const tileSize = puzzleSize / GRID_SIZE;
    const pieceSize = tileSize - 8;

    // Grid pozisyonu - ekranın ortasında, header + instruction altında
    const gridX = (screenW - puzzleSize) / 2;
    const gridY = Platform.OS === 'web' ? 120 : 140;

    // Parça başlangıç pozisyonları (karıştırılmış)
    const getStartPos = useCallback((id: number) => {
        const shuffle = [4, 7, 2, 8, 0, 5, 1, 6, 3];
        const idx = shuffle.indexOf(id);
        const row = Math.floor(idx / GRID_SIZE);
        const col = idx % GRID_SIZE;
        const spacing = pieceSize + 12;
        const areaX = (screenW - GRID_SIZE * spacing) / 2;
        const areaY = gridY + puzzleSize + 80;
        return { x: areaX + col * spacing, y: areaY + row * spacing };
    }, [screenW, pieceSize, gridY, puzzleSize]);

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

    // Sürüklenebilir parça
    const DraggablePiece = ({ id, row, col }: { id: number; row: number; col: number }) => {
        const start = getStartPos(id);
        const pan = useRef(new Animated.ValueXY(start)).current;
        const [locked, setLocked] = useState(false);
        const [dragging, setDragging] = useState(false);
        const lastPos = useRef(start);

        const panResponder = useRef(
            PanResponder.create({
                onStartShouldSetPanResponder: () => !locked,
                onMoveShouldSetPanResponder: () => !locked,
                onPanResponderGrant: () => {
                    setDragging(true);
                    pan.setOffset({ x: lastPos.current.x, y: lastPos.current.y });
                    pan.setValue({ x: 0, y: 0 });
                },
                onPanResponderMove: (_, g) => {
                    pan.setValue({ x: g.dx, y: g.dy });
                },
                onPanResponderRelease: (_, g) => {
                    pan.flattenOffset();
                    setDragging(false);

                    const finalX = lastPos.current.x + g.dx;
                    const finalY = lastPos.current.y + g.dy;

                    // Parçanın merkezi
                    const centerX = finalX + pieceSize / 2;
                    const centerY = finalY + pieceSize / 2;

                    setMoves(m => m + 1);

                    // Grid içinde mi? (toleranslı)
                    const tolerance = 30;
                    const inGrid =
                        centerX >= gridX - tolerance &&
                        centerX <= gridX + puzzleSize + tolerance &&
                        centerY >= gridY - tolerance &&
                        centerY <= gridY + puzzleSize + tolerance;

                    if (inGrid) {
                        // En yakın hücreyi bul
                        const cellCol = Math.round((centerX - gridX - tileSize / 2) / tileSize);
                        const cellRow = Math.round((centerY - gridY - tileSize / 2) / tileSize);

                        // Sınırları kontrol et
                        const validCol = Math.max(0, Math.min(GRID_SIZE - 1, cellCol));
                        const validRow = Math.max(0, Math.min(GRID_SIZE - 1, cellRow));

                        // Doğru hücre mi?
                        if (validRow === row && validCol === col) {
                            // DOĞRU! Kilitle
                            const snapX = gridX + col * tileSize + (tileSize - pieceSize) / 2;
                            const snapY = gridY + row * tileSize + (tileSize - pieceSize) / 2;

                            Animated.spring(pan, {
                                toValue: { x: snapX, y: snapY },
                                useNativeDriver: false,
                                friction: 8,
                            }).start();

                            lastPos.current = { x: snapX, y: snapY };
                            setLocked(true);
                            handleLock(id);
                            return;
                        }
                    }

                    // Yanlış veya grid dışı - parça olduğu yerde kalır
                    lastPos.current = { x: finalX, y: finalY };
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
                        zIndex: dragging ? 999 : locked ? 5 : 10,
                        borderColor: locked ? '#4CAF50' : '#4ECDC4',
                        borderWidth: locked ? 3 : 2,
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
                            left: -col * tileSize,
                            top: -row * tileSize,
                        }}
                        resizeMode="cover"
                    />
                </View>
            </Animated.View>
        );
    };

    // Parça listesi
    const pieces = [];
    for (let i = 0; i < TOTAL_TILES; i++) {
        pieces.push({
            id: i,
            row: Math.floor(i / GRID_SIZE),
            col: i % GRID_SIZE,
        });
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.btn} onPress={onExit}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>🧩 Yapboz</Text>
                <View style={styles.right}>
                    <TouchableOpacity style={styles.btn} onPress={toggleMute}>
                        <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={22} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{lockedIds.size}/{TOTAL_TILES}</Text>
                    </View>
                </View>
            </View>

            {showPreview ? (
                <View style={styles.center}>
                    <Text style={styles.previewTitle}>Resmi hatırla! 👀</Text>
                    <Image
                        source={PUZZLE_IMAGE}
                        style={{ width: puzzleSize, height: puzzleSize, borderRadius: 10, borderWidth: 3, borderColor: '#4ECDC4' }}
                    />
                    <Text style={styles.sub}>Başlıyor...</Text>
                </View>
            ) : (
                <View style={styles.gameArea}>
                    <Text style={styles.instruction}>
                        {isComplete ? '🎉 Tebrikler!' : 'Parçaları sürükle, yerine bırak!'}
                    </Text>

                    {/* Grid - sabit pozisyonda */}
                    <View style={[styles.grid, { width: puzzleSize, height: puzzleSize, left: gridX, top: gridY }]}>
                        {Array.from({ length: TOTAL_TILES }).map((_, i) => (
                            <View key={i} style={[styles.cell, { width: tileSize, height: tileSize }]} />
                        ))}
                    </View>

                    {/* Hedef */}
                    <View style={[styles.hint, { top: gridY + puzzleSize + 15 }]}>
                        <Text style={{ color: '#aaa', fontSize: 11 }}>Hedef:</Text>
                        <Image source={PUZZLE_IMAGE} style={{ width: 36, height: 36, borderRadius: 4 }} />
                    </View>
                </View>
            )}

            {/* Parçalar */}
            {!showPreview && pieces.map(p => (
                <DraggablePiece key={p.id} id={p.id} row={p.row} col={p.col} />
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
        paddingHorizontal: 12,
        paddingTop: Platform.OS === 'ios' ? 48 : 15,
        paddingBottom: 8,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 100,
    },
    btn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    badge: { backgroundColor: 'rgba(76,175,80,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeText: { color: '#4CAF50', fontWeight: 'bold', fontSize: 13 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    previewTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFD54F', marginBottom: 16 },
    sub: { color: '#888', marginTop: 16, fontSize: 14 },
    gameArea: { flex: 1 },
    instruction: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 10,
    },
    grid: {
        position: 'absolute',
        backgroundColor: '#252540',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#4ECDC4',
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    cell: { borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.25)' },
    hint: {
        position: 'absolute',
        left: '50%',
        transform: [{ translateX: -50 }],
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255,255,255,0.08)',
        padding: 6,
        borderRadius: 6,
    },
    piece: {
        position: 'absolute',
        borderRadius: 5,
        backgroundColor: '#fff',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
    },
    pieceInner: { overflow: 'hidden', borderRadius: 3 },
});
