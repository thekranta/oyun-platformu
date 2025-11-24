import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

// Simple shapes/icons represented by views or text
const FloatingItem = ({ delay, duration, startX, size, color, children }: any) => {
    const translateY = useRef(new Animated.Value(height + 100)).current;
    const translateX = useRef(new Animated.Value(startX)).current;

    useEffect(() => {
        const animate = () => {
            translateY.setValue(height + 100);
            Animated.timing(translateY, {
                toValue: -100,
                duration: duration,
                delay: delay,
                easing: Easing.linear,
                useNativeDriver: true,
            }).start(() => animate());
        };
        animate();
    }, []);

    return (
        <Animated.View
            style={{
                position: 'absolute',
                transform: [{ translateY }, { translateX }],
                width: size,
                height: size,
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            {children}
        </Animated.View>
    );
};

export default function DynamicBackground({ children }: { children: React.ReactNode }) {
    return (
        <View style={styles.container}>
            <View style={styles.background}>
                {/* Floating Items */}
                <FloatingItem delay={0} duration={15000} startX={width * 0.1} size={50}>
                    <View style={[styles.circle, { backgroundColor: 'rgba(255, 200, 200, 0.4)' }]} />
                </FloatingItem>
                <FloatingItem delay={2000} duration={18000} startX={width * 0.8} size={80}>
                    <View style={[styles.square, { backgroundColor: 'rgba(200, 255, 200, 0.4)' }]} />
                </FloatingItem>
                <FloatingItem delay={5000} duration={20000} startX={width * 0.4} size={60}>
                    <View style={[styles.circle, { backgroundColor: 'rgba(200, 200, 255, 0.4)' }]} />
                </FloatingItem>
                <FloatingItem delay={1000} duration={12000} startX={width * 0.6} size={40}>
                    <View style={[styles.triangle, { borderBottomColor: 'rgba(255, 255, 200, 0.4)' }]} />
                </FloatingItem>
                <FloatingItem delay={8000} duration={22000} startX={width * 0.2} size={70}>
                    <View style={[styles.square, { backgroundColor: 'rgba(255, 200, 255, 0.4)' }]} />
                </FloatingItem>
            </View>
            <View style={styles.content}>
                {children}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F8FF', // AliceBlue
    },
    background: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 0,
    },
    content: {
        flex: 1,
        zIndex: 1,
    },
    circle: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
    },
    square: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    triangle: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 20,
        borderRightWidth: 20,
        borderBottomWidth: 40,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
    },
});
