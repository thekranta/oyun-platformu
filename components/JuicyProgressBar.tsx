/**
 * JuicyProgressBar - Animasyonlu İlerleme Çubuğu
 * İçinde hareket eden yıldız ile çocukların dikkatini çeker
 * 
 * Kullanım:
 * <JuicyProgressBar current={3} total={10} />
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

// ============== TYPES ==============
interface JuicyProgressBarProps {
    current: number;
    total: number;
    showPercentage?: boolean;
    showStar?: boolean;
    colorScheme?: 'rainbow' | 'green' | 'purple' | 'gold';
    height?: number;
}

// ============== COLOR SCHEMES ==============
const COLOR_SCHEMES = {
    rainbow: {
        gradient: ['#FF6B6B', '#FFE66D', '#4ECDC4', '#45B7D1', '#96CEB4'],
        star: '#FFD700',
        track: 'rgba(255,255,255,0.2)',
    },
    green: {
        gradient: ['#66BB6A', '#81C784', '#A5D6A7'],
        star: '#FFF',
        track: 'rgba(102, 187, 106, 0.2)',
    },
    purple: {
        gradient: ['#BF40BF', '#CE93D8', '#E1BEE7'],
        star: '#FFD700',
        track: 'rgba(191, 64, 191, 0.2)',
    },
    gold: {
        gradient: ['#FFD700', '#FFC107', '#FFCA28'],
        star: '#FFF',
        track: 'rgba(255, 215, 0, 0.2)',
    },
};

// ============== COMPONENT ==============
export default function JuicyProgressBar({
    current,
    total,
    showPercentage = true,
    showStar = true,
    colorScheme = 'rainbow',
    height = 24,
}: JuicyProgressBarProps) {
    const progress = Math.min(Math.max(current / total, 0), 1);
    const colors = COLOR_SCHEMES[colorScheme];

    // Animations
    const starBounce = useRef(new Animated.Value(0)).current;
    const starRotation = useRef(new Animated.Value(0)).current;
    const fillScale = useRef(new Animated.Value(0)).current;
    const shimmerPosition = useRef(new Animated.Value(0)).current;

    // Star bounce animation
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(starBounce, {
                    toValue: -4,
                    duration: 400,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(starBounce, {
                    toValue: 0,
                    duration: 400,
                    easing: Easing.in(Easing.quad),
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    // Star rotation on progress change
    useEffect(() => {
        Animated.sequence([
            Animated.timing(starRotation, {
                toValue: 1,
                duration: 300,
                easing: Easing.out(Easing.back(2)),
                useNativeDriver: true,
            }),
            Animated.timing(starRotation, {
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
            }),
        ]).start();
    }, [current]);

    // Fill animation
    useEffect(() => {
        Animated.spring(fillScale, {
            toValue: progress,
            friction: 6,
            tension: 40,
            useNativeDriver: false, // Can't use native driver for width
        }).start();
    }, [progress]);

    // Shimmer animation
    useEffect(() => {
        Animated.loop(
            Animated.timing(shimmerPosition, {
                toValue: 1,
                duration: 2000,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();
    }, []);

    const starSpin = starRotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const shimmerTranslate = shimmerPosition.interpolate({
        inputRange: [0, 1],
        outputRange: [-50, 200],
    });

    // Get gradient color based on progress position
    const getGradientColor = (progressPercent: number): string => {
        const gradient = colors.gradient;
        if (gradient.length === 1) return gradient[0];

        const index = Math.min(
            Math.floor(progressPercent * (gradient.length - 1)),
            gradient.length - 2
        );
        return gradient[index];
    };

    return (
        <View style={[styles.container, { height }]}>
            {/* Track (background) */}
            <View style={[styles.track, { backgroundColor: colors.track, height }]}>
                {/* Fill */}
                <Animated.View
                    style={[
                        styles.fill,
                        {
                            width: fillScale.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                            }),
                            backgroundColor: getGradientColor(progress),
                            height,
                        },
                    ]}
                >
                    {/* Shimmer effect */}
                    <Animated.View
                        style={[
                            styles.shimmer,
                            {
                                transform: [{ translateX: shimmerTranslate }],
                            },
                        ]}
                    />
                </Animated.View>

                {/* Star indicator */}
                {showStar && (
                    <Animated.View
                        style={[
                            styles.starContainer,
                            {
                                left: `${progress * 100}%`,
                                transform: [
                                    { translateX: -12 },
                                    { translateY: starBounce },
                                    { rotate: starSpin },
                                ],
                            },
                        ]}
                    >
                        <Text style={[styles.star, { color: colors.star }]}>⭐</Text>
                    </Animated.View>
                )}
            </View>

            {/* Percentage / Count text */}
            {showPercentage && (
                <View style={styles.textContainer}>
                    <Text style={styles.text}>
                        {current}/{total}
                    </Text>
                </View>
            )}
        </View>
    );
}

// ============== JuicyProgressBar for Headers ==============
/**
 * Compact version for use in game headers
 */
export function HeaderProgressBar({
    current,
    total,
}: {
    current: number;
    total: number;
}) {
    const progress = Math.min(Math.max(current / total, 0), 1);
    const fillAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(fillAnim, {
            toValue: progress,
            friction: 8,
            tension: 40,
            useNativeDriver: false,
        }).start();
    }, [progress]);

    return (
        <View style={styles.headerContainer}>
            <View style={styles.headerTrack}>
                <Animated.View
                    style={[
                        styles.headerFill,
                        {
                            width: fillAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '100%'],
                            }),
                        },
                    ]}
                />
                {/* Moving star */}
                <Animated.Text
                    style={[
                        styles.headerStar,
                        {
                            left: fillAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: ['0%', '90%'],
                            }),
                        },
                    ]}
                >
                    ⭐
                </Animated.Text>
            </View>
            <Text style={styles.headerText}>{Math.round(progress * 100)}%</Text>
        </View>
    );
}

// ============== STYLES ==============
const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        width: '100%',
    },
    track: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    fill: {
        borderRadius: 10,
        overflow: 'hidden',
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 50,
        backgroundColor: 'rgba(255,255,255,0.3)',
        transform: [{ skewX: '-20deg' }],
    },
    starContainer: {
        position: 'absolute',
        top: -2,
        zIndex: 10,
    },
    star: {
        fontSize: 20,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    textContainer: {
        marginLeft: 12,
        minWidth: 50,
    },
    text: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFF',
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },

    // Header variant
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 120,
    },
    headerTrack: {
        flex: 1,
        height: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 8,
        overflow: 'visible',
        position: 'relative',
    },
    headerFill: {
        height: '100%',
        backgroundColor: '#FFD700',
        borderRadius: 8,
    },
    headerStar: {
        position: 'absolute',
        top: -6,
        fontSize: 18,
    },
    headerText: {
        marginLeft: 8,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFF',
    },
});
