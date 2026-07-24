import speechService from '@/services/speechService';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import DynamicBackground from './DynamicBackground';
import ProgressBar from './ProgressBar';

const SIRALAMA_SAYILARI = [1, 2, 3, 4, 5];
const TOTAL_ROUNDS = 4;
const { width, height } = Dimensions.get('window');
const ITEM_SIZE = width > 600 ? 100 : 70;
const FONT_SIZE = width > 600 ? 40 : 28;

// Color palettes for each round
const ROUND_COLORS = [
    { bg: '#FF6B6B', border: '#E53935', text: '#FFFFFF' }, // Red
    { bg: '#4ECDC4', border: '#00ACC1', text: '#FFFFFF' }, // Teal
    { bg: '#FFE66D', border: '#FFC107', text: '#333333' }, // Yellow
    { bg: '#A78BFA', border: '#7C3AED', text: '#FFFFFF' }, // Purple
];

interface SiralamaOyunuProps {
    onGameEnd: (oyunAdi: string, sure: number, finalHamle: number, finalHata: number, algilananKelime?: string, extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string }) => void;
    onExit?: () => void;
    childName?: string;
}

// Generate random positions for numbers that don't overlap
const generateRandomPositions = (count: number, containerWidth: number, containerHeight: number, itemSize: number) => {
    const positions: { x: number; y: number }[] = [];
    const padding = 20;
    const maxAttempts = 100;

    for (let i = 0; i < count; i++) {
        let attempts = 0;
        let validPosition = false;
        let x = 0, y = 0;

        while (!validPosition && attempts < maxAttempts) {
            x = padding + Math.random() * (containerWidth - itemSize - padding * 2);
            y = padding + Math.random() * (containerHeight - itemSize - padding * 2);

            validPosition = true;
            for (const pos of positions) {
                const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
                if (distance < itemSize + 15) {
                    validPosition = false;
                    break;
                }
            }
            attempts++;
        }

        positions.push({ x, y });
    }

    return positions;
};

