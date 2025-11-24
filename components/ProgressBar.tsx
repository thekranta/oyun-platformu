import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

interface ProgressBarProps {
    current: number;
    total: number;
}

const { width } = Dimensions.get('window');

export default function ProgressBar({ current, total }: ProgressBarProps) {
    const progress = Math.min(Math.max(current / total, 0), 1);

    return (
        <View style={styles.container}>
            <View style={styles.barContainer}>
                <View style={[styles.fill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.text}>{current}/{total}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 10,
        width: '100%',
    },
    barContainer: {
        flex: 1,
        height: 15,
        backgroundColor: '#E0E0E0',
        borderRadius: 10,
        overflow: 'hidden',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#ccc',
    },
    fill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 10,
    },
    text: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#555',
    },
});
