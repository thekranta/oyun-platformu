import React, { useEffect, useState } from 'react';
import { Animated, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Placeholder images - User needs to add these to assets
const CARD_IMAGES = [
    require('../assets/images/icon.png'), // Placeholder 1
    require('../assets/images/icon.png'), // Placeholder 2
    require('../assets/images/icon.png'), // Placeholder 3
    require('../assets/images/icon.png'), // Placeholder 4
    require('../assets/images/icon.png'), // Placeholder 5
];

// Stage configurations
const STAGES = [
    { level: 1, pairCount: 2 }, // 4 cards
    { level: 2, pairCount: 3 }, // 6 cards
    { level: 3, pairCount: 4 }, // 8 cards
    { level: 4, pairCount: 5 }, // 10 cards
    { level: 5, pairCount: 5 }, // 10 cards
];

interface HafizaOyunuProps {
    onGameEnd: (oyunAdi: string, sure: number, finalHamle: number, finalHata: number) => void;
}

interface Card {
    id: number;
    imageId: number;
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

    useEffect(() => {
        startStage(0);
    }, []);

    const startStage = (stageIndex: number) => {
        const config = STAGES[stageIndex];
        const pairCount = config.pairCount;

        // Select images for this stage
        const stageImages = CARD_IMAGES.slice(0, pairCount);

        // Create pairs
        let newCards: Card[] = [];
        stageImages.forEach((img, idx) => {
            // Card 1
            newCards.push({
                id: idx * 2,
                imageId: idx,
                isFlipped: false,
                isMatched: false,
                animValue: new Animated.Value(0),
                scaleValue: new Animated.Value(1),
                shakeValue: new Animated.Value(0),
            });
            // Card 2
            newCards.push({
                id: idx * 2 + 1,
                imageId: idx,
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

            if (firstCard.imageId === secondCard.imageId) {
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
                setTotalErrors(e => e + 1);

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
        }
    };

    const handleStageComplete = () => {
        const now = new Date();
        const stageDuration = startTime ? Math.round((now.getTime() - startTime.getTime()) / 1000) : 0;
        setCumulativeTime(prev => prev + stageDuration);
        setStartTime(null); // Stop timer until next stage starts
        setStageComplete(true);
    };

    const handleNextStage = () => {
        if (currentStageIndex + 1 < STAGES.length) {
            startStage(currentStageIndex + 1);
        } else {
            // Game Over
            onGameEnd('hafiza', cumulativeTime, totalMoves, totalErrors);
        }
    };

    if (stageComplete) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.congratsTitle}>🎉 Harika!</Text>
                <Text style={styles.congratsText}>
                    {currentStageIndex + 1}. Aşamayı Tamamladın!
                </Text>
                <TouchableOpacity style={styles.nextButton} onPress={handleNextStage}>
                    <Text style={styles.nextButtonText}>
                        {currentStageIndex + 1 === STAGES.length ? "Sonuçları Gör 🏁" : "Sonraki Aşama ➡️"}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.gameContainer}>
            <View style={styles.header}>
                <Text style={styles.title}>🧠 Hafıza - Aşama {currentStageIndex + 1}/{STAGES.length}</Text>
                <Text style={styles.stats}>Hamle: {totalMoves} | Hata: {totalErrors}</Text>
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
                        <View key={card.id} style={styles.cardContainer}>
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
                                <Image source={CARD_IMAGES[card.imageId]} style={styles.cardImage} resizeMode="contain" />
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
                                <Text style={styles.questionMark}>❓</Text>
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
    );
}

const styles = StyleSheet.create({
    gameContainer: { flexGrow: 1, alignItems: 'center', paddingTop: 40, backgroundColor: '#fff' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#E3F2FD' },
    header: { marginBottom: 20, alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 5, color: '#1565C0' },
    stats: { fontSize: 16, color: '#555' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: 340 },
    cardContainer: { width: 70, height: 70, margin: 5 },
    touchable: { position: 'absolute', width: '100%', height: '100%', zIndex: 10 },
    card: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        backfaceVisibility: 'hidden',
        borderWidth: 2,
        borderColor: '#ddd',
    },
    cardBack: {
        backgroundColor: '#2196F3',
        borderColor: '#1976D2',
    },
    cardFront: {
        backgroundColor: 'white',
        borderColor: '#4CAF50',
    },
    questionMark: { fontSize: 32, color: 'white' },
    cardImage: { width: 40, height: 40 },
    congratsTitle: { fontSize: 32, fontWeight: 'bold', color: '#4CAF50', marginBottom: 10 },
    congratsText: { fontSize: 20, color: '#333', marginBottom: 30 },
    nextButton: { backgroundColor: '#2196F3', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 25, elevation: 5 },
    nextButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
});
