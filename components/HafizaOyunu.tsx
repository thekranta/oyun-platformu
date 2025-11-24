import React, { useEffect, useState } from 'react';
import { Animated, Dimensions, Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DynamicBackground from './DynamicBackground';
import ProgressBar from './ProgressBar';

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
    { id: 1, source: require('../assets/images/cilek.png'), name: 'Çilek' },
    { id: 2, source: require('../assets/images/elma.png'), name: 'Elma' },
    { id: 3, source: require('../assets/images/nar.png'), name: 'Nar' },
    { id: 4, source: require('../assets/images/kiraz.png'), name: 'Kiraz' },
    { id: 5, source: require('../assets/images/avokado.png'), name: 'Avokado' },
    //...
];

// Bu set, 5 aşamanın tamamı için yeterli benzersiz görsele sahiptir.
const AŞAMA_AYARLARI = [
    { pairs: 2, totalCards: 4, images: GORSELLER_SETI.slice(0, 2) }, // Aşama 1: 4 Kart
    { pairs: 3, totalCards: 6, images: GORSELLER_SETI.slice(0, 3) }, // Aşama 2: 6 Kart
    { pairs: 4, totalCards: 8, images: GORSELLER_SETI.slice(0, 4) }, // Aşama 3: 8 Kart
    { pairs: 5, totalCards: 10, images: GORSELLER_SETI.slice(0, 5) }, // Aşama 4: 10 Kart
    { pairs: 5, totalCards: 10, images: GORSELLER_SETI.slice(0, 5) }, // Aşama 5: 10 Kart
];

interface HafizaOyunuProps {
    onGameEnd: (oyunAdi: string, sure: number, finalHamle: number, finalHata: number) => void;
}

interface Card {
    id: number;
    matchId: number; // Used for matching logic (corresponds to image ID)
    source: any;     // Image source
    isFlipped: boolean;
    isMatched: boolean;
    animValue: Animated.Value;
    scaleValue: Animated.Value;
    shakeValue: Animated.Value;
}

export default function HafizaOyunu({ onGameEnd }: HafizaOyunuProps) {
    const [currentStageIndex, setCurrentStageIndex] = useState(0);
    const [cards, setCards] = useState<Card[]>([]);
    const [selectedCards, setSelectedCards] = useState<Card[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [stageComplete, setStageComplete] = useState(false);

    // Cumulative Stats
    const [totalMoves, setTotalMoves] = useState(0);
    const [totalErrors, setTotalErrors] = useState(0);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [cumulativeTime, setCumulativeTime] = useState(0); // Seconds from previous stages

    // Smart Scoring: Track seen card IDs
    const [seenCardIds, setSeenCardIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        startStage(0);
    }, []);

    const startStage = (stageIndex: number) => {
        const config = AŞAMA_AYARLARI[stageIndex];
        const stageImages = config.images;

        // Create pairs
        let newCards: Card[] = [];
        stageImages.forEach((imgObj, idx) => {
            // Card 1
            newCards.push({
                id: idx * 2,
                matchId: imgObj.id,
                source: imgObj.source,
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
        setSeenCardIds(new Set()); // Reset seen cards for new stage (optional, or keep cumulative?) -> Resetting makes sense per stage usually, but user said "ilk açtığımız kartlar". Let's reset per stage to be fair.

        // Start timer only if it's the first stage or resuming
        if (stageIndex === 0) {
            setStartTime(new Date());
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

                // Smart Scoring Logic:
                // Only count error if we have seen at least one of these cards before (and failed to match).
                // If both are new, it's just exploration, not an error.
                // OR: If we pick Card A (seen) and Card B (new/seen) and they don't match -> Error.
                // Basically: If I picked a card that I SHOULD have known the match for (because I saw the match elsewhere), or if I picked two cards I've seen before.
                // Simplest interpretation of user request: "ilk açtığımız kartlar yanlış olarak hesaplanmasın".
                // Implementation: If EITHER card was already in 'seenCardIds', then it's an error.

                const isFirstSeen = seenCardIds.has(firstCard.id);
                const isSecondSeen = seenCardIds.has(secondCard.id);

                if (isFirstSeen || isSecondSeen) {
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

                setTimeout(() => {
                    unflipCard(cards.find(c => c.id === firstCard.id)!);
                    unflipCard(cards.find(c => c.id === secondCard.id)!);

                    const resetCards = newCards.map(c =>
                        (c.id === firstCard.id || c.id === secondCard.id) ? { ...c, isFlipped: false } : c
                    );
                    setCards(resetCards);
                    setSelectedCards([]);
                    setIsProcessing(false);
                }, 1000);
            }
        } else {
            // First card of pair flipped, add to seen?
            // Usually we add to seen after the pair is closed or matched to avoid "seeing" it while it's open?
            // Actually, as soon as you flip it, you see it.
            // But for the logic "don't count first open error", we handle it in the pair check.
        }
    };

    const handleStageComplete = () => {
        const now = new Date();
        const stageDuration = startTime ? Math.round((now.getTime() - startTime.getTime()) / 1000) : 0;
        setCumulativeTime(prev => prev + stageDuration);
        setStartTime(null); // Stop timer until next stage starts
        setStageComplete(true);

        // Auto transition after 2 seconds
        setTimeout(() => {
            handleNextStage();
        }, 2000);
    };

    const handleNextStage = () => {
        if (currentStageIndex + 1 < AŞAMA_AYARLARI.length) {
            startStage(currentStageIndex + 1);
        } else {
            // Game Over
            onGameEnd('hafiza', cumulativeTime, totalMoves, totalErrors);
        }
    };

    if (stageComplete) {
        return (
            <DynamicBackground>
                <View style={styles.centerContainer}>
                    <Text style={styles.congratsTitle}>🎉 Harika!</Text>
                    <Text style={styles.congratsText}>
                        {currentStageIndex + 1}. Aşamayı Tamamladın!
                    </Text>
                    <Text style={styles.autoText}>Sonraki aşamaya geçiliyor...</Text>
                </View>
            </DynamicBackground>
        );
    }

    return (
        <DynamicBackground>
            <View style={styles.topBar}>
                <ProgressBar current={currentStageIndex + 1} total={AŞAMA_AYARLARI.length} />
            </View>
            <ScrollView contentContainerStyle={styles.gameContainer}>
                <View style={styles.header}>
                    <Text style={styles.title}>🧠 Hafıza Oyunu</Text>
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
                                    <Image source={card.source} style={[styles.cardImage, { width: CARD_SIZE * 0.6, height: CARD_SIZE * 0.6 }]} resizeMode="contain" />
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
        </DynamicBackground>
    );
}

const styles = StyleSheet.create({
    gameContainer: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', minHeight: height - 100 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    topBar: { width: '100%', paddingTop: 40, paddingBottom: 10, backgroundColor: 'rgba(255,255,255,0.8)' },
    header: { marginBottom: 20, alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: '#1565C0' },
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
    congratsTitle: { fontSize: 32, fontWeight: 'bold', color: '#4CAF50', marginBottom: 10 },
    congratsText: { fontSize: 20, color: '#333', marginBottom: 10 },
    autoText: { fontSize: 16, color: '#666', fontStyle: 'italic' },
});
