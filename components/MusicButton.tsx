import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSound } from './SoundContext';

export default function MusicButton() {
    const { isMuted, toggleMute, volume, changeVolume, resumeAfterInteraction } = useSound();
    const [isExpanded, setIsExpanded] = useState(false);
    const expandAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const autoCollapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Responsive positioning based on screen size
    const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setScreenWidth(window.width);
        });
        return () => subscription?.remove();
    }, []);

    // Pulse animation when not muted
    useEffect(() => {
        if (!isMuted) {
            const pulse = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            pulse.start();
            return () => pulse.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isMuted, pulseAnim]);

    // Auto-collapse after 3 seconds
    const scheduleAutoCollapse = () => {
        if (autoCollapseTimer.current) {
            clearTimeout(autoCollapseTimer.current);
        }
        autoCollapseTimer.current = setTimeout(() => {
            collapse();
        }, 3000);
    };

    const expand = () => {
        setIsExpanded(true);
        Animated.spring(expandAnim, {
            toValue: 1,
            useNativeDriver: false,
            friction: 8,
        }).start();
        scheduleAutoCollapse();
    };

    const collapse = () => {
        Animated.timing(expandAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
        }).start(() => {
            setIsExpanded(false);
        });
        if (autoCollapseTimer.current) {
            clearTimeout(autoCollapseTimer.current);
            autoCollapseTimer.current = null;
        }
    };

    const handlePress = async () => {
        // First interaction - try to resume audio
        await resumeAfterInteraction();

        if (isExpanded) {
            collapse();
        } else {
            expand();
        }
    };

    const handleMuteToggle = async () => {
        await toggleMute();
        scheduleAutoCollapse();
    };

    const handleVolumeChange = (val: number) => {
        changeVolume(val);
        scheduleAutoCollapse();
    };

    // Position away from common interaction areas
    const isSmallScreen = screenWidth < 400;
    const buttonSize = isSmallScreen ? 40 : 48;

    const containerWidth = expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [buttonSize, isSmallScreen ? 160 : 200],
    });

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    width: containerWidth,
                    height: buttonSize,
                    borderRadius: buttonSize / 2,
                    top: isSmallScreen ? 10 : 20,
                    right: isSmallScreen ? 10 : 20,
                },
            ]}
        >
            <TouchableOpacity
                onPress={handlePress}
                style={[styles.mainButton, { width: buttonSize, height: buttonSize }]}
                activeOpacity={0.8}
            >
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <Ionicons
                        name={isMuted ? 'volume-mute' : 'musical-notes'}
                        size={isSmallScreen ? 20 : 24}
                        color="#fff"
                    />
                </Animated.View>
            </TouchableOpacity>

            {isExpanded && (
                <View style={styles.expandedContent}>
                    <TouchableOpacity
                        onPress={handleMuteToggle}
                        style={styles.muteButton}
                    >
                        <Ionicons
                            name={isMuted ? 'volume-mute' : 'volume-high'}
                            size={18}
                            color="#fff"
                        />
                    </TouchableOpacity>

                    <Slider
                        style={styles.slider}
                        minimumValue={0}
                        maximumValue={1}
                        value={volume}
                        onValueChange={handleVolumeChange}
                        minimumTrackTintColor="#fff"
                        maximumTrackTintColor="rgba(255,255,255,0.3)"
                        thumbTintColor="#fff"
                        disabled={isMuted}
                    />
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        zIndex: 100,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(102, 126, 234, 0.95)',
        overflow: 'hidden',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    mainButton: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    expandedContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 12,
    },
    muteButton: {
        padding: 6,
    },
    slider: {
        flex: 1,
        height: 30,
    },
});
