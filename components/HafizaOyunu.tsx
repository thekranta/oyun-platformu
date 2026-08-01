import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, ImageBackground, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { FeedbackService } from '../services/FeedbackService';
import CountdownOverlay from './CountdownOverlay';
import ProgressBar from './ProgressBar';
import { asset } from '../lib/assetMap';

// Arka plan görseli
const BACKGROUND_IMAGE = asset('/backgrounds/games/hafiza_bg.png');

// Get screen dimensions
const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

// Calculate card size dynamically
// On mobile, we want 3 cards per row roughly (width / 3.5)
// On web, we want larger cards but capped
const CARD_MARGIN = 10;
const COLUMNS = isWeb ? 4 : 3;
const CONTAINER_PADDING = 20;
const AVAILABLE_WIDTH = Math.min(width, 800) - (CONTAINER_PADDING * 2); // Cap max width for web
const CARD_SIZE = (AVAILABLE_WIDTH / COLUMNS) - (CARD_MARGIN * 2);

// Placeholder images - User needs to add these to assets
const GORSELLER_SETI = [
    // Her obje, bir benzersiz kart çiftini temsil eder
    { id: 1, source: asset('/images/cilek.png'), name: 'Çilek' },
    { id: 2, source: asset('/images/elma.png'), name: 'Elma' },
    { id: 3, source: asset('/images/nar.png'), name: 'Nar' },
    { id: 4, source: asset('/images/kiraz.png'), name: 'Kiraz' },
    { id: 5, source: asset('/images/avokado.png'), name: 'Avokado' },
    //...
];

interface HafizaOyunuProps {
    onGameEnd: (oyunAdi: string, sure: number, finalHamle: number, finalHata: number, algilananKelime?: string, extraData?: { cizimVerisi?: string; zorlukSeviyesi?: number; kazanimOdagi?: string }) => void;
    onExit?: () => void;
    childName?: string;
    emojiSet?: string[];   // verilirse görsel yerine emoji kartlar (temalı varyant)
    oyunAdi?: string;      // varyant oyun kimliği
    title?: string;        // başlık metni
}

interface Card {
    id: number;
    matchId: number; // Used for matching logic (corresponds to image ID)
    source: any;     // Image source
    emoji?: string;  // emoji varyantı için
    isFlipped: boolean;
    isMatched: boolean;
    animValue: Animated.Value;
    scaleValue: Animated.Value;
    shakeValue: Animated.Value;
}

