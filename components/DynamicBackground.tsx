import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import SoundControls from './SoundControls';

const { width, height } = Dimensions.get('window');

// Floating Item with Icons
const FloatingItem = ({ delay, duration, startX, size, children }: any) => {
    const translateY = useRef(new Animated.Value(height + 100)).current;
    const translateX = useRef(new Animated.Value(startX)).current;
    const rotate = useRef(new Animated.Value(0)).current;

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
                    duration: duration,
                    delay: delay,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ]).start(() => animate());
        };
        animate();
    }, []);

    const spin = rotate.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    return (
        <Animated.View
            style={{
                position: 'absolute',
                transform: [{ translateY }, { translateX }, { rotate: spin }],
                width: size,
                height: size,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: 0.6
            }}
        >
            {children}
        </Animated.View>
    );
};

interface DynamicBackgroundProps {
    children: React.ReactNode;
    onExit?: () => void;
}

export default function DynamicBackground({ children, onExit }: DynamicBackgroundProps) {
    return (
        <View style={styles.container}>
            <View style={styles.background}>
                {/* Floating Icons - More Playful */}
                <FloatingItem delay={0} duration={15000} startX={width * 0.1} size={50}>
                    <Ionicons name="star" size={40} color="#FFD700" />
                </FloatingItem>
                <FloatingItem delay={2000} duration={18000} startX={width * 0.8} size={80}>
                    <Ionicons name="cloud" size={70} color="#B3E5FC" />
                </FloatingItem>
                <FloatingItem delay={5000} duration={20000} startX={width * 0.4} size={60}>
                    <Ionicons name="heart" size={50} color="#FFCDD2" />
                </FloatingItem>
                <FloatingItem delay={1000} duration={12000} startX={width * 0.6} size={40}>
                    <Ionicons name="musical-note" size={35} color="#E1BEE7" />
                </FloatingItem>
                <FloatingItem delay={8000} duration={22000} startX={width * 0.2} size={70}>
                    <Ionicons name="sunny" size={60} color="#FFF176" />
                </FloatingItem>
                <FloatingItem delay={12000} duration={19000} startX={width * 0.9} size={45}>
                    <Ionicons name="planet" size={40} color="#C5CAE9" />
                </FloatingItem>
            </View>

            {/* Global Sound Controls */}
            <View style={styles.soundControlsContainer}>
                <SoundControls />
            </View>

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
        backgroundColor: '#FFF8E1', // Soft Yellow / Papaya Whip - Warmer tone
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
