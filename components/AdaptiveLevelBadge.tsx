import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

// Akıllı (uyarlanır zorluk) oyunlarda çocuğun o anki SEVİYESİNİ gösterir: 📈 + yükselen 5 çubuk.
// Seviye artınca rozet büyüyüp "⭐ Seviye yükseldi!" kısa süre görünür — böylece oyunun
// çocuğa göre değiştiği oynarken HİSSEDİLİR (Oyun_Test_Listesi #20/#21: "zorluk oynarken
// değişmiyor"). Yazıyı okuyamayan çocuk için çubukların dolması ve yıldız yeterlidir.
// Seviye düşünce sessizce çubuk azalır (kötü his verilmez).

interface Props {
    /** Şu anki zorluk seviyesi (1..max). */
    level: number;
    max?: number;
}

export default function AdaptiveLevelBadge({ level, max = 5 }: Props) {
    const prev = useRef(level);
    const pulse = useRef(new Animated.Value(1)).current;
    const banner = useRef(new Animated.Value(0)).current;
    const [bannerOn, setBannerOn] = useState(false);

    useEffect(() => {
        if (level > prev.current) {
            setBannerOn(true);
            banner.setValue(0);
            pulse.setValue(1);
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(pulse, { toValue: 1.3, duration: 160, useNativeDriver: true }),
                    Animated.spring(pulse, { toValue: 1, friction: 4, useNativeDriver: true }),
                ]),
                Animated.sequence([
                    Animated.timing(banner, { toValue: 1, duration: 220, useNativeDriver: true }),
                    Animated.delay(1100),
                    Animated.timing(banner, { toValue: 0, duration: 300, useNativeDriver: true }),
                ]),
            ]).start(({ finished }) => { if (finished) setBannerOn(false); });
        }
        prev.current = level;
    }, [level, pulse, banner]);

    return (
        <View style={styles.wrap} accessibilityLabel={`Seviye ${level} / ${max}`}>
            <Animated.View style={[styles.pill, { transform: [{ scale: pulse }] }]}>
                <Text style={styles.icon}>📈</Text>
                <View style={styles.bars}>
                    {Array.from({ length: max }, (_, i) => (
                        <View key={i} style={[styles.bar, { height: 7 + i * 3 }, i < level && styles.barOn]} />
                    ))}
                </View>
            </Animated.View>
            {bannerOn && (
                <Animated.View
                    pointerEvents="none"
                    style={[styles.banner, {
                        opacity: banner,
                        transform: [{ translateY: banner.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
                    }]}
                >
                    <Text style={styles.bannerText}>⭐ Seviye yükseldi!</Text>
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { position: 'relative' },
    pill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16,
    },
    icon: { fontSize: 14 },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 21 },
    bar: { width: 5, borderRadius: 2, backgroundColor: '#B0BEC5' },
    barOn: { backgroundColor: '#1976D2' },
    banner: {
        // Sabit genişlik: rozetin dar kabına sığmaya çalışıp satırlara bölünmesin (sağa hizalı, sola taşar).
        position: 'absolute', top: 38, right: 0, zIndex: 30, width: 172, alignItems: 'center',
        backgroundColor: '#FFD54F', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4,
    },
    bannerText: { fontSize: 14, fontWeight: '900', color: '#5D4037' },
});
