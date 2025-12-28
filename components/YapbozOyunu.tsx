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
    View
} from 'react-native';
import { useSound } from './SoundContext';

interface YapbozOyunuProps {
    onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number) => void;
    onExit: () => void;
}

interface PieceData {
    id: number;
    correctRow: number;
    correctCol: number;
}

const GRID_SIZE = 3;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;
const PUZZLE_IMAGE = require('@/assets/images/karpuz.png');

export default function YapbozOyunu({ onGameEnd, onExit }: YapbozOyunuProps) {
    const { isMuted, toggleMute } = useSound();
    const [pieces, setPieces] = useState<PieceData[]>([]);
    const [lockedIds, setLockedIds] = useState<Set<number>>(new Set());
    const [moves, setMoves] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [showPreview, setShowPreview] = useState(true);
    const [startTime] = useState(Date.now());
    const [gridRect, setGridRect] = useState({ x: 0, y: 0, width: 0, height: 0 });

    const gridRef = useRef<View>(null);

    const { width: screenW, height: screenH } = Dimensions.get('window');
    const puzzleSize = Math.min(screenW * 0.65, screenH * 0.38, 300);
    const tileSize = puzzleSize / GRID_SIZE;
    const pieceSize = tileSize - 6;

    // Başla
    useEffect(() => {
        const t = setTimeout(() => {
            setShowPreview(false);
            initPieces();
        }, 2500);
        return () => clearTimeout(t);
    }, []);

    const initPieces = () => {
        const arr: PieceData[] = [];
        for (let i = 0; i < TOTAL_TILES; i++) {
            arr.push({
                id: i,
                correctRow: Math.floor(i / GRID_SIZE),
                correctCol: i % GRID_SIZE,
            });
        }
        setPieces(arr);
    };

    // Karıştırılmış başlangıç pozisyonları
    const getInitPos = useCallback((id: number) => {
        const shuffled = [5, 2, 8, 0, 6, 3, 7, 1, 4]; // Sabit karışık sıra
        const idx = shuffled.indexOf(id);
        const row = Math.floor(idx / GRID_SIZE);
        const col = idx % GRID_SIZE;
        const spacing = pieceSize + 10;
        const startX = (screenW - GRID_SIZE * spacing) / 2 + col * spacing;
        const startY = screenH * 0.56 + row * spacing;
        return { x: startX, y: startY };
    }, [screenW, screenH, pieceSize]);

    // Grid ölç
    const measureGrid = useCallback(() => {
        if (Platform.OS === 'web') {
            // Web: manuel hesapla
            const x = (screenW - puzzleSize) / 2;
            const y = 130; // header + instruction yüksekliği
            setGridRect({ x, y, width: puzzleSize, height: puzzleSize });
        }
    }, [screenW, puzzleSize]);

    useEffect(() => {
        if (!showPreview) {
            setTimeout(measureGrid, 50);
        }
    }, [showPreview, measureGrid]);

    const handleLock = (id: number) => {
        setLockedIds(prev => {
            const next = new Set(prev).add(id);
            if (next.size === TOTAL_TILES) {
                setIsComplete(true);
                const dur = Math.floor((Date.now() - startTime) / 1000);
                setTimeout(() => onGameEnd('Yapboz Oyunu', dur, moves, 0), 1500);
            }
            return next;
        });
    };

    // Sürüklenebilir parça
    const Piece = ({ data }: { data: PieceData }) => {
        const init = getInitPos(data.id);
        const pos = useRef({ x: init.x, y: init.y });
        const anim = useRef(new Animated.ValueXY(init)).current;
        const [locked, setLocked] = useState(false);
        const [dragging, setDragging] = useState(false);

        const panResponder = useRef(
            PanResponder.create({
                onStartShouldSetPanResponder: () => !locked,
                onMoveShouldSetPanResponder: () => !locked,
                onPanResponderGrant: () => {
                    setDragging(true);
                    anim.setOffset({ x: pos.current.x, y: pos.current.y });
                    anim.setValue({ x: 0, y: 0 });
                },
                onPanResponderMove: (_, g) => {
                    anim.setValue({ x: g.dx, y: g.dy });
                },
                onPanResponderRelease: (_, g) => {
                    anim.flattenOffset();
                    setDragging(false);

                    const newX = pos.current.x + g.dx;
                    const newY = pos.current.y + g.dy;
                    pos.current = { x: newX, y: newY };

                    setMoves(m => m + 1);

                    // Drop kontrolü
                    const dropX = g.moveX;
                    const dropY = g.moveY;

                    const { x: gx, y: gy, width: gw, height: gh } = gridRect;

                    if (dropX >= gx && dropX <= gx + gw && dropY >= gy && dropY <= gy + gh) {
                        const col = Math.floor((dropX - gx) / tileSize);
                        const row = Math.floor((dropY - gy) / tileSize);

                        if (row === data.correctRow && col === data.correctCol) {
                            // Doğru!
                            const snapX = gx + data.correctCol * tileSize + (tileSize - pieceSize) / 2;
                            const snapY = gy + data.correctRow * tileSize + (tileSize - pieceSize) / 2;

                            Animated.spring(anim, {
                                toValue: { x: snapX, y: snapY },
                                useNativeDriver: false,
                            }).start();

                            pos.current = { x: snapX, y: snapY };
                            setLocked(true);
                            handleLock(data.id);
                        }
                    }
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
                        transform: anim.getTranslateTransform(),
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
                            left: -data.correctCol * tileSize,
                            top: -data.correctRow * tileSize,
                        }}
                        resizeMode="cover"
                    />
                </View>
            </Animated.View>
        );
    };

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

                    {/* Grid */}
                    <View
                        ref={gridRef}
                        style={[styles.grid, { width: puzzleSize, height: puzzleSize }]}
                    >
                        {Array.from({ length: TOTAL_TILES }).map((_, i) => (
                            <View
                                key={i}
                                style={[styles.cell, { width: tileSize, height: tileSize }]}
                            />
                        ))}
                    </View>

                    <View style={styles.hint}>
                        <Text style={{ color: '#aaa', fontSize: 11 }}>Hedef:</Text>
                        <Image source={PUZZLE_IMAGE} style={{ width: 36, height: 36, borderRadius: 4 }} />
                    </View>

                    <Text style={styles.bottomText}>⬆️ Parçaları yukarıdaki kutuya sürükle</Text>
                </View>
            )}

            {/* Parçalar */}
            {!showPreview && pieces.map(p => (
                <Piece key={p.id} data={p} />
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
        paddingTop: Platform.OS === 'ios' ? 48 : 18,
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
    gameArea: { alignItems: 'center', paddingTop: 12 },
    instruction: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 12 },
    grid: {
        backgroundColor: '#252540',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#4ECDC4',
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    cell: { borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)' },
    hint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: 'rgba(255,255,255,0.08)', padding: 6, borderRadius: 6 },
    bottomText: { color: '#666', fontSize: 12, marginTop: 14 },
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
