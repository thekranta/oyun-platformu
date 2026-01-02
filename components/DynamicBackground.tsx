import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MusicButton from './MusicButton';

const { width, height } = Dimensions.get('window');

// Floating Item with Icons - Slower, dreamier movement
const FloatingItem = ({ delay, duration, startX, size, children, floatRange = 20 }: any) => {
    const translateY = useRef(new Animated.Value(height + 100)).current;
    const translateX = useRef(new Animated.Value(startX)).current;
    const rotate = useRef(new Animated.Value(0)).current;
    const floatY = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = () => {
            translateY.setValue(height + 100);
            rotate.setValue(0);

            Animated.parallel([
                Animated.timing(translateY, {
                    toValue: -100,
                    duration: duration,
                    delay: delay,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.timing(rotate, {
                    toValue: 1,
                    duration: duration * 2,
                    delay: delay,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ]).start(() => animate());
        };
        animate();

        // Gentle floating effect
        const floatAnimation = () => {
            Animated.sequence([
                Animated.timing(floatY, {
                    toValue: floatRange,
                    duration: 2000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                }),
                Animated.timing(floatY, {
                    toValue: -floatRange,
                    duration: 2000,
                    easing: Easing.inOut(Easing.sin),
                    useNativeDriver: true,
                })
            ]).start(() => floatAnimation());
        };
        floatAnimation();
    }, []);

    const spin = rotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '15deg'] // Subtle rotation for dreamy effect
    });

    return (
        <Animated.View
            style={{
                position: 'absolute',
                transform: [
                    { translateY: Animated.add(translateY, floatY) },
                    { translateX },
                    { rotate: spin }
                ],
                width: size,
                height: size,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: 0.7
            }}
        >
            {children}
        </Animated.View>
    );
};

// Gently drifting cloud component
const DriftingCloud = ({ delay, startX, startY, size }: any) => {
    const translateX = useRef(new Animated.Value(startX - 100)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animate = () => {
            translateX.setValue(startX - 100);
            opacity.setValue(0);

            Animated.parallel([
                Animated.timing(translateX, {
                    toValue: startX + width + 100,
                    duration: 30000,
                    delay: delay,
                    easing: Easing.linear,
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.timing(opacity, {
                        toValue: 0.6,
                        duration: 3000,
                        delay: delay,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0.6,
                        duration: 24000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 3000,
                        useNativeDriver: true,
                    })
                ])
            ]).start(() => animate());
        };
        animate();
    }, []);

    return (
        <Animated.View
            style={{
                position: 'absolute',
                top: startY,
                transform: [{ translateX }],
                opacity,
            }}
        >
            <Text style={{ fontSize: size, color: '#FFFFFF' }}>☁️</Text>
        </Animated.View>
    );
};

// Twinkling star component
const TwinklingStar = ({ x, y, size, delay }: any) => {
    const opacity = useRef(new Animated.Value(0.3)).current;
    const scale = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        const twinkle = () => {
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(opacity, {
                        toValue: 1,
                        duration: 1000 + Math.random() * 500,
                        delay: delay,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(scale, {
                        toValue: 1.2,
                        duration: 1000 + Math.random() * 500,
                        delay: delay,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    })
                ]),
                Animated.parallel([
                    Animated.timing(opacity, {
                        toValue: 0.3,
                        duration: 1000 + Math.random() * 500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(scale, {
                        toValue: 0.8,
                        duration: 1000 + Math.random() * 500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    })
                ])
            ]).start(() => twinkle());
        };
        twinkle();
    }, []);

    return (
        <Animated.View
            style={{
                position: 'absolute',
                left: x,
                top: y,
                opacity,
                transform: [{ scale }],
            }}
        >
            <Text style={{ fontSize: size, color: '#FFD700' }}>⭐</Text>
        </Animated.View>
    );
};

interface DynamicBackgroundProps {
    children: React.ReactNode;
    onExit?: () => void;
}

export default function DynamicBackground({ children, onExit }: DynamicBackgroundProps) {
    // Generate random star positions
    const stars = React.useMemo(() => {
        return Array.from({ length: 8 }, (_, i) => ({
            id: i,
            x: Math.random() * width * 0.9,
            y: Math.random() * height * 0.7,
            size: 16 + Math.random() * 14,
            delay: Math.random() * 2000,
        }));
    }, []);

    return (
        <View style={styles.container}>
            {/* Gradient Background Layer */}
            <View style={styles.gradientBackground} />

            <View style={styles.background}>
                {/* Twinkling Stars */}
                {stars.map((star) => (
                    <TwinklingStar
                        key={star.id}
                        x={star.x}
                        y={star.y}
                        size={star.size}
                        delay={star.delay}
                    />
                ))}

                {/* Drifting Clouds */}
                <DriftingCloud delay={0} startX={-50} startY={height * 0.1} size={60} />
                <DriftingCloud delay={8000} startX={-100} startY={height * 0.3} size={80} />
                <DriftingCloud delay={15000} startX={-80} startY={height * 0.6} size={50} />
                <DriftingCloud delay={22000} startX={-60} startY={height * 0.2} size={70} />

                {/* Floating Icons - Slower, dreamier */}
                <FloatingItem delay={0} duration={25000} startX={width * 0.1} size={50} floatRange={15}>
                    <Ionicons name="star" size={40} color="#FFD700" />
                </FloatingItem>
                <FloatingItem delay={3000} duration={30000} startX={width * 0.85} size={70} floatRange={20}>
                    <Ionicons name="cloud" size={60} color="#FFFFFF" />
                </FloatingItem>
                <FloatingItem delay={7000} duration={28000} startX={width * 0.5} size={55} floatRange={18}>
                    <Ionicons name="heart" size={45} color="#FFB6C1" />
                </FloatingItem>
                <FloatingItem delay={2000} duration={22000} startX={width * 0.7} size={40} floatRange={12}>
                    <Ionicons name="musical-note" size={35} color="#DDA0DD" />
                </FloatingItem>
                <FloatingItem delay={10000} duration={32000} startX={width * 0.25} size={65} floatRange={25}>
                    <Ionicons name="sunny" size={55} color="#FFE082" />
                </FloatingItem>
                <FloatingItem delay={15000} duration={27000} startX={width * 0.9} size={45} floatRange={14}>
                    <Ionicons name="planet" size={40} color="#B39DDB" />
                </FloatingItem>
            </View>

            {/* Global Music Button */}
            <MusicButton />

            {/* Global Exit Button */}
            {onExit && (
                <TouchableOpacity style={styles.exitButton} onPress={onExit}>
                    <Text style={styles.exitIcon}>🚪</Text>
                </TouchableOpacity>
            )}

            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#E3F2FD', // Fallback color (light blue)
    },
    gradientBackground: {
        ...StyleSheet.absoluteFillObject,
        // CSS gradient for web, fallback for native
        ...(Platform.OS === 'web' ? {
            background: 'linear-gradient(180deg, #E3F2FD 0%, #BBDEFB 30%, #FFF8E1 70%, #FFF3E0 100%)',
        } : {
            backgroundColor: '#E8F5E9', // Light pastel green fallback for native
        }),
    },
    background: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
    content: {
        flex: 1,
        zIndex: 1,
    },
    soundControlsContainer: {
        position: 'absolute',
        top: 50,
        right: 20,
        zIndex: 100,
    },
    exitButton: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        backgroundColor: '#FF5252',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
        elevation: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        borderWidth: 3,
        borderColor: '#FFF'
    },
    exitIcon: {
        fontSize: 30,
        color: 'white',
    },
});
