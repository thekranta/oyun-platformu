import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

// Tüm oyunlarda ortak "Tekrar Dinle" düğmesi (Oyun_Test_Listesi.docx #1: "komutu yeniden
// dinlemek için tüm oyunlarda geçerli ortak bir buton kullanalım"). Her oyun kendi
// tema rengini `color` ile, yerleşim boşluğunu `style` ile (marginTop vb.) verir.
interface ListenButtonProps {
    onPress: () => void;
    color?: string;
    style?: StyleProp<ViewStyle>;
    label?: string;
}

export default function ListenButton({ onPress, color = '#4CAF50', style, label = 'Tekrar Dinle' }: ListenButtonProps) {
    return (
        <TouchableOpacity
            style={[styles.btn, { backgroundColor: color }, style]}
            onPress={onPress}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={label}
        >
            <Ionicons name="volume-high" size={20} color="#fff" />
            <Text style={styles.text}>{label}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 22,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 1,
        elevation: 3,
    },
    text: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '800',
    },
});