export default function HafizaOyunu({ onGameEnd, onExit, childName = 'Küçük Kaşif', emojiSet, oyunAdi = 'hafiza', title = '🧠 Çiftini Bul!' }: HafizaOyunuProps) {
    // Emoji seti verilirse görsel yerine emoji kartlar kullan (temalı varyant)
    const gorseller: { id: number; name: string; source?: any; emoji?: string }[] =
        emojiSet && emojiSet.length >= 5
            ? emojiSet.slice(0, 5).map((e, i) => ({ id: i + 1, name: e, emoji: e }))
            : GORSELLER_SETI;
    const stages = [
        { pairs: 2, totalCards: 4, images: gorseller.slice(0, 2) },
        { pairs: 3, totalCards: 6, images: gorseller.slice(0, 3) },
        { pairs: 4, totalCards: 8, images: gorseller.slice(0, 4) },
        { pairs: 5, totalCards: 10, images: gorseller.slice(0, 5) },
        { pairs: 5, totalCards: 10, images: gorseller.slice(0, 5) },
    ];

    const [currentStageIndex, setCurrentStageIndex] = useState(0);
    const [cards, setCards] = useState<Card[]>([]);
    const [selectedCards, setSelectedCards] = useState<Card[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [stageComplete, setStageComplete] = useState(false);

    // Cumulative Stats
    const [, setTotalMoves] = useState(0);
    const [, setTotalErrors] = useState(0);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [, setCumulativeTime] = useState(0); // Seconds from previous stages

    // Smart Scoring: Track seen card IDs
    const [seenCardIds, setSeenCardIds] = useState<Set<number>>(new Set());
    const [gameReady, setGameReady] = useState(false);

    // Confetti Ref
    const confettiRef = useRef<ConfettiCannon>(null);

    // handleNextStage bir setTimeout icinden cagrildigi icin state'i eski closure'dan
    // okur; son asamanin suresi ve son hamle onGameEnd'e yansimaz. Guncel degerleri
    // bu ref'lerden okuyoruz.
    const totalMovesRef = useRef(0);
    const totalErrorsRef = useRef(0);
    const cumulativeTimeRef = useRef(0);

    // Unmount'ta temizlenecek zamanlayicilar
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    // Start stage on mount
    useEffect(() => {
        startStage(0);
    }, []);

    // Unmount cleanup: bekleyen setTimeout'lari temizle
    useEffect(() => () => {
         
        timersRef.current.forEach(clearTimeout);
    }, []);

    const startStage = (stageIndex: number) => {
        const config = stages[stageIndex];
        const stageImages = config.images;

        // Create pairs
        let newCards: Card[] = [];
        stageImages.forEach((imgObj, idx) => {
            // Card 1
            newCards.push({
                id: idx * 2,
                matchId: imgObj.id,
                source: imgObj.source,
                emoji: imgObj.emoji,
                isFlipped: false,
                isMatched: false,
                animValue: new Animated.Value(0),
                scaleValue: new Animated.Value(1),
                shakeValue: new Animated.Value(0),
            });
            // Card 2
            newCards.push({
                id: idx * 2 + 1,
                matchId: imgObj.id,
                source: imgObj.source,
                emoji: imgObj.emoji,
                isFlipped: false,
                isMatched: false,
                animValue: new Animated.Value(0),
                scaleValue: new Animated.Value(1),
                shakeValue: new Animated.Value(0),
            });
        });

        // Shuffle
        newCards.sort(() => Math.random() - 0.5);

        setCards(newCards);
        setCurrentStageIndex(stageIndex);
        setSelectedCards([]);
        setIsProcessing(false);
        setStageComplete(false);
        setSeenCardIds(new Set());

        // Start timer only if it's the first stage or resuming
        if (stageIndex === 0) {
            setStartTime(new Date());
            totalMovesRef.current = 0;
            totalErrorsRef.current = 0;
            cumulativeTimeRef.current = 0;
            setTotalMoves(0);
            setTotalErrors(0);
            setCumulativeTime(0);
        } else {
            setStartTime(new Date());
        }
    };

    const flipCard = (card: Card) => {
        Animated.spring(card.animValue, {
            toValue: 180,
            friction: 8,
            tension: 10,
            useNativeDriver: true,
        }).start();
    };

    const unflipCard = (card: Card) => {
        Animated.spring(card.animValue, {
            toValue: 0,
            friction: 8,
            tension: 10,
            useNativeDriver: true,
        }).start();
    };

    const animateMatch = (card: Card) => {
        // Use FeedbackService for haptic + sound
        FeedbackService.playSuccess({ intensity: 'medium' });
        FeedbackService.playSuccessSound();

        Animated.sequence([
            Animated.timing(card.scaleValue, {
                toValue: 1.2,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(card.scaleValue, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const animateError = (card: Card) => {
        // U-oh sound on error
        FeedbackService.playError({ sound: true });

        Animated.sequence([
            Animated.timing(card.shakeValue, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(card.shakeValue, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(card.shakeValue, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(card.shakeValue, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const handleCardPress = (index: number) => {
        if (isProcessing || stageComplete) return;
        const card = cards[index];
        if (card.isFlipped || card.isMatched) return;

        // Flip animation
        flipCard(card);

        // Update state
        const newCards = [...cards];
        newCards[index].isFlipped = true;
        setCards(newCards);

        const newSelected = [...selectedCards, card];
        setSelectedCards(newSelected);

        if (newSelected.length === 2) {
            setIsProcessing(true);
            totalMovesRef.current += 1;
            setTotalMoves(m => m + 1);

            const [firstCard, secondCard] = newSelected;

            if (firstCard.matchId === secondCard.matchId) {
                // Match!
                const matchedCards = newCards.map(c =>
                    (c.id === firstCard.id || c.id === secondCard.id) ? { ...c, isMatched: true } : c
                );
                setCards(matchedCards);
                setSelectedCards([]);
                setIsProcessing(false);

                // Animations
                animateMatch(cards.find(c => c.id === firstCard.id)!);
                animateMatch(cards.find(c => c.id === secondCard.id)!);

                // Check Stage Completion
                if (matchedCards.every(c => c.isMatched)) {
                    handleStageComplete();
                }

            } else {
                // No Match
                const isFirstSeen = seenCardIds.has(firstCard.id);
                const isSecondSeen = seenCardIds.has(secondCard.id);

                if (isFirstSeen || isSecondSeen) {
                    totalErrorsRef.current += 1;
                    setTotalErrors(e => e + 1);
                }

                // Add to seen
                const newSeen = new Set(seenCardIds);
                newSeen.add(firstCard.id);
                newSeen.add(secondCard.id);
                setSeenCardIds(newSeen);

                // Error Animation
                animateError(cards.find(c => c.id === firstCard.id)!);
                animateError(cards.find(c => c.id === secondCard.id)!);

                timersRef.current.push(setTimeout(() => {
                    unflipCard(cards.find(c => c.id === firstCard.id)!);
                    unflipCard(cards.find(c => c.id === secondCard.id)!);

                    const resetCards = newCards.map(c =>
                        (c.id === firstCard.id || c.id === secondCard.id) ? { ...c, isFlipped: false } : c
                    );
                    setCards(resetCards);
                    setSelectedCards([]);
                    setIsProcessing(false);
                }, 1000));
            }
        }
    };

    const handleStageComplete = () => {
        const now = new Date();
        const stageDuration = startTime ? Math.round((now.getTime() - startTime.getTime()) / 1000) : 0;
        cumulativeTimeRef.current += stageDuration;
        setCumulativeTime(prev => prev + stageDuration);
        setStartTime(null); // Stop timer until next stage starts
        setStageComplete(true);

        // Trigger Confetti
        if (confettiRef.current) {
            confettiRef.current.start();
        }

        // Auto transition after 3 seconds (increased for confetti)
        timersRef.current.push(setTimeout(() => {
            handleNextStage();
        }, 3000));
    };

    const handleNextStage = () => {
        if (currentStageIndex + 1 < stages.length) {
            startStage(currentStageIndex + 1);
        } else {
            // Game Over — guncel degerler ref'lerden (setTimeout closure'i eski state tutar)
            onGameEnd(oyunAdi, cumulativeTimeRef.current, totalMovesRef.current, totalErrorsRef.current, undefined, {
                zorlukSeviyesi: currentStageIndex + 1,
                kazanimOdagi: 'Görsel Bellek ve Eşleştirme',
            });
        }
    };

    if (stageComplete) {
        return (
            <ImageBackground source={BACKGROUND_IMAGE} style={styles.background} resizeMode="cover">
                <View style={styles.darkOverlay} />
                {/* Exit Button */}
                {onExit && (
                    <TouchableOpacity style={styles.exitButton} onPress={onExit}>
                        <Text style={styles.exitButtonText}>🏠</Text>
                    </TouchableOpacity>
                )}
                <View style={styles.centerContainer}>
                    <Text style={styles.congratsTitle}>🎉 Harika!</Text>
                    <Text style={styles.congratsText}>
                        {currentStageIndex + 1}. Aşamayı Tamamladın!
                    </Text>
                    <Text style={styles.autoText}>Sonraki aşamaya geçiliyor...</Text>
                </View>
                <ConfettiCannon
                    count={200}
                    origin={{ x: -10, y: 0 }}
                    autoStart={true}
                    ref={confettiRef}
                    fadeOut={true}
                />
            </ImageBackground>
        );
    }

    return (
        <ImageBackground source={BACKGROUND_IMAGE} style={styles.background} resizeMode="cover">
            <View style={styles.darkOverlay} />
            {/* Exit Button */}
            {onExit && (
                <TouchableOpacity style={styles.exitButton} onPress={onExit}>
                    <Text style={styles.exitButtonText}>🏠</Text>
                </TouchableOpacity>
            )}
            {/* Countdown Overlay */}
            {!gameReady && (
                <CountdownOverlay
                    message="Hafıza Oyununa hoş geldin! Kartların çiftlerini bulmaya çalış!"
                    childName={childName}
                    countdownSeconds={5}
                    onComplete={() => setGameReady(true)}
                />
            )}
            <View style={styles.topBar}>
                <ProgressBar current={currentStageIndex + 1} total={stages.length} />
            </View>

            <ScrollView contentContainerStyle={styles.gameContainer}>
                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                </View>

                <View style={styles.grid}>
                    {cards.map((card, index) => {
                        const rotateY = card.animValue.interpolate({
                            inputRange: [0, 180],
                            outputRange: ['0deg', '180deg'],
                        });

                        const backRotateY = card.animValue.interpolate({
                            inputRange: [0, 180],
                            outputRange: ['180deg', '360deg'],
                        });

                        return (
                            <View key={card.id} style={[styles.cardContainer, { width: CARD_SIZE, height: CARD_SIZE, margin: CARD_MARGIN }]}>
                                {/* Front Face (Hidden initially) */}
                                <Animated.View style={[
                                    styles.card,
                                    styles.cardFront,
                                    {
                                        transform: [
                                            { rotateY: backRotateY },
                                            { scale: card.scaleValue },
                                            { translateX: card.shakeValue }
                                        ]
                                    }
                                ]}>
                                    {card.emoji ? (
                                        <Text style={{ fontSize: CARD_SIZE * 0.5 }}>{card.emoji}</Text>
                                    ) : (
                                        <Image source={card.source} style={[styles.cardImage, { width: CARD_SIZE * 0.6, height: CARD_SIZE * 0.6 }]} resizeMode="contain" />
                                    )}
                                </Animated.View>

                                {/* Back Face (Visible initially) */}
                                <Animated.View style={[
                                    styles.card,
                                    styles.cardBack,
                                    {
                                        transform: [
                                            { rotateY: rotateY },
                                            { scale: card.scaleValue },
                                            { translateX: card.shakeValue }
                                        ]
                                    }
                                ]}>
                                    <Text style={[styles.questionMark, { fontSize: CARD_SIZE * 0.5 }]}>❓</Text>
                                </Animated.View>

                                {/* Touch Handler */}
                                <TouchableOpacity
                                    style={styles.touchable}
                                    onPress={() => handleCardPress(index)}
                                    activeOpacity={1}
                                />
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    background: { flex: 1, width: '100%', height: '100%' },
    darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.25)' },
    exitButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 107, 107, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    exitButtonText: { fontSize: 22 },
    gameContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', minHeight: height - 100 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    topBar: { width: '100%', paddingTop: 40, paddingBottom: 10, backgroundColor: 'rgba(255,255,255,0.8)' },
    header: { marginBottom: 20, alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: '#fff', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: 800 },
    cardContainer: {
        // width & height are dynamic now
    },
    touchable: { position: 'absolute', width: '100%', height: '100%', zIndex: 10 },
    card: {
        width: '100%',
        height: '100%',
        borderRadius: 15, // More rounded
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        backfaceVisibility: 'hidden',
        borderWidth: 3, // Thicker border
        borderColor: '#ddd',
        backgroundColor: 'white',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    cardBack: {
        backgroundColor: '#2196F3',
        borderColor: '#1976D2',
    },
    cardFront: {
        backgroundColor: 'white',
        borderColor: '#4CAF50',
    },
    questionMark: { color: 'white', fontWeight: 'bold' },
    cardImage: {},
    congratsTitle: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
    congratsText: { fontSize: 20, color: '#fff', marginBottom: 10 },
    autoText: { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' },
});

