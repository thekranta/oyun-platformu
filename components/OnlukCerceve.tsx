import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    ImageBackground,
    LayoutRectangle,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { useSound } from './SoundContext';

interface OnlukCerceveProps {
    onGameEnd: (oyunAdi: string, sure: number, hamle: number, hata: number, algilananKelime?: string, extraData?: any) => void;
    onExit: () => void;
}

const { width, height } = Dimensions.get('window');
const CELL_SIZE = width / 7;
const FRUIT_SIZE = CELL_SIZE * 0.8;

export default function OnlukCerceve({ onGameEnd, onExit }: OnlukCerceveProps) {
    const { isMuted, toggleMute, playSound } = useSound();
    const [round, setRound] = useState(1);
    const [targetNumber, setTargetNumber] = useState(0);
    const [placedFruits, setPlacedFruits] = useState<boolean[]>(Array(10).fill(false));
    const [mistakes, setMistakes] = useState(0);
    const [startTime, setStartTime] = useState(Date.now());
    const [roundData, setRoundData] = useState<any[]>([]);
    const [showConfetti, setShowConfetti] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    // Draggable Fruit State
    const pan = useRef(new Animated.ValueXY()).current;
    const [isDragging, setIsDragging] = useState(false);
    const [draggedFruitOpacity, setDraggedFruitOpacity] = useState(1);

    // Cell Layouts for Drop Detection
    const cellLayouts = useRef<{ [key: number]: LayoutRectangle }>({});

    useEffect(() => {
        startRound();
    }, [round]);

    const startRound = () => {
        setShowConfetti(false);
        setFeedbackMessage(null);
        setPlacedFruits(Array(10).fill(false));

        let newTarget;
        if (round <= 4) {
            newTarget = Math.floor(Math.random() * 5) + 1;
        } else {
            newTarget = Math.floor(Math.random() * 5) + 6;
            if (newTarget > 10) newTarget = 10;
        }

        if (newTarget === targetNumber && round > 1) {
            newTarget = newTarget === 10 ? 9 : newTarget + 1;
        }
        setTargetNumber(newTarget);
    };

    const playEffect = async (type: 'success' | 'error' | 'pop' | 'limit') => {
        if (isMuted) return;
        // Placeholder for sound play
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                setIsDragging(true);
                pan.setOffset({
                    x: (pan.x as any)._value,
                    y: (pan.y as any)._value
                });
                pan.setValue({ x: 0, y: 0 });
                setDraggedFruitOpacity(1);
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: (_, gestureState) => {
                setIsDragging(false);
                pan.flattenOffset();

                // Drop Detection Logic
                // Mutlak koordinatlar (dropY) yerine bağıl hareket (dy) kullanıyoruz.
                // Kullanıcı meyveyi yukarı doğru (negatif dy) sürüklediyse ve yeterince mesafe katettiyse kabul et.
                const draggedDistanceY = gestureState.dy;

                // Eğer yukarı doğru en az 100 birim sürüklendiyse grid'e atılmış sayalım.
                // Bu, farklı ekran boyutlarında koordinat hesaplama derdini ortadan kaldırır.
                if (draggedDistanceY < -100) {
                    handleFruitDrop();
                } else {
                    // Yeterince sürüklenmediyse geri dön
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: false
                    }).start();
                }
            }
        })
    ).current;

    // drop logic revize
    const handleFruitDrop = () => {
        const currentCount = placedFruits.filter(Boolean).length;

        // Önce limit kontrolü
        if (currentCount >= targetNumber) {
            // Limit aşıldı
            playEffect('limit');
            setFeedbackMessage('Daha fazla yer kalmadı! 🚫');
            setMistakes(m => m + 1);

            Animated.spring(pan, {
                toValue: { x: 0, y: 0 },
                useNativeDriver: false
            }).start();

            setTimeout(() => setFeedbackMessage(null), 1500);
            return;
        }

        // Boş bir hücre bul ve yerleştir
        const firstEmptyIndex = placedFruits.findIndex(x => !x);
        if (firstEmptyIndex !== -1) {
            playEffect('pop');
            const newPlaced = [...placedFruits];
            newPlaced[firstEmptyIndex] = true;
            setPlacedFruits(newPlaced);

            // Animasyon: Meyve kaybolup sepete geri dönsün
            setDraggedFruitOpacity(0);
            pan.setValue({ x: 0, y: 0 });

            // Kısa bir gecikmeyle görünür yap (titreme olmasın)
            setTimeout(() => setDraggedFruitOpacity(1), 100);

            // Kontrol et: Hedef tamamlandı mı?
            const newCount = currentCount + 1;
            if (newCount === targetNumber) {
                handleSuccess();
            }
        }
    };

    const handleSuccess = () => {
        playEffect('success');
        setShowConfetti(true);
        setFeedbackMessage('Harika! 🎉');

        setRoundData(prev => [...prev, {
            round,
            target: targetNumber,
            result: 'success',
            mistakesInRound: 0
        }]);

        setTimeout(() => {
            if (round < 10) {
                setRound(r => r + 1);
            } else {
                finishGame();
            }
        }, 2500);
    };

    const finishGame = () => {
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const extraData = {
            cizimVerisi: JSON.stringify({ roundHistory: roundData }),
            zorlukSeviyesi: 1,
            kazanimOdagi: 'MAB.1 Sayı Kompozisyonu',
            algilananKelime: mistakes === 0 ? 'Mükemmel' : `${mistakes} deneme hatası`
        };
        onGameEnd('Onluk Çerçeve', duration, 10, mistakes, undefined, extraData);
    };

    // Render Grid Cells
    const renderCell = (index: number) => {
        return (
            <View
                key={index}
                style={styles.cell}
            >
                {placedFruits[index] && (
                    <Animated.View style={[styles.fruitInCell, { transform: [{ scale: 1 }] }]}>
                        <Text style={styles.fruitEmoji}>🍎</Text>
                    </Animated.View>
                )}
            </View>
        );
    };

    return (
        <ImageBackground
            source={{ uri: 'https://img.freepik.com/free-vector/hand-painted-watercolor-pastel-sky-background_23-2148902771.jpg' }} // Pastel Doğa Teması (Placeholder URL - gerçek asset kullanılmalı)
            style={styles.container}
            imageStyle={{ opacity: 0.6 }} // Soft background
        >
            {showConfetti && <ConfettiCannon count={200} origin={{ x: width / 2, y: 0 }} fadeOut={true} />}

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onExit} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color="#5D4037" />
                </TouchableOpacity>
                <View style={styles.scoreContainer}>
                    <Text style={styles.scoreText}>Tur: {round}/10</Text>
                </View>
                <TouchableOpacity onPress={toggleMute} style={styles.soundButton}>
                    <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={24} color="#5D4037" />
                </TouchableOpacity>
            </View>

            {/* Instruction */}
            <View style={styles.instructionContainer}>
                <Text style={styles.instructionText}>
                    Sepetten <Text style={styles.targetNumber}>{targetNumber}</Text> elma topla!
                </Text>
                {feedbackMessage && (
                    <Animated.Text style={styles.feedbackText}>{feedbackMessage}</Animated.Text>
                )}
            </View>

            {/* Ten Frame Grid */}
            <View style={styles.gridContainer}>
                <View style={styles.gridRow}>
                    {[0, 1, 2, 3, 4].map(renderCell)}
                </View>
                <View style={styles.gridRow}>
                    {[5, 6, 7, 8, 9].map(renderCell)}
                </View>
            </View>

            {/* Source Basket (Drag Source) */}
            {/* Z-Index artırıldı ve pozisyon düzeltildi */}
            <View style={styles.basketContainer}>
                <Image
                    source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1625/1625046.png' }} // Simple Basket Icon
                    style={styles.basketImage}
                />

                {/* Draggable Fruit - HitSlop eklendi */}
                <Animated.View
                    style={{
                        transform: [{ translateX: pan.x }, { translateY: pan.y }],
                        opacity: draggedFruitOpacity,
                        position: 'absolute',
                        top: -30, // Biraz daha yukarı alındı
                        zIndex: 999, // En üstte olması için
                    }}
                    {...panResponder.panHandlers}
                    hitSlop={{ top: 30, bottom: 30, left: 30, right: 30 }} // Dokunma alanı genişletildi
                >
                    <View style={styles.draggableFruit}>
                        <Text style={styles.fruitEmoji}>🍎</Text>
                    </View>
                </Animated.View>

                {/* Visual pile of apples */}
                <View style={styles.applePile}>
                    <Text style={[styles.fruitEmoji, { fontSize: 30, transform: [{ rotate: '15deg' }] }]}>🍎</Text>
                    <Text style={[styles.fruitEmoji, { fontSize: 30, transform: [{ rotate: '-10deg' }] }]}>🍎</Text>
                    <Text style={[styles.fruitEmoji, { fontSize: 30, transform: [{ rotate: '5deg' }] }]}>🍎</Text>
                </View>
            </View>

        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F4C3', // Fallback color (Lime 100)
        paddingTop: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    backButton: { backgroundColor: 'rgba(255,255,255,0.8)', padding: 8, borderRadius: 20 },
    soundButton: { backgroundColor: 'rgba(255,255,255,0.8)', padding: 8, borderRadius: 20 },
    scoreContainer: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    scoreText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#558B2F',
    },
    instructionContainer: {
        alignItems: 'center',
        marginBottom: 20,
        height: 80,
    },
    instructionText: {
        fontSize: 26,
        color: '#33691E',
        fontWeight: '700',
        fontFamily: 'System',
    },
    targetNumber: {
        fontSize: 36,
        color: '#D32F2F',
        fontWeight: 'bold',
    },
    feedbackText: {
        marginTop: 10,
        fontSize: 22,
        color: '#E65100',
        fontWeight: 'bold',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 10,
        overflow: 'hidden',
    },
    gridContainer: {
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.6)',
        padding: 15,
        borderRadius: 20,
        borderWidth: 4,
        borderColor: '#81C784',
        marginBottom: 40,
    },
    gridRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
    },
    cell: {
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: 'rgba(255,255,255,0.8)',
        borderWidth: 2,
        borderColor: '#A5D6A7',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    fruitInCell: {
        width: '90%',
        height: '90%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    basketContainer: {
        position: 'absolute',
        bottom: 40,
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        width: 150,
        height: 120,
    },
    basketImage: {
        width: 120,
        height: 120,
        resizeMode: 'contain',
        opacity: 0.9,
    },
    draggableFruit: {
        width: FRUIT_SIZE * 1.5,
        height: FRUIT_SIZE * 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 5,
        backgroundColor: 'rgba(255,255,255,0.4)', // Slight glow
        borderRadius: 50,
    },
    fruitEmoji: {
        fontSize: FRUIT_SIZE,
    },
    applePile: {
        position: 'absolute',
        bottom: 20,
        flexDirection: 'row',
        gap: -10,
        zIndex: -1,
    },
});
