import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

interface InAppNoticeProps {
    message: string | null;
    onDismiss: () => void;
    /** Ekranda kalma süresi (ms). */
    duration?: number;
}

/**
 * Ekranın altında kısa süre görünen uygulama içi bildirim kartı.
 * Tarayıcının kendi alert penceresi yerine kullanılır (Alert.alert web'de zaten boş işlemdir,
 * window.alert ise amatör görünür). Üst bileşenin ekranı kaplayan bir View olması gerekir
 * (mutlak konumlanır).
 */
export default function InAppNotice({ message, onDismiss, duration = 6000 }: InAppNoticeProps) {
    useEffect(() => {
        if (!message) return;
        const id = setTimeout(onDismiss, duration);
        return () => clearTimeout(id);
    }, [message, onDismiss, duration]);

    if (!message) return null;
    return (
        <View style={styles.wrap} pointerEvents="box-none">
            <View style={styles.card} accessibilityRole="alert">
                <Ionicons name="information-circle" size={22} color="#fff" />
                <Text style={styles.text}>{message}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 24,
        alignItems: 'center',
    },
    card: {
        width: '100%',
        maxWidth: 560,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        borderRadius: 16,
        backgroundColor: '#263238',
        ...Platform.select({
            web: { boxShadow: '0 6px 20px rgba(0,0,0,0.25)' },
            default: { elevation: 6 },
        }),
    },
    text: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        lineHeight: 20,
    },
});