export default function SiralamaOyunu({ onGameEnd, onExit, childName }: SiralamaOyunuProps) {
    const [karisikSayilar, setKarisikSayilar] = useState<any[]>([]);
    const [beklenenSayi, setBeklenenSayi] = useState(1);
    const [positions, setPositions] = useState<{ x: number; y: number }[]>([]);

    // Countdown State
    const [countdown, setCountdown] = useState<number | null>(5);
    const [gameStarted, setGameStarted] = useState(false);
    const countdownScale = useRef(new Animated.Value(1)).current;

    // Round State
    const [currentRound, setCurrentRound] = useState(1);

    // Cumulative Stats
    const [totalHamle, setTotalHamle] = useState(0);
    const [totalHata, setTotalHata] = useState(0);
    const [startTime, setStartTime] = useState<Date | null>(null);

    // UI State
    const [containerSize, setContainerSize] = useState({ width: 300, height: 400 });
    const [showError, setShowError] = useState<number | null>(null);

    // Confetti Ref
    const confettiRef = useRef<ConfettiCannon>(null);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Initialize game on mount
    useEffect(() => {
        initializeGame();
        startCountdown();

        return () => {
            speechService.stopSpeech();
            // eslint-disable-next-line react-hooks/exhaustive-deps
            timersRef.current.forEach(clearTimeout);
        };
    }, []);

    const initializeGame = () => {
        const karisik = [...SIRALAMA_SAYILARI].sort(() => Math.random() - 0.5)
            .map((sayi, index) => ({ id: index, sayi, tiklandi: false }));
        setKarisikSayilar(karisik);
        setBeklenenSayi(1);
    };

    const startCountdown = async () => {
        const name = childName || 'küçük kaşif';

        // Start voice during countdown
        if (Platform.OS === 'web') {
            speechService.speak(`Merhaba ${name}! Sayıları sırala.`);
        }

        // Countdown animation
        for (let i = 5; i >= 1; i--) {
            setCountdown(i);

            // Pulse animation
            Animated.sequence([
                Animated.timing(countdownScale, {
                    toValue: 1.3,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(countdownScale, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                }),
            ]).start();

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setCountdown(null);
        setGameStarted(true);
        setStartTime(new Date());
    };

    const baslat = (isFirstStart: boolean = false) => {
        const karisik = [...SIRALAMA_SAYILARI].sort(() => Math.random() - 0.5)
            .map((sayi, index) => ({ id: index, sayi, tiklandi: false }));
        setKarisikSayilar(karisik);
        setBeklenenSayi(1);

        // Generate new random positions
        const newPositions = generateRandomPositions(
            SIRALAMA_SAYILARI.length,
            containerSize.width,
            containerSize.height,
            ITEM_SIZE
        );
        setPositions(newPositions);

        if (isFirstStart) {
            setStartTime(new Date());
            setTotalHamle(0);
            setTotalHata(0);
            setCurrentRound(1);
        }
    };

    const sayiSec = async (index: number, sayi: number) => {
        if (!gameStarted || karisikSayilar[index].tiklandi) return;

        setTotalHamle(h => h + 1);

        if (sayi === beklenenSayi) {
            const yeniSayilar = [...karisikSayilar];
            yeniSayilar[index].tiklandi = true;
            setKarisikSayilar(yeniSayilar);

            if (beklenenSayi === 5) {
                // Round Complete
                if (confettiRef.current) {
                    confettiRef.current.start();
                }

                if (currentRound < TOTAL_ROUNDS) {
                    // Round complete voice
                    await speechService.speak('Aferin!');

                    timersRef.current.push(setTimeout(() => {
                        setCurrentRound(r => r + 1);
                        baslat(false);
                    }, 1200));
                } else {
                    // Game Complete
                    await speechService.speak('Tebrikler!');

                    timersRef.current.push(setTimeout(() => {
                        const now = new Date();
                        const totalDuration = startTime ? Math.round((now.getTime() - startTime.getTime()) / 1000) : 0;
                        onGameEnd('siralama', totalDuration, totalHamle + 1, totalHata, undefined, {
                            zorlukSeviyesi: currentRound,
                            kazanimOdagi: 'Sayı Sıralaması ve Ardışıklık',
                        });
                    }, 1500));
                }
            } else {
                setBeklenenSayi(b => b + 1);
            }
        } else {
            setTotalHata(h => h + 1);
            setShowError(index);

            // Error feedback
            if (Platform.OS === 'web') {
                speechService.speak('Tekrar dene!');
            }

            setTimeout(() => setShowError(null), 500);
        }
    };

    const onContainerLayout = (event: any) => {
        const { width: w, height: h } = event.nativeEvent.layout;
        setContainerSize({ width: w, height: h });

        // Regenerate positions when container size changes
        const newPositions = generateRandomPositions(
            SIRALAMA_SAYILARI.length,
            w,
            h,
            ITEM_SIZE
        );
        setPositions(newPositions);
    };

    const currentColors = ROUND_COLORS[(currentRound - 1) % ROUND_COLORS.length];

    // Countdown Overlay
    if (countdown !== null) {
        return (
            <DynamicBackground onExit={onExit}>
                <View style={styles.countdownOverlay}>
                    <View style={styles.countdownCard}>
                        <Text style={styles.countdownTitle}>🔢 Sayıları Sırala</Text>
                        <Text style={styles.countdownSubtitle}>Hazır ol!</Text>
                        <Animated.View style={[styles.countdownCircle, { transform: [{ scale: countdownScale }] }]}>
                            <Text style={styles.countdownNumber}>{countdown}</Text>
                        </Animated.View>
                        <Text style={styles.countdownHint}>1'den 5'e kadar sırala</Text>
                    </View>
                </View>
            </DynamicBackground>
        );
    }

    return (
        <DynamicBackground onExit={onExit}>
            <View style={styles.topBar}>
                <ProgressBar current={currentRound} total={TOTAL_ROUNDS} />
            </View>

            <View style={styles.headerContainer}>
                <Text style={styles.baslik}>🔢 Sayıları Sırala</Text>
                <Text style={styles.bilgi}>
                    Sıradaki sayı: <Text style={[styles.bilgiVurgulu, { color: currentColors.bg }]}>{beklenenSayi}</Text>
                </Text>
            </View>

            <View
                style={styles.gameArea}
                onLayout={onContainerLayout}
            >
                {karisikSayilar.map((item, index) => {
                    const pos = positions[index] || { x: 0, y: 0 };
                    const isError = showError === index;

                    return (
                        <TouchableOpacity
                            key={item.id}
                            style={[
                                styles.sayiKutu,
                                {
                                    position: 'absolute',
                                    left: pos.x,
                                    top: pos.y,
                                    backgroundColor: item.tiklandi ? '#E0E0E0' : currentColors.bg,
                                    borderColor: item.tiklandi ? '#BDBDBD' : currentColors.border,
                                    transform: [{ scale: isError ? 1.2 : 1 }],
                                    opacity: item.tiklandi ? 0.5 : 1,
                                },
                                isError && styles.errorShake
                            ]}
                            onPress={() => sayiSec(index, item.sayi)}
                            disabled={item.tiklandi}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.sayiYazi,
                                { color: item.tiklandi ? '#9E9E9E' : currentColors.text }
                            ]}>
                                {item.sayi}
                            </Text>
                            {item.tiklandi && (
                                <Text style={styles.checkmark}>✓</Text>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={styles.roundIndicator}>
                <Text style={styles.roundText}>Aşama {currentRound} / {TOTAL_ROUNDS}</Text>
            </View>

            <ConfettiCannon
                count={200}
                origin={{ x: -10, y: 0 }}
                autoStart={false}
                ref={confettiRef}
                fadeOut={true}
            />
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    // Countdown Styles
    countdownOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    countdownCard: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        padding: 40,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 15,
    },
    countdownTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1565C0',
        marginBottom: 8,
    },
    countdownSubtitle: {
        fontSize: 20,
        color: '#757575',
        marginBottom: 30,
    },
    countdownCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FF6B6B',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF6B6B',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 10,
    },
    countdownNumber: {
        fontSize: 60,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    countdownHint: {
        fontSize: 16,
        color: '#9E9E9E',
        marginTop: 25,
    },

    // Game Styles
    topBar: {
        width: '100%',
        paddingTop: 40,
        paddingBottom: 10,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    headerContainer: {
        alignItems: 'center',
        paddingVertical: 15,
    },
    baslik: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1565C0',
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    bilgi: {
        fontSize: 20,
        marginTop: 8,
        color: '#555',
    },
    bilgiVurgulu: {
        fontWeight: 'bold',
        fontSize: 24,
    },
    gameArea: {
        flex: 1,
        margin: 15,
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 25,
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 3,
        borderColor: 'rgba(100,181,246,0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    sayiKutu: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: ITEM_SIZE / 2,
        borderWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 6,
    },
    errorShake: {
        backgroundColor: '#FF5252',
        borderColor: '#D32F2F',
    },
    sayiYazi: {
        fontSize: FONT_SIZE,
        fontWeight: 'bold',
    },
    checkmark: {
        position: 'absolute',
        fontSize: 20,
        color: '#4CAF50',
        bottom: -2,
        right: -2,
    },
    roundIndicator: {
        paddingVertical: 15,
        alignItems: 'center',
    },
    roundText: {
        fontSize: 16,
        color: '#757575',
        fontWeight: '600',
    },
});
