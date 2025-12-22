import Slider from '@react-native-community/slider';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSound } from './SoundContext';

export default function SoundControls() {
    const { isPlaying, volume, toggleSound, changeVolume } = useSound();

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={toggleSound} style={styles.button}>
                <Text style={styles.icon}>{isPlaying ? '🔊' : '🔇'}</Text>
            </TouchableOpacity>
            {isPlaying && (
                <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={1}
                    value={volume}
                    onValueChange={changeVolume}
                    minimumTrackTintColor="#4CAF50"
                    maximumTrackTintColor="#000000"
                    thumbTintColor="#4CAF50"
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        padding: 5,
        borderRadius: 20,
        elevation: 5,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    button: {
        padding: 8,
    },
    icon: {
        fontSize: 24,
    },
    slider: {
        width: 100,
        height: 40,
    },
});
